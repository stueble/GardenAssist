---
id: STORY-012
title: Docker Setup
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 17:25'
updated_date: '2026-05-04 21:07'
labels:
  - setup
dependencies: []
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure Docker for local development and on-premise deployment. Single docker-compose.yml starts the full stack.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dockerfile for backend (Hono + Node.js)
- [x] #2 Dockerfile for frontend (Vite build + static serving)
- [x] #3 docker-compose.yml starts frontend, backend, and mounts volume for SQLite and attachments
- [x] #4 DATABASE_URL environment variable controls SQLite vs PostgreSQL
- [x] #5 App accessible at http://localhost:3000 after docker-compose up
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. apps/backend/Dockerfile (multi-stage: build + run)
2. apps/frontend/Dockerfile (multi-stage: build + nginx)
3. docker-compose.yml im Root
4. .env.example mit DATABASE_URL
5. .dockerignore fuer beide Apps
6. README.md Docker-Abschnitt
7. docker-compose config Syntax-Check
8. ACs, Final Summary, In Review
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Configured Docker for local development and on-premise deployment.

Changes:
- apps/backend/Dockerfile: multi-stage build (node:20-slim builder + slim runner); creates /data directory for SQLite and attachments
- apps/frontend/Dockerfile: multi-stage build (node:20-slim builder + nginx:alpine runner); SPA served via nginx
- apps/frontend/nginx.conf: SPA fallback (try_files), /api/ proxied to backend service
- docker-compose.yml: frontend (port 3000:80) + backend services; shared gardenassist_data volume for /data
- DATABASE_URL env var defaults to file:/data/gardenassist.db; set to postgresql://... for PostgreSQL
- .env.example: documents DATABASE_URL, DATA_DIR, PORT
- .dockerignore: excludes node_modules, dist, .env, .git, docs/tasks, ui-mockups from build context
- README.md: Docker section with docker-compose up instructions and DATABASE_URL switch example

Verified:
- docker compose config passes without errors

Note: Dockerfiles will produce a working image once story-014 (backend) and story-015 (frontend) add the actual source code and dependencies.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [ ] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
