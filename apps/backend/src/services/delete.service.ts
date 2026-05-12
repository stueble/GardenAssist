/**
 * Delete / defaults service.
 *
 * deleteAllData():
 *   Deletes everything — all plants, journal entries, attachments, color
 *   presets, and settings. Removes attachment files from disk.
 *   Re-creates the garden and settings singleton rows (empty defaults).
 *   Use this before an import to guarantee a clean slate.
 *
 * installDefaults():
 *   Overwrites color presets and settings with their factory defaults,
 *   without touching any existing plants, journal entries, or attachments.
 *   Existing color presets are replaced in full; settings are updated in place.
 *   To do a full factory reset: call deleteAllData() first, then installDefaults().
 */

import * as fs from "fs";
import * as path from "path";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import type { Garden } from "@api/garden.js";
import { getGarden } from "./garden.service.js";
import {
  DEFAULT_IRRIGATION_ZONES,
  DEFAULT_PLANT_CATEGORIES,
  DEFAULT_COLOR_PRESETS,
} from "../db/seed.js";

type Db = BetterSQLite3Database<typeof schema>;

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Delete all attachment files from disk (best-effort, never throws). */
function deleteAttachmentFiles(
  attachmentRows: (typeof schema.attachments.$inferSelect)[],
  dataDir: string,
): void {
  for (const attachment of attachmentRows) {
    try {
      const filePath = path.join(
        dataDir,
        "static",
        "attachments",
        attachment.owner_type,
        attachment.owner_id ?? "garden",
        path.basename(attachment.url),
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const dirPath = path.dirname(filePath);
      if (fs.existsSync(dirPath)) {
        try { fs.rmdirSync(dirPath); } catch { /* not empty, fine */ }
      }
    } catch (err) {
      console.warn(`Could not delete attachment file ${attachment.id}:`, err);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Deletes ALL data — plants, journal entries, attachments, color presets,
 * settings, and the garden plan. Removes attachment files from disk.
 *
 * The garden and settings singletons are re-created with empty/minimal
 * values (no location, no API key, no color presets).
 *
 * Use this before importing a backup to guarantee a clean slate.
 *
 * Deletion order avoids FK constraint violations:
 *   journal_entry_attachments → attachments → journal_entries
 *   → plant_positions → schedules → plants
 *   → color_presets → settings → garden
 */
export async function deleteAllData(db: Db, dataDir: string): Promise<Garden> {
  const attachmentRows = db.select().from(schema.attachments).all();
  deleteAttachmentFiles(attachmentRows, dataDir);

  db.transaction((tx) => {
    tx.delete(schema.journalEntryAttachments).run();
    tx.delete(schema.attachments).run();
    tx.delete(schema.journalEntries).run();
    tx.delete(schema.plantPositions).run();
    tx.delete(schema.schedules).run();
    tx.delete(schema.plants).run();
    tx.delete(schema.colorPresets).run();
    tx.delete(schema.settings).run();
    tx.delete(schema.garden).run();

    // Re-create singletons with minimal defaults
    tx.insert(schema.garden).values({ id: "garden" }).run();
    tx.insert(schema.settings).values({ id: "settings", language: "en" }).run();
  });

  return getGarden(db);
}

/**
 * Installs factory defaults for color presets and settings,
 * without deleting any existing plants, journal entries, or attachments.
 *
 * - Color presets are replaced in full (old ones removed, defaults inserted).
 * - Settings are overwritten with factory values (zones, categories, task
 *   windows). The AI API key is preserved.
 *
 * To do a full factory reset: call deleteAllData() first, then installDefaults().
 */
export async function installDefaults(db: Db): Promise<Garden> {
  // Preserve the current AI API key so the user doesn't have to re-enter it.
  const currentSettings = db
    .select({ ai_api_key: schema.settings.ai_api_key })
    .from(schema.settings)
    .get();
  const preservedApiKey = currentSettings?.ai_api_key ?? null;

  db.transaction((tx) => {
    // Replace color presets in full
    tx.delete(schema.colorPresets).run();
    DEFAULT_COLOR_PRESETS.forEach((preset, index) => {
      tx.insert(schema.colorPresets).values({
        id:            crypto.randomUUID(),
        schedule_type: preset.schedule_type,
        name:          preset.name,
        color:         preset.color,
        sort_order:    index,
      }).run();
    });

    // Overwrite settings with factory defaults, preserving the AI API key
    tx.delete(schema.settings).run();
    tx.insert(schema.settings).values({
      id:                       "settings",
      language:                 "en",
      location_city:            "Cologne",
      location_zip:             "50667",
      irrigation_zones:         DEFAULT_IRRIGATION_ZONES,
      plant_categories:         DEFAULT_PLANT_CATEGORIES,
      task_lookback_weeks:      8,
      task_lookahead_weeks:     4,
      attachment_size_limit_mb: 10,
      ai_provider:              null,
      ai_model:                 null,
      ai_api_key:               preservedApiKey,
    }).run();
  });

  return getGarden(db);
}
