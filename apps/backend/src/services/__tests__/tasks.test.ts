/**
 * Task derivation tests.
 *
 * These tests verify that tasks are correctly derived from schedules and that
 * resolved journal entries (done/skipped) suppress the corresponding tasks.
 * Status (overdue/due/upcoming) is verified relative to an injected reference date.
 */

import { describe, it, expect } from "vitest";
import { deriveTasks, toIsoWeek, isoWeekNumber, weeksInYear, expandScheduleWeeks } from "../tasks.js";
import type { Schedule } from "@api/schedule.js";

const NOW = new Date("2026-05-05T12:00:00Z"); // Tuesday of 2026-W19
const CURRENT_WEEK = "2026-W19";

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

describe("isoWeekNumber", () => {
  it("returns correct week for a known date", () => {
    expect(isoWeekNumber(new Date("2026-05-05"))).toBe(19);
  });

  it("returns week 1 for Jan 1 2026", () => {
    // Jan 1 2026 is a Thursday — that's in week 1
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

describe("expandScheduleWeeks", () => {
  it("returns weeks within a normal range", () => {
    const weeks = expandScheduleWeeks(
      { start_week: 18, end_week: 20 },
      "2026-W17",
      "2026-W22"
    );
    expect(weeks).toEqual(["2026-W18", "2026-W19", "2026-W20"]);
  });

  it("handles year-end wrapping (e.g. W50–W04)", () => {
    const weeks = expandScheduleWeeks(
      { start_week: 51, end_week: 2 },
      "2026-W50",
      "2027-W03"
    );
    expect(weeks).toContain("2026-W51");
    expect(weeks).toContain("2026-W52");
    expect(weeks).toContain("2027-W01");
    expect(weeks).toContain("2027-W02");
    expect(weeks).not.toContain("2027-W03"); // end_week=2, not 3
  });

  it("respects window boundaries", () => {
    const weeks = expandScheduleWeeks(
      { start_week: 1, end_week: 52 },
      "2026-W10",
      "2026-W12"
    );
    expect(weeks).toEqual(["2026-W10", "2026-W11", "2026-W12"]);
  });
});

describe("deriveTasks", () => {
  it("generates tasks for each week in the schedule window", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 19, end_week: 19 })],
      journalEntries: [],
      lookbackWeeks:  2,
      lookaheadWeeks: 2,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].week).toBe("2026-W19");
    expect(tasks[0].status).toBe("due");
  });

  it("marks past weeks as overdue", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 17, end_week: 17 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 0,
      now:            NOW,
    });
    expect(tasks[0].status).toBe("overdue");
  });

  it("marks future weeks as upcoming", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 21, end_week: 21 })],
      journalEntries: [],
      lookbackWeeks:  0,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    expect(tasks[0].status).toBe("upcoming");
  });

  it("suppresses tasks resolved with 'done' journal entries", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 19, end_week: 19 })],
      journalEntries: [{ schedule_id: "sched-001", week: "2026-W19", entry_type: "done" }],
      lookbackWeeks:  2,
      lookaheadWeeks: 2,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });

  it("suppresses tasks resolved with 'skipped' journal entries", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 19, end_week: 19 })],
      journalEntries: [{ schedule_id: "sched-001", week: "2026-W19", entry_type: "skipped" }],
      lookbackWeeks:  2,
      lookaheadWeeks: 2,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });

  it("does NOT suppress tasks for 'manual' journal entries", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 19, end_week: 19 })],
      journalEntries: [{ schedule_id: "sched-001", week: "2026-W19", entry_type: "manual" }],
      lookbackWeeks:  2,
      lookaheadWeeks: 2,
      now:            NOW,
    });
    expect(tasks).toHaveLength(1);
  });

  it("only suppresses the matching (schedule_id, week) pair", () => {
    // Both schedules have exactly W19 in their range
    const sched1 = makeSchedule({ id: "sched-001", start_week: 19, end_week: 19 });
    const sched2 = makeSchedule({ id: "sched-002", start_week: 19, end_week: 19 });
    const tasks = deriveTasks({
      schedules:      [sched1, sched2],
      journalEntries: [{ schedule_id: "sched-001", week: "2026-W19", entry_type: "done" }],
      lookbackWeeks:  2,
      lookaheadWeeks: 2,
      now:            NOW,
    });
    // sched-001/W19 resolved, sched-002/W19 still open
    expect(tasks).toHaveLength(1);
    expect(tasks[0].schedule.id).toBe("sched-002");
  });

  it("returns tasks sorted: overdue first, then due, then upcoming", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 17, end_week: 21 })],
      journalEntries: [],
      lookbackWeeks:  4,
      lookaheadWeeks: 4,
      now:            NOW,
    });
    const statuses = tasks.map((t) => t.status);
    const overdueEnd   = statuses.lastIndexOf("overdue");
    const dueStart     = statuses.indexOf("due");
    const upcomingStart = statuses.indexOf("upcoming");
    expect(overdueEnd).toBeLessThan(dueStart);
    expect(dueStart).toBeLessThan(upcomingStart);
  });

  it("returns empty array when schedule is outside the window", () => {
    const tasks = deriveTasks({
      schedules:      [makeSchedule({ start_week: 1, end_week: 2 })],
      journalEntries: [],
      lookbackWeeks:  2,
      lookaheadWeeks: 2,
      now:            NOW,
    });
    expect(tasks).toHaveLength(0);
  });
});
