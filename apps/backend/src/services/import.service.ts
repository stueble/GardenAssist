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
    //
    // owner_type and owner_id are not part of the Attachment API type, but they
    // can be recovered from the URL: /static/attachments/{owner_type}/{owner_id}/{file}
    // For garden-level attachments the URL is /static/attachments/garden/{file}
    // (owner_id segment is absent — the literal string "garden" stands in).
    //
    // We collect all attachment records from every context in which they appear:
    //   - Garden.attachments          → owner_type: "garden",        owner_id: null
    //   - Plant.attachments           → owner_type: "plant",         owner_id: plant.id
    //   - JournalEntry (via ids)      → owner_type: "journal_entry", owner_id: entry.id
    //     (journal_entry_attachments junction rows are recreated in step 2)
    {
      const now = new Date().toISOString();

      // Collect all unique attachment objects from every place they appear in the export.
      // owner_type and owner_id are recovered directly from the URL:
      //   /static/attachments/{owner_type}/{owner_id}/{filename}
      // This is the canonical source of truth — no assumptions about context needed.
      const seenIds = new Set<string>();
      const allAttachments: (typeof jsonData.garden.attachments)[0][] = [];

      const collect = (atts: typeof jsonData.garden.attachments | undefined) => {
        for (const a of atts ?? []) {
          if (!seenIds.has(a.id)) { seenIds.add(a.id); allAttachments.push(a); }
        }
      };

      collect(jsonData.garden.attachments);
      for (const plant of jsonData.garden.plants ?? []) collect(plant.attachments);

      for (const attachment of allAttachments) {
        // Parse owner_type and owner_id from URL path:
        // /static/attachments/{owner_type}/{owner_id}/{file}  (plant / journal_entry)
        // /static/attachments/garden/{file}                   (garden, no owner_id segment)
        const parts = attachment.url.replace(/^\//, "").split("/");
        // parts: ["static", "attachments", owner_type, owner_id_or_file, file?]
        const owner_type = parts[2] ?? "garden";
        const owner_id   = parts.length >= 5 ? (parts[3] ?? null) : null;
        try {
          const existing = db
            .select()
            .from(schema.attachments)
            .where(eq(schema.attachments.id, attachment.id))
            .get();

          // sort_order: use value from export if present, fall back to 0 for
          // backwards compatibility with exports that predate this field.
          const sortOrder = (attachment as any).sort_order ?? 0;

          if (existing) {
            db.update(schema.attachments)
              .set({ category: attachment.category ?? null, sort_order: sortOrder, updated_at: now })
              .where(eq(schema.attachments.id, attachment.id))
              .run();
          } else {
            // Derive attachment_type from the file extension in the URL
            const ext = attachment.url.split(".").pop()?.toLowerCase() ?? "";
            const attachmentType = ext === "pdf" ? "pdf" : "image";

            db.insert(schema.attachments).values({
              id:              attachment.id,
              owner_type,
              owner_id,
              attachment_type: attachmentType,
              category:        attachment.category ?? null,
              sort_order:      sortOrder,
              url:             attachment.url,
              created_at:      attachment.created_at ?? now,
              updated_at:      attachment.updated_at ?? now,
            }).run();
          }
        } catch (err) {
          skippedErrors.push(`Attachment id=${attachment.id}: ${String(err)}`);
          skippedCount++;
          if (!skipErrors) throw err;
        }
      }
    }

    // 1. Upsert plants (preserving schedule IDs from backup)
    if (jsonData.garden.plants) {
      const now = new Date().toISOString();
      for (const plant of jsonData.garden.plants) {
        try {
          const existing = db
            .select()
            .from(schema.plants)
            .where(eq(schema.plants.id, plant.id))
            .get();

          if (existing) {
            // Update plant core fields
            db.update(schema.plants)
              .set({
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
                updated_at: now,
              })
              .where(eq(schema.plants.id, plant.id))
              .run();

            // Delete and re-create positions (replace semantics)
            db.delete(schema.plantPositions)
              .where(eq(schema.plantPositions.plant_id, plant.id))
              .run();
            for (const pos of plant.positions ?? []) {
              db.insert(schema.plantPositions).values({
                id: crypto.randomUUID(),
                plant_id: plant.id,
                x_percent: pos.x_percent,
                y_percent: pos.y_percent,
              }).run();
            }

            // Delete and re-create schedules, BUT preserve IDs from backup
            db.delete(schema.schedules)
              .where(eq(schema.schedules.plant_id, plant.id))
              .run();
            for (const sched of plant.schedules ?? []) {
              db.insert(schema.schedules).values({
                id: sched.id, // IMPORTANT: Use ID from backup, not random!
                plant_id: plant.id,
                schedule_type: sched.schedule_type,
                start_week: sched.start_week,
                end_week: sched.end_week,
                color: sched.color ?? null,
                label: sched.label ?? null,
                notes: sched.notes ?? null,
                created_at: sched.created_at,
                updated_at: sched.updated_at,
              }).run();
            }
          } else {
            // Create new plant with preserved IDs
            db.insert(schema.plants)
              .values({
                id: plant.id,
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
                created_at: plant.created_at,
                updated_at: plant.updated_at,
              })
              .run();

            // Insert positions
            for (const pos of plant.positions ?? []) {
              db.insert(schema.plantPositions).values({
                id: crypto.randomUUID(),
                plant_id: plant.id,
                x_percent: pos.x_percent,
                y_percent: pos.y_percent,
              }).run();
            }

            // Insert schedules with preserved IDs
            for (const sched of plant.schedules ?? []) {
              db.insert(schema.schedules).values({
                id: sched.id, // IMPORTANT: Use ID from backup!
                plant_id: plant.id,
                schedule_type: sched.schedule_type,
                start_week: sched.start_week,
                end_week: sched.end_week,
                color: sched.color ?? null,
                label: sched.label ?? null,
                notes: sched.notes ?? null,
                created_at: sched.created_at,
                updated_at: sched.updated_at,
              }).run();
            }
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
          // Validate that plant exists if plant_id is set
          if (entry.plant_id) {
            const plantExists = db
              .select()
              .from(schema.plants)
              .where(eq(schema.plants.id, entry.plant_id))
              .get();
            if (!plantExists) {
              skippedErrors.push(
                `JournalEntry id=${entry.id}: Referenced plant_id=${entry.plant_id} does not exist`,
              );
              skippedCount++;
              if (!skipErrors) throw new Error("Plant reference missing");
              continue; // Skip this entry
            }
          }

          // Validate that schedule exists if schedule_id is set
          if (entry.schedule_id) {
            const scheduleExists = db
              .select()
              .from(schema.schedules)
              .where(eq(schema.schedules.id, entry.schedule_id))
              .get();
            if (!scheduleExists) {
              skippedErrors.push(
                `JournalEntry id=${entry.id}: Referenced schedule_id=${entry.schedule_id} does not exist`,
              );
              skippedCount++;
              if (!skipErrors) throw new Error("Schedule reference missing");
              continue; // Skip this entry
            }
          }

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

    // 3. Restore garden plan metadata (plan_url + plan_name)
    try {
      db.update(schema.garden)
        .set({
          plan_url:  jsonData.garden.plan_url  ?? null,
          plan_name: jsonData.garden.plan_name ?? null,
        })
        .where(eq(schema.garden.id, "garden"))
        .run();
    } catch (err) {
      skippedErrors.push(`Garden plan metadata restore failed: ${String(err)}`);
      skippedCount++;
      if (!skipErrors) throw err;
    }

    // 4. Merge settings (preserve ai_api_key!)
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
  const { metadataJson, attachments, staticFiles } = await extractTarGz(tarGzBuffer);

  // Parse metadata
  let jsonData: { garden: Garden; settings: Settings };
  try {
    jsonData = JSON.parse(metadataJson.toString("utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse metadata.json: ${String(err)}`);
  }

  // Import JSON data
  const result = await importJsonData(db, jsonData, options);

  // Restore attachment files to disk (entry paths are relative: attachments/...)
  for (const [entryPath, fileData] of Object.entries(attachments)) {
    try {
      const targetPath = path.join(dataDir, "static", entryPath);
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, fileData);
    } catch (err) {
      result.skipped_errors.push(`Failed to restore ${entryPath}: ${String(err)}`);
      result.skipped_count++;
    }
  }

  // Restore other static files (entry paths are already relative: static/garden/plan.png)
  for (const [entryPath, fileData] of Object.entries(staticFiles)) {
    try {
      const targetPath = path.join(dataDir, entryPath);
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
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
  staticFiles: Record<string, Buffer>; // other static files, e.g. static/garden/plan.png
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
  const staticFiles: Record<string, Buffer> = {};

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
    } else if (header.filename.startsWith("static/")) {
      // Other static files (e.g. static/garden/plan.png)
      staticFiles[header.filename] = fileData;
    }
  }

  return {
    metadataJson: Buffer.concat(metadataJson),
    attachments,
    staticFiles,
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
