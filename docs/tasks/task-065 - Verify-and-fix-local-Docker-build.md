---
id: TASK-065
title: Verify and fix local Docker build
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 21:29'
updated_date: '2026-05-11 16:58'
labels:
  - infrastructure
dependencies: []
priority: high
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Docker configuration (Dockerfiles, docker-compose.yml) was created in TASK-012 and only verified with 'docker compose config' for syntax correctness — never with an actual build. The full application has been implemented since then. Goal is to ensure 'docker compose up --build' produces a working stack locally before the CI pipeline is set up in TASK-066.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 docker compose up --build completes without build errors
- [x] #2 Frontend is reachable at http://localhost:3000 and renders the application
- [x] #3 Backend responds to http://localhost:3000/health with {status: ok}
- [x] #4 API calls from the frontend reach the backend through the nginx proxy (/api/)
- [x] #5 Data persists across container restarts (Docker volume)
- [x] #6 All Dockerfile paths and CMD entries match the actual build output structure
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

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Three fixes applied to make docker compose up --build produce a working stack:

1. apps/backend/src/server.ts: Added drizzle-orm migrate() call before serve() so DB schema is applied automatically on container start.
2. apps/backend/Dockerfile: Added COPY for apps/backend/drizzle/ into the run-stage (migration SQL files are required at runtime by the migrator).
3. apps/frontend/nginx.conf: Added location /health and location /static/ proxy blocks to forward health checks and attachment/garden-plan images to the backend.

All 6 ACs verified manually with docker compose up --build: build succeeded, frontend rendered at localhost:3000, health returned {status:ok}, API calls proxied correctly, data persisted across restarts, and CMD path matched the actual dist structure.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
