---
id: TASK-065
title: Verify and fix local Docker build
status: In Progress
assignee:
  - '@agent'
created_date: '2026-05-10 21:29'
updated_date: '2026-05-11 16:36'
labels:
  - infrastructure
dependencies: []
priority: high
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Docker configuration (Dockerfiles, docker-compose.yml) was created in TASK-012 and only verified with 'docker compose config' for syntax correctness — never with an actual build. The full application has been implemented since then. Goal is to ensure 'docker compose up --build' produces a working stack locally before the CI pipeline is set up in TASK-066.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docker compose up --build completes without build errors
- [ ] #2 Frontend is reachable at http://localhost:3000 and renders the application
- [ ] #3 Backend responds to http://localhost:3000/health with {status: ok}
- [ ] #4 API calls from the frontend reach the backend through the nginx proxy (/api/)
- [ ] #5 Data persists across container restarts (Docker volume)
- [ ] #6 All Dockerfile paths and CMD entries match the actual build output structure
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run docker compose up --build and document errors
2. Backend Dockerfile: verify CMD path against actual dist output structure
3. Frontend Dockerfile: verify Vite build output and nginx.conf proxy config
4. Manually verify all 6 ACs
5. Update README.md if needed
6. Check off ACs, add final summary, move to In Review
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
