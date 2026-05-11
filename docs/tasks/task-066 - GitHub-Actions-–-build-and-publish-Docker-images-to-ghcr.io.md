---
id: TASK-066
title: GitHub Actions – build and publish Docker images to ghcr.io
status: Ready
assignee: []
created_date: '2026-05-10 21:29'
updated_date: '2026-05-11 16:57'
labels:
  - infrastructure
dependencies:
  - TASK-065
priority: medium
ordinal: 66250
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Once the local Docker build is verified in TASK-065, a GitHub Actions workflow should automatically build both images on every push to main and publish them to the GitHub Container Registry (ghcr.io). This allows the application to be installed on any server via docker compose pull + up -d without a local build.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GitHub Actions workflow created at .github/workflows/docker-publish.yml
- [ ] #2 Workflow builds apps/backend/Dockerfile and apps/frontend/Dockerfile as separate images
- [ ] #3 Images are pushed to ghcr.io/<owner>/gardenassist-backend and ghcr.io/<owner>/gardenassist-frontend
- [ ] #4 Image tags: branch name (e.g. main), semantic version on Git tags (v*.*.*), sha-<commit>
- [ ] #5 No push on pull requests – build only for verification
- [ ] #6 GitHub Actions cache (type=gha) used for faster subsequent builds
- [ ] #7 docker-compose.prod.yml added to project root referencing the ghcr.io images (no local build)
- [ ] #8 README.md updated with server installation instructions using docker-compose.prod.yml
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
