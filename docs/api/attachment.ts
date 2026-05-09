// ── Enums ────────────────────────────────────────────────────────────────────

/**
 * The file type of an attachment.
 * - image: raster image (PNG, JPG, WebP)
 * - pdf: PDF document (e.g. invoice, care instructions, plant label)
 */
export const AttachmentType = {
  Image: "image",
  Pdf:   "pdf",
} as const;
export type AttachmentType = typeof AttachmentType[keyof typeof AttachmentType];

/**
 * The semantic category of an attachment.
 * Applies to both plant and journal attachments.
 * - main: general photo
 * - bloom: photo of the plant's flowers (plant only)
 * - leaf: photo of the plant's leaves (plant only)
 * - problem: photo documenting a disease, pest, or damage
 * - invoice: purchase receipt or invoice; typically a PDF
 *
 * UI labels are not part of this spec — generate locale strings from
 * the enum values and their descriptions above.
 */
export const AttachmentCategory = {
  Main:    "main",
  Bloom:   "bloom",
  Leaf:    "leaf",
  Problem: "problem",
  Invoice: "invoice",
} as const;
export type AttachmentCategory = typeof AttachmentCategory[keyof typeof AttachmentCategory];

// ── Attachment ────────────────────────────────────────────────────────────────

/**
 * A file attached to a Plant, a JournalEntry, or the Garden.
 *
 * Attachments are always returned as part of their owner object — never
 * fetched standalone via the JSON API. The binary file is served separately
 * as a static asset via the URL in the `url` field.
 *
 * Accepted formats: PNG, JPG, WebP, PDF.
 * Maximum file size: configurable via Settings.attachment_size_limit_mb.
 */
export type Attachment = {
  id: string;

  /** The file type of this attachment. */
  attachment_type: AttachmentType;

  /** The semantic category of this attachment. */
  category: AttachmentCategory | null;

  /**
   * Display order within the owner's attachment list (0-based).
   * The attachment with the lowest sort_order is shown as the thumbnail
   * in list and overview views. Controlled by the user via drag-and-drop.
   */
  sort_order: number;

  /**
   * Relative URL to the binary file,
   * e.g. "/static/attachments/plants/abc123/bloom-1.jpg".
   * The binary is served as a static asset — never embedded in API responses.
   */
  url: string;

  /** ISO 8601 datetime string. Set on creation, never updated. */
  created_at: string;

  /** ISO 8601 datetime string. Updated on every write. */
  updated_at: string;
};
