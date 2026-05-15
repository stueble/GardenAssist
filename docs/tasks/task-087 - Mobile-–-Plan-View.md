---
id: TASK-087
title: Mobile – Plan View
status: Done
assignee:
  - '@agent'
created_date: '2026-05-15 21:46'
updated_date: '2026-05-15 21:55'
labels: []
dependencies: []
ordinal: 84000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile garden plan view (Gartenplan) as a fullscreen interactive map showing all plants as pins on the garden layout. The view fills the entire space between top bar and bottom nav. Pan is supported via touch/drag. Two zoom buttons sit in the bottom right corner, consistent with the desktop version.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Top bar contains: hamburger icon (opens left drawer), title 'Gartenplan', + button (opens new-plant flow, margin-left gap before chat icon), chat bubble icon (opens AI assistant panel) — in that order left to right
- [x] #2 Garden plan fills all available space between top bar and bottom nav; no padding or background visible around the plan itself
- [x] #3 Plant pins are rendered as colored circles with emoji; overdue pins are red (#c0392b), pins with current tasks are amber (#d4850a), all other pins are semi-transparent dark green — no distinct color to keep the map clean
- [x] #4 Tapping a pin shows a dark pill tooltip above the pin with emoji, plant name, and status label (Überfällig / Aktuell); tapping anywhere else dismisses it
- [x] #5 Legend in the top left corner (semi-transparent dark green background, backdrop blur) shows only two entries: Überfällig (red dot) and Aktuell (amber dot)
- [x] #6 Two zoom buttons in the bottom right corner (semi-transparent, grouped vertically, consistent with desktop version): fit-to-width and fit-to-height; icons ti-arrows-horizontal and ti-arrows-vertical
- [x] #7 Pan via touch drag (or mouse drag on desktop); the existing GardenPlanWidget touch-pan and pinch-zoom implementation is reused
- [x] #8 AI assistant panel opens in-flow above the bottom nav, pushing the plan area up; both areas remain independently scrollable
- [x] #9 Bottom navigation bar shows five tabs: Aufgaben, Pflanzen, Kalender, Tagebuch, Plan (active)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- MobilePlanView: TopBar (Hamburger/+/Chat), plan area fills flex-1
- Reuses GardenPlanWidget with legend=true (zoom buttons, pin rendering, pan/pinch-zoom, legend)
- Pin colors: overdue=#c0392b, due=#d4850a, ok=rgba(30,46,30,0.55)
- In-flow ChatPanel from MobileParts
- App.tsx routes /plan to MobilePlanView on mobile
- 13 tests in MobilePlanView.test.tsx; 621 total, typecheck clean
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Mobile garden plan view: fullscreen GardenPlanWidget with legend, zoom buttons, color-coded pins (overdue/current/neutral), in-flow AI chat panel and bottom nav.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
