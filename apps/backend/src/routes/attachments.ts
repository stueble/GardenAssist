import { Hono } from "hono";
import { mockAttachment } from "../mock/index.js";

export const attachmentRoutes = new Hono()

  // POST /api/attachments?owner_type=plant&owner_id=...
  // Accepts multipart/form-data with a `file` field
  .post("/", (c) => {
    return c.json(mockAttachment(), 201);
  })

  // DELETE /api/attachments/:id
  .delete("/:id", (c) => c.body(null, 204));
