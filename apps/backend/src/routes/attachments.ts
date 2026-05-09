import { Hono } from "hono";
import { db } from "../db/index.js";
import { attachments } from "../db/schema.js";
import { and, eq, count } from "drizzle-orm";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Attachment } from "@api/attachment.js";

// Files are stored under <DATA_DIR>/static/attachments/<owner_type>/<owner_id>/
// and served at /static/attachments/... by serveStatic (root: DATA_DIR).
function attachmentDir(ownerType: string, ownerId: string | null): string {
  const base = join(process.env.DATA_DIR ?? "./data", "static", "attachments");
  if (ownerType === "garden" || !ownerId) return join(base, "garden");
  return join(base, ownerType, ownerId);
}

const ALLOWED_MIME: Record<string, string> = {
  "image/png":       "png",
  "image/jpeg":      "jpg",
  "image/jpg":       "jpg",
  "image/webp":      "webp",
  "application/pdf": "pdf",
};

export const attachmentRoutes = new Hono()

  // POST /api/attachments?owner_type=plant&owner_id=...
  // Accepts multipart/form-data with a `file` field and optional `category` field.
  .post("/", async (c) => {
    const ownerType = c.req.query("owner_type") ?? "plant";
    const ownerId   = c.req.query("owner_id")   ?? null;

    const formData = await c.req.formData();
    const file     = formData.get("file");
    const category = (formData.get("category") as string | null) ?? null;

    if (!(file instanceof File)) {
      return c.json({ error: "Missing file field" }, 400);
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return c.json({ error: "Unsupported file type. Accepted: PNG, JPG, WebP, PDF" }, 400);
    }

    const attachmentType = file.type === "application/pdf" ? "pdf" : "image";
    const id   = crypto.randomUUID();
    const dir  = attachmentDir(ownerType, ownerId);
    const name = `${id}.${ext}`;
    const path = join(dir, name);

    // Determine URL path relative to DATA_DIR/static/
    const urlPath = ownerId
      ? `/static/attachments/${ownerType}/${ownerId}/${name}`
      : `/static/attachments/garden/${name}`;

    // Ensure directory exists
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(path, Buffer.from(arrayBuffer));

    const now = new Date().toISOString();

    // sort_order: append after existing attachments of this owner
    const existingCount = db
      .select({ count: count() })
      .from(attachments)
      .where(
        ownerId
          ? and(eq(attachments.owner_type, ownerType), eq(attachments.owner_id, ownerId))
          : and(eq(attachments.owner_type, ownerType)),
      )
      .get();
    const sortOrder = existingCount?.count ?? 0;

    // Insert into DB
    db.insert(attachments).values({
      id,
      owner_type:      ownerType,
      owner_id:        ownerId,
      attachment_type: attachmentType,
      category,
      sort_order:      sortOrder,
      url:             urlPath,
      created_at:      now,
      updated_at:      now,
    }).run();

    const result: Attachment = {
      id,
      attachment_type: attachmentType as Attachment["attachment_type"],
      category:        category as Attachment["category"],
      sort_order:      sortOrder,
      url:             urlPath,
      created_at:      now,
      updated_at:      now,
    };

    return c.json(result, 201);
  })

  // DELETE /api/attachments/:id
  .delete("/:id", async (c) => {
    const id = c.req.param("id");

    // Look up attachment to find its file path
    const rows = db.select().from(attachments).where(eq(attachments.id, id)).all();
    if (rows.length === 0) {
      return c.body(null, 204); // Already gone — treat as success
    }

    const row = rows[0];

    // Remove file from disk (best-effort — don't fail if file is missing)
    const filePath = join(
      process.env.DATA_DIR ?? "./data",
      row.url.replace(/^\/static\//, "static/")
    );
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => undefined);
    }

    // Remove from DB
    db.delete(attachments).where(eq(attachments.id, id)).run();

    return c.body(null, 204);
  });
