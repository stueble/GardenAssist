import { Attachment } from "./attachment";
import { JournalEntry } from "./journal-entry";
import { Plant } from "./plant";

// ── Garden ────────────────────────────────────────────────────────────────────

/**
 * The garden — a singleton representing the user's garden as a whole.
 *
 * This is the root object of the application. A single getGarden() call
 * returns everything the UI needs to render all views: the garden plan,
 * all plants (including their schedules, tasks, attachments, positions,
 * and journal entries), all journal entries, and all garden-wide attachments.
 *
 * Write operations (create, update, delete) are performed via separate
 * endpoints on the individual entity types.
 */
export type Garden = {
  /**
   * Relative URL to the garden plan image,
   * e.g. "/static/garden/plan.jpg".
   * Plant positions (x_percent, y_percent) are relative to this image.
   * null if no plan has been uploaded yet.
   *
   * Accepted formats: PNG, JPG, SVG.
   */
  plan_url: string | null;

  /**
   * User-defined name for the garden plan, e.g. "Hauptgarten 2024".
   * Displayed in the Settings view next to the plan preview.
   */
  plan_name: string | null;

  /**
   * All plants in the garden, each fully assembled with positions,
   * attachments, schedules, tasks, and journal entries.
   */
  plants: Plant[];

  /**
   * All journal entries across the entire garden, sorted by date descending
   * (newest first). Includes both plant-specific entries (plant_id set) and
   * garden-wide entries (plant_id = null).
   * Filtering by plant or type is left to the UI.
   * Pagination is not supported in v1 — the full list is always returned.
   */
  journal_entries: JournalEntry[];

  /**
   * Garden-wide attachments not associated with any specific plant.
   * Referenced by JournalEntry.attachment_ids when JournalEntry.plant_id is null.
   */
  attachments: Attachment[];
};
