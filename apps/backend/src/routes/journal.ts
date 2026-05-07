import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { JournalEntryInputSchema } from "../schemas/index.js";
import { db } from "../db/index.js";
import { journalEntries, journalEntryAttachments, plants, schedules } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { JournalEntry } from "@api/journal-entry.js";

// ── Auto-title helpers ────────────────────────────────────────────────────────

const SCHEDULE_TYPE_LABEL: Record<string, string> = {
  pruning:       "Schneiden",
  fertilization: "Düngen",
  bloom:         "Blüte",
  growth:        "Wachstum",
  foliage:       "Blätter",
  misc:          "Aufgabe",
};

function buildAutoTitle(
  entryType: "done" | "skipped" | "manual" | "observation" | "problem",
  scheduleType: string | null,
  plantName: string | null,
  scheduleLabel: string | null,
): string | null {
  if (entryType === "manual" || entryType === "observation" || entryType === "problem") return null;
  const action    = entryType === "done" ? "Erledigt" : "Übersprungen";
  const taskLabel = scheduleLabel ?? (scheduleType ? SCHEDULE_TYPE_LABEL[scheduleType] : null) ?? "Aufgabe";
  if (plantName) return `${action}: ${taskLabel} – ${plantName}`;
  return `${action}: ${taskLabel}`;
}

// ── Map DB row → JournalEntry ─────────────────────────────────────────────────

function mapRow(row: typeof journalEntries.$inferSelect): JournalEntry {
  return {
    id:             row.id,
    plant_id:       row.plant_id ?? null,
    schedule_id:    row.schedule_id ?? null,
    week:           row.week ?? null,
    entry_type:     row.entry_type as JournalEntry["entry_type"],
    date:           row.date,
    title:          row.title ?? null,
    notes:          row.notes ?? null,
    attachment_ids: [],   // attachments not managed here
    created_at:     row.created_at,
    updated_at:     row.updated_at,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export const journalRoutes = new Hono()

  // POST /api/journal — create a journal entry
  .post("/", zValidator("json", JournalEntryInputSchema), async (c) => {
    const data = c.req.valid("json");
    const now  = new Date().toISOString();
    const id   = crypto.randomUUID();

    // Resolve auto-title (AC #5): look up plant name + schedule label if not provided
    let title = data.title;
    if (title === null && (data.entry_type === "done" || data.entry_type === "skipped")) {
      let plantName:     string | null = null;
      let scheduleType:  string | null = null;
      let scheduleLabel: string | null = null;

      if (data.plant_id) {
        const plantRow = db.select({ name: plants.name_common })
          .from(plants).where(eq(plants.id, data.plant_id)).get();
        plantName = plantRow?.name ?? null;
      }
      if (data.schedule_id) {
        const schedRow = db.select({ type: schedules.schedule_type, label: schedules.label })
          .from(schedules).where(eq(schedules.id, data.schedule_id)).get();
        scheduleType  = schedRow?.type  ?? null;
        scheduleLabel = schedRow?.label ?? null;
      }
      title = buildAutoTitle(data.entry_type, scheduleType, plantName, scheduleLabel);
    }

    db.insert(journalEntries).values({
      id,
      plant_id:    data.plant_id,
      schedule_id: data.schedule_id,
      week:        data.week,
      entry_type:  data.entry_type,
      date:        data.date,
      title,
      notes:       data.notes,
      created_at:  now,
      updated_at:  now,
    }).run();

    const row = db.select().from(journalEntries).where(eq(journalEntries.id, id)).get()!;
    return c.json(mapRow(row), 201);
  })

  // PUT /api/journal/:id — update a journal entry
  .put("/:id", zValidator("json", JournalEntryInputSchema), async (c) => {
    const id   = c.req.param("id");
    const data = c.req.valid("json");
    const now  = new Date().toISOString();

    const existing = db.select().from(journalEntries).where(eq(journalEntries.id, id)).get();
    if (!existing) return c.json({ error: "Not found" }, 404);

    db.update(journalEntries).set({
      plant_id:    data.plant_id,
      schedule_id: data.schedule_id,
      week:        data.week,
      entry_type:  data.entry_type,
      date:        data.date,
      title:       data.title,
      notes:       data.notes,
      updated_at:  now,
    }).where(eq(journalEntries.id, id)).run();

    // Sync attachment_ids: delete all existing junctions and re-insert
    db.delete(journalEntryAttachments)
      .where(eq(journalEntryAttachments.journal_entry_id, id))
      .run();
    for (const attId of data.attachment_ids) {
      db.insert(journalEntryAttachments)
        .values({ journal_entry_id: id, attachment_id: attId })
        .run();
    }

    const row = db.select().from(journalEntries).where(eq(journalEntries.id, id)).get()!;
    return c.json({ ...mapRow(row), attachment_ids: data.attachment_ids });
  });
