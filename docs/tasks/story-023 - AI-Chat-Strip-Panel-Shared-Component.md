---
id: STORY-023
title: AI Chat Strip & Panel (Shared Component)
status: Ready
assignee: []
created_date: '2026-05-04 22:45'
labels: []
dependencies: []
documentation:
  - docs/docs/doc-004 - 004-UX-UI-Concept-Dashboard.md
  - docs/api/settings.ts
  - docs/api/garden.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the persistent AI chat strip and expandable chat panel as a shared component available in all views. The strip is always visible on the right edge; clicking it expands to a full chat panel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Narrow vertical strip (~34px) visible in all views with chat icon and 'Assistent' label
- [ ] #2 Click expands to full chat panel (~300px) from the right
- [ ] #3 Chat panel shows message history, input field, and send button
- [ ] #4 Messages sent to configured AI provider via Settings.ai_provider and Settings.ai_api_key
- [ ] #5 Garden context (getGarden() data) included in every AI request as system context
- [ ] #6 Panel closes via ✕; strip reappears
- [ ] #7 If AI not configured, strip shows a hint to configure in Settings
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
