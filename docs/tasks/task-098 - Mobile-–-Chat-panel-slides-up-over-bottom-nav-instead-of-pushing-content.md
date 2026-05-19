---
id: TASK-098
title: Mobile – Chat panel slides up over bottom nav instead of pushing content
status: Done
assignee:
  - '@agent'
created_date: '2026-05-17 01:10'
updated_date: '2026-05-19 19:43'
labels: []
dependencies: []
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently ChatPanel is rendered in-flow between the main content and BottomNav, expanding from height 0 to 210px and pushing the main content upward. This means the chat panel shrinks the plan area, the plant list, etc. The new behaviour: ChatPanel renders as position:fixed from the bottom of the screen, slides up over the BottomNav (which stays in place), and slightly reduces the main content area via a bottom padding/margin equal to the panel height. This change is made centrally in ChatPanel in MobileParts.tsx and therefore applies to all mobile views at once: MobileTaskView, MobilePlanView, MobilePlantsView, MobilePlantDetailView, and any future views. The SnapSheet (planned, see snap-sheet task) must start above the ChatPanel when both are open.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ChatPanel is position:fixed at the bottom of the viewport, overlapping BottomNav when open
- [x] #2 When ChatPanel opens, the main content area gets a bottom padding/offset equal to the panel height so content is not hidden behind the panel
- [x] #3 BottomNav remains visible at its fixed position and is covered by ChatPanel while it is open — no layout shift on the BottomNav itself
- [x] #4 When ChatPanel closes, the bottom offset is removed and BottomNav is fully visible again
- [x] #5 Behaviour is identical across all mobile views (MobileTaskView, MobilePlanView, MobilePlantsView, MobilePlantDetailView) — change is made once in MobileParts.tsx
- [x] #6 The planned SnapSheet anchors its bottom edge to the top of the ChatPanel when both are open, so they never overlap each other
- [x] #7 No regression — open/close toggle, message sending, and close button behave as before
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
ChatPanel is now position:fixed at viewport bottom (zIndex:100), overlapping BottomNav when open. CSS custom property --mobile-chat-height (0px/210px) is set on <html> by ChatPanel via useEffect. All mobile scroll areas read this var as paddingBottom so content remains accessible. PlanSnapSheet anchors its bottom to var(--mobile-chat-height) with a matching .25s ease transition, and uses zIndex:101 to stay above ChatPanel. MobileSettingsView unchanged. 4 new tests covering AC#1/2/3/4.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
