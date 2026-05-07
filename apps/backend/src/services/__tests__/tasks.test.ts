/**
 * Task derivation tests.
 *
 * After the refactor: deriveTasks produces ONE task per schedule (not one per week).
 * Status is derived from the schedule's time window vs. the current week.
 * A schedule is resolved if ANY done/skipped JournalEntry references its schedule_id.
 */

import { describe, it, expect } from "vitest";
import { deriveTasks, toIsoWeek, isoWeekNumber, weeksInYear, expandScheduleWeeks } from "../tasks.js";
import type { Schedule } from "@api/schedule.js";

const NOW = new Date("2026-05-05T12:00:00Z"); // Tuesday of 2026-W19
const CURRENT_WEEK = "2026-W19";
const CURRENT_WEEK_NUM = 19;

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id:            "sched-001",
    schedule_type: "pruning",
    start_week:    18,
    end_week:      20,
    color:         null,
    label:         null,
    notes:         null,
    created_at:    "2026-01-01T00:00:00Z",
    updated_at:    "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── ISO helpers ───────────────────────────────────────────────────────────────

describe("isoWeekNumber", () => {
  it("returns 19 for 2026-05-05", () => {
    expect(isoWeekNumber(new Date("2026-05-05"))).toBe(19);
  });

  it("returns 1 for Jan 1 2026 (Thursday → week 1)", () => {
    expect(isoWeekNumber(new Date("2026-01-01"))).toBe(1);
  });
});

describe("weeksInYear", () => {
  it("returns 53 for 2026 (Jan 1 is Thursday)", () => {
    expect(weeksInYear(2026)).toBe(53);
  });

  it("returns 53 for 2015 (known 53-week year)", () => {
    expect(weeksInYear(2015)).toBe(53);
  });
});

describe("expandScheduleWeeks (used internally, not for task count)", () => {
  it("returns weeks within a normal range", () => {
    const weeks = expandScheduleWeeks(
      { start_week: 18, end_week: 20 },
      "2026-W17",
      "2026-W22"
    );
    expect(weeks).toEqual(["2026-W18", "2026-W19", "2026-W20"]);
  });

  it("handles year-end wrapping", () => {
    const weeks = expandScheduleWeeks(
      { start_week: 51, end_week: 2 },
      "2026-W50",
      "2027-W03"
    );
    expect(weeks).toContain("2026-W51");
    expect(weeks).toContain("2027-W01");
    expect(weeks).toContain("2027-W02");
    expect(weeks).not.toContain("2027-W03");
  });
});

// ── deriveTasks — one task per schedule ──────────────────────────────────────

describe("deriveTasks — one task per schedule", () => {
  it("generates exactly one task for a schedule active this week", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 18, end_week: 20 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].week).toBe(CURRENT_WEEK);
  });

  it("generates one task per schedule (not N tasks for N-week range)", () => {
    const tasks = deriveTasks({
      schedules: [
        makeSchedule({ id: "s1", start_week: 15, end_week: 22 }),
        makeSchedule({ id: "s2", start_week: 19, end_week: 19 }),
      ],
      journalEntries: [],
      lookbackWeeks:  8,
      lookaheadWeeks: 8,
      now:            NOW,
    });
    expect(tasks).toHaveLength(2);
  });
});

// ── Status derivation ─────────────────────────────────────────────────────────

describe("deriveTasks — status from window", () => {
  it("status is 'due' when currentWeek is within window", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 18, end_week: 20 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks[0].status).toBe("due");
  });

  it("status is 'overdue' when end_week < currentWeek", () => {
    // W13-16, current W19 → overdue
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 13, end_week: 16 })],
      journalEntries: [],
      lookbackWeeks:  8,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks[0].status).toBe("overdue");
  });

  it("status is 'upcoming' when start_week > currentWeek", () => {
    // W21-23, current W19 → upcoming
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 21, end_week: 23 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks[0].status).toBe("upcoming");
  });

  it("sorts: overdue first, then due, then upcoming", () => {
    const tasks = deriveTasks({
      schedules: [
        makeSchedule({ id: "s-upcoming", start_week: 22, end_week: 24 }),
        makeSchedule({ id: "s-overdue",  start_week: 13, end_week: 16 }),
        makeSchedule({ id: "s-due",      start_week: 18, end_week: 20 }),
      ],
      journalEntries: [],
      lookbackWeeks:  8,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks[0].status).toBe("overdue");
    expect(tasks[1].status).toBe("due");
    expect(tasks[2].status).toBe("upcoming");
  });
});

// ── Window filtering ──────────────────────────────────────────────────────────

describe("deriveTasks — window filtering", () => {
  it("excludes schedule whose window is before lookback", () => {
    // W1-5, lookback 4 weeks from W19 → windowStart ≈ W15 → W1-5 excluded
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 1, end_week: 5 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });

  it("excludes schedule whose window is beyond lookahead", () => {
    // W30-35, lookahead 4 weeks from W19 → windowEnd ≈ W23 → excluded
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 30, end_week: 35 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });

  it("includes schedule that partially overlaps window", () => {
    // W17-21 overlaps [W15, W23]
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 17, end_week: 21 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
  });
});

// ── Resolved by journal entry ─────────────────────────────────────────────────

describe("deriveTasks — resolved suppression", () => {
  it("suppresses a schedule when 'done' entry exists for schedule_id", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 18, end_week: 20 })],
      journalEntries: [{ schedule_id: "sched-001", week: CURRENT_WEEK, entry_type: "done" }],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });

  it("suppresses a schedule when 'skipped' entry exists for schedule_id", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 18, end_week: 20 })],
      journalEntries: [{ schedule_id: "sched-001", week: CURRENT_WEEK, entry_type: "skipped" }],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });

  it("does NOT suppress for 'manual' journal entries", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 18, end_week: 20 })],
      journalEntries: [{ schedule_id: "sched-001", week: CURRENT_WEEK, entry_type: "manual" }],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
  });

  it("suppresses only the matching schedule_id, leaves other schedules", () => {
    const tasks = deriveTasks({
      schedules: [
        makeSchedule({ id: "sched-001", start_week: 18, end_week: 20 }),
        makeSchedule({ id: "sched-002", start_week: 18, end_week: 20 }),
      ],
      journalEntries: [{ schedule_id: "sched-001", week: CURRENT_WEEK, entry_type: "done" }],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].schedule.id).toBe("sched-002");
  });

  it("suppresses regardless of which week the journal entry references", () => {
    // done entry references a different week — still suppresses the schedule
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 13, end_week: 16 })],
      journalEntries: [{ schedule_id: "sched-001", week: "2026-W13", entry_type: "done" }],
      lookbackWeeks:  8,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });
});

// ── Wrapping schedules ────────────────────────────────────────────────────────

describe("deriveTasks — wrapping schedules (end_week < start_week)", () => {
  const wrapping = makeSchedule({ id: "wrap", start_week: 50, end_week: 4 });

  it("includes wrapping schedule in window", () => {
    // W50-W04 is upcoming from W19 with 40-week lookahead
    const tasks = deriveTasks({
      schedules:      [wrapping],
      journalEntries: [],
      lookbackWeeks:  0,
      lookaheadWeeks: 40,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("upcoming");
  });

  it("wrapping schedule is 'due' when current week is within the range", () => {
    // Reference: W51 is within W50-W04
    const nov = new Date("2026-12-14T12:00:00Z"); // 2026-W51
    const tasks = deriveTasks({
      schedules:      [wrapping],
      journalEntries: [],
      lookbackWeeks:  2,
      lookaheadWeeks: 8,
      now:            nov,
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("due");
  });

  it("suppresses wrapping schedule when done entry exists", () => {
    const tasks = deriveTasks({
      schedules:      [wrapping],
      journalEntries: [{ schedule_id: "wrap", week: "2026-W51", entry_type: "done" }],
      lookbackWeeks:  0,
      lookaheadWeeks: 40,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });
});
