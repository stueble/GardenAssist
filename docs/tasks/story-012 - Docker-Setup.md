---
id: STORY-012
title: Docker Setup
status: Ready
assignee: []
created_date: '2026-05-04 17:25'
updated_date: '2026-05-04 17:27'
labels:
  - setup
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure Docker for local development and on-premise deployment. Single docker-compose.yml starts the full stack.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dockerfile for backend (Hono + Node.js)
- [ ] #2 Dockerfile for frontend (Vite build + static serving)
- [ ] #3 docker-compose.yml starts frontend, backend, and mounts volume for SQLite and attachments
- [ ] #4 DATABASE_URL environment variable controls SQLite vs PostgreSQL
- [ ] #5 App accessible at http://localhost:3000 after docker-compose up
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
