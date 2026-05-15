---
id: TASK-083
title: Mobile – Task View
status: Done
assignee:
  - '@agent'
created_date: '2026-05-15 15:45'
updated_date: '2026-05-15 16:47'
labels: []
dependencies: []
references:
  - ui-mockups/mobile/tasks/mobile_tasks.html
ordinal: 80000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile task view (Aufgaben) as the primary landing screen for the mobile layout. The view shows weather warnings, a grouped task list, and provides access to the AI assistant and left navigation drawer. All panels are in-flow (not overlays) so the user can scroll the main content even when the assistant is open.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Top bar contains: hamburger icon (opens left drawer), title 'Aufgaben', + button (opens new-task sheet), chat bubble icon (opens AI assistant panel) — in that order left to right
- [x] #2 Left drawer slides in from the left and contains: Settings, Appearance, Export Data, About
- [x] #3 Weather widget collapsed by default, showing current temperature, city, and warning pills only (frost pill and/or moisture pill when thresholds are exceeded)
- [x] #4 Weather widget expands on tap to show 5-day forecast (icon + max/min temperature on one line) and per-zone moisture sparkline graphs for the last 14 days with a threshold dashed line; zones below threshold show an orange warning label
- [x] #5 Frost warning banner appears below the weather widget when a frost event is forecast for a plant
- [x] #6 Task list is grouped into three sections: Überfällig (overdue), Diese Woche (due this week), Demnächst (upcoming); each section header shows label and count
- [x] #7 Each task row shows: color-coded circular checkbox, task title, plant tag, location (pin icon + name), bloom color pill (colored background + color name), relative due date; overdue tasks also show a Skip button
- [x] #8 Tapping the checkbox marks the task as done (visual fade); Skip button marks as skipped
- [x] #9 AI assistant panel opens in-flow below the task list, pushing the scroll area up — not as an overlay; both areas remain independently scrollable
- [ ] #10 New-task sheet opens in-flow above the bottom nav (same pattern as assistant panel) with fields: title, plant picker, due date; + button toggles to ✕ when open; new-task and assistant panels are mutually exclusive
- [x] #11 Bottom navigation bar shows five tabs: Aufgaben (active), Pflanzen, Kalender, Tagebuch, Plan
- [x] #12 Search area below top bar contains a green-tinted pill (background #dde8d8) with search icon; no white background wrapper around the pill
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added useIsMobile hook (matchMedia, 768px breakpoint)
- App.tsx routes to MobileTaskView on narrow viewports, desktop unchanged
- MobileTaskView: TopBar, SearchBar, WeatherWidgetMobile (collapsed/expanded), FrostBanner, task sections (Überfällig/Diese Woche/Demnächst), TaskRow with checkbox+skip, in-flow ChatPanel, BottomNav (5 tabs), LeftDrawer
- Weather+soil data reuse singleton caches from DashboardView (no duplicate polling)
- New i18n keys in mobile.* namespace (de + en)
- Added matchMedia stub to test-setup.ts (fixes App.test.tsx regression)
- 19 new tests in MobileTaskView.test.tsx
- All 533 tests pass, typecheck clean
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented mobile task view (≤768px) with: green top bar, left drawer (Settings/About), collapsible weather widget with 5-day forecast and soil sparklines, frost warning banner, task list grouped by overdue/this week/upcoming with color-coded checkboxes and skip buttons, in-flow AI chat panel, 5-tab bottom nav.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
