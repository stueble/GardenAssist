---
id: TASK-072
title: Mouse-over of Pins only partly visible
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-10 22:39'
updated_date: '2026-05-10 22:45'
labels:
  - bug
dependencies: []
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The infomration shown be the mouse-over of pins is partly hidden by other pins. The mouse-over should always be the topmost layer. The same for the mouse-over of the calendar bar. The mouse-over is party covered by the assistant.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 mouse-over information of pins are always visible completely
- [x] #2 mouse-over infromation of the month bar is always visible completely
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pin-Tooltips: Von CSS-hover auf React-Hover-State mit position:fixed umgestellt. Tooltip wird jetzt mit zIndex:9999 direkt im Viewport gerendert — nie durch overflow:hidden Parent-Container oder andere Pins abgeschnitten/überdeckt. MonthBand-Tooltips: Center-Container von overflow:hidden auf overflow:visible geändert damit Tooltips nach oben ragen können. MonthTooltip-zIndex von 201 auf 9999 erhöht. 4 neue Tests für Pin-Tooltip. 418/418 grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
