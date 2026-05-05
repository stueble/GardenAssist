---
id: STORY-038
title: Wrong bottom bar location in settings dialog
status: Done
assignee:
  - '@agent'
created_date: '2026-05-05 16:29'
updated_date: '2026-05-05 16:51'
labels:
  - bug
dependencies: []
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current implementation puts the botton bar including the "Save" button always below the sessings widgets. As a result, the bottom bar may or may not be visible to the user. In contrast, the mockup always shows the bottom bar at the bottom of the window and inserts a scrollbar if the sessings widgets are larger that the available space. The behavior of the mockup is better.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Root div in App.tsx changed from min-h-screen to h-screen. min-h-screen setzt nur eine Mindesthöhe, lässt den Container aber auf auto wachsen — damit hat flex-1 + min-h-0 in den Kind-Elementen keine feste Obergrenze und overflow-y-auto greift nie. h-screen setzt eine feste Viewport-Höhe, wodurch der Flex-Baum korrekt begrenzt wird und die SaveBar immer am unteren Rand sichtbar bleibt.
<!-- SECTION:FINAL_SUMMARY:END -->
