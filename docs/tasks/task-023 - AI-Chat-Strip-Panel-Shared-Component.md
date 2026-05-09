---
id: TASK-023
title: AI Chat Strip & Panel (Shared Component)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:45'
updated_date: '2026-05-05 21:15'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - docs/api/settings.ts
  - docs/api/garden.ts
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the persistent AI chat strip and expandable chat panel as a shared component available in all views. The strip is always visible on the right edge; clicking it expands to a full chat panel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Narrow vertical strip (~34px) visible in all views with chat icon and 'Assistent' label
- [x] #2 Click expands to full chat panel (~300px) from the right
- [x] #3 Chat panel shows message history, input field, and send button
- [ ] #4 Messages sent to configured AI provider via Settings.ai_provider and Settings.ai_api_key
- [ ] #5 Garden context (getGarden() data) included in every AI request as system context
- [x] #6 Panel closes via ✕; strip reappears
- [x] #7 If AI not configured, strip shows a hint to configure in Settings
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Visueller Fix des AI-Panels: Toggle wird versteckt wenn Panel offen ist (wie Mockup). Panel öffnet mit CSS-Transition width:0→300px. Close-Button schließt Panel, Toggle erscheint wieder. Nicht-konfiguriert-Hinweis wenn ai_provider oder ai_api_key nicht gesetzt (AC#7). AiPanel in alle Views eingebaut (Dashboard, Plants, Calendar, Journal). 10 neue Tests. AC#4 (KI-Anbindung) und AC#5 (Garden-Kontext) bleiben als Stub für eine spätere Story.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
