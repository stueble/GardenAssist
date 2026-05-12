// ── Enums ────────────────────────────────────────────────────────────────────
/**
 * The file type of an attachment.
 * - image: raster image (PNG, JPG, WebP)
 * - pdf: PDF document (e.g. invoice, care instructions, plant label)
 */
export const AttachmentType = {
    Image: "image",
    Pdf: "pdf",
};
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
    Main: "main",
    Bloom: "bloom",
    Leaf: "leaf",
    Problem: "problem",
    Invoice: "invoice",
};
