---
id: TASK-044
title: Install Backup/Restore
status: Done
assignee:
  - agent
created_date: '2026-05-07 23:05'
updated_date: '2026-05-08 23:12'
labels:
  - user story
dependencies: []
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Backup and Restore functions are only stubs that need a complete implementation. Security Hint: The API key MUST not be part of the backup!
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 Implementation finished
- [x] #2 Test(s) added
- [x] #3 No regressions introduced
- [x] #4 Documentation updated
- [x] #5 Changes committed
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Backend Services
- **exportJsonData()** – Exports complete garden data as JSON object
  - Removes `ai_api_key` from settings for security
  - Includes all plants, schedules, journal entries, attachments (metadata only)
  
- **exportBackupTarGz()** – Creates tar.gz archive with metadata + all files
  - Uses Node.js built-in `zlib` (no new dependencies)
  - Format: USTAR tar with gzip compression
  - Includes `metadata.json` + `attachments/` directory with all binary files

- **importJsonData()** – Merges JSON data into database
  - Upsert semantics: insert if missing, update by id if exists
  - Preserves existing `ai_api_key` (does not overwrite)
  - Skips invalid objects, returns count and error details

- **importBackupTarGz()** – Extracts tar.gz and restores data + files
  - Decompresses in-memory, extracts JSON and attachment files
  - Restores file directory structure to disk
  - Calls importJsonData() internally

### Routes
- `GET /api/export/json` – Returns JSON blob
- `POST /api/export/backup` – Returns tar.gz blob with timestamp filename
- `GET /api/export/plants.csv` – Returns CSV blob
- `POST /api/import/json` – Accepts JSON file, merges data
- `POST /api/import/backup` – Accepts tar.gz file, restores everything

### Frontend
- Updated **DataSection** component: "Full Backup" & "Restore Backup" buttons only
- **SettingsView** handlers for backup/restore with error toasts
- Shows warning if objects were skipped during import

### Security
- ✅ API key removed from exports
- ✅ API key preserved on import (old key not overwritten)
- ✅ Filename includes timestamp for easy sorting

### Testing
- 13 export/import tests (10 unit + 3 integration tests)
- **Round-trip test**: Export → Delete → Import → Verify all data restored
- **Schedule ID preservation** test: Verifies schedule IDs maintained during import
- **API key preservation** test: Old API key not overwritten during import
- **Journal entry validation** test: Garden-level entries (plant_id=null) handled correctly
- All 95 backend tests passing ✅
- All 302 frontend tests passing ✅
- No regressions ✅

### Bug Fixes During Implementation
1. **Journal Entry FK Constraints**: Added validation for plant_id/schedule_id references before insert
   - Skips invalid entries instead of throwing errors
   - Returns detailed error messages

2. **Schedule ID Loss**: Fixed import to preserve schedule IDs from backup
   - Previous: `crypto.randomUUID()` generated new IDs, breaking journal entry references
   - Now: Uses original schedule IDs from exported data
   - Direct DB inserts instead of service functions to maintain referential integrity

### Commits
- 16afa31: Implement full backup/restore functionality with tar.gz export
- fc35a7a: Fix journal entry import validation for FK constraints
- 9684f20: Fix schedule IDs preservation and add comprehensive integration tests
<!-- SECTION:NOTES:END -->
