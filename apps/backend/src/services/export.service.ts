/**
 * Export service — serializes garden data to JSON and tar.gz backup formats.
 *
 * - exportJsonData: Returns complete garden + settings as JSON object
 * - exportBackupTarGz: Creates tar.gz archive with metadata.json + all attachment files
 */

import * as fs from "fs";
import * as path from "path";
import { createGzip } from "zlib";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import type { Garden } from "@api/garden.js";
import type { Settings } from "@api/settings.js";
import { getGarden } from "./garden.service.js";
import { getSettings } from "./settings.service.js";

type Db = BetterSQLite3Database<typeof schema>;

// ── JSON Export ────────────────────────────────────────────────────────────────

export interface ExportData {
  garden: Garden;
  settings: Settings;
}

/**
 * Exports complete garden data as JSON object.
 * - Removes ai_api_key from settings for security
 * - Includes all plants, schedules, journal entries, attachments (metadata only)
 */
export async function exportJsonData(db: Db): Promise<ExportData> {
  const garden = await getGarden(db);
  const settings = getSettings(db);

  // Remove API key for security
  const safeSettings: Settings = {
    ...settings,
    ai_api_key: null,
  };

  return {
    garden,
    settings: safeSettings,
  };
}

// ── tar.gz Backup Export ───────────────────────────────────────────────────────

/**
 * Creates a tar.gz backup archive containing:
 * - metadata.json (garden + settings without api_key)
 * - attachments/ directory with all binary files
 *
 * Returns the gzipped buffer for download.
 */
export async function exportBackupTarGz(db: Db, dataDir: string): Promise<Buffer> {
  const jsonData = await exportJsonData(db);

  // Collect all attachments from DB
  const attachmentRows = db.select().from(schema.attachments).all();

  // Build tar.gz in memory
  const tarBuffer = await createTarGzBuffer(jsonData, attachmentRows, dataDir);
  return tarBuffer;
}

// ── Tar.gz Helper ──────────────────────────────────────────────────────────────

interface TarEntry {
  name: string;
  data: Buffer;
  mode: number;
}

/**
 * Creates a tar.gz buffer with metadata.json and all attachment files.
 */
async function createTarGzBuffer(
  jsonData: ExportData,
  attachmentRows: typeof schema.attachments.$inferSelect[],
  dataDir: string,
): Promise<Buffer> {
  const entries: TarEntry[] = [];

  // 1. Add metadata.json
  const metadataJson = JSON.stringify(jsonData, null, 2);
  entries.push({
    name: "metadata.json",
    data: Buffer.from(metadataJson, "utf-8"),
    mode: 0o644,
  });

  // 2. Add all attachment files
  for (const attachment of attachmentRows) {
    const filePath = path.join(
      dataDir,
      "static",
      "attachments",
      attachment.owner_type,
      attachment.owner_id ?? "garden",
      path.basename(attachment.url), // Extract filename from URL
    );

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath);
      const entryName = path.join(
        "attachments",
        attachment.owner_type,
        attachment.owner_id ?? "garden",
        path.basename(attachment.url),
      );
      entries.push({
        name: entryName,
        data: fileData,
        mode: 0o644,
      });
    }
    // If file doesn't exist on disk, skip it (best effort)
  }

  // Convert entries to tar format, then gzip
  return new Promise((resolve, reject) => {
    const tarData = createTarData(entries);
    const gzip = createGzip();
    const chunks: Buffer[] = [];

    gzip.on("data", (chunk) => chunks.push(chunk));
    gzip.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    gzip.on("error", reject);

    gzip.write(tarData);
    gzip.end();
  });
}

/**
 * Converts array of entries to tar format (simplified, USTAR format).
 */
function createTarData(entries: TarEntry[]): Buffer {
  const blocks: Buffer[] = [];

  for (const entry of entries) {
    // Create header block (512 bytes)
    const header = createTarHeader(entry.name, entry.data.length, entry.mode);
    blocks.push(header);

    // Add file data (padded to 512-byte boundary)
    blocks.push(entry.data);
    const padding = (512 - (entry.data.length % 512)) % 512;
    if (padding > 0) {
      blocks.push(Buffer.alloc(padding));
    }
  }

  // Add two end-of-file blocks (1024 null bytes)
  blocks.push(Buffer.alloc(1024));

  return Buffer.concat(blocks);
}

/**
 * Creates a 512-byte tar header (USTAR format).
 */
function createTarHeader(
  filename: string,
  filesize: number,
  mode: number,
): Buffer {
  const header = Buffer.alloc(512);

  const now = Math.floor(Date.now() / 1000).toString(8);
  const mtime = now.padStart(12, "0");
  const size = filesize.toString(8).padStart(12, "0");
  const modeStr = mode.toString(8).padStart(7, "0");

  let offset = 0;

  // name (100 bytes) — null-terminated string, padded with zeros
  const filenameBuf = Buffer.alloc(100);
  filenameBuf.write(filename.slice(0, 99), 0, "utf-8");
  filenameBuf.copy(header, offset);
  offset += 100;

  // mode (8 bytes)
  offset += header.write(modeStr + "\0", offset, 8, "utf-8");

  // uid (8 bytes) = 0
  offset += header.write("0000000\0", offset, 8, "utf-8");

  // gid (8 bytes) = 0
  offset += header.write("0000000\0", offset, 8, "utf-8");

  // size (12 bytes)
  offset += header.write(size + "\0", offset, 12, "utf-8");

  // mtime (12 bytes)
  offset += header.write(mtime + "\0", offset, 12, "utf-8");

  // checksum (8 bytes) — set to spaces first
  offset += header.write("        ", offset, 8, "utf-8");

  // typeflag (1 byte) — "0" for regular file
  offset += header.write("0", offset, 1, "utf-8");

  // linkname (100 bytes) — empty
  offset += 100;

  // USTAR magic and version
  offset += header.write("ustar\0", offset, 6, "utf-8");
  offset += 2; // version

  // uname (32 bytes)
  offset += 32;

  // gname (32 bytes)
  offset += 32;

  // devmajor (8 bytes)
  offset += 8;

  // devminor (8 bytes)
  offset += 8;

  // filename prefix (155 bytes)
  offset += 155;

  // Calculate checksum (sum of all header bytes, with checksum field as spaces)
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  const checksumStr = checksum.toString(8).padStart(6, "0");
  header.write(checksumStr + "\0 ", 148, 8, "utf-8");

  return header;
}
