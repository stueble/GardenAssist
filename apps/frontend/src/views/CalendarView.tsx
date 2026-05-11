/**
 * CalendarView — story-033: Gantt Structure & Plant Rows.
 *
 * AC #1  Plant rows from Garden.plants[], one row per plant
 * AC #2  12 month columns with month name headers
 * AC #3  Sticky plant name column (220px) with thumbnail, name, botanical name
 * AC #4  Current month highlighted (header tint + faint column background)
 * AC #5  Live search filters rows by plant name
 * AC #6  Click row opens PlantDetailPanel overlaying from left
 */

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { PlantDetailPanel } from "@/components/PlantDetailPanel";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { invalidateGarden }     from "@/hooks/useGarden";
import { getPlantEditHandler }   from "@/hooks/usePlantEditContext";
import type { Plant }            from "@api/plant";
import type { Garden }           from "@api/garden";
import type { Schedule }         from "@api/schedule";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

const SCHEDULE_TYPES: Array<{ type: Schedule["schedule_type"]; icon: string; labelKey: string }> = [
  { type: "bloom",         icon: "🌸", labelKey: "bloom"         },
  { type: "growth",        icon: "🌿", labelKey: "growth"        },
  { type: "foliage",       icon: "🍃", labelKey: "foliage"       },
  { type: "fertilization", icon: "💧", labelKey: "fertilization" },
  { type: "pruning",       icon: "✂️", labelKey: "pruning"       },
  { type: "misc",          icon: "📋", labelKey: "misc"          },
];

const TOTAL_WEEKS = 52;

/** Week number (1-based) → left-offset % within the 12-month band */
function weekToPercent(week: number): number {
  return ((week - 1) / TOTAL_WEEKS) * 100;
}

/** Duration in weeks → width % */
function durationToPercent(startWeek: number, endWeek: number): number {
  // Handle year-wrap (end < start)
  const dur = endWeek >= startWeek
    ? endWeek - startWeek + 1
    : (TOTAL_WEEKS - startWeek + 1) + endWeek;
  return (dur / TOTAL_WEEKS) * 100;
}

/** Current ISO week number */
function currentWeekNumber(): number {
  const now  = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

/** Week number → month index (0-based, approximate) */
function weekToMonthIdx(week: number): number {
  return Math.min(11, Math.floor((week - 1) / (TOTAL_WEEKS / 12)));
}

// ── Lane assignment ────────────────────────────────────────────────────────────

/**
 * Returns true when two schedules overlap in time.
 * Wrapping schedules (end_week < start_week) are normalised to two intervals
 * [start..52] and [1..end] for comparison.
 */
export function schedulesOverlap(
  a: { start_week: number; end_week: number },
  b: { start_week: number; end_week: number },
): boolean {
  // Expand each schedule into at most two [lo, hi] intervals (week-inclusive).
  const intervalsA = toIntervals(a.start_week, a.end_week);
  const intervalsB = toIntervals(b.start_week, b.end_week);

  for (const [aLo, aHi] of intervalsA) {
    for (const [bLo, bHi] of intervalsB) {
      if (aLo <= bHi && bLo <= aHi) return true;
    }
  }
  return false;
}

function toIntervals(start: number, end: number): Array<[number, number]> {
  if (end >= start) return [[start, end]];
  // Wrapping: split at year boundary
  return [[start, TOTAL_WEEKS], [1, end]];
}

export interface LaneResult {
  /** Maps schedule id → zero-based lane index */
  laneMap:    Map<string, number>;
  totalLanes: number;
}

/**
 * Assign each schedule a lane so that no two schedules in the same lane
 * overlap. Uses a greedy first-fit algorithm after sorting by start_week.
 * Wrapping schedules (end_week < start_week) are handled via schedulesOverlap.
 */
export function assignLanes(
  schedules: Array<{ id: string; start_week: number; end_week: number }>,
): LaneResult {
  if (schedules.length === 0) return { laneMap: new Map(), totalLanes: 0 };

  // Sort by start_week; wrapping schedules (end < start) sort by effective start
  const sorted = [...schedules].sort((a, b) => a.start_week - b.start_week);

  // lanes[i] = array of schedules already assigned to lane i
  const lanes: Array<typeof sorted> = [];
  const laneMap = new Map<string, number>();

  for (const sched of sorted) {
    let assigned = false;
    for (let i = 0; i < lanes.length; i++) {
      const conflicts = lanes[i].some((existing) => schedulesOverlap(sched, existing));
      if (!conflicts) {
        lanes[i].push(sched);
        laneMap.set(sched.id, i);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      laneMap.set(sched.id, lanes.length);
      lanes.push([sched]);
    }
  }

  return { laneMap, totalLanes: lanes.length };
}

// ── Lane geometry ──────────────────────────────────────────────────────────────

const BASE_ROW_HEIGHT = 60;
const BASE_BAR_HEIGHT = 28;
const BAR_GAP         = 2;
const ROW_PADDING     = 8;   // top and bottom padding inside the bars div
const MIN_BAR_HEIGHT  = 8;
const LABEL_MIN_BAR_HEIGHT = 18;

export interface LaneGeometry {
  barHeight:  number;
  rowHeight:  number;
  /** Returns the absolute `top` (px) for a given lane index */
  topForLane: (lane: number) => number;
}

export function computeLaneGeometry(totalLanes: number): LaneGeometry {
  if (totalLanes <= 1) {
    return {
      barHeight:  BASE_BAR_HEIGHT,
      rowHeight:  BASE_ROW_HEIGHT,
      topForLane: () => ROW_PADDING + (BASE_BAR_HEIGHT / 2),   // unused; top = "50%" path
    };
  }

  const usableHeight = BASE_ROW_HEIGHT - 2 * ROW_PADDING;
  const barHeight = Math.max(
    MIN_BAR_HEIGHT,
    Math.floor((usableHeight - (totalLanes - 1) * BAR_GAP) / totalLanes),
  );

  // Grow row height if bars would overflow
  const needed = 2 * ROW_PADDING + totalLanes * barHeight + (totalLanes - 1) * BAR_GAP;
  const rowHeight = Math.max(BASE_ROW_HEIGHT, needed);

  const topForLane = (lane: number) =>
    ROW_PADDING + lane * (barHeight + BAR_GAP);

  return { barHeight, rowHeight, topForLane };
}

// ── Main component ─────────────────────────────────────────────────────────────

interface CalendarViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function CalendarView({ garden, loading }: CalendarViewProps) {
  const { t } = useTranslation("calendar");
  const assistantSettings = useAssistantSettings();

  const plants = garden?.plants ?? [];
  const [search,    setSearch]   = useState("");
  const [activeType, setActiveType] = useState<Schedule["schedule_type"]>("bloom");
  const [selected,  setSelected] = useState<Plant | null>(null);
  // Keep selected in sync with garden updates (e.g. after save)
  useEffect(() => {
    if (selected && garden) {
      const fresh = garden.plants.find((p) => p.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden]);

  const cw           = currentWeekNumber();
  const currentMonth = weekToMonthIdx(cw);

  // Filter + sort: plants with bars for active type first, then alphabetical
  const filtered = plants.filter((p) =>
    p.name_common.toLowerCase().includes(search.toLowerCase()) ||
    (p.name_botanical ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aHas = a.schedules.some((s) => s.schedule_type === activeType);
    const bHas = b.schedules.some((s) => s.schedule_type === activeType);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.name_common.localeCompare(b.name_common);
  });

  useEffect(() => {
    setAssistantContext(
      garden
        ? { view: "calendar", garden, selectedPlant: selected ?? undefined, settings: assistantSettings }
        : undefined
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, selected, assistantSettings]);

  return (
    <div
      data-testid="calendar-view"
      style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", background: "var(--cream)" }}
    >
      {/* ── Main Gantt area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Subheader: search + type toggles */}
        <div
          style={{
            background:   "var(--warm-white)",
            borderBottom: "1px solid var(--border)",
            padding:      "10px 16px",
            display:      "flex",
            alignItems:   "center",
            gap:          "12px",
            flexShrink:   0,
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", width: "260px", flexShrink: 0 }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--text-light)", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pflanze suchen …"
              data-testid="calendar-search"
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

          {/* Schedule type toggles */}
          <div style={{ display: "flex", gap: "4px" }}>
            {SCHEDULE_TYPES.map(({ type, icon, labelKey }) => (
              <button
                key={type}
                type="button"
                data-testid={`schedule-toggle-${type}`}
                onClick={() => setActiveType(type)}
                style={{
                  padding:      "6px 12px",
                  borderRadius: "20px",
                  border:       "1.5px solid var(--border)",
                  background:   activeType === type ? "var(--green-deep)" : "none",
                  color:        activeType === type ? "white" : "var(--text-mid)",
                  fontSize:     "12px",
                  fontWeight:   500,
                  fontFamily:   "var(--font-body)",
                  cursor:       "pointer",
                  transition:   "all .15s",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "4px",
                  whiteSpace:   "nowrap",
                }}
              >
                {icon} {(t as (k: string) => string)(`schedule_type.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Gantt table */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", fontSize: "13px" }}>
            Wird geladen …
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto" }}>
            <table
              data-testid="calendar-table"
              style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}
            >
              {/* Header */}
              <thead>
                <tr>
                  {/* Plant column header */}
                  <th
                    style={{
                      width:       "220px",
                      minWidth:    "220px",
                      padding:     "10px 16px",
                      textAlign:   "left",
                      fontSize:    "10px",
                      fontWeight:  700,
                      letterSpacing: ".8px",
                      textTransform: "uppercase",
                      color:       "var(--text-light)",
                      background:  "var(--warm-white)",
                      position:    "sticky",
                      top:         0,
                      left:        0,
                      zIndex:      30,
                      borderBottom:"2px solid var(--border)",
                      borderRight: "2px solid var(--border)",
                    }}
                  >
                    Pflanze
                  </th>
                  {/* Month headers */}
                  {MONTHS_DE.map((month, idx) => (
                    <th
                      key={month}
                      data-testid={`month-header-${idx}`}
                      style={{
                        padding:     "8px 0",
                        textAlign:   "center",
                        fontSize:    "11px",
                        fontWeight:  600,
                        color:       idx === currentMonth ? "var(--green-deep)" : "var(--text-mid)",
                        letterSpacing: ".3px",
                        borderLeft:  "1px solid var(--border)",
                        borderBottom:"2px solid var(--border)",
                        background:  idx === currentMonth ? "var(--green-mist)" : "var(--warm-white)",
                        position:    "sticky",
                        top:         0,
                        zIndex:      20,
                        whiteSpace:  "nowrap",
                      }}
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Plant rows */}
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: "40px", textAlign: "center", color: "var(--text-light)", fontSize: "13px" }}>
                      {search ? "Keine Pflanzen gefunden." : "Noch keine Pflanzen vorhanden."}
                    </td>
                  </tr>
                ) : (
                  sorted.map((plant) => (
                    <PlantRow
                      key={plant.id}
                      plant={plant}
                      activeType={activeType}
                      currentMonth={currentMonth}
                      selected={selected?.id === plant.id}
                      onClick={() => setSelected((prev) => prev?.id === plant.id ? null : plant)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail panel — right of center, left of AiPanel (AC #6) ── */}
      <div
        data-testid="calendar-detail-panel"
        style={{
          width:         selected ? "360px" : "0",
          minWidth:      selected ? "360px" : "0",
          overflow:      "hidden",
          background:    "var(--warm-white)",
          borderLeft:    selected ? "1px solid var(--border)" : "none",
          display:       "flex",
          flexDirection: "column",
          transition:    "width .3s ease, min-width .3s ease",
          flexShrink:    0,
        }}
      >
        {selected && (
          <PlantDetailPanel
            plant={selected}
            onClose={() => setSelected(null)}
            onEdit={(p) => { getPlantEditHandler()?.editPlant(p.id, {}); }}
            onDelete={() => {
              invalidateGarden();
              setSelected(null);
            }}
          />
        )}
      </div>

      {/* AiPanel is rendered once in App.tsx — not here */}
    </div>
  );
}

// ── PlantRow ──────────────────────────────────────────────────────────────────

interface PlantRowProps {
  plant:       Plant;
  activeType:  Schedule["schedule_type"];
  currentMonth:number;
  selected:    boolean;
  onClick:     () => void;
}

function PlantRow({ plant, activeType, currentMonth, selected, onClick }: PlantRowProps) {
  const bars = plant.schedules.filter((s) => s.schedule_type === activeType);

  // ── Lane assignment + geometry ──
  const { laneMap, totalLanes } = assignLanes(bars);
  const geo = computeLaneGeometry(totalLanes);

  // Thumbnail: first image in sort_order (backend returns attachments sorted by sort_order)
  const firstImg = plant.attachments.find((a) => a.attachment_type === "image");

  return (
    <tr
      data-testid="calendar-plant-row"
      onClick={onClick}
      style={{
        borderBottom: "1px solid var(--border)",
        cursor:       "pointer",
        background:   selected ? "rgba(228,240,224,.6)" : "none",
        transition:   "background .12s",
      }}
      className={selected ? "" : "hover:bg-green-mist"}
    >
      {/* Sticky plant name column (AC #3) */}
      <td
        style={{
          padding:    "10px 16px",
          width:      "220px",
          minWidth:   "220px",
          borderRight:"2px solid var(--border)",
          position:   "sticky",
          left:       0,
          background: selected ? "rgba(228,240,224,.6)" : "var(--warm-white)",
          zIndex:     10,
          verticalAlign: "middle",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Thumbnail — outer wrapper allows badge to overflow */}
          <div style={{ position: "relative", flexShrink: 0, width: "40px", height: "40px" }}>
            {/* Inner: clips image/emoji to rounded corners */}
            <div
              style={{
                width:       "40px",
                height:      "40px",
                borderRadius:"8px",
                background:  "var(--green-mist)",
                border:      "1.5px solid var(--border)",
                display:     "flex",
                alignItems:  "center",
                justifyContent: "center",
                fontSize:    "22px",
                overflow:    "hidden",
              }}
            >
              {firstImg ? (
                <img src={firstImg.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                plant.icon ?? "🌿"
              )}
            </div>
            {plant.temperature_protected && (
              <div
                title="Kälteschutz/Indoor"
                style={{ position: "absolute", bottom: "-4px", left: "-4px", fontSize: "12px", lineHeight: 1, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.4))", userSelect: "none" }}
              >🏠</div>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {plant.name_common}
            </div>
            {plant.name_botanical && (
              <div style={{ fontSize: "10px", color: "var(--text-light)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {plant.name_botanical}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Gantt bars cell spanning all 12 months (AC #2, #4) */}
      <td
        colSpan={12}
        style={{
          padding:       0,
          position:      "relative",
          verticalAlign: "middle",
          overflow:      "visible",
          height:        `${geo.rowHeight}px`,
        }}
      >
        {/* Month grid lines + current month tint */}
        <div
          style={{
            position:              "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display:               "grid",
            gridTemplateColumns:   "repeat(12, 1fr)",
            pointerEvents:         "none",
          }}
        >
          {MONTHS_DE.map((_, idx) => (
            <div
              key={idx}
              style={{
                borderLeft:  idx > 0 ? "1px solid var(--border)" : "none",
                background:  idx === currentMonth ? "rgba(238,244,235,.5)" : "none",
              }}
            />
          ))}
        </div>

        {/* Bars — wrapping schedules (end < start) rendered as two segments */}
        <div style={{ position: "relative", height: "100%" }}>
          {bars.length === 0 ? null : (
            bars.flatMap((s) => {
              const color     = s.color ?? "var(--green-mid)";
              const lane      = laneMap.get(s.id) ?? 0;
              const topPx     = totalLanes <= 1
                ? undefined          // use top:"50%" + transform for single-lane (unchanged look)
                : geo.topForLane(lane);
              const barH      = geo.barHeight;
              const showLabel = barH >= LABEL_MIN_BAR_HEIGHT;

              const barStyle = (
                left: number,
                width: number,
                extraRadius?: React.CSSProperties,
              ): React.CSSProperties => ({
                position:    "absolute",
                left:        `${left}%`,
                width:       `${width}%`,
                ...(topPx !== undefined
                  ? { top: `${topPx}px` }
                  : { top: "50%", transform: "translateY(-50%)" }),
                height:      `${barH}px`,
                background:  color,
                borderRadius:"6px",
                display:     "flex",
                alignItems:  "center",
                padding:     "0 8px",
                fontSize:    "10px",
                fontWeight:  600,
                color:       "white",
                boxShadow:   "0 1px 4px rgba(0,0,0,.15)",
                overflow:    "hidden",
                whiteSpace:  "nowrap",
                textOverflow:"ellipsis",
                textShadow:  "0 1px 2px rgba(0,0,0,.2)",
                cursor:      "pointer",
                zIndex:      10,
                ...extraRadius,
              });

              // Build tooltip: label + month range
              const startMonth = MONTHS_DE[weekToMonthIdx(s.start_week)];
              const endMonth   = MONTHS_DE[weekToMonthIdx(
                s.end_week >= s.start_week ? s.end_week : s.end_week,
              )];
              const tooltip = s.label
                ? `${s.label} (${startMonth}–${endMonth})`
                : `${startMonth}–${endMonth}`;

              if (s.end_week >= s.start_week) {
                // Normal (non-wrapping) schedule — single bar
                return [(
                  <div
                    key={s.id}
                    data-testid="calendar-bar"
                    title={tooltip}
                    style={barStyle(weekToPercent(s.start_week), durationToPercent(s.start_week, s.end_week))}
                  >
                    {showLabel ? (s.label ?? "") : ""}
                  </div>
                )];
              } else {
                // Wrapping schedule — two segments
                const leftW1  = weekToPercent(s.start_week);
                const widthW1 = durationToPercent(s.start_week, TOTAL_WEEKS);   // start → W52
                const leftW2  = weekToPercent(1);                               // W1 → end
                const widthW2 = durationToPercent(1, s.end_week);
                return [
                  <div
                    key={`${s.id}-a`}
                    data-testid="calendar-bar"
                    title={tooltip}
                    style={barStyle(leftW1, widthW1, {
                      borderTopRightRadius:    0,
                      borderBottomRightRadius: 0,
                    })}
                  >
                    {showLabel ? (s.label ?? "") : ""}
                  </div>,
                  <div
                    key={`${s.id}-b`}
                    data-testid="calendar-bar"
                    title={tooltip}
                    style={barStyle(leftW2, widthW2, {
                      borderTopLeftRadius:    0,
                      borderBottomLeftRadius: 0,
                    })}
                  />,
                ];
              }
            })
          )}
        </div>
      </td>
    </tr>
  );
}
