/**
 * Garden service — assembles the Garden root object from normalized DB tables.
 *
 * The DB stores flat, normalized rows. This service maps them to the nested
 * API types defined in docs/api/.
 */

import { eq, inArray } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import type * as Schema from "../db/schema.js";
import type { Garden, Warning } from "@api/garden.js";
import type { Plant }        from "@api/plant.js";
import type { PlantPosition } from "@api/plant-position.js";
import type { Schedule }     from "@api/schedule.js";
import type { JournalEntry } from "@api/journal-entry.js";
import type { Attachment }   from "@api/attachment.js";
import type { Settings }     from "@api/settings.js";
import { deriveTasks }       from "./tasks.js";

type Db = BetterSQLite3Database<typeof schema>;

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapPosition(row: typeof schema.plantPositions.$inferSelect): PlantPosition {
  return {
    x_percent: row.x_percent,
    y_percent: row.y_percent,
  };
}

function mapSchedule(row: typeof schema.schedules.$inferSelect): Schedule {
  return {
    id:            row.id,
    schedule_type: row.schedule_type as Schedule["schedule_type"],
    start_week:    row.start_week,
    end_week:      row.end_week,
    color:         row.color ?? null,
    label:         row.label ?? null,
    notes:         row.notes ?? null,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
  };
}

function mapJournalEntry(
  row: typeof schema.journalEntries.$inferSelect,
  attachmentIds: string[],
): JournalEntry {
  return {
    id:             row.id,
    plant_id:       row.plant_id ?? null,
    schedule_id:    row.schedule_id ?? null,
    week:           row.week ?? null,
    entry_type:     row.entry_type as JournalEntry["entry_type"],
    date:           row.date,
    title:          row.title ?? null,
    notes:          row.notes ?? null,
    attachment_ids: attachmentIds,
    created_at:     row.created_at,
    updated_at:     row.updated_at,
  };
}

function mapAttachment(row: typeof schema.attachments.$inferSelect): Attachment {
  return {
    id:              row.id,
    attachment_type: row.attachment_type as Attachment["attachment_type"],
    category:        (row.category ?? null) as Attachment["category"],
    url:             row.url,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
  };
}

// ── getGarden ─────────────────────────────────────────────────────────────────

export async function getGarden(db: Db): Promise<Garden> {
  // 1. Load settings for task window config
  const settingsRows = db.select().from(schema.settings).all();
  const settingsRow = settingsRows[0];
  const lookbackWeeks  = settingsRow?.task_lookback_weeks  ?? 2;
  const lookaheadWeeks = settingsRow?.task_lookahead_weeks ?? 4;

  // 2. Load garden singleton
  const gardenRows = db.select().from(schema.garden).all();
  const gardenRow = gardenRows[0];

  // 3. Load all plants
  const plantRows = db.select().from(schema.plants).all();
  const plantIds  = plantRows.map((p) => p.id);

  // 4. Load all related data in bulk (avoid N+1 queries)
  const positionRows = plantIds.length > 0
    ? db.select().from(schema.plantPositions)
        .where(inArray(schema.plantPositions.plant_id, plantIds)).all()
    : [];

  const scheduleRows = plantIds.length > 0
    ? db.select().from(schema.schedules)
        .where(inArray(schema.schedules.plant_id, plantIds)).all()
    : [];

  const journalEntryRows = db.select().from(schema.journalEntries).all();

  const attachmentRows   = db.select().from(schema.attachments).all();

  const jeAttachRows     = db.select().from(schema.journalEntryAttachments).all();

  // 5. Build lookup maps
  const positionsByPlant   = groupBy(positionRows,     (r) => r.plant_id);
  const schedulesByPlant   = groupBy(scheduleRows,      (r) => r.plant_id);
  const jeByPlant          = groupBy(
    journalEntryRows.filter((e) => e.plant_id != null),
    (r) => r.plant_id!
  );
  const attachmentById     = new Map(attachmentRows.map((a) => [a.id, a]));
  const attachmentsByOwner = groupBy(
    attachmentRows.filter((a) => a.owner_type === "plant" && a.owner_id != null),
    (r) => r.owner_id!
  );
  const jeAttachsByJe      = groupBy(jeAttachRows, (r) => r.journal_entry_id);

  // 6. Assemble plants
  const plants: Plant[] = plantRows.map((plantRow) => {
    const positions     = (positionsByPlant.get(plantRow.id) ?? []).map(mapPosition);
    const schedules     = (schedulesByPlant.get(plantRow.id) ?? []).map(mapSchedule);
    const plantJeRows   = jeByPlant.get(plantRow.id) ?? [];
    const plantAttRows  = attachmentsByOwner.get(plantRow.id) ?? [];

    const journalEntries: JournalEntry[] = plantJeRows.map((je) => {
      const attachIds = (jeAttachsByJe.get(je.id) ?? []).map((r) => r.attachment_id);
      return mapJournalEntry(je, attachIds);
    });

    const attachments: Attachment[] = plantAttRows.map(mapAttachment);

    const tasks = deriveTasks({
      schedules,
      journalEntries,
      lookbackWeeks,
      lookaheadWeeks,
    });

    return {
      id:                      plantRow.id,
      name_common:             plantRow.name_common,
      name_botanical:          plantRow.name_botanical ?? null,
      icon:                    plantRow.icon ?? null,
      origin_type:             (plantRow.origin_type ?? null) as Plant["origin_type"],
      category:                plantRow.category ?? null,
      lifecycle:               (plantRow.lifecycle ?? null) as Plant["lifecycle"],
      description:             plantRow.description ?? null,
      care_notes:              plantRow.care_notes ?? null,
      sun_demand:              (plantRow.sun_demand ?? null) as Plant["sun_demand"],
      water_demand:            (plantRow.water_demand ?? null) as Plant["water_demand"],
      soil_type:               (plantRow.soil_type ?? null) as Plant["soil_type"],
      frost_tolerance_min_c:   plantRow.frost_tolerance_min_c ?? null,
      temperature_protected:   plantRow.temperature_protected ?? false,
      health_status:           (plantRow.health_status ?? null) as Plant["health_status"],
      location:                plantRow.location ?? null,
      watering_zone:           plantRow.watering_zone ?? null,
      purchase_date:           plantRow.purchase_date ?? null,
      purchase_price:          plantRow.purchase_price ?? null,
      thumbnail_attachment_id: plantRow.thumbnail_attachment_id ?? null,
      positions,
      attachments,
      journal_entries: journalEntries,
      schedules,
      tasks,
      created_at: plantRow.created_at,
      updated_at: plantRow.updated_at,
    };
  });

  // 7. Garden-wide journal entries (plant_id = null)
  const gardenJeRows = journalEntryRows.filter((e) => e.plant_id == null);
  const gardenJournalEntries: JournalEntry[] = gardenJeRows.map((je) => {
    const attachIds = (jeAttachsByJe.get(je.id) ?? []).map((r) => r.attachment_id);
    return mapJournalEntry(je, attachIds);
  });

  // All journal entries for Garden.journal_entries (plant-specific + garden-wide)
  const allJournalEntries: JournalEntry[] = [
    ...plants.flatMap((p) => p.journal_entries),
    ...gardenJournalEntries,
  ].sort((a, b) => b.date.localeCompare(a.date));

  // 8. Garden-wide attachments
  const gardenAttachments: Attachment[] = attachmentRows
    .filter((a) => a.owner_type === "garden")
    .map(mapAttachment);

  // Hardcoded warnings — will be replaced by weather API integration in a future story
  const warnings: Warning[] = [
    {
      message: "Wettermodul nicht verfügbar",
      sub:     "Wetterinformationen und Frostwarnungen folgen in einer späteren Version.",
    },
  ];

  return {
    plan_url:        gardenRow?.plan_url   ?? null,
    plan_name:       gardenRow?.plan_name  ?? null,
    plants,
    journal_entries: allJournalEntries,
    attachments:     gardenAttachments,
    warnings,
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k) ?? [];
    arr.push(item);
    map.set(k, arr);
  }
  return map;
}
