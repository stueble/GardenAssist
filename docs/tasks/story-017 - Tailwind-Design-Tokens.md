---
id: STORY-017
title: Tailwind Design Tokens
status: Ready
assignee: []
created_date: '2026-05-04 21:36'
labels: []
dependencies: []
documentation:
  - ui-mockups/dashboard/dashboard-mockup.html
  - ui-mockups/plants-overview/plants-overview-mockup.html
  - ui-mockups/plant-edit/plant-edit-mockup.html
  - ui-mockups/calendar/calendar-mockup.html
  - ui-mockups/settings/settings-mockup.html
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract all design tokens from the UI mockups and configure them in tailwind.config.ts. This ensures visual consistency across all components without manual color/spacing lookups.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 tailwind.config.ts created with all colors from mockups (green-deep, green-mid, green-light, green-pale, green-mist, cream, warm-white, bark, bark-light, red-warn, red-soft, yellow-warn, yellow-soft, blue-soft, blue-mid, text-dark, text-mid, text-light, border)
- [ ] #2 Custom fonts configured: Playfair Display (headings), DM Sans (body)
- [ ] #3 Shadow tokens defined (shadow, shadow-lg)
- [ ] #4 Border radius tokens defined
- [ ] #5 All tokens verified against all mockups
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
