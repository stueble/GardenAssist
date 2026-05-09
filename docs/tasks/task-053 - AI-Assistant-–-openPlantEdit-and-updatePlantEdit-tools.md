---
id: TASK-053
title: AI Assistant – openPlantEdit() and updatePlantEdit() tools
status: Ready
assignee: []
created_date: '2026-05-09 00:37'
updated_date: '2026-05-09 00:41'
labels:
  - frontend
  - ai
dependencies: []
references:
  - ui-mockups/ai-fild-suggestion/ai-field-suggestion.html
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wire the AI assistant to the PlantEditDialog via two tools: openPlantEdit() opens the dialog (optionally prefilled for new plants), updatePlantEdit() sets fields in an already-open dialog on behalf of the assistant.\n\nThe assistant must never call the save API directly — it may only manipulate dialog state. The user always confirms by clicking Save.\n\n## AI-suggested field visual treatment\nFields set via updatePlantEdit() are visually marked inside the dialog:\n- Green tinted background and border (matching the app's green-mist / green-mid tokens)\n- A small sparkle icon (ti-sparkles) on the left of the field value\n- An × button on the right that reverts the field to its previous value and removes the AI marker\n- A status line at the bottom of the dialog counts how many AI suggestions are still active\n\nThis diff-and-mark logic must be extracted into a shared utility (applyAiSuggestions(current, suggested)) so it can be reused by the journal story.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tool openPlantEdit(plant_id?, prefill?) is registered in the assistant: opens PlantEditDialog; if plant_id is given, opens in edit mode for that plant; if only prefill is given, opens in create mode with fields pre-filled
- [ ] #2 Tool updatePlantEdit(fields) sets the given fields in the currently open PlantEditDialog; if no dialog is open, the assistant replies with an error message instead of calling the tool
- [ ] #3 Fields set by updatePlantEdit() are visually marked: green tinted background and border, ti-sparkles icon, × revert button
- [ ] #4 Clicking × on a marked field reverts it to its previous value and removes the AI marker
- [ ] #5 A status line inside the dialog shows how many AI suggestions are still active
- [ ] #6 The assistant never calls createPlant() or updatePlant() directly — no API writes are triggered by tool use
- [ ] #7 applyAiSuggestions(current, suggested) is extracted as a shared utility reusable for other dialogs
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
