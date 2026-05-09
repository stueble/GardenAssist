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

type Db = BetterSQLite3Database<typeof schema>;

// ── Default seed values (mirrored from db/seed.ts) ───────────────────────────

const DEFAULT_IRRIGATION_ZONES = JSON.stringify([
  "Beet West",
  "Beet Ost",
  "Rasen",
  "Terrasse",
  "Einfahrt",
]);

const DEFAULT_PLANT_CATEGORIES = JSON.stringify([
  "Strauch",
  "Baum",
  "Staude",
  "Blume",
  "Nadelbaum",
  "Obstbaum",
]);

const DEFAULT_COLOR_PRESETS: Array<{
  schedule_type: string;
  name: string;
  color: string;
}> = [
  { schedule_type: "bloom",         name: "Dunkelrot",        color: "#c0392b" },
  { schedule_type: "bloom",         name: "Rot",              color: "#e74c3c" },
  { schedule_type: "bloom",         name: "Korallrot",        color: "#ff6b9d" },
  { schedule_type: "bloom",         name: "Pink",             color: "#e91e8c" },
  { schedule_type: "bloom",         name: "Lila",             color: "#9b59b6" },
  { schedule_type: "bloom",         name: "Orange",           color: "#f39c12" },
  { schedule_type: "bloom",         name: "Zartrosa",         color: "#f8c8d0" },
  { schedule_type: "bloom",         name: "Weiß",             color: "#ffffff" },
  { schedule_type: "growth",        name: "Hellgrün",         color: "#a8d5a2" },
  { schedule_type: "growth",        name: "Mittelgrün",       color: "#4a7c4a" },
  { schedule_type: "growth",        name: "Dunkelgrün",       color: "#2e7d32" },
  { schedule_type: "foliage",       name: "Frühjahrsgrün",    color: "#a8d5a2" },
  { schedule_type: "foliage",       name: "Dunkelgrün",       color: "#1b5e20" },
  { schedule_type: "foliage",       name: "Immergrün",        color: "#2d5a1b" },
  { schedule_type: "foliage",       name: "Herbstrot",        color: "#c0392b" },
  { schedule_type: "foliage",       name: "Herbstorange",     color: "#c0793a" },
  { schedule_type: "foliage",       name: "Herbstgold",       color: "#f0c040" },
  { schedule_type: "foliage",       name: "Herbstbraun",      color: "#8b7355" },
  { schedule_type: "pruning",       name: "Frühlingsschnitt", color: "#27ae60" },
  { schedule_type: "pruning",       name: "Herbstschnitt",    color: "#2ecc71" },
  { schedule_type: "fertilization", name: "Düngen",           color: "#3498db" },
  { schedule_type: "fertilization", name: "Herbstdünger",     color: "#2980b9" },
  { schedule_type: "misc",          name: "Lüften",           color: "#e67e22" },
  { schedule_type: "misc",          name: "Vertikutieren",    color: "#7f8c8d" },
  { schedule_type: "misc",          name: "Ernte",            color: "#3498db" },
  { schedule_type: "misc",          name: "Aussähen",         color: "#f1c40f" },
];

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
    tx.insert(schema.settings).values({ id: "settings", language: "de" }).run();
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
      language:                 "de",
      location_city:            null,
      location_zip:             null,
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
