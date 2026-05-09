/**
 * Plant service — create, update, delete plants.
 */

import { eq, inArray } from "drizzle-orm";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema.js";
import { z } from "zod";
import { PlantInputSchema } from "../schemas/index.js";
import { getGarden } from "./garden.service.js";

type PlantInput = z.infer<typeof PlantInputSchema>;

type Db = BetterSQLite3Database<typeof schema>;

const NOW = () => new Date().toISOString();

// ── createPlant ───────────────────────────────────────────────────────────────

export async function createPlant(db: Db, data: PlantInput) {
  const id = crypto.randomUUID();
  const now = NOW();

  db.insert(schema.plants).values({
    id,
    name_common:           data.name_common,
    name_botanical:        data.name_botanical,
    icon:                  data.icon,
    origin_type:           data.origin_type,
    category:              data.category,
    lifecycle:             data.lifecycle,
    description:           data.description,
    care_notes:            data.care_notes,
    sun_demand:            data.sun_demand,
    water_demand:          data.water_demand,
    soil_type:             data.soil_type,
    frost_tolerance_min_c: data.frost_tolerance_min_c,
    temperature_protected: data.temperature_protected,
    health_status:         data.health_status,
    location:              data.location,
    watering_zone:         data.watering_zone,
    purchase_date:         data.purchase_date,
    purchase_price:        data.purchase_price,
    created_at:            now,
    updated_at:            now,
  }).run();

  // Insert positions
  for (const pos of data.positions) {
    db.insert(schema.plantPositions).values({
      id:        crypto.randomUUID(),
      plant_id:  id,
      x_percent: pos.x_percent,
      y_percent: pos.y_percent,
    }).run();
  }

  // Insert schedules
  for (const sched of data.schedules) {
    db.insert(schema.schedules).values({
      id:            crypto.randomUUID(),
      plant_id:      id,
      schedule_type: sched.schedule_type,
      start_week:    sched.start_week,
      end_week:      sched.end_week,
      color:         sched.color,
      label:         sched.label,
      notes:         sched.notes,
      created_at:    now,
      updated_at:    now,
    }).run();
  }

  // Return the assembled plant
  const garden = await getGarden(db);
  const plant = garden.plants.find((p) => p.id === id);
  if (!plant) throw new Error("Plant not found after create");
  return plant;
}

// ── updatePlant ───────────────────────────────────────────────────────────────

export async function updatePlant(db: Db, id: string, data: PlantInput) {
  const now = NOW();

  db.update(schema.plants)
    .set({
      name_common:           data.name_common,
      name_botanical:        data.name_botanical,
      icon:                  data.icon,
      origin_type:           data.origin_type,
      category:              data.category,
      lifecycle:             data.lifecycle,
      description:           data.description,
      care_notes:            data.care_notes,
      sun_demand:            data.sun_demand,
      water_demand:          data.water_demand,
      soil_type:             data.soil_type,
      frost_tolerance_min_c: data.frost_tolerance_min_c,
      temperature_protected: data.temperature_protected,
      health_status:         data.health_status,
      location:              data.location,
      watering_zone:         data.watering_zone,
      purchase_date:         data.purchase_date,
      purchase_price:        data.purchase_price,
      updated_at:            now,
    })
    .where(eq(schema.plants.id, id))
    .run();

  // Replace positions (patch-replace semantics)
  db.delete(schema.plantPositions)
    .where(eq(schema.plantPositions.plant_id, id))
    .run();
  for (const pos of data.positions) {
    db.insert(schema.plantPositions).values({
      id:        crypto.randomUUID(),
      plant_id:  id,
      x_percent: pos.x_percent,
      y_percent: pos.y_percent,
    }).run();
  }

  // Replace schedules (patch-replace semantics)
  db.delete(schema.schedules)
    .where(eq(schema.schedules.plant_id, id))
    .run();
  for (const sched of data.schedules) {
    db.insert(schema.schedules).values({
      id:            crypto.randomUUID(),
      plant_id:      id,
      schedule_type: sched.schedule_type,
      start_week:    sched.start_week,
      end_week:      sched.end_week,
      color:         sched.color,
      label:         sched.label,
      notes:         sched.notes,
      created_at:    now,
      updated_at:    now,
    }).run();
  }

  // Update attachment category and sort_order (patch-replace semantics on metadata)
  for (const att of data.attachments) {
    db.update(schema.attachments)
      .set({ category: att.category, sort_order: att.sort_order, updated_at: now })
      .where(eq(schema.attachments.id, att.id))
      .run();
  }

  // Return the assembled plant
  const garden = await getGarden(db);
  const plant = garden.plants.find((p) => p.id === id);
  if (!plant) throw new Error("Plant not found after update");
  return plant;
}

// ── deletePlant ───────────────────────────────────────────────────────────────

export function deletePlant(db: Db, id: string): void {
  // Cascade delete via FK (positions, schedules) — set null for journal entries
  db.delete(schema.plants)
    .where(eq(schema.plants.id, id))
    .run();
}
