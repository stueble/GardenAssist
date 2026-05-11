---
id: TASK-054
title: AI Assistant – Add editJournal() tool
status: Done
assignee:
  - '@agent'
created_date: '2026-05-09 00:39'
updated_date: '2026-05-11 16:59'
labels: []
dependencies: []
references:
  - ui-mockups/ai-fild-suggestion/ai-field-suggestion.html
priority: high
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the AI assistant to the JournalEditDialog via tool editJournal() to optionally open the journal edit dialog to add a new or edit an existing journal entry. AI-suggested fields use the same visual treatment as PlantEditDialog (green tint, ti-sparkles icon, × revert button) via the shared applyAiSuggestions() utility introduced in the Plant AI story. Changes are only applied if the user clicks "save"
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tool openJournalEdit(prefill?) opens the journal entry panel, optionally prefilled with entry_type, plant_id, date, title, notes
- [x] #2 Tool updateJournalEdit(fields) sets the given fields in the currently open journal panel; if no panel is open, the assistant replies with an error
- [x] #3 AI-suggested fields use the shared applyAiSuggestions() visual treatment (green tint, ti-sparkles, × revert)
- [x] #4 The assistant never calls createJournalEntry() or updateJournalEntry() directly
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented openJournalEdit and updateJournalEdit AI tools for the journal entry panel.

Changes:
1. useJournalEditContext.ts — singleton bridge (same pattern as usePlantEditContext); exports registerJournalEditHandler / getJournalEditHandler / useJournalEditHandler
2. JournalView.tsx — EntryPanel converted to forwardRef; useImperativeHandle exposes applyAiFields(); JournalView registers handler via useJournalEditHandler; pending prefill applied via setTimeout after panel mount
3. AI-suggested fields (entry_type, plant_id, date, title, notes): green tint background + border, ✦ sparkle icon, × revert button, AI suggestions status bar
4. AiPanel.tsx — dispatches openJournalEdit and updateJournalEdit tool calls via getJournalEditHandler()
5. aiPrompt.ts — journal tool descriptions added in both DE and EN
6. 25 new tests; 444/444 pass, typecheck clean, Docker build successful
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
