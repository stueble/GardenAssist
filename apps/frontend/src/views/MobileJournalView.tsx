/**
 * MobileJournalView — story-086.
 *
 * Chronological timeline of garden journal entries grouped by month.
 * Supports filtering by entry type and full-text search.
 * New entries created via an in-flow sheet above the bottom nav.
 *
 * Reuses MobileParts for BottomNav, LeftDrawer, ChatPanel.
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle, Plus, X, Search, ChevronDown } from "lucide-react";
import type { Garden } from "@api/garden";
import type { JournalEntry, JournalEntryType } from "@api/journal-entry";
import type { Plant } from "@api/plant";
import { apiClient } from "@/api/client";
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

      <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#fff", fontWeight: 600, flex: 1 }}>
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
            fontSize:    "11px",
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
                fontSize:     "9px",
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
}: {
  entry:     JournalEntry;
  plantName: string | null;
}) {
  const { t, i18n } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);

  const dot    = TYPE_DOT[entry.entry_type]    ?? "#8a9e8a";
  const badge  = TYPE_BADGE[entry.entry_type]  ?? { bg: "#f4f6f7", color: "#7f8c8d" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeLabel = t(`mobile.journal_type_${entry.entry_type}` as any, entry.entry_type);
  const displayTitle = entry.title ?? typeLabel;
  const displayPlant = plantName ?? t("mobile.journal_garden_general");
  const dateStr = formatDate(entry.date, i18n.language);

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
        background:   dot,
        border:       "2px solid #f8f4ee",
        zIndex:       1,
      }} />

      {/* Card */}
      <div
        data-testid="mobile-journal-card"
        style={{
          background:   "#fff",
          borderRadius: "10px",
          border:       `1px solid ${expanded ? "#4a7c4a" : "#dde8d8"}`,
          overflow:     "hidden",
          transition:   "border-color .15s",
        }}
      >
        {/* Collapsed header */}
        <div style={{
          padding:    "8px 10px",
          display:    "flex",
          alignItems: "flex-start",
          gap:        "7px",
        }}>
          {/* Type badge */}
          <span style={{
            fontSize:     "8px",
            padding:      "2px 6px",
            borderRadius: "20px",
            fontWeight:   500,
            flexShrink:   0,
            marginTop:    "1px",
            background:   badge.bg,
            color:        badge.color,
          }}>
            {typeLabel}
          </span>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#1e2e1e", lineHeight: 1.3 }}>
              {displayTitle}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "9px", color: "#4a5e4a", background: "#eef4eb", borderRadius: "20px", padding: "1px 6px" }}>
                {displayPlant}
              </span>
              <span style={{ fontSize: "9px", color: "#8a9e8a" }}>{dateStr}</span>
            </div>
          </div>

          {/* Chevron */}
          <span style={{
            fontSize:   "12px",
            color:      "#8a9e8a",
            flexShrink: 0,
            marginTop:  "2px",
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
            style={{ padding: "0 10px 10px", borderTop: "1px solid #eef4eb" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Notes */}
            {entry.notes && (
              <div style={{ fontSize: "10px", color: "#4a5e4a", lineHeight: 1.5, margin: "8px 0" }}>
                {entry.notes}
              </div>
            )}

            {/* Irrigation detail — zone (title) + mm (notes already shown above) — AC #7 */}
            {entry.entry_type === "irrigation" && entry.title && (
              <div style={{ fontSize: "10px", color: "#0f6e56", marginTop: "4px" }}>
                📍 {entry.title}{entry.notes ? ` · ${entry.notes} mm` : ""}
              </div>
            )}

            {/* Photo slots — 3 slots, last dashed */}
            <div style={{ display: "flex", gap: "5px", marginTop: "8px" }}>
              {[0, 1].map((i) => (
                <div key={i} style={{
                  width: "56px", height: "56px", borderRadius: "8px",
                  background: "#eef4eb", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "20px",
                  border: "1px solid #dde8d8",
                }}>
                  🖼
                </div>
              ))}
              <div style={{
                width: "56px", height: "56px", borderRadius: "8px",
                background: "#eef4eb", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "22px", color: "#8a9e8a",
                border: "1.5px dashed #c8dfc0",
              }}>
                +
              </div>
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
}: {
  monthKey: string;
  entries:  JournalEntry[];
  plants:   Plant[];
  locale:   string;
}) {
  const plantMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plants) m.set(p.id, `${p.icon ?? "🌿"} ${p.name_common}`);
    return m;
  }, [plants]);

  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{
        fontFamily:   "var(--font-display)",
        fontSize:     "13px",
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
            plantName={entry.plant_id ? (plantMap.get(entry.plant_id) ?? null) : null}
          />
        ))}
      </div>
    </div>
  );
}

// New-entry sheet — AC #9
function NewEntrySheet({
  open,
  onClose,
  plants,
  onSaved,
}: {
  open:    boolean;
  onClose: () => void;
  plants:  Plant[];
  onSaved: () => void;
}) {
  const { t } = useTranslation("common");

  const [entryType, setEntryType] = useState<JournalEntryType>("done");
  const [title,     setTitle]     = useState("");
  const [plantId,   setPlantId]   = useState<string | null>(null);
  const [notes,     setNotes]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const NEW_ENTRY_TYPES: Array<{ type: JournalEntryType; labelKey: string }> = [
    { type: "done",        labelKey: "journal_type_done"        },
    { type: "observation", labelKey: "journal_type_observation" },
    { type: "problem",     labelKey: "journal_type_problem"     },
    { type: "irrigation",  labelKey: "journal_type_irrigation"  },
    { type: "manual",      labelKey: "journal_type_manual"      },
  ];

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await apiClient.createJournalEntry({
        plant_id:       plantId,
        schedule_id:    null,
        week:           null,
        entry_type:     entryType,
        date:           today(),
        title:          title.trim() || null,
        notes:          notes.trim() || null,
        attachment_ids: [],
      });
      setTitle(""); setNotes(""); setPlantId(null); setEntryType("done");
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
        height:        open ? "220px" : "0",
        overflow:      "hidden",
        transition:    "height .25s ease",
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
        <span style={{ fontSize: "15px", color: "#8b6f47" }}>✏️</span>
        <div style={{ fontSize: "12px", fontWeight: 500, color: "#1e2e1e", flex: 1 }}>
          {t("mobile.journal_new_entry")}
        </div>
        <button
          data-testid="mobile-journal-sheet-close"
          onClick={onClose}
          style={{ fontSize: "9px", color: "#8a9e8a", padding: "2px 7px", border: "1px solid #dde8d8", borderRadius: "20px", background: "#fff", cursor: "pointer" }}
        >
          {t("mobile.journal_cancel")}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px", minHeight: 0 }}>
        {/* Type selector */}
        <div data-testid="mobile-journal-type-select" style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {NEW_ENTRY_TYPES.map(({ type, labelKey }) => (
            <button
              key={type}
              data-testid={`mobile-journal-type-${type}`}
              onClick={() => setEntryType(type)}
              style={{
                fontSize:     "10px",
                padding:      "4px 9px",
                borderRadius: "20px",
                border:       `1px solid ${entryType === type ? "#2d4a2d" : "#dde8d8"}`,
                background:   entryType === type ? "#2d4a2d" : "#fff",
                color:        entryType === type ? "#fff" : "#4a5e4a",
                cursor:       "pointer",
                transition:   "all .15s",
                fontFamily:   "var(--font-body)",
              }}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {t(`mobile.${labelKey}` as any)}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          data-testid="mobile-journal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("mobile.journal_title_placeholder")}
          style={{
            width:        "100%",
            fontSize:     "11px",
            padding:      "7px 10px",
            border:       "1.5px solid #dde8d8",
            borderRadius: "8px",
            outline:      "none",
            fontFamily:   "var(--font-body)",
            color:        "#1e2e1e",
            boxSizing:    "border-box",
          }}
        />

        {/* Plant picker */}
        <select
          data-testid="mobile-journal-plant-select"
          value={plantId ?? ""}
          onChange={(e) => setPlantId(e.target.value || null)}
          style={{
            width:        "100%",
            fontSize:     "11px",
            padding:      "7px 10px",
            border:       "1.5px solid #dde8d8",
            borderRadius: "8px",
            outline:      "none",
            fontFamily:   "var(--font-body)",
            color:        "#1e2e1e",
            background:   "#fff",
            boxSizing:    "border-box",
          }}
        >
          <option value="">{t("mobile.journal_garden_general")}</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>{p.name_common}</option>
          ))}
        </select>

        {/* Notes */}
        <textarea
          data-testid="mobile-journal-notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("mobile.journal_notes_placeholder")}
          rows={2}
          style={{
            width:        "100%",
            fontSize:     "11px",
            padding:      "7px 10px",
            border:       "1.5px solid #dde8d8",
            borderRadius: "8px",
            outline:      "none",
            fontFamily:   "var(--font-body)",
            color:        "#1e2e1e",
            resize:       "none",
            boxSizing:    "border-box",
          }}
        />
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
          style={{ fontSize: "10px", padding: "5px 14px", background: "#fff", color: "#8a9e8a", border: "1px solid #dde8d8", borderRadius: "20px", cursor: "pointer" }}
        >
          {t("mobile.journal_cancel")}
        </button>
        <button
          data-testid="mobile-journal-save-btn"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ fontSize: "10px", padding: "5px 14px", background: "#2d4a2d", color: "#fff", border: "none", borderRadius: "20px", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {t("mobile.journal_save")}
        </button>
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
  const { t, i18n } = useTranslation("common");

  const [search,       setSearch]      = useState("");
  const [activeFilter, setActiveFilter] = useState<JournalEntryType | null>(null);
  const [newOpen,      setNewOpen]     = useState(false);
  const [chatOpen,     setChatOpen]    = useState(false);
  const [drawerOpen,   setDrawerOpen]  = useState(false);

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
          <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#8a9e8a" }}>
            {t("status.loading")}
          </div>
        )}

        {!loading && monthGroups.size === 0 && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#8a9e8a" }}>
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
          />
        ))}

        <div style={{ height: "8px" }} />
      </div>

      {/* New-entry sheet — in-flow, mutually exclusive with chat */}
      <NewEntrySheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        plants={plants}
        onSaved={invalidateGarden}
      />

      {/* Chat panel — in-flow */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/journal" />

      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
