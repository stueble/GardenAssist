---
id: TASK-081
title: PWA Basic Setup (Manifest + Service Worker)
status: Done
assignee:
  - '@agent'
created_date: '2026-05-15 13:31'
updated_date: '2026-05-15 16:14'
labels: []
dependencies: []
ordinal: 79000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the app installable as a Progressive Web App. HTTPS is already in place, so only the Web App Manifest and Service Worker are missing. This allows the app to be installed on the smartphone home screen and used offline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Web App Manifest created with name, short name, icons, display: standalone, theme_color and background_color matching the design tokens
- [x] #2 Manifest linked in index.html
- [x] #3 vite-plugin-pwa installed and configured in vite.config.ts
- [x] #4 Service Worker generated with caching strategy for static assets and getGarden() API response
- [ ] #5 App is installable via 'Add to Home Screen' in Chrome/Safari on mobile
- [ ] #6 Offline access shows last cached state instead of an error
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Installed vite-plugin-pwa as devDependency
- Created public/icon-192.png and public/icon-512.png (programmatic PNG, green-deep bg + warm-white leaf)
- Created public/manifest.webmanifest with all required fields
- Updated vite.config.ts: VitePWA plugin with NetworkFirst for /api/garden
- Updated index.html: manifest link, theme-color, Apple PWA meta tags
- Added src/__tests__/pwa.test.ts (13 tests covering manifest fields and HTML meta tags)
- All 514 tests pass, typecheck clean
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added full PWA setup: web app manifest with brand colors, placeholder icons (192/512), vite-plugin-pwa with Workbox NetworkFirst caching for /api/garden and precaching of static assets, plus all required index.html meta/link tags for iOS/Android installability. 13 new tests verify manifest structure and HTML tags.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
