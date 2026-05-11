---
id: TASK-066
title: GitHub Actions – build and publish Docker images to ghcr.io
status: Done
assignee:
  - '@agent'
created_date: '2026-05-10 21:29'
updated_date: '2026-05-11 22:15'
labels:
  - infrastructure
dependencies:
  - TASK-065
priority: medium
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Once the local Docker build is verified in TASK-065, a GitHub Actions workflow should automatically build both images on every push to main and publish them to the GitHub Container Registry (ghcr.io). This allows the application to be installed on any server via docker compose pull + up -d without a local build.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GitHub Actions workflow created at .github/workflows/docker-publish.yml
- [x] #2 Workflow builds apps/backend/Dockerfile and apps/frontend/Dockerfile as separate images
- [x] #3 Images are pushed to ghcr.io/<owner>/gardenassist-backend and ghcr.io/<owner>/gardenassist-frontend
- [x] #4 Image tags: branch name (e.g. main), semantic version on Git tags (v*.*.*), sha-<commit>
- [x] #5 No push on pull requests – build only for verification
- [x] #6 GitHub Actions cache (type=gha) used for faster subsequent builds
- [x] #7 docker-compose.prod.yml added to project root referencing the ghcr.io images (no local build)
- [x] #8 README.md updated with server installation instructions using docker-compose.prod.yml
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
GitHub Actions CI/CD pipeline implemented:

- .github/workflows/docker-publish.yml: two parallel jobs (build-backend, build-frontend), each using docker/metadata-action v5 with flavor latest=auto (pre-release tags like v1.0.0-beta1 do not receive :latest), tags branch name, semver (major/minor/patch), and sha-<short>. Login and push only on non-PR events. GHA cache scoped per image for faster subsequent builds.
- docker-compose.prod.yml: production compose file referencing ghcr.io/stueble/gardenassist-backend and ghcr.io/stueble/gardenassist-frontend with named volume for data persistence. No local build required.
- README.md: new "Using pre-built images from ghcr.io" section with pull/up instructions, version pinning note, and update workflow.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
