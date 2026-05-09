/**
 * JournalView — story-035 + story-036.
 *
 * story-035: Timeline & Entry List
 * story-036: New Entry Panel & Edit
 */

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAiPanelState } from "@/hooks/useAiPanelState";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { apiClient } from "@/api/client";
import type { JournalEntry, JournalEntryType } from "@api/journal-entry";
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
};

const TYPE_LABEL: Record<string, string> = {
  done:        "Erledigt",
  skipped:     "Übersprungen",
  manual:      "Manuell",
  observation: "Beobachtung",
  problem:     "Problem",
};

const FILTER_CHIPS: Array<{ type: JournalEntryType; label: string }> = [
  { type: "done",        label: "✅ Erledigt"     },
  { type: "skipped",     label: "⏭ Übersprungen"  },
  { type: "observation", label: "👁 Beobachtung"  },
  { type: "problem",     label: "⚠️ Problem"       },
];

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

export function JournalView() {
  const { t } = useTranslation("journal");
  const { open: aiOpen } = useAiPanelState();
  const assistantSettings = useAssistantSettings();

  const [entries,      setEntries]      = useState<JournalEntry[]>([]);
  const [plants,       setPlants]       = useState<Plant[]>([]);
  const [garden,       setGarden]       = useState<Garden | null>(null);
  const [attachmentMap, setAttachmentMap] = useState<Map<string, Attachment>>(new Map());
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [activeType,   setActiveType]   = useState<JournalEntryType | null>(null);
  // Panel state: null=closed, undefined=new, JournalEntry=edit
  const [panelEntry, setPanelEntry] = useState<JournalEntry | null | undefined>(undefined);

  function loadGarden() {
    return apiClient.getGarden().then((g) => {
      setGarden(g);
      const sorted = [...g.journal_entries].sort((a, b) => b.date.localeCompare(a.date));
      setEntries(sorted);
      setPlants(g.plants);
      // Build attachment lookup: garden + journal_entry attachments
      const map = new Map<string, Attachment>();
      g.attachments.forEach((a) => map.set(a.id, a));
      setAttachmentMap(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { void loadGarden(); }, []);

  // Report AssistantContext to the shared AiPanel in App.tsx; clear on unmount
  const assistantContext = garden
    ? { view: "journal" as const, garden, settings: assistantSettings }
    : undefined;
  useEffect(() => {
    setAssistantContext(assistantContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, assistantSettings]);
  useEffect(() => () => setAssistantContext(undefined), []);

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
              placeholder="Suchen …"
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
            {FILTER_CHIPS.map(({ type, label }) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px 24px 48px", position: "relative" }}>
          {loading ? (
            <div style={{ color: "var(--text-light)", fontSize: "13px" }}>Wird geladen …</div>
          ) : groups.length === 0 ? (
            /* AC #5 — empty state */
            <div
              data-testid="journal-empty"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "var(--text-light)", fontSize: "13px", textAlign: "center", gap: "8px" }}
            >
              <span style={{ fontSize: "36px" }}>📔</span>
              <span>{search || activeType ? "Keine Einträge gefunden." : "Noch keine Einträge vorhanden."}</span>
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
            entry={panelEntry}
            plants={plants}
            onClose={() => setPanelEntry(undefined)}
            onSaved={() => {
              setPanelEntry(undefined);
              void loadGarden();
            }}
            onDeleted={() => {
              setPanelEntry(undefined);
              void loadGarden();
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
            right:          aiOpen ? "346px" : "60px", // shifts with AI panel (36px strip / 36+310px open)
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
            {colors.badge} {TYPE_LABEL[entry.entry_type] ?? entry.entry_type}
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
              title="Bearbeiten"
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

/** Panel form entry types (maps to API types) */
const PANEL_TYPES: Array<{ value: JournalEntryType; label: string; style: string }> = [
  { value: "done",        label: "✅ Erledigt",     style: "done"        },
  { value: "observation", label: "👁 Beobachtung",  style: "observation" },
  { value: "problem",     label: "⚠️ Problem",       style: "problem"     },
  { value: "skipped",     label: "⏭ Übersprungen",  style: "skipped"     },
];

type PanelTypeIdx = 0 | 1 | 2 | 3;

interface EntryPanelProps {
  entry:     JournalEntry | null;   // null = new entry
  plants:    Plant[];
  onClose:   () => void;
  onSaved:   () => void;
  onDeleted: () => void;
}

function EntryPanel({ entry, plants, onClose, onSaved, onDeleted }: EntryPanelProps) {
  const { t } = useTranslation("journal");
  const isNew = entry === null;

  // Determine initial type index from entry_type
  function entryTypeToIdx(type: JournalEntryType): PanelTypeIdx {
    if (type === "done")        return 0;
    if (type === "observation") return 1;
    if (type === "problem")     return 2;
    if (type === "skipped")     return 3;
    return 1; // manual → Beobachtung as default
  }

  const [typeIdx,    setTypeIdx]    = useState<PanelTypeIdx>(entry ? entryTypeToIdx(entry.entry_type) : 0);
  const [plantId,    setPlantId]    = useState<string>(entry?.plant_id ?? "");
  const [date,       setDate]       = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [title,      setTitle]      = useState(entry?.title ?? "");
  const [notes,      setNotes]      = useState(entry?.notes ?? "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);
  // Local files to upload (new) + existing attachment ids
  const [localFiles,    setLocalFiles]    = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [existingAttIds, setExistingAttIds] = useState<string[]>(entry?.attachment_ids ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = PANEL_TYPES[typeIdx];

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
    const apiType = selectedType.value;
    try {
      // 1. Create or update the journal entry
      const basePayload = {
        plant_id:       plantId || null,
        schedule_id:    null,
        week:           null,
        entry_type:     apiType,
        date,
        title:          title.trim() || null,
        notes:          notes.trim() || null,
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

      onSaved();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
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
          {isNew ? "Neuer Eintrag" : "Eintrag bearbeiten"}
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

        {/* Type selector */}
        <div>
          <div style={labelStyle}>Typ</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            {PANEL_TYPES.map((pt, i) => {
              const tc = TYPE_COLOR[pt.style] ?? TYPE_COLOR.manual;
              const active = typeIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  data-testid={`panel-type-${i}`}
                  onClick={() => setTypeIdx(i as PanelTypeIdx)}
                  style={{
                    padding:      "7px 8px",
                    borderRadius: "8px",
                    fontSize:     "11.5px",
                    fontWeight:   500,
                    border:       active ? `1.5px solid ${tc.border}` : "1.5px solid var(--border)",
                    background:   active ? tc.bg : "none",
                    color:        active ? tc.text : "var(--text-mid)",
                    cursor:       "pointer",
                    fontFamily:   "var(--font-body)",
                    transition:   "all .15s",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "5px",
                    ...(i === 3 ? { gridColumn: "1/-1" } : {}),
                  }}
                >
                  {pt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plant picker */}
        <div>
          <div style={labelStyle}>Pflanze / Bezug</div>
          <select
            value={plantId}
            onChange={(e) => setPlantId(e.target.value)}
            data-testid="panel-plant"
            style={{ ...fieldStyle, cursor: "pointer" }}
          >
            <option value="">🌿 Garten (allgemein)</option>
            {plants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon ?? "🌿"} {p.name_common}{p.location ? ` · ${p.location}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <div style={labelStyle}>Datum</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            data-testid="panel-date"
            style={fieldStyle}
          />
        </div>

        {/* Title */}
        <div>
          <div style={labelStyle}>Titel</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kurze Beschreibung …"
            data-testid="panel-title"
            style={fieldStyle}
          />
        </div>

        {/* Notes */}
        <div>
          <div style={labelStyle}>Notizen</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Details, Beobachtungen …"
            rows={4}
            data-testid="panel-notes"
            style={{ ...fieldStyle, resize: "vertical", minHeight: "90px", lineHeight: "1.5" }}
          />
        </div>

        {/* Photo upload */}
        <div>
          <div style={labelStyle}>
            Fotos
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
                  }}>neu</span>
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
            ＋ Foto hinzufügen
          </button>
        </div>
      </div>

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
                <span>✕</span> Abbrechen
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
                <span>✓</span> {saving ? "…" : "Speichern"}
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
}
