---
id: TASK-086
title: Mobile – Journal View
status: In Review
assignee:
  - '@agent'
created_date: '2026-05-15 15:47'
updated_date: '2026-05-15 18:19'
labels: []
dependencies: []
references:
  - ui-mockups/mobile/journal/mobile_journal.html
ordinal: 84000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the mobile journal view (Tagebuch) as a chronological timeline of garden entries grouped by month. The view supports filtering by entry type, inline search, and adding new entries via a sheet that opens in-flow. The view follows the same top bar, assistant panel, and bottom nav conventions as the other mobile views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Top bar contains: hamburger icon (opens left drawer), title 'Tagebuch', + button (opens new-entry sheet), chat bubble icon (opens AI assistant panel) — in that order left to right; the + toggles to ✕ when the sheet is open
- [x] #2 Search pill below the top bar uses background #dde8d8 with no white wrapper; placeholder 'Einträge durchsuchen …'; live-filters entries by title, notes, and plant name
- [x] #3 Horizontally scrollable filter chips below the search pill (no white background wrapper) in the following order: ✅ Erledigt, 👁 Beobachtung, ⚠️ Problem, 💧 Bewässerung, 💰 Ausgabe; only one chip active at a time; tapping the active chip deactivates it
- [x] #4 Timeline is grouped by month with a Playfair Display month heading and a vertical 2px line connecting entries; each entry has a color-coded dot on the line matching its type
- [x] #5 Each entry card shows collapsed by default: type badge, plant tag, entry title, date, chevron; tapping expands to show full notes text and photo slots (3 slots, last slot is a dashed + placeholder)
- [x] #6 Entry type colors — Erledigt: green (#27ae60), Beobachtung: blue (#4a78c0), Problem: red (#c0392b), Bewässerung: teal (#1d9e75), Ausgabe: amber (#d4850a)
- [x] #7 Bewässerung entries show additional fields when expanded: duration, zone, estimated volume (as teal pills)
- [ ] #8 Ausgabe entries show a cost total line when expanded
- [x] #9 New-entry sheet opens in-flow above the bottom nav with: type selector (same five types as filter chips), title input, plant picker, notes textarea; new-entry and assistant panels are mutually exclusive — opening one closes the other
- [x] #10 AI assistant panel opens in-flow above the bottom nav, pushing the timeline up; both areas remain independently scrollable
- [x] #11 Bottom navigation bar shows five tabs: Aufgaben, Pflanzen, Kalender, Tagebuch (active), Plan
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- MobileJournalView: TopBar (Hamburger/+/Chat), SearchPill (#dde8d8), 5 FilterChips
- Timeline grouped by month (Playfair Display heading, 2px vertical line, color-coded dots)
- EntryCard: collapsed by default, tap to expand (notes, photo slots)
- Irrigation entries show zone + mm as plain text when expanded (AC #7)
- NewEntrySheet: in-flow, height 0→220px, bark border-top, type selector, title/plant/notes
- Mutually exclusive: new-entry ↔ chat (öffnet → schließt das andere)
- App.tsx routes /journal to MobileJournalView on mobile
- 29 tests in MobileJournalView.test.tsx; 608 total, typecheck clean
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Mobile journal timeline with month groupings, colored type dots, collapsible entry cards, full-text search, type-filter chips, in-flow new-entry sheet and AI chat panel.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->
