---
id: TASK-054
title: AI Assistant – openJournalEdit() and updateJournalEdit() tools
status: Ready
assignee: []
created_date: '2026-05-09 00:39'
updated_date: '2026-05-10 21:47'
labels: []
dependencies: []
references:
  - ui-mockups/ai-fild-suggestion/ai-field-suggestion.html
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the AI assistant to the JournalEditDialog via two tools: openJournalEdit() opens the panel (optionally prefilled), updateJournalEdit() sets fields in an already-open panel on behalf of the assistant.\n\nThe assistant must never call createJournalEntry() or updateJournalEntry() directly — the user always confirms by clicking Save.\n\nAI-suggested fields use the same visual treatment as PlantEditDialog (green tint, ti-sparkles icon, × revert button) via the shared applyAiSuggestions() utility introduced in the Plant AI story.
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
