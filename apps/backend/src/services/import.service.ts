/**
 * Import service — deserializes garden data from JSON and tar.gz backup formats.
 *
 * - importJsonData: Merges JSON data into database (upsert plants/entries, replace settings)
 * - importBackupTarGz: Extracts tar.gz, imports metadata, restores attachment files
 */

import * as fs from "fs";
import * as path from "path";
import { createGunzip } from "zlib";
import { eq } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import type { Garden } from "@api/garden.js";
import type { Settings } from "@api/settings.js";
import { getGarden } from "./garden.service.js";
import { updateSettings, getSettings } from "./settings.service.js";
import { createPlant, updatePlant } from "./plant.service.js";
import type { PlantInput } from "@api/api.js";
import type { JournalEntryInput } from "@api/api.js";
import type { Plant } from "@api/plant.js";

type Db = BetterSQLite3Database<typeof schema>;

// ── JSON Import ────────────────────────────────────────────────────────────────

export interface ImportResult {
  garden: Garden;
  skipped_count: number;
  skipped_errors: string[];
}

/**
 * Imports JSON data into database.
 * - Upserts plants by id (insert if missing, update if exists)
 * - Upserts journal entries by id
 * - Replaces settings (but preserves old ai_api_key!)
 * - Returns updated garden and list of skipped errors
 */
export async function importJsonData(
  db: Db,
  jsonData: { garden: Garden; settings: Settings },
  options: { skipErrors?: boolean } = {},
): Promise<ImportResult> {
  const { skipErrors = true } = options;
  const skippedErrors: string[] = [];
  let skippedCount = 0;

  try {
    // 0. Upsert attachments (must come first, as plants/entries reference them)
    // Note: attachment API type doesn't include owner_type/owner_id
    // These are derived from how attachments are loaded (as part of their owner)
    // So we only update metadata (category, etc.) on import
    if (jsonData.garden.attachments) {
      const now = new Date().toISOString();
      for (const attachment of jsonData.garden.attachments) {
        try {
          const existing = db
            .select()
            .from(schema.attachments)
            .where(eq(schema.attachments.id, attachment.id))
            .get();

          if (existing) {
            // Only update category, not owner info
            db.update(schema.attachments)
              .set({
                category: attachment.category ?? null,
                updated_at: now,
              })
              .where(eq(schema.attachments.id, attachment.id))
              .run();
          } else {
            // Skip creating new attachments without owner info
            // They must be restored as part of file restore, not JSON import
            // This is because we don't know owner_type/owner_id from the API
            skippedErrors.push(
              `Attachment id=${attachment.id}: Cannot import new attachment without owner info (restore from backup instead)`,
            );
            skippedCount++;
          }
        } catch (err) {
          skippedErrors.push(`Attachment id=${attachment.id}: ${String(err)}`);
          skippedCount++;
          if (!skipErrors) throw err;
        }
      }
    }

    // 1. Upsert plants
    if (jsonData.garden.plants) {
      for (const plant of jsonData.garden.plants) {
        try {
          const existing = db
            .select()
            .from(schema.plants)
            .where(eq(schema.plants.id, plant.id))
            .get();

          const plantInput: PlantInput = {
            name_common: plant.name_common,
            name_botanical: plant.name_botanical ?? null,
            icon: plant.icon ?? null,
            origin_type: plant.origin_type ?? null,
            category: plant.category ?? null,
            lifecycle: plant.lifecycle ?? null,
            description: plant.description ?? null,
            care_notes: plant.care_notes ?? null,
            sun_demand: plant.sun_demand ?? null,
            water_demand: plant.water_demand ?? null,
            soil_type: plant.soil_type ?? null,
            frost_tolerance_min_c: plant.frost_tolerance_min_c ?? null,
            temperature_protected: plant.temperature_protected ?? false,
            health_status: plant.health_status ?? null,
            location: plant.location ?? null,
            watering_zone: plant.watering_zone ?? null,
            purchase_date: plant.purchase_date ?? null,
            purchase_price: plant.purchase_price ?? null,
            thumbnail_attachment_id: plant.thumbnail_attachment_id ?? null,
            positions: plant.positions ?? [],
            schedules: plant.schedules ?? [],
            // Attachments are not directly imported from JSON (they're restored from tar.gz backup)
            // Use empty array for JSON imports
            attachments: [],
          };

          if (existing) {
            await updatePlant(db, plant.id, plantInput);
          } else {
            await createPlant(db, plantInput);
          }
        } catch (err) {
          skippedErrors.push(`Plant id=${plant.id}: ${String(err)}`);
          skippedCount++;
          if (!skipErrors) throw err;
        }
      }
    }

    // 2. Upsert journal entries
    if (jsonData.garden.journal_entries) {
      const now = new Date().toISOString();
      for (const entry of jsonData.garden.journal_entries) {
        try {
          const existing = db
            .select()
            .from(schema.journalEntries)
            .where(eq(schema.journalEntries.id, entry.id))
            .get();

          if (existing) {
            // Update existing entry
            db.update(schema.journalEntries)
              .set({
                plant_id: entry.plant_id ?? null,
                schedule_id: entry.schedule_id ?? null,
                week: entry.week ?? null,
                entry_type: entry.entry_type,
                date: entry.date,
                title: entry.title ?? null,
                notes: entry.notes ?? null,
                updated_at: now,
              })
              .where(eq(schema.journalEntries.id, entry.id))
              .run();

            // Update attachments (replace completely)
            db.delete(schema.journalEntryAttachments)
              .where(eq(schema.journalEntryAttachments.journal_entry_id, entry.id))
              .run();
            for (const attachmentId of entry.attachment_ids ?? []) {
              db.insert(schema.journalEntryAttachments).values({
                journal_entry_id: entry.id,
                attachment_id: attachmentId,
              }).run();
            }
          } else {
            // Create new entry
            db.insert(schema.journalEntries)
              .values({
                id: entry.id,
                plant_id: entry.plant_id ?? null,
                schedule_id: entry.schedule_id ?? null,
                week: entry.week ?? null,
                entry_type: entry.entry_type,
                date: entry.date,
                title: entry.title ?? null,
                notes: entry.notes ?? null,
                created_at: now,
                updated_at: now,
              })
              .run();

            // Insert attachments
            for (const attachmentId of entry.attachment_ids ?? []) {
              db.insert(schema.journalEntryAttachments).values({
                journal_entry_id: entry.id,
                attachment_id: attachmentId,
              }).run();
            }
          }
        } catch (err) {
          skippedErrors.push(`JournalEntry id=${entry.id}: ${String(err)}`);
          skippedCount++;
          if (!skipErrors) throw err;
        }
      }
    }

    // 3. Merge settings (preserve ai_api_key!)
    try {
      const oldSettings = getSettings(db);
      const newSettings: Settings = {
        ...jsonData.settings,
        ai_api_key: oldSettings.ai_api_key, // Preserve old key!
      };
      updateSettings(db, newSettings);
    } catch (err) {
      skippedErrors.push(`Settings merge failed: ${String(err)}`);
      skippedCount++;
      if (!skipErrors) throw err;
    }
  } catch (err) {
    throw new Error(
      `Import failed: ${String(err)}. Skipped ${skippedCount} objects.`,
    );
  }

  const garden = await getGarden(db);
  return {
    garden,
    skipped_count: skippedCount,
    skipped_errors: skippedErrors,
  };
}

// ── tar.gz Backup Import ───────────────────────────────────────────────────────

/**
 * Imports from tar.gz backup archive.
 * - Extracts metadata.json and attachment files
 * - Imports JSON data
 * - Restores attachment files to disk
 * - Returns updated garden and skipped errors
 */
export async function importBackupTarGz(
  db: Db,
  tarGzBuffer: Buffer,
  dataDir: string,
  options: { skipErrors?: boolean } = {},
): Promise<ImportResult> {
  // Extract tar.gz to in-memory
  const { metadataJson, attachments } = await extractTarGz(tarGzBuffer);

  // Parse metadata
  let jsonData: { garden: Garden; settings: Settings };
  try {
    jsonData = JSON.parse(metadataJson.toString("utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse metadata.json: ${String(err)}`);
  }

  // Import JSON data
  const result = await importJsonData(db, jsonData, options);

  // Restore attachment files to disk
  for (const [entryPath, fileData] of Object.entries(attachments)) {
    try {
      const targetPath = path.join(dataDir, "static", entryPath);
      const dir = path.dirname(targetPath);

      // Create directory if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(targetPath, fileData);
    } catch (err) {
      result.skipped_errors.push(`Failed to restore ${entryPath}: ${String(err)}`);
      result.skipped_count++;
    }
  }

  return result;
}

// ── Tar.gz Extraction Helper ───────────────────────────────────────────────────

interface ExtractedTarGz {
  metadataJson: Buffer;
  attachments: Record<string, Buffer>;
}

/**
 * Extracts tar.gz buffer to in-memory object.
 * Returns metadata.json and attachment files organized by path.
 */
async function extractTarGz(tarGzBuffer: Buffer): Promise<ExtractedTarGz> {
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const chunks: Buffer[] = [];

    gunzip.on("data", (chunk) => chunks.push(chunk));
    gunzip.on("end", () => {
      try {
        const tarData = Buffer.concat(chunks);
        const extracted = parseTarData(tarData);
        resolve(extracted);
      } catch (err) {
        reject(err);
      }
    });
    gunzip.on("error", reject);

    gunzip.write(tarGzBuffer);
    gunzip.end();
  });
}

/**
 * Parses tar data (USTAR format) into files.
 */
function parseTarData(tarData: Buffer): ExtractedTarGz {
  const metadataJson: Buffer[] = [];
  const attachments: Record<string, Buffer> = {};

  let offset = 0;

  while (offset < tarData.length - 1024) {
    // Read 512-byte header
    const headerBuf = tarData.slice(offset, offset + 512);
    const header = parseTarHeader(headerBuf);

    if (!header.filename) {
      // End of tar
      break;
    }

    offset += 512;

    // Read file data
    const fileData = tarData.slice(offset, offset + header.filesize);
    const paddedSize = ((header.filesize + 511) / 512 | 0) * 512;
    offset += paddedSize;

    // Store file
    if (header.filename === "metadata.json") {
      metadataJson.push(fileData);
    } else if (header.filename.startsWith("attachments/")) {
      attachments[header.filename] = fileData;
    }
  }

  return {
    metadataJson: Buffer.concat(metadataJson),
    attachments,
  };
}

/**
 * Parses a 512-byte tar header (USTAR format).
 */
function parseTarHeader(
  headerBuf: Buffer,
): { filename: string; filesize: number } {
  const filename = headerBuf
    .slice(0, 100)
    .toString("utf-8")
    .split("\0")[0];
  const filesizeStr = headerBuf
    .slice(124, 136)
    .toString("utf-8")
    .split("\0")[0]
    .trim();
  const filesize = parseInt(filesizeStr, 8) || 0;

  return { filename, filesize };
}
