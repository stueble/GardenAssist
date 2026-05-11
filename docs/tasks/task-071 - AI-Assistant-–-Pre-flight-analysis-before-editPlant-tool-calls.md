---
id: TASK-071
title: AI Assistant – Pre-flight analysis before editPlant tool calls
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-10 22:33'
updated_date: '2026-05-10 22:39'
labels:
  - ai
  - frontend
dependencies: []
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The assistant currently does not reliably check existing plant data before filling in fields or adding schedules. When asked to fill in missing info, it sometimes adds duplicate schedules or overwrites existing scalar fields — because it guesses what might be missing rather than comparing the actual current state against what should exist.

## Root Cause

The current PFLICHTREGELN in Block 1 say "Prüfe zuerst die vorhandenen Zeitpläne der Pflanze" (only for schedules) and have no equivalent for scalar fields. This is an intent statement, not a process. The model skips the comparison and infers from the plant type what "should" exist — leading to duplicates and redundant suggestions.

## Solution

Add an explicit PFLICHT-ANALYSE instruction to Block 1 (DE + EN) that the model must visibly work through before every editPlant call.

SCHRITT 1 — BESTAND:
  a) Skalare Felder: Liste alle Felder der Pflanze mit ihrem aktuellen Wert auf. Markiere leere Felder als "(leer)".
  b) Zeitpläne: Liste alle vorhandenen Zeitpläne auf (Typ, KW-Start, KW-Ende, UUID).

SCHRITT 2 — SOLL:
  Was möchte der Nutzer erreichen? Welche Felder/Zeitpläne sollen am Ende vorhanden sein?

SCHRITT 3 — DELTA:
  a) Skalare Felder: Nur "(leer)"-Felder befüllen — außer der Nutzer verlangt ausdrücklich eine Änderung eines vorhandenen Wertes.
  b) Zeitpläne add: Nur eintragen, was im BESTAND fehlt.
  c) Zeitpläne update/remove: Wenn der BESTAND vom SOLL abweicht, korrigieren.

SCHRITT 4 — AKTION: Nur das Delta aus Schritt 3 in den Tool-Aufruf einfügen.

Key requirement: "in der Antwort sichtbar" — the model must write out the analysis in its response, not just execute it internally. Invisible CoT instructions are frequently skipped.

The now-redundant existing rule "NIEMALS add verwenden für einen Zeitplan, der bereits existiert — Prüfe zuerst die vorhandenen Zeitpläne der Pflanze" can be removed from PFLICHTREGELN since it is fully covered by the new PFLICHT-ANALYSE.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Block 1 (DE + EN) contains the PFLICHT-ANALYSE / PRE-FLIGHT ANALYSIS instruction with all 4 steps
- [x] #2 The instruction explicitly requires the analysis to be visible in the assistant's response ("in der Antwort sichtbar" / "visible in the response")
- [x] #3 SCHRITT 1 covers both scalar fields (with empty-marker "(leer)") and existing schedules (type, week range, UUID)
- [x] #4 SCHRITT 3a: only empty scalar fields are filled unless the user explicitly requests a change to an existing value
- [x] #5 SCHRITT 3b: schedules are only added if absent from BESTAND
- [x] #6 SCHRITT 3c: schedule update/remove is allowed when BESTAND diverges from SOLL — no explicit user instruction required
- [x] #7 The now-redundant standalone duplicate-check rule for schedules is removed from PFLICHTREGELN
- [x] #8 Tests verify the new instruction keywords are present in Block 1 for both languages
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. PFLICHT-ANALYSE Block (DE) in Block 1 einfügen, nach den PFLICHTREGELN
2. PRE-FLIGHT ANALYSIS Block (EN) analog einfügen
3. Redundante Regel 2 (NIEMALS add / NEVER add) aus PFLICHTREGELN entfernen
4. Tests: Keywords PFLICHT-ANALYSE/PRE-FLIGHT ANALYSIS in beiden Sprachen prüfen
5. Typecheck + Tests grün, commit
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Block 1 (DE + EN) erhält eine PFLICHT-ANALYSE / PRE-FLIGHT ANALYSIS Sektion mit 4 Schritten (BESTAND, SOLL, DELTA, AKTION). Die Analyse muss explizit in der Antwort sichtbar durchgeführt werden. SCHRITT 1 deckt skalare Felder (mit (leer)-Markierung) und Zeitpläne (Typ, KW-Bereich, UUID) ab. SCHRITT 3 beschränkt Scalar-Fills auf leere Felder, Schedule-Adds auf fehlende Einträge, und erlaubt Update/Remove bei Abweichung ohne explizite User-Anweisung. Die redundante Regel "NIEMALS add verwenden..." aus PFLICHTREGELN wurde entfernt. 10 neue Tests, 414/414 grün.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
