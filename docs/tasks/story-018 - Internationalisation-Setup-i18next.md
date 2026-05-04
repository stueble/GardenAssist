---
id: STORY-018
title: Internationalisation Setup (i18next)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 22:08'
updated_date: '2026-05-04 22:33'
labels: []
dependencies: []
documentation:
  - docs/api/plant.ts
  - docs/api/schedule.ts
  - docs/api/journal-entry.ts
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Set up i18next and react-i18next for multilingual support. German is the default locale, English is prepared from the start. All UI text must use t() — no hardcoded strings in JSX allowed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 i18next and react-i18next installed and configured
- [x] #2 Locale files created: src/locales/de/ and src/locales/en/ with JSON files per domain (common, plants, journal, calendar, settings)
- [x] #3 All enum labels (OriginType, Lifecycle, HealthStatus, ScheduleType etc.) translated in both locales
- [x] #4 Language switcher component created (de/en)
- [x] #5 Selected language persisted in localStorage
- [x] #6 TypeScript type-safety for translation keys configured (i18next type augmentation)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Backend: language-Spalte in schema.ts, Migration, Seed, Zod
2. i18next + react-i18next installieren
3. Locale-Dateien anlegen (de/en: common, plants, journal, calendar, settings)
4. i18next konfigurieren + TypeScript-Augmentation
5. LanguageSwitcher Komponente
6. NavBar + Views auf t() umstellen
7. Tests
8. Typecheck + Tests gruen
9. ACs, Final Summary, In Review, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Set up i18next/react-i18next for multilingual support (de/en) and added language field to backend.

Backend changes:
- schema.ts: language TEXT NOT NULL DEFAULT de added to settings table
- Migration 0002 generated and applied
- seed.ts: language: "de" in default settings
- schemas/index.ts: language z.enum(["de","en"]) in SettingsSchema
- mock/index.ts: language: "de" in mockSettings()

Frontend changes:
- Installed: i18next, react-i18next, i18next-browser-languagedetector
- src/locales/de/ and src/locales/en/: 5 domain files each (common, plants, calendar, journal, settings) with all enum labels translated
- src/i18n/index.ts: i18next config with localStorage detection (key: ga_language), fallback de, static imports
- src/i18n/types.d.ts: TypeScript augmentation for type-safe t() keys
- src/components/LanguageSwitcher.tsx: DE/EN toggle buttons in NavBar right area
- NavBar: all strings via t(); LanguageSwitcher integrated
- All views: headings and subtitles via t()
- main.tsx: i18n initialized before app render
- 4 new LanguageSwitcher tests; NavBar + App tests updated with I18nextProvider and beforeEach(de)

Verified:
- 53/53 frontend tests passing
- 18/18 backend tests passing
- Both packages typecheck clean
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
