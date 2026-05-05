---
id: STORY-039
title: Wrong font rendering
status: Done
assignee:
  - '@agent'
created_date: '2026-05-05 16:37'
updated_date: '2026-05-05 16:54'
labels:
  - bug
dependencies: []
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The font shown by the implementation looks different than the font of the mockup. This is the case for the application title, but also for the section header, e.g., "Einstellungen" of the settings. 

Here a hint of claude:

Der Entwickler sollte in index.css den @import für Google Fonts kontrollieren — er muss die gleichen Gewichte wie das Mockup laden:
css/* Soll so aussehen: */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
Wenn dort nur wght@400 oder wght@0,400 steht, fehlt Weight 600 und der Browser synthetisiert — das ist der typische Grund für sichtbare Font-Unterschiede zwischen Mockup und Implementierung.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CSS @import für Google Fonts aus index.css entfernt und als <link rel=preconnect> + <link rel=stylesheet> in index.html verschoben. CSS @import nach einem anderen @import (hier: @import 'tailwindcss') kann von Browsern und Bundlern ignoriert werden, was zu synthetisierten Fallback-Fonts führt. Das <link>-Tag in index.html lädt die Fonts zuverlässig und früh. Tokens-Tests auf index.html umgestellt und um Weight-Checks erweitert.
<!-- SECTION:FINAL_SUMMARY:END -->
