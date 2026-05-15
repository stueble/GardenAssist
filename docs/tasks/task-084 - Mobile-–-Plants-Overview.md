---
id: TASK-084
title: Mobile – Plants Overview
status: Ready
assignee: []
created_date: '2026-05-15 15:46'
labels: []
dependencies: []
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile plants overview (Pflanzen) with a toggleable list and card view. The view provides search, shows plant details relevant for quick identification in the garden, and follows the same top bar, assistant panel, and bottom nav conventions as the other mobile views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Top bar contains: hamburger icon (opens left drawer), title 'Pflanzen', list/card view toggle (two icon buttons in a grouped control), + button (opens new-plant flow), chat bubble icon (opens AI assistant panel) — in that order left to right; a visible gap separates the view toggle from the + button
- [ ] #2 Search pill below top bar uses background #dde8d8 with no white wrapper, search icon on the left, placeholder 'Name, Standort …'; no border or box-shadow on the input element
- [ ] #3 List view shows one plant per row: 40×40px thumbnail (emoji/image, rounded 8px), name + botanical name, location (pin icon + name) + watering zone (blue pill), next task status badge + task name right-aligned; rows separated by a subtle divider
- [ ] #4 Task status badge in list view is color-coded: Überfällig (red), Diese Woche (amber), Demnächst (blue), OK (green)
- [ ] #5 Card view shows a 2-column grid; each card has: image area (4:3 aspect ratio), plant name, botanical name (italic), location (pin icon), watering zone pill (bottom left), status dot (bottom right) colored by task status
- [ ] #6 View toggle state is preserved when navigating away and returning to the view within the same session
- [ ] #7 AI assistant panel opens in-flow above the bottom nav, pushing the plant list up; both areas remain independently scrollable
- [ ] #8 Bottom navigation bar shows five tabs: Aufgaben, Pflanzen (active), Kalender, Tagebuch, Plan
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
