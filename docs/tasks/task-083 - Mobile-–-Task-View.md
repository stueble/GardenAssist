---
id: TASK-083
title: Mobile – Task View
status: Ready
assignee: []
created_date: '2026-05-15 15:45'
labels: []
dependencies: []
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile task view (Aufgaben) as the primary landing screen for the mobile layout. The view shows weather warnings, a grouped task list, and provides access to the AI assistant and left navigation drawer. All panels are in-flow (not overlays) so the user can scroll the main content even when the assistant is open.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Top bar contains: hamburger icon (opens left drawer), title 'Aufgaben', + button (opens new-task sheet), chat bubble icon (opens AI assistant panel) — in that order left to right
- [ ] #2 Left drawer slides in from the left and contains: Settings, Appearance, Export Data, About
- [ ] #3 Weather widget collapsed by default, showing current temperature, city, and warning pills only (frost pill and/or moisture pill when thresholds are exceeded)
- [ ] #4 Weather widget expands on tap to show 5-day forecast (icon + max/min temperature on one line) and per-zone moisture sparkline graphs for the last 14 days with a threshold dashed line; zones below threshold show an orange warning label
- [ ] #5 Frost warning banner appears below the weather widget when a frost event is forecast for a plant
- [ ] #6 Task list is grouped into three sections: Überfällig (overdue), Diese Woche (due this week), Demnächst (upcoming); each section header shows label and count
- [ ] #7 Each task row shows: color-coded circular checkbox, task title, plant tag, location (pin icon + name), bloom color pill (colored background + color name), relative due date; overdue tasks also show a Skip button
- [ ] #8 Tapping the checkbox marks the task as done (visual fade); Skip button marks as skipped
- [ ] #9 AI assistant panel opens in-flow below the task list, pushing the scroll area up — not as an overlay; both areas remain independently scrollable
- [ ] #10 New-task sheet opens in-flow above the bottom nav (same pattern as assistant panel) with fields: title, plant picker, due date; + button toggles to ✕ when open; new-task and assistant panels are mutually exclusive
- [ ] #11 Bottom navigation bar shows five tabs: Aufgaben (active), Pflanzen, Kalender, Tagebuch, Plan
- [ ] #12 Search area below top bar contains a green-tinted pill (background #dde8d8) with search icon; no white background wrapper around the pill
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
