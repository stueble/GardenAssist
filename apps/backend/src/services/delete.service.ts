/**
 * Delete service — removes all user data while preserving singletons.
 *
 * Deletes:
 * - All plants (cascades to positions, schedules, journal entries via FK)
 * - All garden-level journal entries
 * - Garden plan image (plan_url set to null)
 * - Attachment files from disk
 *
 * Preserves:
 * - Garden singleton
 * - Settings singleton (with API key)
 * - Attachment directory structure on disk
 */

import * as fs from "fs";
import * as path from "path";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import { eq, isNull } from "drizzle-orm";
import type { Garden } from "@api/garden.js";
import { getGarden } from "./garden.service.js";

type Db = BetterSQLite3Database<typeof schema>;

/**
 * Deletes all user data (plants, journal entries, attachments).
 * Preserves garden and settings singletons.
 * Returns empty garden after deletion.
 */
export async function deleteAllData(db: Db, dataDir: string): Promise<Garden> {
  // 1. Get all attachment files before deletion (to delete from disk)
  const attachmentRows = db.select().from(schema.attachments).all();

  // 2. Delete all plants (cascades to positions, schedules, plant journal entries via FK)
  db.delete(schema.plants).run();

  // 3. Delete all garden-level journal entries (plant_id = null)
  db.delete(schema.journalEntries)
    .where(isNull(schema.journalEntries.plant_id))
    .run();

  // 4. Reset garden plan
  db.update(schema.garden)
    .set({ plan_url: null })
    .where(eq(schema.garden.id, "garden"))
    .run();

  // 5. Delete attachment files from disk (best effort)
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

      // Try to clean up empty directories
      const dirPath = path.dirname(filePath);
      if (fs.existsSync(dirPath)) {
        try {
          fs.rmdirSync(dirPath);
        } catch {
          // Directory not empty, that's fine
        }
      }
    } catch (err) {
      // Log but don't fail if file deletion fails
      console.warn(`Could not delete attachment file ${attachment.id}:`, err);
    }
  }

  // 6. Return empty garden
  return getGarden(db);
}
