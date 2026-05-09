---
id: TASK-045
title: Delete all data
status: Done
assignee:
  - agent
created_date: '2026-05-08 20:36'
updated_date: '2026-05-08 22:35'
labels:
  - user story
dependencies: []
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the Delete all data feature of the backup/restore settings
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
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
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Backend
- **deleteAllData(db, dataDir)** service function
  - Deletes all plants (cascades via FK)
  - Deletes garden-level journal entries (plant_id = null)
  - Resets garden.plan_url to null
  - Deletes attachment files from disk (best-effort)
  - Preserves garden and settings singletons

- **DELETE /api/garden/all** route
  - Calls deleteAllData() service
  - Returns empty garden after deletion
  - Error handling with 500 response on failure

### Frontend
- **handleDeleteAll()** in SettingsView
  - Two-step confirmation dialog (German)
  - First dialog: Details what will be deleted
  - Second dialog: Final confirmation
  - Calls api.deleteAllData() and reloads page on success
  - Shows error alerts on failure

### API Update
- Added `deleteAllData(): Promise<Garden>` to Api interface

### Testing
- 4 delete service tests:
  - Deletes all plants and journal entries
  - Preserves singletons (garden, settings, API key)
  - Deletes garden-level journal entries
  - Resets garden.plan_url to null

### Results
- All 99 backend tests passing ✅
- All 302 frontend tests passing ✅
- No regressions ✅
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->
