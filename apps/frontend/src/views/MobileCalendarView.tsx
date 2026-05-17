/**
 * MobileCalendarView — story-085.
 *
 * Mobile Gantt chart: 12 months × 4 segments = 48 segments per plant row.
 * Read-only — no + button. Filter chips select the schedule category.
 *
 * Improvements over initial version:
 * - Plants with schedules for the active category shown first (AC #7)
 * - Chart background is cream (#f8f4ee) so white bloom colors are visible
 * - Non-overlapping schedules share a lane (same row) — uses assignLanes()
 * - Shared logic (overlap detection, lane assignment, segment model) from calendarUtils
 *
 * Reuses MobileParts for BottomNav, LeftDrawer, ChatPanel.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle } from "lucide-react";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";
import type { Schedule } from "@api/schedule";
import {
  currentISOWeek,
  weekToSeg,
  TOTAL_SEGS,
  buildMobileLanes,
  buildSegmentArray,
  type MobileLane,
} from "@/lib/calendarUtils";
import { topBtnStyle, BottomNav, LeftDrawer, ChatPanel } from "@/components/mobile/MobileParts";

// ── Constants ─────────────────────────────────────────────────────────────────

const currentSeg        = weekToSeg(currentISOWeek());
const currentMonthIdx   = Math.floor(currentSeg / 4);   // 0-based
const currentWeekInMonth = currentSeg % 4;               // 0-based

type FilterKey = Schedule["schedule_type"];

/** Filter chips in the order specified by the mockup. */
const FILTER_CHIPS: Array<{ key: FilterKey; icon: string }> = [
  { key: "bloom",         icon: "🌸" },
  { key: "fertilization", icon: "💧" },
  { key: "pruning",       icon: "✂️" },
  { key: "misc",          icon: "·"  },
  { key: "foliage",       icon: "🍂" },
  { key: "growth",        icon: "🌱" },
];

/** Module-level singleton — preserves selected filter across navigation. */
let _calendarFilter: FilterKey = "bloom";

/** Reset filter singleton for testing — do not call in production code. */
export function _resetCalendarFilterForTest(): void {
  _calendarFilter = "bloom";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a merged segment array as a readable date range for the tooltip. */
function formatRange(
  segs: boolean[],
  monthsShort: string[],
  monthsLong: string[],
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  let first = -1, last = -1;
  segs.forEach((on, i) => { if (on) { if (first < 0) first = i; last = i; } });
  if (first < 0) return "";
  const mF = Math.floor(first / 4), wF = (first % 4) + 1;
  const mL = Math.floor(last  / 4), wL = (last  % 4) + 1;
  if (mF === mL) {
    return t("mobile.calendar_range_same", { month: monthsShort[mF], w1: wF, w2: wL });
  }
  return t("mobile.calendar_range", { from: monthsLong[mF], w1: wF, to: monthsLong[mL], w2: wL });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

// TopBar — AC #1 (no + button — read-only view)
function TopBar({
  onMenuClick,
  onChatClick,
  chatOpen,
}: {
  onMenuClick: () => void;
  onChatClick: () => void;
  chatOpen:    boolean;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      data-testid="mobile-calendar-topbar"
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
        data-testid="mobile-calendar-hamburger"
        aria-label="Menü öffnen"
        onClick={onMenuClick}
        style={topBtnStyle}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#fff", fontWeight: 600, flex: 1 }}>
        {t("mobile.calendar")}
      </div>

      <button
        data-testid="mobile-calendar-chat-btn"
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

// FilterChips — AC #2
function FilterChips({
  active,
  onChange,
}: {
  active:   FilterKey;
  onChange: (k: FilterKey) => void;
}) {
  const { t } = useTranslation("common");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const label = (key: FilterKey) => t(`schedule_type.${key}` as any);

  return (
    <div style={{ padding: "7px 12px", flexShrink: 0 }}>
      <div
        data-testid="mobile-calendar-chips"
        style={{
          display:         "flex",
          gap:             "5px",
          overflowX:       "auto",
          scrollbarWidth:  "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        {FILTER_CHIPS.map(({ key, icon }) => (
          <button
            key={key}
            data-testid={`mobile-calendar-chip-${key}`}
            onClick={() => onChange(key)}
            style={{
              fontSize: "11px",
              padding:      "3px 10px",
              borderRadius: "20px",
              border:       `1px solid ${active === key ? "#2d4a2d" : "#c8dfc0"}`,
              background:   active === key ? "#2d4a2d" : "#eef4eb",
              color:        active === key ? "#fff" : "#4a5e4a",
              cursor:       "pointer",
              whiteSpace:   "nowrap",
              flexShrink:   0,
              transition:   "all .15s",
              fontFamily:   "var(--font-body)",
            }}
          >
            {icon} {label(key)}
          </button>
        ))}
      </div>
    </div>
  );
}

// StickyMonthHeader — AC #3
function MonthHeader() {
  const { t } = useTranslation("common");
  const monthsShort = t("months_short", { returnObjects: true }) as string[];

  return (
    <div style={{
      display:      "flex",
      alignItems:   "flex-end",
      padding:      "5px 8px 0",
      position:     "sticky",
      top:          0,
      background:   "#f8f4ee",
      zIndex:       5,
      borderBottom: "1px solid #dde8d8",
    }}>
      <div style={{ width: "110px", flexShrink: 0 }} />
      {/*
        CSS grid with 48 columns + column-gap:1px — identical structure to LaneBarRow.
        Row 1: month letters, each spanning 4 columns → perfectly centred.
        Row 2: week dots, one per column.
      */}
      <div style={{
        flex:                1,
        display:             "grid",
        gridTemplateColumns: `repeat(${TOTAL_SEGS}, 1fr)`,
        gridTemplateRows:    "auto auto",
        columnGap:           "1px",
        paddingBottom:       "4px",
        alignItems:          "end",
      }}>
        {/* Row 1: month letters — each spans 4 grid columns */}
        {monthsShort.map((m, mi) => {
          const isCurrent = mi === currentMonthIdx;
          const colStart  = mi * 4 + 1;          // CSS grid is 1-based
          return (
            <div
              key={mi}
              data-testid={`mobile-calendar-month-${mi}`}
              style={{
                gridColumn:    `${colStart} / ${colStart + 4}`,
                gridRow:       1,
                textAlign:     "center",
                fontSize:      "11px",
                color:         isCurrent ? "#2d4a2d" : "#8a9e8a",
                fontWeight:    isCurrent ? 700 : 600,
                marginBottom:  "2px",
                overflow:      "visible",
                whiteSpace:    "nowrap",
              }}
            >
              {m[0]}
            </div>
          );
        })}
        {/* Row 2: week dots — one per column */}
        {Array.from({ length: TOTAL_SEGS }, (_, si) => {
          const mi = Math.floor(si / 4);
          const wi = si % 4;
          const isCurrent = mi === currentMonthIdx;
          return (
            <div
              key={si}
              style={{
                gridColumn:     si + 1,
                gridRow:        2,
                display:        "flex",
                justifyContent: "center",
              }}
            >
              <div style={{
                width:        "4px",
                height:       "4px",
                borderRadius: "50%",
                background:   (isCurrent && wi === currentWeekInMonth) ? "#4a7c4a" : "#eef4eb",
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Border-radius for a segment based on whether its neighbours are also active. */
function segRadius(colors: Array<string | null>, i: number): string {
  const prev = i > 0             && colors[i - 1] !== null;
  const next = i < TOTAL_SEGS - 1 && colors[i + 1] !== null;
  if (!prev && !next) return "4px";
  if (!prev && next)  return "4px 1px 1px 4px";
  if (prev  && !next) return "1px 4px 4px 1px";
  return "1px";
}

// Single lane bar row — renders one lane with per-segment colors
function LaneBarRow({ lane }: { lane: MobileLane }) {
  const { segmentColors } = lane;
  return (
    <div style={{ display: "flex", width: "100%", height: "10px", gap: "1px" }}>
      {segmentColors.map((color, i) => (
        <div
          key={i}
          style={{
            flex:         1,
            height:       "10px",
            borderRadius: color !== null ? segRadius(segmentColors, i) : "1px",
            background:   color ?? "#f8f4ee",
          }}
        />
      ))}
    </div>
  );
}

// Plant row — AC #4, #5, #6, #7
function PlantRow({
  plant,
  filterKey,
  selected,
  onSelect,
}: {
  plant:     Plant;
  filterKey: FilterKey;
  selected:  boolean;
  onSelect:  () => void;
}) {
  const matchingSchedules = plant.schedules.filter((s) => s.schedule_type === filterKey);
  const hasData = matchingSchedules.length > 0;

  // Build lanes: non-overlapping schedules share a lane (same row)
  const lanes = buildMobileLanes(matchingSchedules);

  const curLinePct = ((currentSeg + 0.5) / TOTAL_SEGS * 100).toFixed(2) + "%";

  return (
    <div
      data-testid="mobile-calendar-plant-row"
      onClick={onSelect}
      style={{
        display:     "flex",
        alignItems:  "flex-start",
        padding:     "5px 8px",
        borderBottom:"1px solid #e8eee4",
        cursor:      "pointer",
        background:  selected ? "#eef4eb" : "#f8f4ee",
        opacity:     hasData ? 1 : 0.4,
        transition:  "background .12s",
      }}
    >
      {/* Plant name column — 100px */}
      <div style={{ width: "110px", flexShrink: 0, paddingTop: "2px" }}>
        <div style={{ fontSize: "12px", fontWeight: 500, color: "#1e2e1e", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={plant.name_common}>
          {plant.name_common}
        </div>
        {plant.location && (
          <div style={{ fontSize: "10px", color: "#8a9e8a", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {plant.location}
          </div>
        )}
      </div>

      {/* Bar track — one row per lane, current-week line spans all */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", gap: "1px" }}>
        {/* Current-week indicator line */}
        <div style={{
          position:      "absolute",
          top:           0,
          bottom:        0,
          left:          curLinePct,
          width:         "1.5px",
          background:    "#4a7c4a",
          opacity:       0.5,
          pointerEvents: "none",
          zIndex:        1,
        }} />

        {/* Lane rows — non-overlapping schedules share a lane */}
        {lanes.length > 0 ? (
          lanes.map((lane, i) => (
            <LaneBarRow key={i} lane={lane} />
          ))
        ) : (
          // One empty row for visual consistency when no data in this category
          <div style={{ display: "flex", width: "100%", height: "10px", gap: "1px" }}>
            {Array.from({ length: TOTAL_SEGS }, (_, si) => (
              <div key={si} style={{ flex: 1, height: "10px", borderRadius: "1px", background: "#ebe6df" }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tooltip — AC #8
function Tooltip({
  plant,
  filterKey,
  onClose,
}: {
  plant:     Plant;
  filterKey: FilterKey;
  onClose:   () => void;
}) {
  const { t } = useTranslation("common");
  const monthsShort = t("months_short", { returnObjects: true }) as string[];
  const monthsLong  = t("months_long",  { returnObjects: true }) as string[];

  const schedules = plant.schedules.filter((s) => s.schedule_type === filterKey);

  return (
    <div
      data-testid="mobile-calendar-tooltip"
      style={{
        margin:       "0 8px 8px",
        padding:      "8px 10px",
        background:   "#eef4eb",
        borderRadius: "8px",
        border:       "1px solid #c8dfc0",
        fontSize: "11px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "3px" }}>
        <div>
          <span style={{ fontWeight: 500, color: "#1e2e1e" }}>{plant.name_common}</span>
          {plant.name_botanical && (
            <span style={{ color: "#8a9e8a", fontWeight: 400, fontSize: "10px", marginLeft: "4px" }}>
              {plant.name_botanical}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#8a9e8a", lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {schedules.length === 0 ? (
        <div style={{ color: "#4a5e4a" }}>{t("mobile.calendar_no_entry")}</div>
      ) : (
        schedules.map((s, idx) => {
          const segs  = buildSegmentArray(s);
          const range = formatRange(
            segs, monthsShort, monthsLong,
            t as (k: string, opts?: Record<string, unknown>) => string,
          );
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#4a5e4a", marginTop: idx > 0 ? "3px" : 0 }}>
              {s.color && (
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                  background: s.color, border: "1px solid rgba(0,0,0,.1)",
                }} />
              )}
              <span>
                {s.label ? `${s.label}: ` : ""}
                {range || t("mobile.calendar_no_entry")}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobileCalendarViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobileCalendarView({ garden, loading }: MobileCalendarViewProps) {
  const { t } = useTranslation("common");

  const [filterKey,  setFilterKey]  = useState<FilterKey>(_calendarFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatOpen,   setChatOpen]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleFilterChange(k: FilterKey) {
    _calendarFilter = k;
    setFilterKey(k);
    setSelectedId(null);
  }

  function handleRowSelect(plantId: string) {
    setSelectedId((prev) => prev === plantId ? null : plantId);
  }

  const allPlants = garden?.plants ?? [];

  // Sort: plants with schedules for the active category first, then alphabetical (AC #7)
  const plants = [...allPlants].sort((a, b) => {
    const aHas = a.schedules.some((s) => s.schedule_type === filterKey);
    const bHas = b.schedules.some((s) => s.schedule_type === filterKey);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.name_common.localeCompare(b.name_common);
  });

  const selectedPlant = plants.find((p) => p.id === selectedId) ?? null;

  return (
    <div
      data-testid="mobile-calendar-view"
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
        onMenuClick={() => setDrawerOpen(true)}
        onChatClick={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      <FilterChips active={filterKey} onChange={handleFilterChange} />

      <div style={{ height: "1px", background: "#dde8d8", flexShrink: 0 }} />

      {/* Chart area */}
      <div
        data-testid="mobile-calendar-chart"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0, background: "#f8f4ee", paddingBottom: "var(--mobile-chat-height, 0px)" }}
      >
        <MonthHeader />

        {loading && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("status.loading")}
          </div>
        )}

        {!loading && plants.map((plant) => (
          <PlantRow
            key={plant.id}
            plant={plant}
            filterKey={filterKey}
            selected={selectedId === plant.id}
            onSelect={() => handleRowSelect(plant.id)}
          />
        ))}

        {selectedPlant && (
          <Tooltip
            plant={selectedPlant}
            filterKey={filterKey}
            onClose={() => setSelectedId(null)}
          />
        )}

        <div style={{ height: "8px" }} />
      </div>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/calendar" />

      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
