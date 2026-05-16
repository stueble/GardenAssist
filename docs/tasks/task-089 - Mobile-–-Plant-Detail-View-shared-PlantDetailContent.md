---
id: TASK-089
title: Mobile – Plant Detail View (shared PlantDetailContent)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-16 14:36'
updated_date: '2026-05-16 16:48'
labels: []
dependencies: []
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile plant detail view as a fullscreen screen, reusing the existing desktop plant detail content via a shared PlantDetailContent component. The desktop PlantDetailPanel is refactored to extract its content into PlantDetailContent without any visual or functional changes — the desktop experience stays identical. The mobile view wraps the same content in a fullscreen layout with a mobile-appropriate top bar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PlantDetailPanel refactored: inner content extracted into a standalone PlantDetailContent component — no visual or functional changes on desktop
- [x] #2 PlantDetailPanel (desktop) wraps PlantDetailContent unchanged — no regression
- [x] #3 MobilePlantDetailView is a fullscreen view with: back arrow (←) top left, plant name + botanical name two-line in the center, ✏️ Bearbeiten button top right, chat bubble icon (opens AI assistant panel) next to the edit button
- [x] #4 MobilePlantDetailView uses PlantDetailContent as-is for its body — no content changes, no duplication
- [x] #5 AI assistant panel opens in-flow above the bottom nav, pushing the content up; both areas remain independently scrollable
- [x] #6 Tapping a plant in MobilePlantsView (list or card) opens MobilePlantDetailView; back arrow returns to MobilePlantsView
- [x] #7 Bottom navigation remains visible in MobilePlantDetailView
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted PlantDetailContent from PlantDetailPanel (body + actions, no header). PlantDetailPanel (desktop) unchanged — wraps PlantDetailContent with its own header. MobilePlantDetailView: fullscreen view at /plants/:id with TopBar (← back, plant name 2-line, ✏️ stub, 💬 chat), scrollable PlantDetailContent, in-flow ChatPanel, BottomNav(/plants). MobilePlantsView: PlantListItem and PlantCard get onClick → navigate(/plants/:id). App.tsx: /plants/:id route added to mobile block. 639/640 tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
