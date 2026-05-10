---
id: TASK-058
title: Calendar – Overlapping schedule bars rendered in lanes
status: Ready
assignee: []
created_date: '2026-05-09 17:55'
updated_date: '2026-05-10 21:47'
labels:
  - frontend
  - calendar
dependencies: []
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the calendar Gantt view to correctly display multiple overlapping schedules per plant.

## Problem

Currently all schedule bars in a plant row are rendered at the same vertical position (top: 50%). When two schedules overlap in time, the later one in the array covers the earlier one — the user cannot see both.

## Solution

Implement a lane-assignment algorithm that groups overlapping bars into horizontal lanes. Overlapping bars are rendered smaller and stacked vertically within the row; non-overlapping bars keep the full height.

## Lane Assignment Algorithm

1. Sort schedules by start_week
2. For each schedule, find the first lane where no existing bar overlaps
3. Assign the schedule to that lane (create a new lane if needed)
4. Render each lane at an evenly distributed vertical position within the row

## Example

A rose with bloom (Apr–Jun) and a second bloom (May–Aug) of different colors:

Before: second bar invisible (covered by first)
After:
  ┌─────────────────────────────────────────┐
  │  ░░░ [── bloom 1 ──]                    │  ← lane 1 (13px)
  │  ░░░       [──── bloom 2 ────]          │  ← lane 2 (13px)
  └─────────────────────────────────────────┘
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When a plant has multiple schedules of the same type that overlap in time, they are rendered as separate thinner bars stacked vertically within the row
- [ ] #2 Non-overlapping bars for the same plant continue to use the full row height
- [ ] #3 Lane assignment is calculated per plant row: each overlapping group of bars is split into the minimum number of lanes needed (no two bars in the same lane overlap)
- [ ] #4 Bar height scales with the number of lanes: 1 lane = 28px (current), 2 lanes = 13px each, 3+ lanes = proportionally smaller, with 2px gap between lanes
- [ ] #5 Row height grows to accommodate multiple lanes so bars are never clipped
- [ ] #6 Tooltips (label + month range) still appear on hover for each individual bar
- [ ] #7 Wrapping schedules (end_week < start_week) are handled correctly in lane assignment
- [ ] #8 Tests cover lane assignment logic for overlapping and non-overlapping schedules
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
