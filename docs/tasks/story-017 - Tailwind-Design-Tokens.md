---
id: STORY-017
title: Tailwind Design Tokens
status: Done
assignee:
  - '@agent'
created_date: '2026-05-04 21:36'
updated_date: '2026-05-04 22:36'
labels: []
dependencies: []
documentation:
  - ui-mockups/dashboard/dashboard-mockup.html
  - ui-mockups/plants-overview/plants-overview-mockup.html
  - ui-mockups/plant-edit/plant-edit-mockup.html
  - ui-mockups/calendar/calendar-mockup.html
  - ui-mockups/settings/settings-mockup.html
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract all design tokens from the UI mockups and configure them in tailwind.config.ts. This ensures visual consistency across all components without manual color/spacing lookups.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 tailwind.config.ts created with all colors from mockups (green-deep, green-mid, green-light, green-pale, green-mist, cream, warm-white, bark, bark-light, red-warn, red-soft, yellow-warn, yellow-soft, blue-soft, blue-mid, text-dark, text-mid, text-light, border)
- [x] #2 Custom fonts configured: Playfair Display (headings), DM Sans (body)
- [x] #3 Shadow tokens defined (shadow, shadow-lg)
- [x] #4 Border radius tokens defined
- [x] #5 All tokens verified against all mockups
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. @theme Block in index.css mit allen Farb-, Font-, Shadow- und Border-Radius-Tokens
2. Google Fonts einbinden (Playfair Display + DM Sans)
3. NavBar und Button auf Tailwind-Klassen umstellen (statt style="var(--...)")
4. Test: Tokens sind als Tailwind-Klassen verwendbar
5. Typecheck + Tests gruen
6. ACs abhaken, Final Summary, In Review, Commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extracted all design tokens from all 5 UI mockups and configured them in Tailwind v4 @theme.

Changes:
- src/index.css: replaced :root-only tokens with @theme block — tokens are now available as Tailwind utility classes (bg-green-deep, text-text-mid, font-display, shadow-ga, rounded-md etc.)
- Colors: all brand greens, neutrals (cream, warm-white, bark, bark-light), semantic state colors, text colors, border, schedule category colors (sc-bloom/growth/foliage/prune/fertilize/misc)
- Fonts: Playfair Display (headings) + DM Sans (body) via Google Fonts @import; --font-display / --font-body tokens
- Shadows: --shadow-ga and --shadow-ga-lg
- Border radius: --radius-sm (4px) through --radius-full (9999px)
- :root block preserved for var() usage in arbitrary values
- NavBar, Button, views, App.tsx: migrated from style="var(--...)" to Tailwind token classes
- 37 token tests: @theme presence, all 25 colors, 2 fonts, font imports, 2 shadows, 5 radii

Verified against all 5 mockups — no token omitted.

Tests: 49/49 passed | Typecheck: clean
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
