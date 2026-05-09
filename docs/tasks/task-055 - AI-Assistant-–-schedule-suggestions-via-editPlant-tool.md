---
id: TASK-055
title: AI Assistant – schedule suggestions via editPlant tool
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-09 16:17'
updated_date: '2026-05-09 16:37'
labels: []
dependencies: []
references:
  - apps/frontend/src/hooks/usePlantEditContext.ts
  - apps/frontend/src/components/PlantEditDialog.tsx
  - apps/frontend/src/__tests__/aiTools.test.tsx
documentation:
  - docs/api/schedule.ts
  - apps/frontend/src/lib/aiPrompt.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The assistant can currently only pre-fill scalar plant fields (name, location, etc.) via the editPlant tool. Schedules are explicitly excluded from PlantEditFields, not handled in applyAiFields, and not documented in the system prompt. All three gaps must be closed so the assistant can suggest e.g. bloom periods or pruning windows directly into the edit dialog.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 schedules field added to PlantEditFields (usePlantEditContext.ts) as an optional array with objects: schedule_type, start_week, end_week, color (nullable), label (nullable), notes (nullable)
- [x] #2 applyAiFields in PlantEditDialog processes an incoming schedules array: each object is converted to a ScheduleRow and inserted additively via setScheduleRows (existing entries are preserved)
- [x] #3 AI-inserted schedule rows are visually marked as AI suggestions (consistent with scalar fields) and can be individually removed
- [x] #4 TOOLS_DESCRIPTION in aiPrompt.ts (de + en) documents the schedules field with allowed schedule_type values (bloom | growth | foliage | pruning | fertilization | misc), the field schema, and an example JSON block
- [x] #5 System prompt explains that start_week > end_week denotes a year-wrap interval (e.g. W48–W06)
- [x] #6 At least 6 new tests: type check, applyAiFields with schedules, additive behaviour, no direct API write triggered, prompt string contains 'schedules'
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added schedule suggestions to editPlant tool. AiScheduleSuggestion type with action add/remove/update. ScheduleRow extended with aiAction/aiPrev. applyAiFields processes schedules additively. ScheduleEntryRow: orange border+background for AI rows, ✦ icon, struck-through display for 'remove', × reverts to original state. ScheduleSection auto-opens when AI rows present. remove-rows filtered before save. TOOLS_DESCRIPTION documents schedules field with year-wrap explanation. serializePlant now includes schedule IDs. 8 new tests, 331/331 pass.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
