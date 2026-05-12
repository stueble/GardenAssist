/**
 * JournalView — story-035 + story-036 + story-054.
 *
 * story-035: Timeline & Entry List
 * story-036: New Entry Panel & Edit
 * story-054: AI openJournalEdit / updateJournalEdit tools
 */

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { invalidateGarden }    from "@/hooks/useGarden";
import { apiClient }           from "@/api/client";
import { applyAiSuggestions }  from "@/lib/applyAiSuggestions";
import { useJournalEditHandler } from "@/hooks/useJournalEditContext";
import type { JournalEditFields } from "@/hooks/useJournalEditContext";
import type { JournalEntry, JournalEntryType } from "@api/journal-entry";
import type { Schedule }         from "@api/schedule";
import type { Attachment }      from "@api/attachment";
import type { Plant }           from "@api/plant";
import type { Garden }          from "@api/garden";
import type { AssistantContext } from "@api/assistant-context";

// ── Type colors (AC #6) ───────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, { border: string; bg: string; text: string; badge: string }> = {
   done:        { border: "#27ae60", bg: "#edfaf3", text: "#27ae60", badge: "✅" },
   skipped:     { border: "#7f8c8d", bg: "#f4f6f7", text: "#7f8c8d", badge: "⏭" },
   manual:      { border: "#4a78c0", bg: "#eef3fb", text: "#4a78c0", badge: "📝" },
   observation: { border: "#4a78c0", bg: "#eef3fb", text: "#4a78c0", badge: "👁" },
   problem:     { border: "#c0392b", bg: "#fdf0ee", text: "#c0392b", badge: "⚠️" },
   irrigation:  { border: "#1a6fa8", bg: "#e8f4fc", text: "#1a6fa8", badge: "💧" },
};

const FILTER_CHIP_TYPES: JournalEntryType[] = ["done", "skipped", "observation", "problem", "irrigation"];

/** Care schedule types that generate tasks — only these appear in the schedule picker. */
const CARE_SCHEDULE_TYPES = new Set(["pruning", "fertilization", "misc"]);

const SCHEDULE_TYPE_ICON: Record<string, string> = {
  pruning:       "✂️",
  fertilization: "💧",
  misc:          "📋",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

// ── Main component ─────────────────────────────────────────────────────────────

interface JournalViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function JournalView({ garden, loading }: JournalViewProps) {
  const { t } = useTranslation("journal");
  const { t: tc } = useTranslation("common");
  const assistantSettings = useAssistantSettings();

  // Local derived state — rebuilt whenever the shared garden prop updates.
  const [entries,       setEntries]       = useState<JournalEntry[]>([]);
  const [plants,        setPlants]        = useState<Plant[]>([]);
  const [attachmentMap, setAttachmentMap] = useState<Map<string, Attachment>>(new Map());
  const [search,        setSearch]        = useState("");
  const [activeType,    setActiveType]    = useState<JournalEntryType | null>(null);
  // Panel state: undefined=closed, null=new entry, JournalEntry=edit existing
  const [panelEntry, setPanelEntry] = useState<JournalEntry | null | undefined>(undefined);

  // Ref to the EntryPanel — used by AI tool handler to call applyAiFields()
  const entryPanelRef = useRef<EntryPanelHandle>(null);

  // Pending AI prefill — applied once the panel mounts
  const pendingPrefillRef = useRef<JournalEditFields | null>(null);

  // Derive local state from the shared garden prop whenever it updates.
  useEffect(() => {
    if (!garden) return;
    const sorted = [...garden.journal_entries].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(sorted);
    setPlants(garden.plants);
    const map = new Map<string, Attachment>();
    garden.attachments.forEach((a) => map.set(a.id, a));
    setAttachmentMap(map);
  }, [garden]);

  // Report AssistantContext to the shared AiPanel in App.tsx; clear on unmount
  useEffect(() => {
    setAssistantContext(
      garden ? { view: "journal" as const, garden, settings: assistantSettings } : undefined
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, assistantSettings]);

  // ── AI tool handler ─────────────────────────────────────────────────────────
  useJournalEditHandler({
    openJournalEdit: (entry_id, prefill) => {
      if (entry_id !== undefined) {
        // Edit existing entry
        const entry = entries.find((e) => e.id === entry_id) ?? null;
        pendingPrefillRef.current = Object.keys(prefill).length > 0 ? prefill : null;
        setPanelEntry(entry);
      } else {
        // New entry
        pendingPrefillRef.current = Object.keys(prefill).length > 0 ? prefill : null;
        setPanelEntry(null);
      }
    },
    updateJournalEdit: (fields) => {
      if (panelEntry === undefined) {
        return "Journal entry panel is not open. Please open it first.";
      }
      entryPanelRef.current?.applyAiFields(fields);
      return "";
    },
  });

  // Apply pending prefill once EntryPanel mounts (after setPanelEntry triggers re-render)
  useEffect(() => {
    if (panelEntry !== undefined && pendingPrefillRef.current) {
      // Small delay so the panel has mounted and the ref is populated
      const fields = pendingPrefillRef.current;
      pendingPrefillRef.current = null;
      // Use setTimeout to ensure the panel ref is available after render
      setTimeout(() => {
        entryPanelRef.current?.applyAiFields(fields);
      }, 0);
    }
  }, [panelEntry]);

  // Plant lookup map
  const plantById = new Map(plants.map((p) => [p.id, p]));

  // Filter
  const filtered = entries.filter((e) => {
    if (activeType && e.entry_type !== activeType) return false;
    if (search) {
      const q = search.toLowerCase();
      const plant = e.plant_id ? plantById.get(e.plant_id) : null;
      const matches =
        (e.title ?? "").toLowerCase().includes(q) ||
        (e.notes ?? "").toLowerCase().includes(q) ||
        (plant?.name_common ?? "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // Group by month
  const groups: Array<{ key: string; entries: JournalEntry[] }> = [];
  for (const entry of filtered) {
    const key = monthKey(entry.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, entries: [entry] });
    }
  }

  return (
    <div
      data-testid="journal-view"
      style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", background: "var(--cream)", position: "relative" }}
    >
      {/* ── Timeline area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Subheader */}
        <div style={{
          background:   "var(--warm-white)",
          borderBottom: "1px solid var(--border)",
          padding:      "10px 16px",
          display:      "flex",
          alignItems:   "center",
          gap:          "12px",
          flexShrink:   0,
          flexWrap:     "wrap",
        }}>
          {/* Search */}
          <div style={{ position: "relative", width: "260px", flexShrink: 0 }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--text-light)", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("overview.search_placeholder")}
              data-testid="journal-search"
              style={{
                width:        "100%",
                background:   "var(--green-mist)",
                border:       "1.5px solid var(--border)",
                borderRadius: "24px",
                padding:      "7px 14px 7px 32px",
                fontSize:     "13px",
                fontFamily:   "var(--font-body)",
                color:        "var(--text-dark)",
                outline:      "none",
              }}
            />
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {FILTER_CHIP_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                data-testid={`filter-chip-${type}`}
                onClick={() => setActiveType((prev) => prev === type ? null : type)}
                style={{
                  padding:      "5px 12px",
                  borderRadius: "20px",
                  fontSize:     "11.5px",
                  fontWeight:   500,
                  border:       "1.5px solid var(--border)",
                  background:   activeType === type ? "var(--green-deep)" : "none",
                  color:        activeType === type ? "white" : "var(--text-mid)",
                  cursor:       "pointer",
                  fontFamily:   "var(--font-body)",
                  transition:   "all .15s",
                  whiteSpace:   "nowrap",
                }}
              >
                {t(`filter.${type}` as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 24px 48px", position: "relative" }}>
          {loading ? (
            <div style={{ color: "var(--text-light)", fontSize: "13px" }}>{t("overview.loading")}</div>
          ) : groups.length === 0 ? (
            /* AC #5 — empty state */
            <div
              data-testid="journal-empty"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "var(--text-light)", fontSize: "13px", textAlign: "center", gap: "8px" }}
            >
              <span style={{ fontSize: "36px" }}>📔</span>
              <span>{search || activeType ? t("overview.no_results") : t("overview.no_entries")}</span>
            </div>
          ) : (
            groups.map(({ key, entries: monthEntries }) => (
              <div key={key} style={{ marginBottom: "32px" }}>
                {/* Month heading */}
                <div style={{
                  fontFamily:   "var(--font-display)",
                  fontSize:     "15px",
                  fontWeight:   600,
                  color:        "var(--green-deep)",
                  marginBottom: "16px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "10px",
                }}>
                  {monthLabel(key)}
                  <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                </div>

                {/* Entries with timeline line */}
                <div style={{ position: "relative", paddingLeft: "28px" }}>
                  {/* Vertical line */}
                  <div style={{
                    position:     "absolute",
                    left:         "7px",
                    top:          0,
                    bottom:       0,
                    width:        "2px",
                    background:   "var(--border)",
                    borderRadius: "2px",
                  }} />

                  {monthEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      plant={entry.plant_id ? plantById.get(entry.plant_id) ?? null : null}
                      attachmentMap={attachmentMap}
                      onEdit={(e) => setPanelEntry(e)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── New/Edit Entry Panel (AC #1, #7) ── */}
      <div
        data-testid="entry-panel"
        style={{
          width:         panelEntry !== undefined ? "320px" : "0",
          minWidth:      panelEntry !== undefined ? "320px" : "0",
          overflow:      "hidden",
          background:    "var(--warm-white)",
          borderLeft:    panelEntry !== undefined ? "1px solid var(--border)" : "none",
          display:       "flex",
          flexDirection: "column",
          transition:    "width .3s ease, min-width .3s ease",
          flexShrink:    0,
        }}
      >
        {panelEntry !== undefined && (
          <EntryPanel
            ref={entryPanelRef}
            entry={panelEntry}
            plants={plants}
            irrigationZones={assistantSettings?.irrigation_zones ?? []}
            onClose={() => setPanelEntry(undefined)}
            onSaved={() => {
              setPanelEntry(undefined);
              invalidateGarden();
            }}
            onDeleted={() => {
              setPanelEntry(undefined);
              invalidateGarden();
            }}
          />
        )}
      </div>

      {/* AiPanel is rendered once in App.tsx — not here */}

      {/* FAB — hidden when panel open */}
      {panelEntry === undefined && (
        <button
          type="button"
          data-testid="journal-fab"
          onClick={() => setPanelEntry(null)}
          style={{
            position:       "absolute",
            bottom:         "24px",
            right:          "24px",
            transition:     "right .3s ease",
            width:          "48px",
            height:         "48px",
            borderRadius:   "12px",
            background:     "var(--green-deep)",
            color:          "white",
            border:         "none",
            fontSize:       "26px",
            fontWeight:     300,
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            boxShadow:      "0 4px 16px rgba(45,74,45,.35)",
            lineHeight:     1,
            zIndex:         10,
          }}
          className="hover:bg-green-mid"
        >
          ＋
        </button>
      )}
    </div>
  );
}

// ── EntryCard ─────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry:         JournalEntry;
  plant:         Plant | null;
  attachmentMap: Map<string, Attachment>;
  onEdit?:       (entry: JournalEntry) => void;
}

function EntryCard({ entry, plant, attachmentMap, onEdit }: EntryCardProps) {
  const { t } = useTranslation("journal");
  const [expanded, setExpanded] = useState(false);

  const colors = TYPE_COLOR[entry.entry_type] ?? TYPE_COLOR.manual;
  const hasContent = entry.notes || entry.attachment_ids.length > 0;

  return (
    <div
      style={{ marginBottom: "12px", position: "relative" }}
    >
      {/* Timeline dot */}
      <div style={{
        position:     "absolute",
        left:         "-28px",
        top:          "16px",
        width:        "14px",
        height:       "14px",
        borderRadius: "50%",
        background:   colors.border,
        border:       "3px solid var(--warm-white)",
        zIndex:       1,
      }} />

      {/* Card */}
      <div
        data-testid="journal-entry"
        style={{
          background:       "var(--warm-white)",
          border:           "1.5px solid var(--border)",
          borderLeft:       `4px solid ${colors.border}`,
          borderRadius:     "10px",
          overflow:         "hidden",
          transition:       "box-shadow .15s",
          cursor:           hasContent ? "pointer" : "default",
        }}
        onClick={() => hasContent && setExpanded((p) => !p)}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", flexWrap: "wrap" }}>
          {/* Type badge */}
          <span
            data-testid="entry-type-badge"
            style={{
              fontSize:     "11px",
              fontWeight:   600,
              padding:      "2px 8px",
              borderRadius: "10px",
              background:   colors.bg,
              color:        colors.text,
              whiteSpace:   "nowrap",
              flexShrink:   0,
            }}
          >
            {t(`entry_type_badge.${entry.entry_type}` as any) ?? entry.entry_type}
          </span>

          {/* Plant tag — icon + name + first bloom color + location */}
          {plant && (
            <span
              data-testid="entry-plant-tag"
              style={{
                fontSize:     "11px",
                color:        "var(--text-light)",
                background:   "var(--green-mist)",
                padding:      "2px 8px",
                borderRadius: "10px",
                display:      "flex",
                alignItems:   "center",
                gap:          "4px",
                flexShrink:   0,
              }}
            >
              {plant.icon ?? "🌿"} {plant.name_common}
              {(() => {
                const bloom = plant.schedules.find((s) => s.schedule_type === "bloom" && s.color);
                const parts: React.ReactNode[] = [];
                if (bloom) {
                  parts.push(
                    <span key="bloom" style={{ display: "flex", alignItems: "center", gap: "3px", opacity: 0.85 }}>
                      ·
                      <span style={{
                        width:        "9px",
                        height:       "9px",
                        borderRadius: "2px",
                        background:   bloom.color ?? "#ccc",
                        flexShrink:   0,
                        display:      "inline-block",
                      }} />
                      {bloom.label ?? ""}
                    </span>
                  );
                }
                if (plant.location) {
                  parts.push(
                    <span key="loc" style={{ opacity: 0.7 }}>· {plant.location}</span>
                  );
                }
                return parts.length > 0 ? <>{parts}</> : null;
              })()}
            </span>
          )}

          {/* Title */}
          {entry.title && (
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-dark)", flex: 1, minWidth: 0 }}>
              {entry.title}
            </span>
          )}

          {/* Date */}
          <span style={{ fontSize: "11px", color: "var(--text-light)", flexShrink: 0, marginLeft: "auto" }}>
            {formatDate(entry.date)}
          </span>

          {/* Edit button */}
          {onEdit && (
            <button
              type="button"
              data-testid="entry-edit-btn"
              onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-light)", fontSize: "13px", padding: "0 2px",
                flexShrink: 0,
              }}
              className="hover:text-green-deep"
              title={t("overview.edit_title")}
            >
              ✏️
            </button>
          )}

          {/* Chevron */}
          {hasContent && (
            <span style={{
              fontSize:    "12px",
              color:       "var(--text-light)",
              transition:  "transform .2s",
              transform:   expanded ? "rotate(180deg)" : "none",
              flexShrink:  0,
            }}>
              ▾
            </span>
          )}
        </div>

        {/* Expanded content */}
        {expanded && hasContent && (
          <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
            {entry.notes && (
              <p style={{ fontSize: "12.5px", color: "var(--text-mid)", lineHeight: 1.6, padding: "10px 0 0", margin: 0 }}>
                {entry.notes}
              </p>
            )}
            {entry.attachment_ids.length > 0 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                {entry.attachment_ids.map((id) => {
                  const att = attachmentMap.get(id);
                  return (
                    <div
                      key={id}
                      style={{
                        width:        "64px",
                        height:       "64px",
                        borderRadius: "7px",
                        background:   "var(--green-mist)",
                        border:       "1.5px solid var(--border)",
                        display:      "flex",
                        alignItems:   "center",
                        justifyContent: "center",
                        fontSize:     "24px",
                        overflow:     "hidden",
                        flexShrink:   0,
                      }}
                    >
                      {att?.attachment_type === "image" && att.url ? (
                        <img
                          src={att.url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : att?.attachment_type === "pdf" ? (
                        "📄"
                      ) : (
                        "📷"
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── EntryPanel ────────────────────────────────────────────────────────────────

/** Panel entry type buttons — manual is implicit (no schedule selected) */
const PANEL_TYPE_VALUES: JournalEntryType[] = ["done", "skipped", "observation", "problem", "irrigation", "manual"];

const SCHEDULE_TYPE_LABEL_DE: Record<string, string> = {
  pruning:       "Schneiden",
  fertilization: "Düngen",
  misc:          "Aufgabe",
};

interface EntryPanelProps {
  entry:            JournalEntry | null;   // null = new entry
  plants:           Plant[];
  irrigationZones:  string[];
  onClose:          () => void;
  onSaved:          () => void;
  onDeleted:        () => void;
}

/** Public handle exposed to JournalView via forwardRef / useImperativeHandle */
export interface EntryPanelHandle {
  applyAiFields: (fields: JournalEditFields) => void;
}

/** Form state shape — mirrors the suggestable fields */
type EntryForm = {
  entry_type: JournalEntryType;
  plant_id:   string;
  date:       string;
  title:      string;
  notes:      string;
};

const EntryPanel = forwardRef<EntryPanelHandle, EntryPanelProps>(
function EntryPanel({ entry, plants, irrigationZones, onClose, onSaved, onDeleted }, ref) {
  const { t } = useTranslation("journal");
  const { t: tc } = useTranslation("common");
  const isNew = entry === null;

  // For existing entries: if entry_type is "manual", default the button to "done"
  const initType: JournalEntryType =
    (entry?.entry_type && entry.entry_type !== "manual")
      ? entry.entry_type
      : "done";

  // Irrigation-specific state:
  // - new entry: Set of selected zones (multiple allowed)
  // - edit entry: single zone from title (not multi-selectable in edit mode)
  const initIrrigationZones  = entry?.entry_type === "irrigation" && entry.title
    ? new Set([entry.title])
    : new Set<string>();
  const initIrrigationAmount = entry?.entry_type === "irrigation" ? (entry.notes ?? "") : "";

  const [entryType,         setEntryType]         = useState<JournalEntryType>(initType);
  const [plantId,           setPlantId]           = useState<string>(entry?.plant_id ?? "");
  const [scheduleId,        setScheduleId]        = useState<string>(entry?.schedule_id ?? "");
  const [date,              setDate]              = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [title,             setTitle]             = useState(entry?.title ?? "");
  const [notes,             setNotes]             = useState(entry?.notes ?? "");
  const [selectedZones,    setSelectedZones]      = useState<Set<string>>(initIrrigationZones);
  const [irrigationAmount, setIrrigationAmount]  = useState<string>(initIrrigationAmount);

  // AI suggestion markers
  const [aiMarked, setAiMarked] = useState<Partial<Record<keyof EntryForm, true>>>({});
  const [aiPrev,   setAiPrev]   = useState<Partial<EntryForm>>({});

  // Expose applyAiFields to JournalView
  useImperativeHandle(ref, () => ({
    applyAiFields(fields: JournalEditFields) {
      const current: EntryForm = { entry_type: entryType, plant_id: plantId, date, title, notes };
      // Only include keys that exist in EntryForm
      const suggestion: Partial<EntryForm> = {};
      if (fields.entry_type !== undefined) suggestion.entry_type = fields.entry_type;
      if (fields.plant_id   !== undefined) suggestion.plant_id   = fields.plant_id;
      if (fields.date       !== undefined) suggestion.date       = fields.date;
      if (fields.title      !== undefined) suggestion.title      = fields.title;
      if (fields.notes      !== undefined) suggestion.notes      = fields.notes;

      const { nextForm, nextMarked, prevValues } = applyAiSuggestions<EntryForm>(current, suggestion);
      setEntryType(nextForm.entry_type);
      setPlantId(nextForm.plant_id);
      setDate(nextForm.date);
      setTitle(nextForm.title);
      setNotes(nextForm.notes);
      setAiMarked((prev) => ({ ...prev, ...nextMarked }));
      setAiPrev((prev) => ({ ...prev, ...prevValues }));
    },
  }));

  /** Revert a single AI-suggested field to its previous value. */
  function revertAiField(key: keyof EntryForm) {
    const prev = aiPrev[key];
    if (key === "entry_type" && prev !== undefined) setEntryType(prev as JournalEntryType);
    if (key === "plant_id"   && prev !== undefined) setPlantId(prev as string);
    if (key === "date"       && prev !== undefined) setDate(prev as string);
    if (key === "title"      && prev !== undefined) setTitle(prev as string);
    if (key === "notes"      && prev !== undefined) setNotes(prev as string);
    setAiMarked((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setAiPrev((prev)   => { const n = { ...prev }; delete n[key]; return n; });
  }

  const aiSuggestionCount = Object.keys(aiMarked).length;

  // Schedules available for the selected plant (care types only)
  const selectedPlant = plantId ? plants.find((p) => p.id === plantId) ?? null : null;
  const availableSchedules: Schedule[] = selectedPlant
    ? selectedPlant.schedules.filter((s) => CARE_SCHEDULE_TYPES.has(s.schedule_type))
    : [];

  // Reset scheduleId and title when plant changes
  function handlePlantChange(newPlantId: string) {
    setPlantId(newPlantId);
    setScheduleId("");
    if (isNew) setTitle("");
  }

  // Build a title suggestion — just the task label (type + plant shown via UI already)
  function buildTitleSuggestion(
    _type: "done" | "skipped",
    schedule: Schedule,
    _plant: { name_common: string } | null,
  ): string {
    return schedule.label ?? tc(`schedule_type.${schedule.schedule_type}`) ?? tc("schedule_type.misc");
  }

  // Handle schedule selection — auto-fill title suggestion
  function handleScheduleChange(newScheduleId: string) {
    setScheduleId(newScheduleId);
    if (!isNew) return; // don't overwrite title in edit mode
    if (newScheduleId === "") {
      // Back to no schedule → reset to manual prefix
      setTitle("");
    } else {
      const schedule = availableSchedules.find((s) => s.id === newScheduleId);
      if (schedule) {
        const type = entryType === "skipped" ? "skipped" : "done";
        setTitle(buildTitleSuggestion(type, schedule, selectedPlant));
      }
    }
  }

  // When schedule is selected, restrict type to done/skipped;
  // when no schedule and type is done/skipped, use "manual" as effective type;
  // irrigation always stays as "irrigation" regardless of schedule state.
  const hasSchedule = scheduleId !== "";
  const effectiveType: JournalEntryType = entryType === "irrigation"
    ? "irrigation"
    : hasSchedule
      ? (entryType === "skipped" ? "skipped" : "done")
      : (entryType === "done" || entryType === "skipped") ? "manual"
      : entryType;
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  // Local files to upload (new) + existing attachment ids
  const [localFiles,    setLocalFiles]    = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [existingAttIds, setExistingAttIds] = useState<string[]>(entry?.attachment_ids ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fieldStyle: React.CSSProperties = {
    width:        "100%",
    background:   "var(--green-mist)",
    border:       "1.5px solid var(--border)",
    borderRadius: "8px",
    padding:      "8px 12px",
    fontSize:     "13px",
    fontFamily:   "var(--font-body)",
    color:        "var(--text-dark)",
    outline:      "none",
    boxSizing:    "border-box",
  };

  const aiFieldStyle: React.CSSProperties = {
    ...fieldStyle,
    background:  "#fff4e6",
    border:      "1.5px solid #e07b00",
    paddingLeft: "28px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize:      "10px",
    fontWeight:    700,
    letterSpacing: ".8px",
    textTransform: "uppercase",
    color:         "var(--text-light)",
    marginBottom:  "6px",
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (effectiveType === "irrigation" && isNew) {
        // Create one entry per selected zone
        const zonesToCreate = [...selectedZones];
        if (zonesToCreate.length === 0) {
          setError(t("panel.irrigation_zone_required"));
          setSaving(false);
          return;
        }
        await Promise.all(
          zonesToCreate.map((zone) =>
            apiClient.createJournalEntry({
              plant_id:       null,
              schedule_id:    null,
              week:           null,
              entry_type:     "irrigation",
              date,
              title:          zone,
              notes:          irrigationAmount.trim() || null,
              attachment_ids: [],
            })
          )
        );
      } else {
        // 1. Create or update a single journal entry
        const basePayload = {
          plant_id:       effectiveType === "irrigation" ? null : (plantId || null),
          schedule_id:    scheduleId || null,
          week:           null,
          entry_type:     effectiveType,
          date,
          title:          effectiveType === "irrigation"
            ? ([...selectedZones][0]?.trim() || null)
            : (title.trim() || null),
          notes:          effectiveType === "irrigation"
            ? (irrigationAmount.trim() || null)
            : (notes.trim() || null),
          attachment_ids: existingAttIds,
        };

        const saved = isNew
          ? await apiClient.createJournalEntry(basePayload)
          : await apiClient.updateJournalEntry(entry!.id, basePayload);

        // 2. Upload local files and collect new attachment ids
        if (localFiles.length > 0) {
          const uploaded = await Promise.all(
            localFiles.map((lf) =>
              apiClient.uploadAttachment("journal_entry", saved.id, {
                file:       lf.file,
                category:   null,
                updated_at: "",
              })
            )
          );
          const allAttIds = [...existingAttIds, ...uploaded.map((a) => a.id)];
          await apiClient.updateJournalEntry(saved.id, {
            ...basePayload,
            attachment_ids: allAttIds,
          });
        }
      }

      onSaved();
    } catch {
      setError(t("panel.save_error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    setSaving(true);
    setDeleteError(null);
    try {
      await apiClient.deleteJournalEntry(entry.id);
      onDeleted();
    } catch (err) {
      setDeleteError(t("actions.delete_error", { error: String(err) }));
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div style={{
        padding:        "16px 18px 12px",
        borderBottom:   "1px solid var(--border)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        flexShrink:     0,
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "var(--green-deep)", fontWeight: 600 }}>
          {isNew ? t("panel.new") : t("panel.edit")}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", fontSize: "16px" }}
          data-testid="panel-close"
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--red-soft)", border: "1px solid var(--red-warn)", fontSize: "12px", color: "var(--red-warn)" }}>
            {error}
          </div>
        )}



        {/* Type selector — all four types always visible.
            observation/problem are disabled when a schedule is selected
            (a schedule-linked entry is always done or skipped). */}
        <div>
          <div style={labelStyle}>{t("fields.entry_type")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {PANEL_TYPE_VALUES.map((typeVal) => {
              const tc = TYPE_COLOR[typeVal] ?? TYPE_COLOR.manual;
              const active = entryType === typeVal;
              // observation/problem make no sense when a schedule is selected
              const disabled = hasSchedule && (typeVal === "observation" || typeVal === "problem");
              // AI marker: highlight the active button when entry_type is AI-suggested
              const isAiActive = aiMarked.entry_type && active;
              return (
                <button
                  key={typeVal}
                  type="button"
                  data-testid={`panel-type-${typeVal}`}
                  onClick={() => {
                    if (disabled) return;
                    setAiMarked((p) => { const n={...p}; delete n.entry_type; return n; });
                    setEntryType(typeVal);
                    // Update title suggestion when done↔skipped changes with schedule selected
                    if (isNew && hasSchedule) {
                      const schedule = availableSchedules.find((s) => s.id === scheduleId);
                      if (schedule) {
                        const type = typeVal === "skipped" ? "skipped" : "done";
                        setTitle(buildTitleSuggestion(type, schedule, selectedPlant));
                      }
                    }
                  }}
                  style={{
                    padding:      "7px 8px",
                    borderRadius: "8px",
                    fontSize:     "11.5px",
                    fontWeight:   500,
                    border:       isAiActive
                      ? "1.5px solid #e07b00"
                      : active ? `1.5px solid ${tc.border}` : "1.5px solid var(--border)",
                    background:   isAiActive
                      ? "#fff4e6"
                      : active ? tc.bg : "none",
                    color:        active ? tc.text : disabled ? "var(--border)" : "var(--text-mid)",
                    cursor:       disabled ? "default" : "pointer",
                    fontFamily:   "var(--font-body)",
                    transition:   "all .15s",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "5px",
                    opacity:      disabled ? 0.35 : 1,
                    position:     "relative",
                  }}
                >
                  {isAiActive && <span aria-hidden="true" style={{ fontSize: "10px", color: "#e07b00" }}>✦</span>}
                  {t(`entry_type_badge.${typeVal}` as any)}
                  {isAiActive && (
                    <span
                      data-testid="ai-revert-entry_type"
                      onClick={(e) => { e.stopPropagation(); revertAiField("entry_type"); }}
                      style={{ marginLeft: "auto", cursor: "pointer", fontSize: "13px", color: "#e07b00", lineHeight: 1 }}
                      title={t("overview.ai_revert_title")}
                    >×</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Hint: done/skipped without schedule saves as manual entry */}
          {!hasSchedule && (entryType === "done" || entryType === "skipped") && (
            <div style={{ fontSize: "10.5px", color: "var(--text-light)", marginTop: "6px" }}>
              {t("panel.manual_hint")}
            </div>
          )}
        </div>

        {/* Plant picker — hidden for irrigation entries */}
        {entryType !== "irrigation" && <div>
          <div style={labelStyle}>{t("fields.plant")}</div>
          <div style={{ position: "relative" }}>
            {aiMarked.plant_id && (
              <span aria-hidden="true" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "#e07b00", zIndex: 1, pointerEvents: "none" }}>✦</span>
            )}
            <select
              value={plantId}
              onChange={(e) => { setAiMarked((p) => { const n={...p}; delete n.plant_id; return n; }); handlePlantChange(e.target.value); }}
              data-testid="panel-plant"
              style={{ ...(aiMarked.plant_id ? aiFieldStyle : fieldStyle), cursor: "pointer" }}
            >
              <option value="">{t("fields.plant_general")}</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon ?? "🌿"} {p.name_common}{p.location ? ` · ${p.location}` : ""}
                </option>
              ))}
            </select>
            {aiMarked.plant_id && (
              <button
                type="button"
                data-testid="ai-revert-plant_id"
                onClick={() => revertAiField("plant_id")}
                style={{ position: "absolute", right: "28px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#e07b00", fontSize: "13px", lineHeight: 1, padding: "2px" }}
                title={t("overview.ai_revert_title")}
              >×</button>
            )}
          </div>
        </div>}

        {/* Schedule picker — shown when a plant is selected and has care schedules (AC #1) */}
        {selectedPlant && availableSchedules.length > 0 && (
          <div>
            <div style={labelStyle}>{t("fields.schedule")}</div>
            <select
              value={scheduleId}
              onChange={(e) => handleScheduleChange(e.target.value)}
              data-testid="panel-schedule"
              style={{ ...fieldStyle, cursor: "pointer" }}
            >
              <option value="">{t("fields.schedule_none_manual")}</option>
              {availableSchedules.map((s) => {
                const icon = SCHEDULE_TYPE_ICON[s.schedule_type] ?? "📋";
                const label = s.label ?? t(`entry_type.${s.schedule_type}` as any, s.schedule_type);
                return (
                  <option key={s.id} value={s.id}>
                     {icon} {label} ({tc("week_abbr")}{s.start_week}–{s.end_week})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Date */}
        <div>
          <div style={labelStyle}>{t("fields.date")}</div>
          <div style={{ position: "relative" }}>
            {aiMarked.date && (
              <span aria-hidden="true" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "#e07b00", zIndex: 1, pointerEvents: "none" }}>✦</span>
            )}
            <input
              type="date"
              value={date}
              onChange={(e) => { setAiMarked((p) => { const n={...p}; delete n.date; return n; }); setDate(e.target.value); }}
              data-testid="panel-date"
              style={aiMarked.date ? aiFieldStyle : fieldStyle}
            />
            {aiMarked.date && (
              <button
                type="button"
                data-testid="ai-revert-date"
                onClick={() => revertAiField("date")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#e07b00", fontSize: "13px", lineHeight: 1, padding: "2px" }}
                title={t("overview.ai_revert_title")}
              >×</button>
            )}
          </div>
        </div>

        {/* Irrigation-specific fields: Zone + Amount (replaces Title + Notes) */}
        {entryType === "irrigation" ? (
          <>
            {/* Irrigation zone selector — checkboxes for multi-zone support */}
            <div>
              <div style={labelStyle}>{t("fields.irrigation_zones")}</div>
              {irrigationZones.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-light)", padding: "6px 0" }}>
                  {t("fields.irrigation_zones_empty")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {irrigationZones.map((z) => {
                    const checked = selectedZones.has(z);
                    return (
                      <label
                        key={z}
                        data-testid={`panel-irrigation-zone-${z}`}
                        style={{
                          display:      "flex",
                          alignItems:   "center",
                          gap:          "8px",
                          cursor:       isNew ? "pointer" : "default",
                          padding:      "6px 10px",
                          borderRadius: "8px",
                          border:       checked ? "1.5px solid #1a6fa8" : "1.5px solid var(--border)",
                          background:   checked ? "#e8f4fc" : "none",
                          fontSize:     "13px",
                          color:        checked ? "#1a6fa8" : "var(--text-dark)",
                          transition:   "all .15s",
                          fontFamily:   "var(--font-body)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!isNew}
                          onChange={() => {
                            if (!isNew) return;
                            setSelectedZones((prev) => {
                              const next = new Set(prev);
                              if (next.has(z)) next.delete(z); else next.add(z);
                              return next;
                            });
                          }}
                          style={{ accentColor: "#1a6fa8", width: "14px", height: "14px" }}
                        />
                        {z}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Irrigation amount in mm */}
            <div>
              <div style={labelStyle}>{t("fields.irrigation_amount")}</div>
              <input
                type="number"
                min="0"
                step="0.1"
                value={irrigationAmount}
                onChange={(e) => setIrrigationAmount(e.target.value)}
                placeholder={t("fields.irrigation_amount_placeholder")}
                data-testid="panel-irrigation-amount"
                style={fieldStyle}
              />
            </div>
          </>
        ) : (
          <>
            {/* Title */}
            <div>
              <div style={labelStyle}>{t("fields.title")}</div>
              <div style={{ position: "relative" }}>
                {aiMarked.title && (
                  <span aria-hidden="true" style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "#e07b00", zIndex: 1, pointerEvents: "none" }}>✦</span>
                )}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setAiMarked((p) => { const n={...p}; delete n.title; return n; }); setTitle(e.target.value); }}
                  placeholder={t("fields.title_placeholder")}
                  data-testid="panel-title"
                  style={aiMarked.title ? aiFieldStyle : fieldStyle}
                />
                {aiMarked.title && (
                  <button
                    type="button"
                    data-testid="ai-revert-title"
                    onClick={() => revertAiField("title")}
                    style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#e07b00", fontSize: "13px", lineHeight: 1, padding: "2px" }}
                    title={t("overview.ai_revert_title")}
                  >×</button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div style={labelStyle}>{t("fields.notes")}</div>
              <div style={{ position: "relative" }}>
                {aiMarked.notes && (
                  <span aria-hidden="true" style={{ position: "absolute", left: "9px", top: "10px", fontSize: "11px", color: "#e07b00", zIndex: 1, pointerEvents: "none" }}>✦</span>
                )}
                <textarea
                  value={notes}
                  onChange={(e) => { setAiMarked((p) => { const n={...p}; delete n.notes; return n; }); setNotes(e.target.value); }}
                  placeholder={t("fields.notes_placeholder")}
                  rows={4}
                  data-testid="panel-notes"
                  style={{
                    ...(aiMarked.notes ? aiFieldStyle : fieldStyle),
                    resize: "vertical", minHeight: "90px", lineHeight: "1.5",
                  }}
                />
                {aiMarked.notes && (
                  <button
                    type="button"
                    data-testid="ai-revert-notes"
                    onClick={() => revertAiField("notes")}
                    style={{ position: "absolute", right: "8px", top: "8px", background: "none", border: "none", cursor: "pointer", color: "#e07b00", fontSize: "13px", lineHeight: 1, padding: "2px" }}
                    title={t("overview.ai_revert_title")}
                  >×</button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Photo upload */}
        <div>
          <div style={labelStyle}>
            {t("fields.photos")}
            {(existingAttIds.length + localFiles.length) > 0 && (
              <span style={{ marginLeft: "6px", fontSize: "10px", background: "var(--green-mist)", color: "var(--text-mid)", padding: "1px 6px", borderRadius: "10px", fontWeight: 600 }}>
                {existingAttIds.length + localFiles.length}
              </span>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            style={{ display: "none" }}
            data-testid="panel-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
              setLocalFiles((prev) => [...prev, { file, previewUrl }]);
            }}
          />

          {/* Previews */}
          {(existingAttIds.length > 0 || localFiles.length > 0) && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
              {existingAttIds.map((id) => (
                <div key={id} style={{ position: "relative" }}>
                  <div style={{
                    width: "52px", height: "52px", borderRadius: "7px",
                    background: "var(--green-mist)", border: "1.5px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                  }}>📷</div>
                  <button
                    type="button"
                    onClick={() => setExistingAttIds((prev) => prev.filter((a) => a !== id))}
                    style={{
                      position: "absolute", top: "-4px", right: "-4px",
                      width: "16px", height: "16px", borderRadius: "50%",
                      background: "var(--red-warn)", color: "white", border: "none",
                      cursor: "pointer", fontSize: "9px", lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</button>
                </div>
              ))}
              {localFiles.map((lf, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <div style={{
                    width: "52px", height: "52px", borderRadius: "7px",
                    background: "var(--green-mist)", border: "1.5px solid var(--border)",
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                  }}>
                    {lf.previewUrl
                      ? <img src={lf.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "📄"
                    }
                  </div>
                  {/* "neu" badge */}
                  <span style={{
                    position: "absolute", bottom: "-2px", right: "-2px",
                    fontSize: "8px", fontWeight: 700, background: "var(--blue-mid)", color: "white",
                    padding: "1px 3px", borderRadius: "3px",
                  }}>{t("attachment.new_badge")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (lf.previewUrl) URL.revokeObjectURL(lf.previewUrl);
                      setLocalFiles((prev) => prev.filter((_, j) => j !== i));
                    }}
                    style={{
                      position: "absolute", top: "-4px", right: "-4px",
                      width: "16px", height: "16px", borderRadius: "50%",
                      background: "var(--red-warn)", color: "white", border: "none",
                      cursor: "pointer", fontSize: "9px", lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo button */}
          <button
            type="button"
            data-testid="panel-add-photo"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              background: "none", border: "1.5px dashed var(--border)", borderRadius: "8px",
              padding: "6px 10px", fontSize: "12px", fontWeight: 500,
              fontFamily: "var(--font-body)", color: "var(--text-light)",
              cursor: "pointer", width: "100%", transition: "all .15s",
            }}
            className="hover:border-green-mid hover:text-green-deep hover:bg-green-mist"
          >
            {t("fields.photos_add")}
          </button>
        </div>
      </div>

      {/* AI suggestions status bar — same design as PlantEditDialog */}
      {aiSuggestionCount > 0 && (
        <div
          data-testid="ai-suggestions-bar"
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "6px",
            padding:    "6px 18px",
            background: "#fff4e6",
            borderTop:  "1px solid #f0c080",
            fontSize:   "11px",
            color:      "#a05000",
            flexShrink: 0,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "13px" }}>✦</span>
          <span>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(t as any)(`ai_suggestions_${aiSuggestionCount === 1 ? "one" : "other"}`, { count: aiSuggestionCount })}
          </span>
        </div>
      )}

      {/* Actions — normal mode OR delete-confirm replaces the whole footer */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        {confirmDelete ? (
          /* Delete confirm replaces Abbrechen/Speichern entirely */
          <div
            data-testid="panel-delete-confirm"
            style={{
              background: "var(--red-soft)", border: "1px solid var(--red-warn)",
              borderRadius: "8px", padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--red-warn)" }}>
              {t("actions.delete_confirm_title")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-mid)" }}>
              {t("actions.delete_confirm_body")}
            </div>
            {deleteError && (
              <div style={{ fontSize: "11px", color: "var(--red-warn)" }}>{deleteError}</div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                data-testid="panel-delete-cancel"
                onClick={() => setConfirmDelete(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: "7px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer",
                  border: "1.5px solid var(--border)", background: "none", color: "var(--text-mid)",
                }}
              >
                {t("actions.delete_confirm_cancel")}
              </button>
              <button
                type="button"
                data-testid="panel-delete-ok"
                onClick={() => void handleDelete()}
                disabled={saving}
                style={{
                  flex: 1, padding: "7px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer",
                  background: "var(--red-warn)", color: "white", border: "1.5px solid var(--red-warn)",
                }}
              >
                {saving ? "…" : t("actions.delete_confirm_ok")}
              </button>
            </div>
          </div>
        ) : (
          /* Normal footer: Abbrechen + Speichern, plus delete link below */
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: 1, padding: "9px", borderRadius: "8px", fontSize: "13px",
                  fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer",
                  border: "1.5px solid var(--border)", background: "none", color: "var(--text-mid)",
                }}
              >
                {t("panel.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                data-testid="panel-save"
                style={{
                  flex: 1, padding: "9px", borderRadius: "8px", fontSize: "13px",
                  fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer",
                  border: "1.5px solid var(--green-deep)", background: "var(--green-deep)", color: "white",
                }}
              >
                <span>✓</span> {saving ? t("panel.saving") : t("panel.save")}
              </button>
            </div>
            {!isNew && (
              <button
                type="button"
                data-testid="panel-delete"
                onClick={() => { setDeleteError(null); setConfirmDelete(true); }}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "12px", color: "var(--red-warn)", fontFamily: "var(--font-body)",
                  textDecoration: "underline", textUnderlineOffset: "2px", alignSelf: "flex-start",
                }}
              >
                {t("actions.delete")}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
});

EntryPanel.displayName = "EntryPanel";
