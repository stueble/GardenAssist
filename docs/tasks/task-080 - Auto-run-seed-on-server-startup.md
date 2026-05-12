---
id: TASK-080
title: Auto-run seed on server startup
status: Done
assignee:
  - '@agent'
created_date: '2026-05-12 15:41'
updated_date: '2026-05-12 16:56'
labels:
  - backend
  - seed
  - onboarding
dependencies: []
priority: medium
ordinal: 76000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On a fresh install, users see an empty application with no plants or example data. To improve the onboarding experience, the seed function should run automatically when the server starts, so default data (5 sample plants, color presets, settings) is present without requiring a manual pnpm db:seed step.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 seed() is exported from seed.ts as a named export
- [x] #2 server.ts calls seed() after migrate() on every startup
- [x] #3 Repeated starts do not duplicate data (idempotency preserved)
- [x] #4 pnpm db:seed still works as a standalone CLI command
- [x] #5 Existing backend tests remain green
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Export seed() als named export aus seed.ts
2. server.ts: seed() nach migrate() aufrufen
3. Idempotenz prüfen (seed.ts schreibt nur wenn Tabellen leer sind)
4. pnpm db:seed CLI-Skript prüfen/anpassen
5. Test für Auto-Seed schreiben
6. Bestehende Tests grün lassen
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
seed() als named export mit optionalem db-Parameter exportiert. server.ts ruft seed() nach migrate() beim Start auf. Idempotenz vollständig erhalten: INSERT OR IGNORE für Singletons, Skip-Logik für Presets und Pflanzen. CLI-Einstiegspunkt via import.meta.url Guard erhalten. 7 neue Tests in seed.test.ts, alle 145 Backend-Tests grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
