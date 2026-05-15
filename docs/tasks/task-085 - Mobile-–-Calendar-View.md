---
id: TASK-085
title: Mobile – Calendar View
status: Ready
assignee: []
created_date: '2026-05-15 15:47'
labels: []
dependencies: []
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile calendar view (Kalender) as a plant-centric Gantt chart showing schedule data at week-level granularity across 12 months (48 segments total). The view is read-only — no add action. The user can switch between schedule categories via horizontally scrollable filter chips and tap a plant row to see details.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Top bar contains: hamburger icon (opens left drawer), title 'Kalender', chat bubble icon (opens AI assistant panel) — no + button as this is a read-only view
- [ ] #2 Horizontally scrollable filter chips below the top bar (no white background wrapper, chip background #eef4eb, active chip #2d4a2d) in the following order: 🌸 Blüte, 💧 Düngen, ✂️ Schnitt, · Sonstiges, 🍂 Blätter, 🌱 Wachstum
- [ ] #3 Sticky month header row shows abbreviated month names (J F M A …) with four week-dots per month; the current month label is bold green, the current week dot is filled green
- [ ] #4 Each plant occupies one row with a 72px name column (plant name + botanical name) and a bar track filling the remaining width; the bar track contains 48 equal segments (12 months × 4 weeks)
- [ ] #5 Active segments are filled with the schedule color for the selected category; inactive segments show the neutral background (#f0f4ee); segment edges are rounded at run start and end (4px radius), straight where segments are contiguous
- [ ] #6 A semi-transparent vertical green line marks the current week across all rows
- [ ] #7 Plants with no data in the selected category are rendered at 40% opacity so the full plant list remains visible
- [ ] #8 Tapping a plant row shows an inline tooltip below the list with plant name, botanical name, category color dot, and the active date range formatted as month + week number (e.g. 'Mai (W2) – August (W3)'); tapping again dismisses it
- [ ] #9 The Fächerahorn uses per-week colors in the Blätter view (green → dark green → orange → red) to reflect seasonal foliage change
- [ ] #10 AI assistant panel opens in-flow above the bottom nav, pushing the chart area up; both areas remain independently scrollable
- [ ] #11 Bottom navigation bar shows five tabs: Aufgaben, Pflanzen, Kalender (active), Tagebuch, Plan
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
