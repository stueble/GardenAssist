/**
 * calendarUtils — shared calendar / Gantt logic.
 *
 * Used by both CalendarView (desktop percentage-based bars) and
 * MobileCalendarView (48-segment discrete model).
 *
 * Overlap detection and lane assignment are representation-agnostic:
 * they operate on schedule week numbers, not pixels or segments.
 */

import type { Schedule } from "@api/schedule";

// ── Week helpers ──────────────────────────────────────────────────────────────

export const TOTAL_WEEKS = 52;

/** Current ISO week number (1–52). */
export function currentISOWeek(): number {
  const now  = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  return Math.ceil((now.getTime() - jan4.getTime()) / 86400000 / 7 + jan4.getDay() / 7);
}

/** Week number → month index (0-based, approximate). */
export function weekToMonthIdx(week: number): number {
  return Math.min(11, Math.floor((week - 1) / (TOTAL_WEEKS / 12)));
}

// ── Overlap detection ─────────────────────────────────────────────────────────

/** Expand a [start, end] week range into at most two non-wrapping intervals. */
export function toIntervals(start: number, end: number): Array<[number, number]> {
  if (end >= start) return [[start, end]];
  // Year-wrap: split at year boundary
  return [[start, TOTAL_WEEKS], [1, end]];
}

/**
 * Returns true when two schedules overlap in time.
 * Handles year-wrapping schedules (end_week < start_week).
 */
export function schedulesOverlap(
  a: { start_week: number; end_week: number },
  b: { start_week: number; end_week: number },
): boolean {
  const intervalsA = toIntervals(a.start_week, a.end_week);
  const intervalsB = toIntervals(b.start_week, b.end_week);
  for (const [aLo, aHi] of intervalsA) {
    for (const [bLo, bHi] of intervalsB) {
      if (aLo <= bHi && bLo <= aHi) return true;
    }
  }
  return false;
}

// ── Lane assignment ───────────────────────────────────────────────────────────

export interface LaneResult {
  /** Maps schedule id → zero-based lane index. */
  laneMap:    Map<string, number>;
  totalLanes: number;
}

/**
 * Assign each schedule to a lane so that no two schedules in the same lane
 * overlap. Uses a greedy first-fit algorithm sorted by start_week.
 * Non-overlapping schedules share a lane; overlapping ones get separate lanes.
 */
export function assignLanes(
  schedules: Array<{ id: string; start_week: number; end_week: number }>,
): LaneResult {
  if (schedules.length === 0) return { laneMap: new Map(), totalLanes: 0 };

  const sorted = [...schedules].sort((a, b) => a.start_week - b.start_week);
  const lanes:   Array<typeof sorted> = [];
  const laneMap = new Map<string, number>();

  for (const sched of sorted) {
    let assigned = false;
    for (let i = 0; i < lanes.length; i++) {
      if (!lanes[i].some((existing) => schedulesOverlap(sched, existing))) {
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

// ── Desktop lane geometry ─────────────────────────────────────────────────────

export const BASE_ROW_HEIGHT      = 60;
export const BASE_BAR_HEIGHT      = 28;
export const BAR_GAP              = 2;
export const ROW_PADDING          = 8;
export const MIN_BAR_HEIGHT       = 8;
export const LABEL_MIN_BAR_HEIGHT = 18;

export interface LaneGeometry {
  barHeight:  number;
  rowHeight:  number;
  topForLane: (lane: number) => number;
}

export function computeLaneGeometry(totalLanes: number): LaneGeometry {
  if (totalLanes <= 1) {
    return {
      barHeight:  BASE_BAR_HEIGHT,
      rowHeight:  BASE_ROW_HEIGHT,
      topForLane: () => ROW_PADDING + BASE_BAR_HEIGHT / 2,
    };
  }
  const usableHeight = BASE_ROW_HEIGHT - 2 * ROW_PADDING;
  const barHeight = Math.max(
    MIN_BAR_HEIGHT,
    Math.floor((usableHeight - (totalLanes - 1) * BAR_GAP) / totalLanes),
  );
  const needed    = 2 * ROW_PADDING + totalLanes * barHeight + (totalLanes - 1) * BAR_GAP;
  const rowHeight = Math.max(BASE_ROW_HEIGHT, needed);
  return {
    barHeight,
    rowHeight,
    topForLane: (lane) => ROW_PADDING + lane * (barHeight + BAR_GAP),
  };
}

// ── Mobile 48-segment model ───────────────────────────────────────────────────

export const TOTAL_SEGS = 48; // 12 months × 4

/** Convert ISO week (1–52) to segment index (0–47). */
export function weekToSeg(week: number): number {
  return Math.min(TOTAL_SEGS - 1, Math.floor((week - 1) / TOTAL_WEEKS * TOTAL_SEGS));
}

/**
 * Build an active-segment array (length 48) from a schedule's week range.
 * Handles year-wrapping schedules.
 */
export function buildSegmentArray(s: Pick<Schedule, "start_week" | "end_week">): boolean[] {
  const segs  = new Array<boolean>(TOTAL_SEGS).fill(false);
  const start = weekToSeg(s.start_week);
  const end   = weekToSeg(s.end_week);
  if (end >= start) {
    for (let i = start; i <= end; i++) segs[i] = true;
  } else {
    for (let i = start; i < TOTAL_SEGS; i++) segs[i] = true;
    for (let i = 0; i <= end; i++) segs[i] = true;
  }
  return segs;
}

/**
 * Merge multiple segment arrays (boolean OR) into one.
 * Used to combine non-overlapping schedules on the same lane.
 */
export function mergeSegmentArrays(arrays: boolean[][]): boolean[] {
  const merged = new Array<boolean>(TOTAL_SEGS).fill(false);
  for (const arr of arrays) {
    for (let i = 0; i < TOTAL_SEGS; i++) {
      if (arr[i]) merged[i] = true;
    }
  }
  return merged;
}

/** Border-radius for a segment based on its neighbours in the same row. */
export function segBorderRadius(active: boolean[], i: number): string {
  const prev = i > 0           && active[i - 1];
  const next = i < TOTAL_SEGS - 1 && active[i + 1];
  if (!prev && !next) return "4px";
  if (!prev && next)  return "4px 1px 1px 4px";
  if (prev  && !next) return "1px 4px 4px 1px";
  return "1px";
}

/**
 * Build lane data for mobile rendering.
 * Returns one entry per lane, each with:
 *   - the merged segment array (OR of all schedules in that lane)
 *   - the color (from the first schedule in that lane — best-effort)
 *   - all schedule ids in this lane (for tooltip / detail)
 */
export interface MobileLane {
  segments:    boolean[];
  color:       string;
  scheduleIds: string[];
}

export function buildMobileLanes(
  schedules: Schedule[],
): MobileLane[] {
  if (schedules.length === 0) return [];

  const { laneMap, totalLanes } = assignLanes(schedules);

  const lanes: MobileLane[] = Array.from({ length: totalLanes }, () => ({
    segments:    new Array<boolean>(TOTAL_SEGS).fill(false),
    color:       "#4a7c4a",
    scheduleIds: [] as string[],
  }));

  for (const s of schedules) {
    const lane = laneMap.get(s.id) ?? 0;
    const segs = buildSegmentArray(s);
    // Merge into lane's segment array
    for (let i = 0; i < TOTAL_SEGS; i++) {
      if (segs[i]) lanes[lane].segments[i] = true;
    }
    // Use first schedule's color for this lane
    if (lanes[lane].scheduleIds.length === 0 && s.color) {
      lanes[lane].color = s.color;
    }
    lanes[lane].scheduleIds.push(s.id);
  }

  return lanes;
}
