---
id: STORY-045
title: Delete all data
status: In Progress
assignee:
  - agent
created_date: '2026-05-08 20:36'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Delete all data feature of the backup/restore settings
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Implementation finished
- [ ] #2 Test(s) added
- [ ] #3 No regressions introduced
- [ ] #4 Documentation updated
- [ ] #5 Changes committed
<!-- DOD:END -->

## Implementation Plan

1. Create `deleteAllData(db)` service function
   - Delete all plants (cascades to positions, schedules, journal entries, attachments)
   - Delete all journal entries not associated with plants
   - Reset garden.plan_url to null
   - Preserve: garden singleton, settings singleton, attachments on disk
   
2. Create `DELETE /api/garden/all` endpoint
   - Returns updated garden after deletion
   - Should be called only with explicit confirmation

3. Update Frontend
   - Implement `handleDeleteAll()` in SettingsView
   - Add confirmation dialog with detailed warning
   - Call api.deleteAllData()
   - Show success message

4. Tests
   - Test deleteAllData() clears all data
   - Test that singletons are preserved
   - Test that garden.plan_url reset
   - Test E2E: Delete all → Backup → Restore → Verify everything gone
   
5. UI/Strings
   - German translation for delete confirmation
