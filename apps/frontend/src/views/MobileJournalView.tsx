/**
 * MobileJournalView — story-086.
 *
 * Chronological timeline of garden journal entries grouped by month.
 * Supports filtering by entry type and full-text search.
 * New entries created via an in-flow sheet above the bottom nav.
 *
 * Reuses MobileParts for BottomNav, LeftDrawer, ChatPanel.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle, Plus, X, Search, ChevronDown, Pencil, Trash2, ImagePlus, Camera } from "lucide-react";
import type { Garden } from "@api/garden";
import type { JournalEntry, JournalEntryType } from "@api/journal-entry";
import type { Plant } from "@api/plant";
import type { Attachment } from "@api/attachment";
import { apiClient } from "@/api/client";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { topBtnStyle, BottomNav, LeftDrawer, ChatPanel } from "@/components/mobile/MobileParts";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Dot color per entry type (AC #6). */
const TYPE_DOT: Record<string, string> = {
  done:        "#27ae60",
  observation: "#4a78c0",
  problem:     "#c0392b",
  irrigation:  "#1d9e75",
  manual:      "#4a78c0",
  skipped:     "#7f8c8d",
};

/** Badge background + text color per entry type. */
const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  done:        { bg: "#eef4eb", color: "#2d4a2d"  },
  observation: { bg: "#e8f0fb", color: "#185fa5"  },
  problem:     { bg: "#fdf0ee", color: "#c0392b"  },
  irrigation:  { bg: "#e1f5ee", color: "#0f6e56"  },
  manual:      { bg: "#e8f0fb", color: "#185fa5"  },
  skipped:     { bg: "#f4f6f7", color: "#7f8c8d"  },
};

/** Filter chips shown in the UI (ordered as per mockup). */
const FILTER_CHIPS: Array<{ type: JournalEntryType; labelKey: string }> = [
  { type: "done",        labelKey: "journal_type_done"        },
  { type: "observation", labelKey: "journal_type_observation" },
  { type: "problem",     labelKey: "journal_type_problem"     },
  { type: "irrigation",  labelKey: "journal_type_irrigation"  },
  { type: "manual",      labelKey: "journal_type_manual"      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric", month: "long",
  });
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string, locale: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    month: "long", year: "numeric",
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns true once it's confirmed that a videoinput device is available. */
function useHasCamera(): boolean {
  const [hasCamera, setHasCamera] = useState(false);
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setHasCamera(devices.some((d) => d.kind === "videoinput"));
    }).catch(() => { /* ignore — no camera */ });
  }, []);
  return hasCamera;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// TopBar — AC #1
function TopBar({
  newOpen,
  chatOpen,
  onMenuClick,
  onAddClick,
  onChatClick,
}: {
  newOpen:     boolean;
  chatOpen:    boolean;
  onMenuClick: () => void;
  onAddClick:  () => void;
  onChatClick: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      data-testid="mobile-journal-topbar"
      style={{
        background: "#2d4a2d",
        display:    "flex",
        alignItems: "center",
        padding:    "0 10px",
        height:     "44px",
        gap:        "4px",
        flexShrink: 0,
      }}
    >
      <button
        data-testid="mobile-journal-hamburger"
        aria-label="Menü öffnen"
        onClick={onMenuClick}
        style={topBtnStyle}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#fff", fontWeight: 600, flex: 1 }}>
        {t("mobile.journal")}
      </div>

      {/* + / ✕ toggle */}
      <button
        data-testid="mobile-journal-add-btn"
        aria-label={newOpen ? t("mobile.journal_cancel") : t("mobile.journal_new_entry")}
        onClick={onAddClick}
        style={{
          ...topBtnStyle,
          background: newOpen ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.15)",
        }}
      >
        {newOpen
          ? <X    size={20} strokeWidth={1.5} />
          : <Plus size={20} strokeWidth={1.5} />
        }
      </button>

      {/* Chat */}
      <button
        data-testid="mobile-journal-chat-btn"
        aria-label={t("ai.panel_label")}
        onClick={onChatClick}
        style={{
          ...topBtnStyle,
          background: chatOpen ? "rgba(255,255,255,.30)" : "rgba(255,255,255,.15)",
          position:   "relative",
        }}
      >
        <MessageCircle size={20} strokeWidth={1.5} />
        {!chatOpen && (
          <span style={{
            position: "absolute", top: "5px", right: "5px",
            width: "7px", height: "7px", borderRadius: "50%",
            background: "#7aab6a", border: "1.5px solid #2d4a2d",
          }} />
        )}
      </button>
    </div>
  );
}

// SearchArea — AC #2, #3
function SearchArea({
  search,
  onSearch,
  activeFilter,
  onFilterChange,
}: {
  search:         string;
  onSearch:       (v: string) => void;
  activeFilter:   JournalEntryType | null;
  onFilterChange: (t: JournalEntryType | null) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div style={{ padding: "6px 12px 7px", flexShrink: 0 }}>
      {/* Search pill */}
      <div
        data-testid="mobile-journal-search"
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "5px",
          background:   "#dde8d8",
          borderRadius: "20px",
          padding:      "2px 10px",
          marginBottom: "7px",
        }}
      >
        <Search size={13} strokeWidth={1.5} color="#4a5e4a" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("mobile.journal_search_placeholder")}
          style={{
            border:      "none",
            outline:     "none",
            boxShadow:   "none",
            background:  "transparent",
            fontSize: "12px",
            color:       "#1e2e1e",
            fontFamily:  "var(--font-body)",
            flex:        1,
            padding:     "3px 0",
          }}
        />
      </div>

      {/* Filter chips */}
      <div
        data-testid="mobile-journal-chips"
        style={{
          display:         "flex",
          gap:             "5px",
          overflowX:       "auto",
          scrollbarWidth:  "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        {FILTER_CHIPS.map(({ type, labelKey }) => {
          const isActive = activeFilter === type;
          return (
            <button
              key={type}
              data-testid={`mobile-journal-chip-${type}`}
              onClick={() => onFilterChange(isActive ? null : type)}
              style={{
                fontSize: "10px",
                padding:      "3px 9px",
                borderRadius: "20px",
                border:       `1px solid ${isActive ? "#2d4a2d" : "#c8dfc0"}`,
                background:   isActive ? "#2d4a2d" : "#eef4eb",
                color:        isActive ? "#fff" : "#4a5e4a",
                cursor:       "pointer",
                whiteSpace:   "nowrap",
                flexShrink:   0,
                transition:   "all .15s",
                fontFamily:   "var(--font-body)",
              }}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {t(`mobile.${labelKey}` as any)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Single entry card — AC #5
function EntryCard({
  entry,
  plantName,
  plantLocation,
  onEdit,
  attachmentMap,
}: {
  entry:         JournalEntry;
  plantName:     string | null;
  plantLocation: string | null;
  onEdit:        (entry: JournalEntry) => void;
  attachmentMap: Map<string, Attachment>;
}) {
  const { t, i18n } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);

  // Align with desktop TYPE_COLOR palette
  const COLORS: Record<string, { border: string; bg: string; text: string }> = {
    done:        { border: "#27ae60", bg: "#edfaf3", text: "#27ae60" },
    skipped:     { border: "#7f8c8d", bg: "#f4f6f7", text: "#7f8c8d" },
    manual:      { border: "#4a78c0", bg: "#eef3fb", text: "#4a78c0" },
    observation: { border: "#4a78c0", bg: "#eef3fb", text: "#4a78c0" },
    problem:     { border: "#c0392b", bg: "#fdf0ee", text: "#c0392b" },
    irrigation:  { border: "#1a6fa8", bg: "#e8f4fc", text: "#1a6fa8" },
  };
  const colors = COLORS[entry.entry_type] ?? COLORS.manual;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeLabel    = t(`mobile.journal_type_${entry.entry_type}` as any, entry.entry_type);
  const typeIcon     = [...typeLabel][0] ?? typeLabel;   // first grapheme = emoji
  const displayTitle = entry.title ?? typeLabel;
  const displayPlant = plantName ?? t("mobile.journal_garden_general");
  const dateStr      = formatDate(entry.date, i18n.language);

  return (
    <div
      data-testid="mobile-journal-entry"
      style={{ position: "relative", padding: "8px 0 4px 14px", cursor: "pointer" }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Timeline dot */}
      <div style={{
        position:     "absolute",
        left:         "-9px",
        top:          "14px",
        width:        "10px",
        height:       "10px",
        borderRadius: "50%",
        background:   colors.border,
        border:       "2px solid #f8f4ee",
        zIndex:       1,
      }} />

      {/* Card — left colour bar + warm-white background, matches desktop */}
      <div
        data-testid="mobile-journal-card"
        style={{
          background:   "var(--warm-white)",
          borderRadius: "10px",
          border:       "1px solid var(--border)",
          borderLeft:   `4px solid ${colors.border}`,
          overflow:     "hidden",
          transition:   "border-color .15s",
        }}
      >
        {/* Header — single row: badge | title | plant pill | date | chevron */}
        <div style={{
          padding:    "8px 10px",
          display:    "flex",
          alignItems: "center",
          gap:        "6px",
        }}>
          {/* Type icon badge — icon only, label shown in filter chips above */}
          <span style={{
            fontSize: "13px",
            padding:      "1px 5px",
            borderRadius: "8px",
            flexShrink:   0,
            background:   colors.bg,
            lineHeight:   1.4,
          }}>
            {typeIcon}
          </span>

          {/* Title — takes remaining space, truncates */}
          <span style={{
            fontSize: "12px",
            fontWeight:   500,
            color:        "var(--text-dark, #1e2e1e)",
            flex:         1,
            minWidth:     0,
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {displayTitle}
          </span>

          {/* Plant pill */}
          <span style={{
            fontSize: "10px",
            color:        "var(--text-light, #4a5e4a)",
            background:   "var(--green-mist, #eef4eb)",
            borderRadius: "10px",
            padding:      "1px 6px",
            flexShrink:   0,
            whiteSpace:   "nowrap",
            maxWidth:     "90px",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}>
            {displayPlant}
          </span>

          {/* Location pill — only when present */}
          {plantLocation && (
            <span style={{
              fontSize: "10px",
              color:        "var(--text-light, #6a7e6a)",
              background:   "#f0f4f0",
              borderRadius: "10px",
              padding:      "1px 6px",
              flexShrink:   0,
              whiteSpace:   "nowrap",
              maxWidth:     "80px",
              overflow:     "hidden",
              textOverflow: "ellipsis",
            }}>
              {plantLocation}
            </span>
          )}

          {/* Date */}
          <span style={{
            fontSize: "10px",
            color:      "var(--text-light, #8a9e8a)",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}>
            {dateStr}
          </span>

          {/* Chevron */}
          <span style={{
            color:      "var(--text-light, #8a9e8a)",
            flexShrink: 0,
            transition: "transform .2s",
            transform:  expanded ? "rotate(180deg)" : "none",
            display:    "flex",
          }}>
            <ChevronDown size={14} strokeWidth={1.5} />
          </span>
        </div>

        {/* Expanded body — AC #5, #7 */}
        {expanded && (
          <div
            data-testid="mobile-journal-entry-body"
            style={{ padding: "0 10px 10px", borderTop: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Notes */}
            {entry.notes && (
              <div style={{ fontSize: "11px", color: "#4a5e4a", lineHeight: 1.5, margin: "8px 0" }}>
                {entry.notes}
              </div>
            )}

            {/* Irrigation detail — zone (title) + mm (notes already shown above) — AC #7 */}
            {entry.entry_type === "irrigation" && entry.title && (
              <div style={{ fontSize: "11px", color: "#0f6e56", marginTop: "4px" }}>
                📍 {entry.title}{entry.notes ? ` · ${entry.notes} mm` : ""}
              </div>
            )}

            {/* Existing attachment thumbnails */}
            {entry.attachment_ids.length > 0 && (
              <div style={{ display: "flex", gap: "5px", marginTop: "8px", flexWrap: "wrap" }}>
                {entry.attachment_ids.map((id) => {
                  const att = attachmentMap.get(id);
                  return (
                    <div key={id} style={{
                      width: "52px", height: "52px", borderRadius: "7px",
                      background: "#eef4eb", border: "1px solid #dde8d8",
                      overflow: "hidden", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px",
                    }}>
                      {att?.attachment_type === "image" && att.url ? (
                        <img src={att.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : att?.attachment_type === "pdf" ? "📄" : "📷"}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions row */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                data-testid="mobile-journal-entry-edit-btn"
                onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "4px",
                  fontSize: "11px",
                  padding:      "4px 10px",
                  borderRadius: "20px",
                  border:       "1px solid #dde8d8",
                  background:   "#fff",
                  color:        "#4a5e4a",
                  cursor:       "pointer",
                  fontFamily:   "var(--font-body)",
                }}
              >
                <Pencil size={11} strokeWidth={1.5} />
                {t("mobile.journal_edit")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Month group
function MonthGroup({
  monthKey: mk,
  entries,
  plants,
  locale,
  onEdit,
  attachmentMap,
}: {
  monthKey:      string;
  entries:       JournalEntry[];
  plants:        Plant[];
  locale:        string;
  onEdit:        (entry: JournalEntry) => void;
  attachmentMap: Map<string, Attachment>;
}) {
  const plantMap = useMemo(() => {
    const m = new Map<string, { name: string; location: string | null }>();
    for (const p of plants) m.set(p.id, { name: `${p.icon ?? "🌿"} ${p.name_common}`, location: p.location ?? null });
    return m;
  }, [plants]);

  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{
        fontFamily:   "var(--font-display)",
        fontSize: "14px",
        fontWeight:   600,
        color:        "#1e2e1e",
        padding:      "10px 0 6px",
        borderBottom: "1px solid #dde8d8",
      }}>
        {monthLabel(mk, locale)}
      </div>

      {/* Timeline */}
      <div style={{ paddingLeft: "16px", position: "relative" }}>
        {/* Vertical line */}
        <div style={{
          position:   "absolute",
          left:       "7px",
          top:        0,
          bottom:     0,
          width:      "2px",
          background: "#dde8d8",
        }} />

        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            plantName={entry.plant_id ? (plantMap.get(entry.plant_id)?.name ?? null) : null}
            plantLocation={entry.plant_id ? (plantMap.get(entry.plant_id)?.location ?? null) : null}
            onEdit={onEdit}
            attachmentMap={attachmentMap}
          />
        ))}
      </div>
    </div>
  );
}

// New-entry sheet — AC #9
const fieldStyle: React.CSSProperties = {
  width:        "100%",
  fontSize: "12px",
  padding:      "7px 10px",
  border:       "1.5px solid #dde8d8",
  borderRadius: "8px",
  outline:      "none",
  fontFamily:   "var(--font-body)",
  color:        "#1e2e1e",
  boxSizing:    "border-box",
};

const photoPickerBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "5px",
  fontSize: "11px", padding: "5px 10px", borderRadius: "20px",
  border: "1px dashed #8a9e8a", background: "#fff",
  color: "#4a5e4a", cursor: "pointer", fontFamily: "var(--font-body)",
};

function NewEntrySheet({
  open,
  onClose,
  plants,
  irrigationZones,
  onSaved,
}: {
  open:            boolean;
  onClose:         () => void;
  plants:          Plant[];
  irrigationZones: string[];
  onSaved:         () => void;
}) {
  const { t } = useTranslation("common");
  const { t: tj } = useTranslation("journal");

  const [entryType,      setEntryType]      = useState<JournalEntryType>("done");
  const [title,          setTitle]          = useState("");
  const [plantId,        setPlantId]        = useState<string>("");
  const [scheduleId,     setScheduleId]     = useState<string>("");
  const [notes,          setNotes]          = useState("");
  const [date,           setDate]           = useState(today());
  const [selectedZones,  setSelectedZones]  = useState<Set<string>>(new Set());
  const [irrigAmount,    setIrrigAmount]    = useState("");
  const [saving,         setSaving]         = useState(false);
  const [localFiles,     setLocalFiles]     = useState<Array<{ file: File; previewUrl: string }>>([]);
  const newFileInputRef    = useRef<HTMLInputElement>(null);
  const newCameraInputRef  = useRef<HTMLInputElement>(null);
  const hasCamera          = useHasCamera();

  function stageFile(file: File) {
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setLocalFiles((prev) => [...prev, { file, previewUrl }]);
  }

  const isIrrigation  = entryType === "irrigation";
  const isDoneSkipped = entryType === "done" || entryType === "skipped";

  // Schedules available for the selected plant (care types only)
  const CARE_SCHEDULE_TYPES = new Set(["pruning", "fertilization", "misc"]);
  const SCHEDULE_TYPE_ICON: Record<string, string> = { pruning: "✂️", fertilization: "💧", misc: "📋" };
  const selectedPlant      = plantId ? plants.find((p) => p.id === plantId) ?? null : null;
  const availableSchedules = selectedPlant
    ? selectedPlant.schedules.filter((s) => CARE_SCHEDULE_TYPES.has(s.schedule_type))
    : [];
  const hasSchedule = scheduleId !== "";

  // Derived entry type: done/skipped without a schedule → "manual"
  const effectiveType: JournalEntryType = isIrrigation
    ? "irrigation"
    : hasSchedule
      ? (entryType === "skipped" ? "skipped" : "done")
      : isDoneSkipped ? "manual"
      : entryType;

  function handlePlantChange(newPlantId: string) {
    setPlantId(newPlantId);
    setScheduleId("");
    setTitle("");
  }

  function handleScheduleChange(newScheduleId: string) {
    setScheduleId(newScheduleId);
    if (newScheduleId === "") {
      setTitle("");
    } else {
      const schedule = availableSchedules.find((s) => s.id === newScheduleId);
      if (schedule) setTitle(schedule.label ?? schedule.schedule_type);
    }
  }

  const NEW_ENTRY_TYPES: Array<{ type: JournalEntryType; labelKey: string }> = [
    { type: "done",        labelKey: "journal_type_done"        },
    { type: "skipped",     labelKey: "journal_type_skipped"     },
    { type: "observation", labelKey: "journal_type_observation" },
    { type: "problem",     labelKey: "journal_type_problem"     },
    { type: "irrigation",  labelKey: "journal_type_irrigation"  },
  ];

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (isIrrigation) {
        // Irrigation: one entry per zone (same as desktop), or one combined entry
        // if no zones configured. title = zone name, notes = amount in mm.
        const zones = selectedZones.size > 0
          ? [...selectedZones]
          : (irrigationZones.length > 0 ? [] : [""]);

        if (zones.length === 0 && irrigationZones.length > 0) {
          // No zone selected — skip save (validation)
          setSaving(false);
          return;
        }

        if (zones.length === 0) {
          // No zones configured — save single general entry
          await apiClient.createJournalEntry({
            plant_id: null, schedule_id: null, week: null,
            entry_type:     "irrigation",
            date,
            title:          null,
            notes:          irrigAmount.trim() || null,
            attachment_ids: [],
          });
        } else {
          // One entry per selected zone (mirrors desktop behaviour)
          for (const zone of zones) {
            await apiClient.createJournalEntry({
              plant_id: null, schedule_id: null, week: null,
              entry_type:     "irrigation",
              date,
              title:          zone,
              notes:          irrigAmount.trim() || null,
              attachment_ids: [],
            });
          }
        }
      } else {
        const saved = await apiClient.createJournalEntry({
          plant_id:       plantId || null,
          schedule_id:    scheduleId || null,
          week:           null,
          entry_type:     effectiveType,
          date,
          title:          title.trim() || null,
          notes:          notes.trim() || null,
          attachment_ids: [],
        });
        if (localFiles.length > 0) {
          const uploaded = await Promise.all(
            localFiles.map((lf) =>
              apiClient.uploadAttachment("journal_entry", saved.id, {
                file: lf.file, category: null, updated_at: "",
              })
            )
          );
          await apiClient.updateJournalEntry(saved.id, {
            plant_id:       saved.plant_id,
            schedule_id:    saved.schedule_id,
            week:           saved.week,
            entry_type:     saved.entry_type,
            date:           saved.date,
            title:          saved.title,
            notes:          saved.notes,
            attachment_ids: uploaded.map((a) => a.id),
          });
        }
      }
      // Reset form
      setTitle(""); setNotes(""); setPlantId(""); setScheduleId(""); setEntryType("done");
      setDate(today()); setSelectedZones(new Set()); setIrrigAmount(""); setLocalFiles([]);
      onSaved();
      onClose();
    } catch {
      // Silently ignore — user can retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      data-testid="mobile-journal-new-sheet"
      style={{
        flexShrink:    0,
        height:        open ? "auto" : "0",
        maxHeight:     open ? "70vh" : "0",
        overflow:      "hidden",
        transition:    "max-height .25s ease",
        background:    "#fff",
        borderTop:     open ? "2px solid #8b6f47" : "none",
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{
        padding:      "8px 12px 7px",
        borderBottom: "1px solid #dde8d8",
        display:      "flex",
        alignItems:   "center",
        gap:          "6px",
        flexShrink:   0,
      }}>
        <span style={{ fontSize: "17px", color: "#8b6f47" }}>✏️</span>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e2e1e", flex: 1 }}>
          {t("mobile.journal_new_entry")}
        </div>
        <button
          data-testid="mobile-journal-sheet-close"
          onClick={onClose}
          aria-label={t("mobile.journal_cancel")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", background: "none", border: "none", cursor: "pointer", color: "#8a9e8a", padding: 0, borderRadius: "50%" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px", minHeight: 0 }}>
        {/* Type selector */}
        <div data-testid="mobile-journal-type-select" style={{ display: "flex", gap: "5px", overflowX: "auto", flexShrink: 0, paddingBottom: "2px" }}>
          {NEW_ENTRY_TYPES.map(({ type, labelKey }) => (
            <button
              key={type}
              data-testid={`mobile-journal-type-${type}`}
              onClick={() => setEntryType(type)}
              style={{
                fontSize: "11px",
                padding:      "4px 9px",
                borderRadius: "20px",
                border:       `1px solid ${entryType === type ? "#2d4a2d" : "#dde8d8"}`,
                background:   entryType === type ? "#2d4a2d" : "#fff",
                color:        entryType === type ? "#fff" : "#4a5e4a",
                cursor:       "pointer",
                transition:   "all .15s",
                fontFamily:   "var(--font-body)",
                flexShrink:   0,
                whiteSpace:   "nowrap",
              }}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {t(`mobile.${labelKey}` as any)}
            </button>
          ))}
        </div>

        {isIrrigation ? (
          <>
            {/* Irrigation amount in mm — first */}
            <input
              data-testid="mobile-journal-irrig-amount"
              type="number"
              min="0"
              step="0.1"
              value={irrigAmount}
              onChange={(e) => setIrrigAmount(e.target.value)}
              placeholder={tj("fields.irrigation_amount_placeholder")}
              style={fieldStyle}
            />

            {/* Irrigation zones — 2-per-row grid */}
            {irrigationZones.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#8a9e8a" }}>
                {tj("fields.irrigation_zones_empty")}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                {irrigationZones.map((z) => {
                  const checked = selectedZones.has(z);
                  return (
                    <label
                      key={z}
                      data-testid={`mobile-journal-zone-${z}`}
                      style={{
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "6px",
                        cursor:       "pointer",
                        padding:      "5px 8px",
                        borderRadius: "8px",
                        border:       `1.5px solid ${checked ? "#1d9e75" : "#dde8d8"}`,
                        background:   checked ? "#e1f5ee" : "#fff",
                        fontSize: "12px",
                        color:        checked ? "#0f6e56" : "#1e2e1e",
                        transition:   "all .15s",
                        fontFamily:   "var(--font-body)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedZones((prev) => {
                          const next = new Set(prev);
                          if (next.has(z)) next.delete(z); else next.add(z);
                          return next;
                        })}
                        style={{ accentColor: "#1d9e75", width: "13px", height: "13px", flexShrink: 0 }}
                      />
                      {z}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Date — last for irrigation */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={fieldStyle}
            />
          </>
        ) : (
          <>
            {/* Date — first for non-irrigation */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={fieldStyle}
            />

            {/* Plant picker */}
            <select
              data-testid="mobile-journal-plant-select"
              value={plantId}
              onChange={(e) => handlePlantChange(e.target.value)}
              style={{ ...fieldStyle, background: "#fff" }}
            >
              <option value="">{t("mobile.journal_garden_general")}</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon ?? "🌿"} {p.name_common}{p.location ? ` · ${p.location}` : ""}
                </option>
              ))}
            </select>

            {/* Schedule picker — only for done/skipped when a plant with care schedules is selected */}
            {isDoneSkipped && selectedPlant && availableSchedules.length > 0 && (
              <select
                data-testid="mobile-journal-schedule-select"
                value={scheduleId}
                onChange={(e) => handleScheduleChange(e.target.value)}
                style={{ ...fieldStyle, background: "#fff" }}
              >
                <option value="">{tj("fields.schedule_none_manual")}</option>
                {availableSchedules.map((s) => {
                  const icon  = SCHEDULE_TYPE_ICON[s.schedule_type] ?? "📋";
                  const label = s.label ?? s.schedule_type;
                  return (
                    <option key={s.id} value={s.id}>
                      {icon} {label} (KW{s.start_week}–{s.end_week})
                    </option>
                  );
                })}
              </select>
            )}

            {/* Title */}
            <input
              data-testid="mobile-journal-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("mobile.journal_title_placeholder")}
              style={fieldStyle}
            />

            {/* Notes */}
            <textarea
              data-testid="mobile-journal-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("mobile.journal_notes_placeholder")}
              rows={2}
              style={{ ...fieldStyle, resize: "none" }}
            />
          </>
        )}

        {/* ── Photos section ── */}
        <div>
          {localFiles.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
              {localFiles.map((lf, i) => (
                <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: "52px", height: "52px", borderRadius: "8px",
                    background: "#eef4eb", border: "1.5px dashed #1d9e75",
                    overflow: "hidden", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "20px",
                  }}>
                    {lf.previewUrl
                      ? <img src={lf.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "📄"}
                  </div>
                  <button
                    onClick={() => setLocalFiles((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      position: "absolute", top: "-5px", right: "-5px",
                      width: "16px", height: "16px", borderRadius: "50%",
                      background: "#c0392b", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}
                    aria-label="remove"
                  >
                    <X size={9} strokeWidth={2.5} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              data-testid="mobile-journal-add-photo"
              onClick={() => newFileInputRef.current?.click()}
              style={photoPickerBtnStyle}
            >
              <ImagePlus size={12} strokeWidth={1.5} />
              {t("mobile.journal_add_photo")}
            </button>
            {hasCamera && (
              <button
                data-testid="mobile-journal-add-photo-camera"
                onClick={() => newCameraInputRef.current?.click()}
                style={photoPickerBtnStyle}
              >
                <Camera size={12} strokeWidth={1.5} />
                {t("mobile.journal_take_photo")}
              </button>
            )}
          </div>
          <input
            ref={newFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ""; stageFile(f); }}
          />
          <input
            ref={newCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ""; stageFile(f); }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding:         "7px 12px",
        borderTop:       "1px solid #dde8d8",
        display:         "flex",
        gap:             "6px",
        justifyContent:  "flex-end",
        flexShrink:      0,
      }}>
        <button
          onClick={onClose}
          style={{ fontSize: "11px", padding: "5px 14px", background: "#fff", color: "#8a9e8a", border: "1px solid #dde8d8", borderRadius: "20px", cursor: "pointer" }}
        >
          {t("mobile.journal_cancel")}
        </button>
        <button
          data-testid="mobile-journal-save-btn"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ fontSize: "11px", padding: "5px 14px", background: "#2d4a2d", color: "#fff", border: "none", borderRadius: "20px", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {t("mobile.journal_save")}
        </button>
      </div>
    </div>
  );
}

// ── Edit entry sheet ───────────────────────────────────────────────────────────

function EditEntrySheet({
  entry,
  plants,
  irrigationZones,
  attachmentMap,
  onClose,
  onSaved,
  onDeleted,
}: {
  entry:           JournalEntry;
  plants:          Plant[];
  irrigationZones: string[];
  attachmentMap:   Map<string, Attachment>;
  onClose:         () => void;
  onSaved:         () => void;
  onDeleted:       () => void;
}) {
  const { t }  = useTranslation("common");
  const { t: tj } = useTranslation("journal");

  // Pre-fill from existing entry
  const [title,         setTitle]         = useState(entry.title ?? "");
  const [notes,         setNotes]         = useState(entry.notes ?? "");
  const [date,          setDate]          = useState(entry.date);
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  // Attachment state
  const [existingAttIds, setExistingAttIds] = useState<string[]>(entry.attachment_ids);
  const [localFiles,     setLocalFiles]     = useState<Array<{ file: File; previewUrl: string }>>([]);
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const cameraInputRef     = useRef<HTMLInputElement>(null);
  const hasCamera          = useHasCamera();

  function stageFile(file: File) {
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    setLocalFiles((prev) => [...prev, { file, previewUrl }]);
  }

  // Irrigation state (pre-fill from entry)
  const isIrrigation   = entry.entry_type === "irrigation";
  const [irrigAmount,  setIrrigAmount]  = useState(() =>
    isIrrigation ? (entry.notes ?? "") : ""
  );
  const [selectedZones, setSelectedZones] = useState<Set<string>>(() =>
    isIrrigation && entry.title ? new Set(entry.title.split(",").map((z) => z.trim())) : new Set()
  );

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const basePayload = isIrrigation ? {
        plant_id:       entry.plant_id,
        schedule_id:    entry.schedule_id,
        week:           entry.week,
        entry_type:     entry.entry_type,
        attachment_ids: existingAttIds,
        date,
        title:  selectedZones.size > 0 ? [...selectedZones].join(",") : null,
        notes:  irrigAmount.trim() || null,
      } : {
        plant_id:       entry.plant_id,
        schedule_id:    entry.schedule_id,
        week:           entry.week,
        entry_type:     entry.entry_type,
        attachment_ids: existingAttIds,
        date,
        title:  title.trim() || null,
        notes:  notes.trim() || null,
      };

      const saved = await apiClient.updateJournalEntry(entry.id, basePayload);

      if (localFiles.length > 0) {
        const uploaded = await Promise.all(
          localFiles.map((lf) =>
            apiClient.uploadAttachment("journal_entry", saved.id, {
              file: lf.file, category: null, updated_at: "",
            })
          )
        );
        await apiClient.updateJournalEntry(saved.id, {
          ...basePayload,
          attachment_ids: [...existingAttIds, ...uploaded.map((a) => a.id)],
        });
      }

      onSaved();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving) return;
    setSaving(true);
    setDeleteError(null);
    try {
      await apiClient.deleteJournalEntry(entry.id);
      onDeleted();
    } catch (err) {
      setDeleteError(String(err));
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Overlay backdrop */
    <div
      data-testid="mobile-journal-edit-overlay"
      onClick={onClose}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(0,0,0,.35)",
        zIndex:     200,
        display:    "flex",
        alignItems: "flex-end",
      }}
    >
      {/* Sheet */}
      <div
        data-testid="mobile-journal-edit-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        "100%",
          maxHeight:    "80vh",
          background:   "#fff",
          borderRadius: "14px 14px 0 0",
          display:      "flex",
          flexDirection:"column",
          overflow:     "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding:      "10px 12px 8px",
          borderBottom: "1px solid #dde8d8",
          display:      "flex",
          alignItems:   "center",
          gap:          "6px",
          flexShrink:   0,
        }}>
          <span style={{ fontSize: "17px", color: "#8b6f47" }}>✏️</span>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e2e1e", flex: 1 }}>
            {t("mobile.journal_edit")}
          </div>
          <button
            data-testid="mobile-journal-edit-close"
            onClick={onClose}
            aria-label={t("mobile.journal_cancel")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", background: "none", border: "none", cursor: "pointer", color: "#8a9e8a", padding: 0, borderRadius: "50%" }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px", minHeight: 0 }}>
          {isIrrigation ? (
            <>
              {/* Amount */}
              <input
                data-testid="mobile-journal-edit-irrig-amount"
                type="number"
                min="0"
                step="0.1"
                value={irrigAmount}
                onChange={(e) => setIrrigAmount(e.target.value)}
                placeholder={tj("fields.irrigation_amount_placeholder")}
                style={fieldStyle}
              />
              {/* Zones — 2-per-row */}
              {irrigationZones.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                  {irrigationZones.map((z) => {
                    const checked = selectedZones.has(z);
                    return (
                      <label
                        key={z}
                        style={{
                          display: "flex", alignItems: "center", gap: "6px", cursor: "pointer",
                          padding: "5px 8px", borderRadius: "8px", fontSize: "12px",
                          border:      `1.5px solid ${checked ? "#1d9e75" : "#dde8d8"}`,
                          background:  checked ? "#e1f5ee" : "#fff",
                          color:       checked ? "#0f6e56" : "#1e2e1e",
                          fontFamily:  "var(--font-body)",
                          transition:  "all .15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelectedZones((prev) => {
                            const next = new Set(prev);
                            if (next.has(z)) next.delete(z); else next.add(z);
                            return next;
                          })}
                          style={{ accentColor: "#1d9e75", width: "13px", height: "13px", flexShrink: 0 }}
                        />
                        {z}
                      </label>
                    );
                  })}
                </div>
              )}
              {/* Date */}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
            </>
          ) : (
            <>
              {/* Date */}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
              {/* Title */}
              <input
                data-testid="mobile-journal-edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("mobile.journal_title_placeholder")}
                style={fieldStyle}
              />
              {/* Notes */}
              <textarea
                data-testid="mobile-journal-edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("mobile.journal_notes_placeholder")}
                rows={3}
                style={{ ...fieldStyle, resize: "none" }}
              />
            </>
          )}

          {/* ── Photos section (always shown) ── */}
          <div>
            {/* Existing + staged thumbnails */}
            {(existingAttIds.length > 0 || localFiles.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                {existingAttIds.map((id) => {
                  const att = attachmentMap.get(id);
                  return (
                    <div key={id} style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "8px",
                        background: "#eef4eb", border: "1px solid #dde8d8",
                        overflow: "hidden", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "20px",
                      }}>
                        {att?.attachment_type === "image" && att.url
                          ? <img src={att.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : att?.attachment_type === "pdf" ? "📄" : "📷"}
                      </div>
                      {/* Remove existing attachment */}
                      <button
                        onClick={() => setExistingAttIds((prev) => prev.filter((x) => x !== id))}
                        style={{
                          position: "absolute", top: "-5px", right: "-5px",
                          width: "16px", height: "16px", borderRadius: "50%",
                          background: "#c0392b", border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0,
                        }}
                        aria-label="remove"
                      >
                        <X size={9} strokeWidth={2.5} color="#fff" />
                      </button>
                    </div>
                  );
                })}
                {localFiles.map((lf, i) => (
                  <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      width: "56px", height: "56px", borderRadius: "8px",
                      background: "#eef4eb", border: "1.5px dashed #1d9e75",
                      overflow: "hidden", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "20px",
                    }}>
                      {lf.previewUrl
                        ? <img src={lf.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : "📄"}
                    </div>
                    {/* Remove staged file */}
                    <button
                      onClick={() => setLocalFiles((prev) => prev.filter((_, j) => j !== i))}
                      style={{
                        position: "absolute", top: "-5px", right: "-5px",
                        width: "16px", height: "16px", borderRadius: "50%",
                        background: "#c0392b", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0,
                      }}
                      aria-label="remove"
                    >
                      <X size={9} strokeWidth={2.5} color="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo / camera buttons */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                data-testid="mobile-journal-edit-add-photo"
                onClick={() => fileInputRef.current?.click()}
                style={photoPickerBtnStyle}
              >
                <ImagePlus size={12} strokeWidth={1.5} />
                {t("mobile.journal_add_photo")}
              </button>
              {hasCamera && (
                <button
                  data-testid="mobile-journal-edit-add-photo-camera"
                  onClick={() => cameraInputRef.current?.click()}
                  style={photoPickerBtnStyle}
                >
                  <Camera size={12} strokeWidth={1.5} />
                  {t("mobile.journal_take_photo")}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ""; stageFile(f); }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ""; stageFile(f); }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:      "8px 12px",
          borderTop:    "1px solid #dde8d8",
          flexShrink:   0,
          display:      "flex",
          flexDirection:"column",
          gap:          "6px",
        }}>
          {deleteError && (
            <div style={{ fontSize: "11px", color: "#c0392b", textAlign: "center" }}>{deleteError}</div>
          )}
          {confirmDelete ? (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, fontSize: "11px", padding: "7px", borderRadius: "8px", border: "1px solid #dde8d8", background: "#fff", color: "#4a5e4a", cursor: "pointer" }}
              >
                {t("mobile.journal_cancel")}
              </button>
              <button
                data-testid="mobile-journal-edit-delete-ok"
                onClick={() => void handleDelete()}
                disabled={saving}
                style={{ flex: 1, fontSize: "11px", padding: "7px", borderRadius: "8px", border: "none", background: "#c0392b", color: "#fff", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontWeight: 500 }}
              >
                {saving ? "…" : t("mobile.journal_delete_confirm")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* Delete link — left side */}
              <button
                data-testid="mobile-journal-edit-delete-btn"
                onClick={() => { setDeleteError(null); setConfirmDelete(true); }}
                style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", padding: "5px 0", background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontFamily: "var(--font-body)" }}
              >
                <Trash2 size={11} strokeWidth={1.5} />
                {t("mobile.journal_delete")}
              </button>
              <div style={{ flex: 1 }} />
              {/* Save */}
              <button
                data-testid="mobile-journal-edit-save-btn"
                onClick={() => void handleSave()}
                disabled={saving}
                style={{ fontSize: "11px", padding: "5px 16px", background: "#2d4a2d", color: "#fff", border: "none", borderRadius: "20px", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {t("mobile.journal_save")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobileJournalViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobileJournalView({ garden, loading, invalidateGarden }: MobileJournalViewProps) {
  const assistantSettings = useAssistantSettings();
  const irrigationZones   = assistantSettings?.irrigation_zones ?? [];
  const { t, i18n } = useTranslation("common");

  const [search,       setSearch]      = useState("");
  const [activeFilter, setActiveFilter] = useState<JournalEntryType | null>(null);
  const [newOpen,      setNewOpen]     = useState(false);
  const [chatOpen,     setChatOpen]    = useState(false);
  const [drawerOpen,   setDrawerOpen]  = useState(false);
  const [editEntry,    setEditEntry]   = useState<JournalEntry | null>(null);

  function toggleNew() {
    if (chatOpen) setChatOpen(false);
    setNewOpen((v) => !v);
  }

  function toggleChat() {
    if (newOpen) setNewOpen(false);
    setChatOpen((v) => !v);
  }

  const allEntries: JournalEntry[] = garden?.journal_entries ?? [];
  const plants: Plant[] = garden?.plants ?? [];

  const attachmentMap = useMemo(() => {
    const m = new Map<string, Attachment>();
    garden?.attachments.forEach((a) => m.set(a.id, a));
    return m;
  }, [garden]);

  // Build plant lookup: plant_id → plant (for search + display)
  const plantById = useMemo(() => {
    const m = new Map<string, Plant>();
    for (const p of plants) m.set(p.id, p);
    return m;
  }, [plants]);

  // Filter + search
  const filtered = useMemo(() => {
    let entries = [...allEntries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (activeFilter) {
      entries = entries.filter((e) => e.entry_type === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => {
        const plant = e.plant_id ? plantById.get(e.plant_id) : null;
        return (
          (e.title  ?? "").toLowerCase().includes(q) ||
          (e.notes  ?? "").toLowerCase().includes(q) ||
          (plant?.name_common ?? "").toLowerCase().includes(q)
        );
      });
    }

    return entries;
  }, [allEntries, activeFilter, search, plantById]);

  // Group by month
  const monthGroups = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>();
    for (const entry of filtered) {
      const mk = monthKey(entry.date);
      const existing = groups.get(mk);
      if (existing) existing.push(entry);
      else groups.set(mk, [entry]);
    }
    return groups;
  }, [filtered]);

  return (
    <div
      data-testid="mobile-journal-view"
      style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100%",
        background:    "#f8f4ee",
        position:      "relative",
        overflow:      "hidden",
      }}
    >
      <TopBar
        newOpen={newOpen}
        chatOpen={chatOpen}
        onMenuClick={() => setDrawerOpen(true)}
        onAddClick={toggleNew}
        onChatClick={toggleChat}
      />

      <SearchArea
        search={search}
        onSearch={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div style={{ height: "1px", background: "#dde8d8", flexShrink: 0 }} />

      {/* Timeline */}
      <div
        data-testid="mobile-journal-timeline"
        style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
      >
        {loading && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("status.loading")}
          </div>
        )}

        {!loading && monthGroups.size === 0 && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("mobile.journal_empty")}
          </div>
        )}

        {!loading && Array.from(monthGroups.entries()).map(([mk, entries]) => (
          <MonthGroup
            key={mk}
            monthKey={mk}
            entries={entries}
            plants={plants}
            locale={i18n.language}
            onEdit={setEditEntry}
            attachmentMap={attachmentMap}
          />
        ))}

        <div style={{ height: "8px" }} />
      </div>

      {/* New-entry sheet — in-flow, mutually exclusive with chat */}
      <NewEntrySheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        plants={plants}
        irrigationZones={irrigationZones}
        onSaved={invalidateGarden}
      />

      {/* Chat panel — in-flow */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/journal" />

      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Edit entry overlay */}
      {editEntry && (
        <EditEntrySheet
          entry={editEntry}
          plants={plants}
          irrigationZones={irrigationZones}
          attachmentMap={attachmentMap}
          onClose={() => setEditEntry(null)}
          onSaved={() => { setEditEntry(null); invalidateGarden(); }}
          onDeleted={() => { setEditEntry(null); invalidateGarden(); }}
        />
      )}
    </div>
  );
}
