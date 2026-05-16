---
id: TASK-088
title: Improve task checkbox affordance — rounded square with ghost checkmark
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-16 13:42'
updated_date: '2026-05-16 13:46'
labels: []
dependencies: []
ordinal: 85000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current circular checkbox in the task list lacks visual affordance — users unfamiliar with the UI cannot tell it is interactive. Replace it with a rounded square (border-radius: 5px) that includes a faint ghost checkmark visible in the default state, making the interactive intent immediately clear. The change applies to all task rows across the desktop dashboard and the mobile task view.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Circular checkbox replaced with a rounded square (20×20px, border-radius: 5px) in all task row components
- [x] #2 Default state shows a faint ghost checkmark (✓) at ~25% opacity in the border color, indicating the element is interactive
- [x] #3 Hover state increases ghost checkmark opacity to ~60% as additional feedback
- [x] #4 Checked state fills the square with green-mid (#4a7c4a), border-color matches fill, checkmark renders at full opacity in white
- [x] #5 Border color remains status-coded: amber (#d4850a) for due, red (#c0392b) for overdue, blue (#4a78c0) for upcoming — the ghost checkmark inherits the border color in each case
- [x] #6 Transition between states is smooth (all properties, 150ms)
- [x] #7 Change applied consistently in desktop TaskRow component and mobile task view
- [x] #8 Existing done/skipped task fade-out behavior (opacity: 0.4) is preserved
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace circular checkbox in TaskSidebar.tsx TaskRow with 20×20px rounded square (border-radius: 5px)
2. Add ghost checkmark (✓ via Check icon) at 25% opacity in default state, 60% on hover, full white when checked
3. Use onMouseEnter/Leave for hover tracking
4. Keep status-coded border colors (amber/red/blue) and smooth 150ms transition
5. Preserve opacity:0.4 fade-out on done
6. Update/add tests for the new checkbox shape
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Replaced circular checkbox in TaskRow (TaskSidebar.tsx) with a 20×20px rounded square (border-radius: 5px). Ghost checkmark always rendered via Check icon: 25% opacity default, 60% on hover, 100% white when checked. Hover tracked via onMouseEnter/Leave state. Border and ghost checkmark color remain status-coded (amber/red/blue). Checked state fills square with green-mid (#4a7c4a). All transitions 150ms. Done/skipped fade-out (opacity: 0.4) preserved. 619 frontend tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
