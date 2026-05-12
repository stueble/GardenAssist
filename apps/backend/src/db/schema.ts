import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ── plants ────────────────────────────────────────────────────────────────────

export const plants = sqliteTable("plants", {
  id:                    text("id").primaryKey(),
  name_common:           text("name_common").notNull(),
  name_botanical:        text("name_botanical"),
  icon:                  text("icon"),
  origin_type:           text("origin_type"),
  category:              text("category"),
  lifecycle:             text("lifecycle"),
  description:           text("description"),
  care_notes:            text("care_notes"),
  sun_demand:            text("sun_demand"),
  water_demand:          text("water_demand"),
  soil_type:             text("soil_type"),
  frost_tolerance_min_c: integer("frost_tolerance_min_c"),
  temperature_protected: integer("temperature_protected", { mode: "boolean" }).notNull().default(false),
  health_status:         text("health_status"),
  location:              text("location"),
  watering_zone:         text("watering_zone"),
  purchase_date:         text("purchase_date"),
  purchase_price:        real("purchase_price"),
  created_at:            text("created_at").notNull(),
  updated_at:            text("updated_at").notNull(),
});

// ── plant_positions ───────────────────────────────────────────────────────────

export const plantPositions = sqliteTable("plant_positions", {
  id:        text("id").primaryKey(),
  plant_id:  text("plant_id").notNull().references(() => plants.id, { onDelete: "cascade" }),
  x_percent: real("x_percent").notNull(),
  y_percent: real("y_percent").notNull(),
});

// ── schedules ─────────────────────────────────────────────────────────────────

export const schedules = sqliteTable("schedules", {
  id:            text("id").primaryKey(),
  plant_id:      text("plant_id").notNull().references(() => plants.id, { onDelete: "cascade" }),
  schedule_type: text("schedule_type").notNull(),
  start_week:    integer("start_week").notNull(),
  end_week:      integer("end_week").notNull(),
  color:         text("color"),
  label:         text("label"),
  notes:         text("notes"),
  created_at:    text("created_at").notNull(),
  updated_at:    text("updated_at").notNull(),
});

// ── journal_entries ───────────────────────────────────────────────────────────

export const journalEntries = sqliteTable("journal_entries", {
  id:          text("id").primaryKey(),
  plant_id:    text("plant_id").references(() => plants.id, { onDelete: "set null" }),
  schedule_id: text("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
  week:        text("week"),
  entry_type:  text("entry_type").notNull(),
  date:        text("date").notNull(),
  title:       text("title"),
  notes:       text("notes"),
  created_at:  text("created_at").notNull(),
  updated_at:  text("updated_at").notNull(),
});

// ── attachments ───────────────────────────────────────────────────────────────

export const attachments = sqliteTable("attachments", {
  id:              text("id").primaryKey(),
  owner_type:      text("owner_type").notNull(),  // plant | journal_entry | garden
  owner_id:        text("owner_id"),              // null for garden attachments
  attachment_type: text("attachment_type").notNull(), // image | pdf — derived server-side
  category:        text("category"),              // main | bloom | leaf | problem | invoice
  sort_order:      integer("sort_order").notNull().default(0), // display order within owner
  url:             text("url").notNull(),
  created_at:      text("created_at").notNull(),
  updated_at:      text("updated_at").notNull(),
});

// ── journal_entry_attachments (junction) ──────────────────────────────────────

export const journalEntryAttachments = sqliteTable(
  "journal_entry_attachments",
  {
    journal_entry_id: text("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    attachment_id: text("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.journal_entry_id, t.attachment_id] })],
);

// ── color_presets ─────────────────────────────────────────────────────────────

export const colorPresets = sqliteTable("color_presets", {
  id:            text("id").primaryKey(),
  schedule_type: text("schedule_type").notNull(),
  name:          text("name").notNull(),
  color:         text("color").notNull(),
  sort_order:    integer("sort_order").notNull(),
});

// ── garden (singleton) ────────────────────────────────────────────────────────

export const garden = sqliteTable("garden", {
  id:        text("id").primaryKey().default("garden"),
  plan_url:  text("plan_url"),
  plan_name: text("plan_name"),
});

// ── settings (singleton) ──────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  id:                       text("id").primaryKey().default("settings"),
  language:                 text("language").notNull().default("en"),            // Enum: de, en
  location_city:            text("location_city"),
  location_zip:             text("location_zip"),
  irrigation_zones:         text("irrigation_zones").default(sql`'[]'`),       // JSON array
  plant_categories:         text("plant_categories").default(sql`'[]'`),       // JSON array
  task_lookback_weeks:      integer("task_lookback_weeks").notNull().default(8),
  task_lookahead_weeks:     integer("task_lookahead_weeks").notNull().default(4),
  attachment_size_limit_mb: integer("attachment_size_limit_mb").notNull().default(10),
  ai_provider:              text("ai_provider"),
  ai_model:                 text("ai_model"),
  ai_api_key:               text("ai_api_key"),
  gardener_profile:         text("gardener_profile"),               // Enum: hobbyist | engaged | expert
});
