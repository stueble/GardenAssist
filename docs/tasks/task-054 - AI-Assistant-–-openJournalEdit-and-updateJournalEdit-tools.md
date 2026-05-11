---
id: TASK-054
title: AI Assistant – Add editJournal() tool
status: Ready
assignee: []
created_date: '2026-05-09 00:39'
updated_date: '2026-05-11 15:00'
labels: []
dependencies: []
references:
  - ui-mockups/ai-fild-suggestion/ai-field-suggestion.html
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the AI assistant to the JournalEditDialog via tool editJournal() to optionally open the journal edit dialog to add a new or edit an existing journal entry. AI-suggested fields use the same visual treatment as PlantEditDialog (green tint, ti-sparkles icon, × revert button) via the shared applyAiSuggestions() utility introduced in the Plant AI story. Changes are only applied if the user clicks "save"
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tool openJournalEdit(prefill?) opens the journal entry panel, optionally prefilled with entry_type, plant_id, date, title, notes
- [ ] #2 Tool updateJournalEdit(fields) sets the given fields in the currently open journal panel; if no panel is open, the assistant replies with an error
- [ ] #3 AI-suggested fields use the shared applyAiSuggestions() visual treatment (green tint, ti-sparkles, × revert)
- [ ] #4 The assistant never calls createJournalEntry() or updateJournalEntry() directly
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
