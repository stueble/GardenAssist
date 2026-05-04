import { z } from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDatetime = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/));
const isoWeek = z.string().regex(/^\d{4}-W\d{2}$/);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

// ── PlantPositionInput ────────────────────────────────────────────────────────

export const PlantPositionInputSchema = z.object({
  x_percent: z.number().min(0).max(100),
  y_percent: z.number().min(0).max(100),
});

// ── ScheduleInput ─────────────────────────────────────────────────────────────

const scheduleType = z.enum(["bloom", "growth", "foliage", "pruning", "fertilization", "misc"]);

export const ScheduleInputSchema = z.object({
  schedule_type: scheduleType,
  start_week:    z.number().int().min(1).max(53),
  end_week:      z.number().int().min(1).max(53),
  color:         hexColor.nullable(),
  label:         z.string().nullable(),
  notes:         z.string().nullable(),
});

// ── AttachmentInput ───────────────────────────────────────────────────────────

const attachmentCategory = z.enum(["main", "bloom", "leaf", "problem", "invoice"]).nullable();

export const AttachmentInputSchema = z.object({
  category: attachmentCategory,
});

// ── PlantInput ────────────────────────────────────────────────────────────────

export const PlantInputSchema = z.object({
  name_common:             z.string().min(1),
  name_botanical:          z.string().nullable(),
  icon:                    z.string().nullable(),
  origin_type:             z.enum(["native", "neophyte", "invasive_neophyte"]).nullable(),
  category:                z.string().nullable(),
  lifecycle:               z.enum(["annual", "biennial", "perennial", "evergreen"]).nullable(),
  description:             z.string().nullable(),
  care_notes:              z.string().nullable(),
  sun_demand:              z.enum(["sunny", "partial_shade", "shady"]).nullable(),
  water_demand:            z.enum(["low", "medium", "high"]).nullable(),
  soil_type:               z.enum(["loamy", "sandy", "humus_rich", "calcareous", "acidic"]).nullable(),
  frost_tolerance_min_c:   z.number().nullable(),
  temperature_protected:   z.boolean(),
  health_status:           z.enum(["good", "watch", "needs_treatment"]).nullable(),
  location:                z.string().nullable(),
  watering_zone:           z.string().nullable(),
  purchase_date:           isoDate.nullable(),
  purchase_price:          z.number().nonnegative().nullable(),
  thumbnail_attachment_id: uuid.nullable(),
  positions:               z.array(PlantPositionInputSchema),
  attachments:             z.array(AttachmentInputSchema),
  schedules:               z.array(ScheduleInputSchema),
});

// ── JournalEntryInput ─────────────────────────────────────────────────────────

export const JournalEntryInputSchema = z.object({
  plant_id:       uuid.nullable(),
  schedule_id:    uuid.nullable(),
  week:           isoWeek.nullable(),
  entry_type:     z.enum(["manual", "done", "skipped"]),
  date:           isoDate,
  title:          z.string().nullable(),
  notes:          z.string().nullable(),
  attachment_ids: z.array(uuid),
});

// ── GardenInput ───────────────────────────────────────────────────────────────

export const GardenInputSchema = z.object({
  plan_name: z.string().nullable(),
});

// ── Settings ──────────────────────────────────────────────────────────────────

const ColorPresetSchema = z.object({
  schedule_type: scheduleType,
  name:          z.string().min(1),
  color:         hexColor,
});

export const SettingsSchema = z.object({
  location_city:            z.string().nullable(),
  location_zip:             z.string().nullable(),
  irrigation_zones:         z.array(z.string()),
  plant_categories:         z.array(z.string()),
  color_presets:            z.array(ColorPresetSchema),
  task_lookback_weeks:      z.number().int().positive(),
  task_lookahead_weeks:     z.number().int().positive(),
  attachment_size_limit_mb: z.number().int().positive(),
  ai_provider:              z.enum(["anthropic", "openai", "openrouter"]).nullable(),
  ai_model:                 z.string().nullable(),
  ai_api_key:               z.string().nullable(),
});
