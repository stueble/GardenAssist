/**
 * JournalView — story-035: Timeline & Entry List.
 *
 * AC #1  Entries from Garden.journal_entries[] grouped by month descending
 * AC #2  Entry card: type badge, plant tag, title, date; expands for notes + attachments
 * AC #3  Filter chips: Erledigt, Übersprungen, Manuell — single active, toggle off
 * AC #4  Live search by title, notes, plant name
 * AC #5  Empty state when no entries match
 * AC #6  Type colors consistent with mockup
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AiPanel } from "@/components/AiPanel";
import { apiClient } from "@/api/client";
import type { JournalEntry, JournalEntryType } from "@api/journal-entry";
import type { Plant } from "@api/plant";

// ── Type colors (AC #6) ───────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  done:    { border: "#27ae60", bg: "#edfaf3", text: "#27ae60", badge: "✅" },
  skipped: { border: "#7f8c8d", bg: "#f4f6f7", text: "#7f8c8d", badge: "⏭" },
  manual:  { border: "#4a78c0", bg: "#eef3fb", text: "#4a78c0", badge: "📝" },
};

const FILTER_CHIPS: Array<{ type: JournalEntryType; label: string }> = [
  { type: "done",    label: "✅ Erledigt"    },
  { type: "skipped", label: "⏭ Übersprungen" },
  { type: "manual",  label: "📝 Manuell"     },
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

  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [plants,     setPlants]     = useState<Plant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [activeType, setActiveType] = useState<JournalEntryType | null>(null);

  useEffect(() => {
    apiClient.getGarden()
      .then((g) => {
        // Sort descending by date
        const sorted = [...g.journal_entries].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
        setEntries(sorted);
        setPlants(g.plants);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
      style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", background: "var(--cream)" }}
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
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AiPanel context={`📔 ${t("title")}`} />
    </div>
  );
}

// ── EntryCard ─────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: JournalEntry;
  plant: Plant | null;
}

function EntryCard({ entry, plant }: EntryCardProps) {
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
            {colors.badge} {entry.entry_type === "done" ? "Erledigt" : entry.entry_type === "skipped" ? "Übersprungen" : "Manuell"}
          </span>

          {/* Plant tag */}
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
                {entry.attachment_ids.map((id) => (
                  <div
                    key={id}
                    style={{
                      width:        "52px",
                      height:       "52px",
                      borderRadius: "7px",
                      background:   "var(--green-mist)",
                      border:       "1.5px solid var(--border)",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "center",
                      fontSize:     "24px",
                    }}
                  >
                    📷
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
