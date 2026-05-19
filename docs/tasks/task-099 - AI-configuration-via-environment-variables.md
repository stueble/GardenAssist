---
id: TASK-099
title: AI configuration via environment variables
status: Ready
assignee: []
created_date: '2026-05-19 19:57'
labels: []
dependencies: []
ordinal: 96000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Area:** Backend / Infrastructure
**Date:** 2026-05-19

---

**As a** developer
**I want to** configure the AI provider, model, and API key via environment variables
**so that** I can run and test the application without entering credentials in the Settings UI every time.

## Technical Notes

- `AI_PROVIDER`, `AI_MODEL`, and `AI_API_KEY` env vars must be read by the backend at runtime.
- `getSettings()` in `apps/backend/src/services/settings.service.ts` should overlay env values on top of the DB row before returning — env always wins.
- Settings UI must display the env-provided values as if the user had typed them (no special visual treatment required).
- `docker-compose.yml` and `docker-compose.prod.yml` must forward the three new vars from the host env to the backend container (`${AI_PROVIDER:-}` etc.).
- `.env.example` must document the three new variables with commented-out examples.
- `README.md` must get a new section documenting all available env vars, including the three AI ones.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AI_PROVIDER, AI_MODEL, and AI_API_KEY env vars are read in getSettings() and override any DB-stored values
- [ ] #2 Settings UI shows env-provided values as if entered manually
- [ ] #3 docker-compose.yml and docker-compose.prod.yml forward the three new vars to the backend service
- [ ] #4 .env.example documents AI_PROVIDER, AI_MODEL, and AI_API_KEY with commented-out examples
- [ ] #5 README.md contains a new Environment Variables section listing and explaining all supported vars
- [ ] #6 Existing tests still pass; at least one new test covers the env-override behaviour in settings.service
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
