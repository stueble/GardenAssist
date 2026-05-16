import type { Garden } from "@api/garden.js";
import type { Plant } from "@api/plant.js";
import type { JournalEntry } from "@api/journal-entry.js";
import type { Attachment } from "@api/attachment.js";
import type { Settings } from "@api/settings.js";
import type { Schedule } from "@api/schedule.js";

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

export function mockAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id:              "att-mock-001",
    attachment_type: "image",
    category:        "main",
    sort_order:      0,
    url:             "/static/attachments/mock.jpg",
    created_at:      NOW,
    updated_at:      NOW,
    ...overrides,
  };
}

export function mockSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id:            "sched-mock-001",
    schedule_type: "pruning",
    start_week:    10,
    end_week:      12,
    color:         "#27ae60",
    label:         "Frühjahrsschnitt",
    notes:         null,
    created_at:    NOW,
    updated_at:    NOW,
    ...overrides,
  };
}

export function mockJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id:             "je-mock-001",
    plant_id:       "plant-mock-001",
    schedule_id:    null,
    week:           null,
    entry_type:     "manual",
    date:           TODAY,
    title:          "Beobachtung",
    notes:          "Alles gut.",
    attachment_ids: [],
    created_at:     NOW,
    updated_at:     NOW,
    ...overrides,
  };
}

export function mockPlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id:                      "plant-mock-001",
    name_common:             "Rote Rose",
    name_botanical:          "Rosa",
    icon:                    null,
    origin_type:             "native",
    category:                "Rosen",
    lifecycle:               "perennial",
    description:             "Eine schöne rote Rose.",
    care_notes:              null,
    sun_demand:              "sunny",
    water_demand:            "medium",
    soil_type:               "loamy",
    frost_tolerance_min_c:   -15,
    temperature_protected:   false,
    health_status:           "good",
    location:                "Westbeet",
    watering_zone:           null,
    purchase_date:           "2024-03-15",
    purchase_price:          12.50,
    positions:       [{ x_percent: 30, y_percent: 50 }],
    attachments:     [mockAttachment()],
    journal_entries: [mockJournalEntry()],
    schedules:               [mockSchedule()],
    tasks:                   [],
    created_at:              NOW,
    updated_at:              NOW,
    ...overrides,
  };
}

export function mockGarden(): Garden {
  return {
    plan_url:        null,
    plan_name:       null,
    plants:          [mockPlant()],
    journal_entries: [mockJournalEntry()],
    attachments:     [],
    warnings:        [],
  };
}

export function mockSettings(): Settings {
  return {
    language:                 "de",
    location_city:            null,
    location_zip:             null,
    irrigation_zones:         [],
    plant_categories:         ["Rosen", "Gemüse"],
    color_presets:            [
      { schedule_type: "pruning",       name: "Grün",  color: "#27ae60" },
      { schedule_type: "fertilization", name: "Blau",  color: "#2980b9" },
      { schedule_type: "bloom",         name: "Rot",   color: "#c0392b" },
    ],
    soil_moisture_dry_threshold_pct: 40,
    task_lookback_weeks:      2,
    task_lookahead_weeks:     4,
    attachment_size_limit_mb: 10,
    ai_provider:              null,
    ai_model:                 null,
    ai_api_key:               null,
    gardener_profile:         null,
  };
}
