---
id: STORY-020
title: Settings View – API Integration
status: Ready
assignee: []
created_date: '2026-05-04 22:44'
labels: []
dependencies: []
documentation:
  - docs/api/settings.ts
  - docs/api/api.ts
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Connect the Settings view to getSettings() and updateSettings() API endpoints. All fields read from and write to the API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All fields populated from getSettings() on load
- [ ] #2 Speichern calls updateSettings() with complete Settings object
- [ ] #3 Verwerfen resets all fields to last saved state
- [ ] #4 Success and error feedback shown after save
- [ ] #5 Language switch (de/en) takes effect immediately without page reload
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
