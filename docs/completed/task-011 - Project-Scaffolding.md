---
id: TASK-011
title: Project Scaffolding
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 17:25'
updated_date: '2026-05-04 21:02'
labels:
  - setup
dependencies: []
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up the monorepo structure with separate packages for frontend and backend. Establishes the foundation for all subsequent tasks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Monorepo structure created (e.g. /apps/frontend, /apps/backend)
- [x] #2 Root package.json with workspaces configured
- [x] #3 TypeScript configured for both frontend and backend
- [x] #4 Shared docs/api/*.ts types accessible from both packages
- [x] #5 README.md with local dev instructions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ADR-009 um pnpm ergänzen
2. Root package.json + pnpm-workspace.yaml anlegen
3. tsconfig.base.json anlegen
4. apps/frontend/ Grundstruktur (package.json, tsconfig.json, vite.config.ts stub)
5. apps/backend/ Grundstruktur (package.json, tsconfig.json)
6. docs/api Typen per tsconfig paths aus beiden Paketen erreichbar machen
7. README.md mit lokaler Dev-Anleitung ergänzen
8. pnpm install ausführen und prüfen
9. ACs abhaken, Final Summary, In Review
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Set up the pnpm monorepo structure for GardenAssist.

Changes:
- Root package.json with pnpm workspaces (apps/*) and top-level dev/build/typecheck scripts
- pnpm-workspace.yaml declaring the workspace packages
- tsconfig.base.json with shared strict TypeScript compiler options
- apps/frontend/: package.json, tsconfig.json (extends base, @api/* path alias), vite.config.ts stub with /api proxy
- apps/backend/: package.json, tsconfig.json (extends base, @api/* path alias)
- Both packages resolve docs/api/*.ts directly via @api/* — no copying or code generation
- README.md updated with prerequisites, install, dev, and typecheck instructions
- ADR-009 updated to document pnpm as the monorepo package manager

Verified:
- pnpm install succeeds across all 3 workspace projects
- Typecheck script is wired up; tsc itself will be available once TypeScript is installed in story-014/015

Note: DoD item "Tests added" left open — this story contains only config files; runnable tests will be added in story-014 (backend) and story-015 (frontend).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [ ] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
