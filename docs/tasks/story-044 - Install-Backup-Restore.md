---
id: STORY-044
title: Install Backup/Restore
status: In Review
assignee: [agent]
created_date: '2026-05-07 23:05'
labels: []
dependencies: []
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
- 10 service tests covering export/import/round-trip
- All 92 backend tests passing
- All 302 frontend tests passing
- No regressions

### Commit
- Commit hash: 16afa31
- Full backup/restore functionality implemented and tested
