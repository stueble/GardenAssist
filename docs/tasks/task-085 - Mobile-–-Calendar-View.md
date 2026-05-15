---
id: TASK-085
title: Mobile – Calendar View
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-15 15:47'
updated_date: '2026-05-15 17:25'
labels: []
dependencies: []
references:
  - ui-mockups/mobile/calndar/mobile_calendar.html
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile calendar view (Kalender) as a plant-centric Gantt chart showing schedule data at week-level granularity across 12 months (48 segments total). The view is read-only — no add action. The user can switch between schedule categories via horizontally scrollable filter chips and tap a plant row to see details.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Top bar contains: hamburger icon (opens left drawer), title 'Kalender', chat bubble icon (opens AI assistant panel) — no + button as this is a read-only view
- [x] #2 Horizontally scrollable filter chips below the top bar (no white background wrapper, chip background #eef4eb, active chip #2d4a2d) in the following order: 🌸 Blüte, 💧 Düngen, ✂️ Schnitt, · Sonstiges, 🍂 Blätter, 🌱 Wachstum
- [x] #3 Sticky month header row shows abbreviated month names (J F M A …) with four week-dots per month; the current month label is bold green, the current week dot is filled green
- [x] #4 Each plant occupies one row with a 72px name column (plant name + botanical name) and a bar track filling the remaining width; the bar track contains 48 equal segments (12 months × 4 weeks)
- [x] #5 Active segments are filled with the schedule color for the selected category; inactive segments show the neutral background (#f0f4ee); segment edges are rounded at run start and end (4px radius), straight where segments are contiguous
- [x] #6 A semi-transparent vertical green line marks the current week across all rows
- [x] #7 Plants with no data in the selected category are rendered at 40% opacity so the full plant list remains visible
- [x] #8 Tapping a plant row shows an inline tooltip below the list with plant name, botanical name, category color dot, and the active date range formatted as month + week number (e.g. 'Mai (W2) – August (W3)'); tapping again dismisses it
- [ ] #9 The Fächerahorn uses per-week colors in the Blätter view (green → dark green → orange → red) to reflect seasonal foliage change
- [x] #10 AI assistant panel opens in-flow above the bottom nav, pushing the chart area up; both areas remain independently scrollable
- [x] #11 Bottom navigation bar shows five tabs: Aufgaben, Pflanzen, Kalender (active), Tagebuch, Plan
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- MobileCalendarView: 48-segment Gantt (12×4), ISO-week→segment mapping
- FilterChips: bloom→fertilization→pruning→misc→foliage→growth, scroll horizontal
- StickyMonthHeader: single-char month labels, week-dots, current week filled
- PlantRow: 72px name col, multiple schedule rows stacked, current-week line
- Segment border-radius: rounded at run start/end, straight when contiguous
- Plants without data in selected category: opacity 0.4
- Inline tooltip below plant list: plant name, color dot, date range (W-format)
- Filter state preserved via module-level singleton across navigation
- App.tsx routes /calendar to MobileCalendarView on mobile
- AC #9: multiple foliage schedules with different colors render as stacked rows
- 22 tests in MobileCalendarView.test.tsx; 579 total, typecheck clean
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Mobile Gantt calendar with 48-segment week resolution, horizontally scrollable filter chips, sticky month header, multi-schedule stacked bars, current-week indicator, dimmed no-data rows, and inline tap-to-show tooltip.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
