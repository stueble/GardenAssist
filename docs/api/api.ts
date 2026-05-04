import { Attachment } from "./attachment";
import { Garden } from "./garden";
import { JournalEntry } from "./journal-entry";
import { Plant } from "./plant";
import { Settings } from "./settings";

// ── Input Types ───────────────────────────────────────────────────────────────

/**
 * Input for creating or updating a plant.
 * Excludes derived and server-managed fields.
 * Nested arrays (positions, attachments, schedules) replace existing data
 * in full on update (patch-replace semantics, not partial update).
 */
export type PlantInput = Omit<Plant,
  | "id"
  | "created_at"
  | "updated_at"
  | "tasks"
  | "journal_entries"
>;

/**
 * Input for creating or updating a journal entry.
 * Excludes server-managed fields.
 */
export type JournalEntryInput = Omit<JournalEntry,
  | "id"
  | "created_at"
  | "updated_at"
>;

/**
 * Input for updating the garden plan metadata.
 */
export type GardenInput = Pick<Garden, "plan_name">;

/**
 * Input for uploading an attachment.
 *
 * attachment_type is intentionally excluded — it must be derived server-side
 * from the MIME type of the uploaded file (e.g. image/jpeg → "image",
 * application/pdf → "pdf"). This prevents inconsistencies between the file
 * content and its declared type.
 */
export type AttachmentInput = Omit<Attachment,
  | "id"
  | "url"
  | "created_at"
  | "attachment_type"
> & {
  /** The binary file to upload. Accepted formats: PNG, JPG, WebP, PDF. */
  file: File;
};

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * The GardenAssist API.
 *
 * All methods are async and return a Promise.
 * All write operations return the updated object as confirmation.
 *
 * The garden is a singleton — there is no garden ID.
 * Plants and journal entries are identified by their string UUID.
 *
 * Attachments (images, PDFs) are uploaded as binary files via uploadAttachment()
 * and served as static assets via the URL in Attachment.url.
 * They are never embedded in JSON responses.
 */
export interface Api {

  // ── Garden ──────────────────────────────────────────────────────────────────

  /**
   * Returns the complete garden object — the root of the application.
   * Includes all plants (with their positions, attachments, schedules, tasks,
   * and journal entries), all journal entries, and all garden-wide attachments.
   *
   * This is the primary load call on application startup.
   */
  getGarden(): Promise<Garden>;

  /**
   * Updates the garden plan metadata (name).
   * To upload or replace the plan image, use uploadGardenPlan().
   */
  updateGarden(data: GardenInput): Promise<Garden>;

  /**
   * Uploads or replaces the garden plan image.
   * Accepted formats: PNG, JPG, SVG.
   * Returns the updated Garden with the new plan_url set.
   */
  uploadGardenPlan(file: File): Promise<Garden>;

  /**
   * Removes the garden plan image.
   * Plant positions are preserved — plan_url is set to null.
   */
  deleteGardenPlan(): Promise<Garden>;

  // ── Plants ──────────────────────────────────────────────────────────────────

  /**
   * Creates a new plant and returns the fully assembled Plant object,
   * including derived tasks.
   */
  createPlant(data: PlantInput): Promise<Plant>;

  /**
   * Updates an existing plant. All nested arrays (positions, attachments,
   * schedules) are replaced in full.
   * Returns the updated fully assembled Plant object.
   */
  updatePlant(id: string, data: PlantInput): Promise<Plant>;

  /**
   * Deletes a plant and all its associated data (positions, schedules,
   * attachments). Journal entries referencing this plant are retained but
   * their plant_id is set to null.
   */
  deletePlant(id: string): Promise<void>;

  // ── Journal Entries ─────────────────────────────────────────────────────────

  /**
   * Creates a new journal entry.
   * If entry_type is "done" or "skipped", the referenced schedule_id and week
   * must be provided so the task is correctly resolved.
   * Returns the created JournalEntry.
   */
  createJournalEntry(data: JournalEntryInput): Promise<JournalEntry>;

  /**
   * Updates an existing journal entry.
   * Returns the updated JournalEntry.
   * Note: journal entries cannot be deleted — edit instead.
   */
  updateJournalEntry(id: string, data: JournalEntryInput): Promise<JournalEntry>;

  // ── Attachments ─────────────────────────────────────────────────────────────

  /**
   * Uploads a new attachment and associates it with a plant or the garden.
   * - owner_type "plant": attachment is added to Plant.attachments[];
   *   owner_id must be the plant's UUID (non-null).
   * - owner_type "garden": attachment is added to Garden.attachments[];
   *   owner_id must be null (the garden is a singleton with no ID).
   *
   * The server derives attachment_type from the file's MIME type.
   * Maximum file size: Settings.attachment_size_limit_mb.
   * Returns the created Attachment with its URL.
   */
  uploadAttachment(
    owner_type: "plant" | "garden",
    owner_id: string | null,
    input: AttachmentInput,
  ): Promise<Attachment>;

  /**
   * Deletes an attachment and its binary file.
   * If the attachment is referenced by any JournalEntry.attachment_ids,
   * those references are removed.
   */
  deleteAttachment(id: string): Promise<void>;

  // ── Settings ─────────────────────────────────────────────────────────────────

  /**
   * Returns the current app-wide settings, including all color presets.
   */
  getSettings(): Promise<Settings>;

  /**
   * Replaces the app-wide settings in full.
   * color_presets are managed as part of settings — pass the complete
   * updated list to add, remove, or reorder presets.
   * Returns the updated Settings.
   */
  updateSettings(data: Settings): Promise<Settings>;

  // ── Export & Import ───────────────────────────────────────────────────────────

  /**
   * Exports the complete garden data as a JSON file.
   * Includes all plants, schedules, journal entries, attachments metadata,
   * color presets, garden plan metadata, and settings.
   * Binary attachment files are not included — export them separately via
   * backup of the file system attachment directory.
   * Returns a Blob representing the JSON file for download.
   */
  exportJson(): Promise<Blob>;

  /**
   * Exports the plant list as a CSV file.
   * Includes one row per plant with all scalar fields (no nested objects).
   * Returns a Blob representing the CSV file for download.
   */
  exportPlantsCsv(): Promise<Blob>;

  /**
   * Imports data from a previously exported JSON file.
   * Merges with existing data — does not overwrite or reset the current state.
   * Plants and journal entries are matched by id; existing records are updated,
   * new records are inserted. Settings and color presets are replaced in full.
   * Binary attachment files are not restored by this method — restore them
   * separately via file system.
   * Returns the updated Garden after import.
   */
  importJson(file: File): Promise<Garden>;
}
