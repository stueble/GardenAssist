---
id: TASK-047
title: Map scales when activating pin mode in plant edit
status: Done
assignee:
  - '@agent'
created_date: '2026-05-08 22:27'
updated_date: '2026-05-09 00:46'
labels:
  - bug
dependencies: []
ordinal: 50000
---

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. pickModeRef in GardenPlanWidget einführen (analog zu modeFitHRef/modeFitWRef)
2. pickModeRef in separatem useEffect([pickMode]) synchron halten
3. onMouseDown und onMouseUp auf pickModeRef.current umstellen
4. pickMode aus dem Dependency-Array des Haupt-useEffect entfernen
5. Redundante Cursor-Logik in onMouseUp entfernen (wird bereits vom separaten Cursor-useEffect behandelt)
6. Tests
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Ursache: pickMode war im Dependency-Array des Haupt-useEffect in GardenPlanWidget. Bei jedem Umschalten des Pick-Modus wurde der Effect neu aufgebaut — dabei wurde der ResizeObserver neu verbunden, feuerte sofort und rief initPlan() auf, was Zoom/Pan auf den Initialzustand zurücksetzte.

Fix: pickModeRef eingeführt (analog zu modeFitHRef/modeFitWRef). onMouseDown und onMouseUp lesen jetzt pickModeRef.current statt pickMode aus dem Closure. Ein separater useEffect([pickMode]) hält den Ref synchron und setzt den Cursor — das war schon vorhanden, wird jetzt auch für die Ref-Synchronisation genutzt. pickMode aus dem Haupt-useEffect-Dependency-Array entfernt. Der ResizeObserver wird nicht mehr bei jedem Pick-Mode-Wechsel neu verbunden.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
