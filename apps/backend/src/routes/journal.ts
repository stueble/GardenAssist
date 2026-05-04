import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { JournalEntryInputSchema } from "../schemas/index.js";
import { mockJournalEntry } from "../mock/index.js";

export const journalRoutes = new Hono()

  // POST /api/journal
  .post("/", zValidator("json", JournalEntryInputSchema), (c) => {
    return c.json(mockJournalEntry(), 201);
  })

  // PUT /api/journal/:id
  .put("/:id", zValidator("json", JournalEntryInputSchema), (c) => {
    return c.json(mockJournalEntry({ id: c.req.param("id") }));
  });
