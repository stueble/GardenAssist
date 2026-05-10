/**
 * Tests for aiPrompt.ts — STORY-043
 *
 * Verifies:
 * - AC #3 Garden serialization strips forbidden fields
 * - AC #4 Selected plant: only one identifying line in layer 3
 * - AC #5 System prompt layers 1+2 available in de and en
 * - AC #2 Three-layer structure present
 */

import { describe, it, expect } from "vitest";
import { serializeGarden, buildSystemPrompt, buildSystemBlocks } from "../lib/aiPrompt";
import type { Garden }            from "@api/garden";
import type { Plant }             from "@api/plant";
import type { AssistantContext }  from "@api/assistant-context";
import type { AssistantSettings } from "@api/assistant-context";

// ── Minimal fixtures ──────────────────────────────────────────────────────────

const SCHEDULE = {
  id:            "s-1",
  schedule_type: "bloom" as const,
  start_week:    15,
  end_week:      25,
  color:         "#ff0000",
  label:         "Blüte",
  notes:         "Schöne Blüte",
  created_at:    "2023-01-01T00:00:00Z",
  updated_at:    "2023-01-01T00:00:00Z",
};

const ATTACHMENT = {
  id:              "att-1",
  attachment_type: "image" as const,
  category:        "main" as const,
  sort_order:      0,
  url:             "/static/p1.jpg",
  created_at:      "2023-01-01T00:00:00Z",
  updated_at:      "2023-01-01T00:00:00Z",
};

const PLANT: Plant = {
  id:                      "p-1",
  name_common:             "Rote Rose",
  name_botanical:          "Rosa rubra",
  icon:                    "<svg>...</svg>",
  origin_type:             "native",
  category:                "Rosen",
  lifecycle:               "perennial",
  description:             "Eine schöne Rose",
  care_notes:              "Viel Sonne",
  sun_demand:              "sunny",
  water_demand:            "medium",
  soil_type:               "loamy",
  frost_tolerance_min_c:   -10,
  temperature_protected:   false,
  health_status:           "good",
  location:                "Südbeeet",
  watering_zone:           null,
  purchase_date:           "2023-04-01",
  purchase_price:          12.5,
  
  positions:               [{ x_percent: 50, y_percent: 60 }],
  attachments:             [ATTACHMENT],
  schedules:               [SCHEDULE],
  tasks:                   [{ schedule: SCHEDULE, status: "due", week: "2024-W20" }],
  journal_entries:         [{ id: "je-1", plant_id: "p-1", schedule_id: null, week: null, entry_type: "done", date: "2024-05-01", title: "Gegossen", notes: "Gründlich", attachment_ids: [], created_at: "2024-05-01T00:00:00Z", updated_at: "2024-05-01T00:00:00Z" }],
  created_at:              "2023-01-01T00:00:00Z",
  updated_at:              "2024-01-01T00:00:00Z",
};

const GARDEN: Garden = {
  plan_url:        "/static/garden/plan.jpg",
  plan_name:       "Mein Garten",
  plants:          [PLANT],
  journal_entries: [
    { id: "je-1", plant_id: "p-1", schedule_id: null, week: null, entry_type: "done", date: "2024-05-01", title: "Gegossen", notes: null, attachment_ids: [], created_at: "2024-05-01T00:00:00Z", updated_at: "2024-05-01T00:00:00Z" },
    { id: "je-2", plant_id: null, schedule_id: null, week: null, entry_type: "observation", date: "2024-05-02", title: "Gartenrundgang", notes: "Alles gut", attachment_ids: [], created_at: "2024-05-02T00:00:00Z", updated_at: "2024-05-02T00:00:00Z" },
  ],
  attachments:     [{ id: "att-1", attachment_type: "image", category: null, sort_order: 0, url: "/static/plan.jpg", created_at: "2023-01-01T00:00:00Z", updated_at: "2023-01-01T00:00:00Z" }],
  warnings:        [],
};

// ── serializeGarden — AC #3 ───────────────────────────────────────────────────

describe("serializeGarden — field stripping (AC #3)", () => {
  it("does not include created_at or updated_at", () => {
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("created_at");
    expect(result).not.toContain("updated_at");
    expect(result).not.toContain("2023-01-01T00:00:00Z");
  });

  it("does not include attachment URLs", () => {
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("/static/p1.jpg");
    expect(result).not.toContain("/static/plan.jpg");
  });

  it("does not include attachment ids or sort_order", () => {
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("att-1");
    expect(result).not.toContain("sort_order");
  });

  it("does not include position coordinates", () => {
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("x_percent");
    expect(result).not.toContain("y_percent");
    expect(result).not.toContain("50");  // x_percent value
  });

  it("does not include raw SVG icon", () => {
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("<svg>");
  });

  it("includes plant name, location, and description", () => {
    const result = serializeGarden(GARDEN);
    expect(result).toContain("Rote Rose");
    expect(result).toContain("Rosa rubra");
    expect(result).toContain("Südbeeet");
    expect(result).toContain("Eine schöne Rose");
  });

  it("includes schedule type, weeks and label", () => {
    const result = serializeGarden(GARDEN);
    expect(result).toContain("bloom");
    expect(result).toContain("15");
    expect(result).toContain("25");
    expect(result).toContain("Blüte");
  });

  it("includes journal entries for the plant", () => {
    const result = serializeGarden(GARDEN);
    expect(result).toContain("2024-05-01");
    expect(result).toContain("Gegossen");
  });

  it("includes garden-wide journal entries (plant_id null)", () => {
    const result = serializeGarden(GARDEN);
    expect(result).toContain("Gartenrundgang");
    expect(result).toContain("Gartenweite");
  });

  it("includes open tasks", () => {
    const result = serializeGarden(GARDEN);
    expect(result).toContain("due");
  });
});

// ── buildSystemPrompt — AC #2, #4, #5 ────────────────────────────────────────

describe("buildSystemPrompt — three-layer structure (AC #2)", () => {
  it("contains all three layers separated by ---", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "de");
    const parts = prompt.split("---");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it("contains garden data in the prompt", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("Rote Rose");
  });
});

describe("buildSystemPrompt — language (AC #5)", () => {
  it("German persona contains 'Gartenassistent'", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("Gartenassistent");
  });

  it("English persona contains 'garden assistant'", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "en");
    expect(prompt.toLowerCase()).toContain("garden assistant");
  });

  it("German prompt contains active view label in German", () => {
    const ctx: AssistantContext = { view: "journal", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("Tagebuch");
  });

  it("English prompt contains active view label in English", () => {
    const ctx: AssistantContext = { view: "journal", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "en");
    expect(prompt).toContain("Journal");
  });
});

describe("buildSystemPrompt — selected plant (AC #4)", () => {
  it("adds one identifying line for selected plant in the situation block", () => {
    const ctx: AssistantContext = {
      view:          "plants",
      garden:        GARDEN,
      selectedPlant: PLANT,
    };
    const prompt = buildSystemPrompt(ctx, "de");

    // The identifying line appears in the situation block (Block 5)
    expect(prompt).toContain("Ausgewählte Pflanze");
    expect(prompt).toContain("Rote Rose");

    // Block 3 (base) and Block 4 (dynamic) both have "## Rote Rose" — that's correct
    // (base: name/location/..., dynamic: schedules/tasks/journal)
    const headingCount = (prompt.match(/## Rote Rose/g) ?? []).length;
    expect(headingCount).toBeGreaterThanOrEqual(1);
  });

  it("selected plant line includes botanical name and location", () => {
    const ctx: AssistantContext = {
      view:          "plants",
      garden:        GARDEN,
      selectedPlant: PLANT,
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("Rosa rubra");
    expect(prompt).toContain("Südbeeet");
  });
});

// ── buildSystemBlocks — TASK-056 ──────────────────────────────────────────────

const MOCK_SETTINGS: AssistantSettings = {
  location_city:    "München",
  location_zip:     "80331",
  irrigation_zones: ["Beet West", "Terrasse"],
  plant_categories: ["Rosen", "Stauden"],
  color_presets:    [
    { schedule_type: "bloom", name: "Dunkelrot", color: "#8B0000" },
  ],
  gardener_profile: null,
};

describe("buildSystemBlocks — block structure (TASK-056 AC #1, #2)", () => {
  it("returns at least 3 blocks (without settings, without dynamic data)", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const blocks = buildSystemBlocks(ctx, "de");
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("returns 5 blocks when settings and dynamic plant data are present", () => {
    const ctx: AssistantContext = {
      view:     "plants",
      garden:   GARDEN,
      settings: MOCK_SETTINGS,
    };
    const blocks = buildSystemBlocks(ctx, "de");
    expect(blocks.length).toBe(5);
  });

  it("each block has a non-empty text field", () => {
    const ctx: AssistantContext = {
      view:     "plants",
      garden:   GARDEN,
      settings: MOCK_SETTINGS,
    };
    const blocks = buildSystemBlocks(ctx, "de");
    for (const b of blocks) {
      expect(b.text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("buildSystemBlocks — block 1: persona + tools (AC #1)", () => {
  it("first block contains persona text", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const blocks = buildSystemBlocks(ctx, "de");
    expect(blocks[0].text).toContain("Gartenassistent");
  });

  it("first block contains tool description", () => {
    const ctx: AssistantContext = { view: "dashboard", garden: GARDEN };
    const blocks = buildSystemBlocks(ctx, "de");
    expect(blocks[0].text).toContain("editPlant");
  });

  it("first block is the same on every call (static, cacheable)", () => {
    const ctx1: AssistantContext = { view: "dashboard", garden: GARDEN };
    const ctx2: AssistantContext = { view: "journal",   garden: GARDEN };
    const b1 = buildSystemBlocks(ctx1, "de")[0].text;
    const b2 = buildSystemBlocks(ctx2, "de")[0].text;
    expect(b1).toBe(b2);
  });
});

describe("buildSystemBlocks — block 2: settings (AC #3)", () => {
  it("includes irrigation zones when settings provided", () => {
    const ctx: AssistantContext = {
      view:     "plants",
      garden:   GARDEN,
      settings: MOCK_SETTINGS,
    };
    const blocks = buildSystemBlocks(ctx, "de");
    const settingsBlock = blocks.find((b) => b.text.includes("Beet West"));
    expect(settingsBlock).toBeDefined();
  });

  it("includes plant categories when settings provided", () => {
    const ctx: AssistantContext = {
      view:     "plants",
      garden:   GARDEN,
      settings: MOCK_SETTINGS,
    };
    const blocks = buildSystemBlocks(ctx, "de");
    const settingsBlock = blocks.find((b) => b.text.includes("Rosen"));
    expect(settingsBlock).toBeDefined();
  });

  it("no settings block when settings not provided", () => {
    const ctx: AssistantContext = { view: "plants", garden: GARDEN };
    const blocks = buildSystemBlocks(ctx, "de");
    const hasZones = blocks.some((b) => b.text.includes("Beet West"));
    expect(hasZones).toBe(false);
  });
});

describe("buildSystemBlocks — block 3+4: plant data split (AC #4)", () => {
  it("plant base data (name, location) appears before dynamic data (tasks, journal)", () => {
    const ctx: AssistantContext = {
      view:     "plants",
      garden:   GARDEN,
      settings: MOCK_SETTINGS,
    };
    const blocks = buildSystemBlocks(ctx, "de");
    const baseIdx    = blocks.findIndex((b) => b.text.includes("Südbeeet"));
    const dynamicIdx = blocks.findIndex((b) => b.text.includes("Gegossen"));
    expect(baseIdx).toBeGreaterThan(-1);
    expect(dynamicIdx).toBeGreaterThan(-1);
    expect(baseIdx).toBeLessThan(dynamicIdx);
  });
});

describe("buildSystemBlocks — block 5: current situation last (AC #5)", () => {
  it("last block contains current view", () => {
    const ctx: AssistantContext = {
      view:     "journal",
      garden:   GARDEN,
      settings: MOCK_SETTINGS,
    };
    const blocks = buildSystemBlocks(ctx, "de");
    const last = blocks[blocks.length - 1];
    expect(last.text).toContain("Tagebuch");
  });

  it("last block changes when view changes; first block stays the same", () => {
    const ctx1: AssistantContext = { view: "plants",   garden: GARDEN, settings: MOCK_SETTINGS };
    const ctx2: AssistantContext = { view: "calendar", garden: GARDEN, settings: MOCK_SETTINGS };
    const blocks1 = buildSystemBlocks(ctx1, "de");
    const blocks2 = buildSystemBlocks(ctx2, "de");
    expect(blocks1[0].text).toBe(blocks2[0].text);  // Block 1 identical
    expect(blocks1[blocks1.length - 1].text).not.toBe(blocks2[blocks2.length - 1].text); // Block 5 differs
  });
});

// ── Missing-field regression tests ───────────────────────────────────────────

describe("serializeGarden — previously missing fields now included", () => {
  it("includes watering_zone when set", () => {
    const plant: Plant = { ...PLANT, watering_zone: "Zone A" };
    const garden: Garden = { ...GARDEN, plants: [plant] };
    const result = serializeGarden(garden);
    expect(result).toContain("Zone A");
    expect(result).toContain("Bewässerungszone");
  });

  it("omits watering_zone label when value is null", () => {
    const plant: Plant = { ...PLANT, watering_zone: null };
    const garden: Garden = { ...GARDEN, plants: [plant] };
    const result = serializeGarden(garden);
    expect(result).not.toContain("Bewässerungszone");
  });

  it("includes Task.week in the task line", () => {
    const result = serializeGarden(GARDEN);
    // PLANT has task with week "2024-W20"
    expect(result).toContain("2024-W20");
    expect(result).toContain("Woche");
  });

  it("includes JournalEntry.week when set", () => {
    const entry = {
      ...PLANT.journal_entries[0],
      week: "2024-W18",
      schedule_id: "s-1",
    };
    const plant: Plant = { ...PLANT, journal_entries: [entry] };
    const garden: Garden = { ...GARDEN, plants: [plant] };
    const result = serializeGarden(garden);
    expect(result).toContain("2024-W18");
  });

  it("includes JournalEntry.schedule_id when set", () => {
    const entry = {
      ...PLANT.journal_entries[0],
      schedule_id: "s-1",
      week: null,
    };
    const plant: Plant = { ...PLANT, journal_entries: [entry] };
    const garden: Garden = { ...GARDEN, plants: [plant] };
    const result = serializeGarden(garden);
    expect(result).toContain("schedule_id: s-1");
  });

  it("omits schedule_id label when schedule_id is null on journal entry", () => {
    // default PLANT journal entry has schedule_id: null
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("schedule_id:");
  });
});

// ── pendingPlantEdit in Block 5 ───────────────────────────────────────────────

describe("buildSystemPrompt — pendingPlantEdit in Block 5", () => {
  it("includes scalar pending fields with 'not suggested again' warning", () => {
    const ctx: AssistantContext = {
      view:   "plants",
      garden: GARDEN,
      pendingPlantEdit: {
        plantId:      "p-1",
        scalarFields: { name_botanical: "Rosa canina", care_notes: "Regelmäßig düngen" },
        schedules:    [],
      },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("name_botanical: Rosa canina");
    expect(prompt).toContain("care_notes: Regelmäßig düngen");
    expect(prompt).toContain("NICHT nochmal vorschlagen");
    expect(prompt).toContain("noch NICHT gespeichert");
  });

  it("includes pending ADD schedule with temporary ID note", () => {
    const ctx: AssistantContext = {
      view:   "plants",
      garden: GARDEN,
      pendingPlantEdit: {
        plantId:      "p-1",
        scalarFields: {},
        schedules: [{
          action:        "add",
          id:            "temp-uuid-123",
          isTemporaryId: true,
          schedule_type: "bloom",
          start_week:    15,
          end_week:      25,
          label:         "Hauptblüte",
          color:         "#c0392b",
        }],
      },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("temp-uuid-123");
    expect(prompt).toContain("temporäre ID");
    expect(prompt).toContain("ADD");
    expect(prompt).toContain("bloom");
    expect(prompt).toContain("KW 15–25");
    expect(prompt).toContain("Hauptblüte");
  });

  it("includes pending REMOVE schedule with server ID (not marked temporary)", () => {
    const ctx: AssistantContext = {
      view:   "plants",
      garden: GARDEN,
      pendingPlantEdit: {
        plantId:      "p-1",
        scalarFields: {},
        schedules: [{
          action:        "remove",
          id:            "server-id-456",
          isTemporaryId: false,
          schedule_type: "pruning",
          start_week:    9,
          end_week:      10,
          label:         null,
          color:         null,
        }],
      },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("server-id-456");
    expect(prompt).toContain("REMOVE");
    expect(prompt).toContain("pruning");
    // No "temporäre ID" note for server IDs
    expect(prompt).not.toContain("temporäre ID");
  });

  it("omits pending section entirely when pendingPlantEdit is absent", () => {
    const ctx: AssistantContext = { view: "plants", garden: GARDEN };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).not.toContain("noch NICHT gespeichert");
    expect(prompt).not.toContain("NICHT nochmal vorschlagen");
  });

  it("renders in English when lang is 'en'", () => {
    const ctx: AssistantContext = {
      view:   "plants",
      garden: GARDEN,
      pendingPlantEdit: {
        plantId:      "p-1",
        scalarFields: { name_botanical: "Rosa canina" },
        schedules:    [],
      },
    };
    const prompt = buildSystemPrompt(ctx, "en");
    expect(prompt).toContain("NOT yet saved");
    expect(prompt).toContain("do NOT suggest again");
    expect(prompt).toContain("name_botanical: Rosa canina");
  });
});

// ── Gardener profile in Block 2 (TASK-062 AC #5, #6, #8) ─────────────────────

describe("buildSystemPrompt — gardener profile in Block 2 (TASK-062)", () => {
  it("hobbyist profile: describes ~1h/week and simple routines (DE)", () => {
    const ctx: AssistantContext = {
      view: "plants", garden: GARDEN,
      settings: { ...MOCK_SETTINGS, gardener_profile: "hobbyist" },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("1 Stunde pro Woche");
    expect(prompt).toContain("einfach");
  });

  it("engaged profile: describes 2–4h/week and standard care (DE)", () => {
    const ctx: AssistantContext = {
      view: "plants", garden: GARDEN,
      settings: { ...MOCK_SETTINGS, gardener_profile: "engaged" },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("2–4 Stunden");
    expect(prompt).toContain("saisonale Pflege");
  });

  it("expert profile: describes 5h+/week and professional routines (DE)", () => {
    const ctx: AssistantContext = {
      view: "plants", garden: GARDEN,
      settings: { ...MOCK_SETTINGS, gardener_profile: "expert" },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("5 Stunden");
    expect(prompt).toContain("professionelle");
  });

  it("null profile falls back to engaged behaviour (DE)", () => {
    const ctx: AssistantContext = {
      view: "plants", garden: GARDEN,
      settings: { ...MOCK_SETTINGS, gardener_profile: null },
    };
    const prompt = buildSystemPrompt(ctx, "de");
    // Should contain engaged text (the default)
    expect(prompt).toContain("2–4 Stunden");
  });

  it("renders in English for all three profiles", () => {
    const profiles = ["hobbyist", "engaged", "expert"] as const;
    const expected = [
      ["1 hour", "simple"],
      ["2–4 hours", "seasonal care"],
      ["5 or more hours", "professional"],
    ];
    for (let i = 0; i < profiles.length; i++) {
      const ctx: AssistantContext = {
        view: "plants", garden: GARDEN,
        settings: { ...MOCK_SETTINGS, gardener_profile: profiles[i] },
      };
      const prompt = buildSystemPrompt(ctx, "en");
      for (const phrase of expected[i]) {
        expect(prompt).toContain(phrase);
      }
    }
  });

  it("profile sentence appears in Block 2, not Block 1 (static block unchanged)", () => {
    const ctx1: AssistantContext = {
      view: "plants", garden: GARDEN,
      settings: { ...MOCK_SETTINGS, gardener_profile: "hobbyist" },
    };
    const ctx2: AssistantContext = {
      view: "plants", garden: GARDEN,
      settings: { ...MOCK_SETTINGS, gardener_profile: "expert" },
    };
    const blocks1 = buildSystemBlocks(ctx1, "de");
    const blocks2 = buildSystemBlocks(ctx2, "de");
    // Block 1 (persona) must be identical regardless of profile
    expect(blocks1[0].text).toBe(blocks2[0].text);
    // Block 2 (settings) must differ
    expect(blocks1[1].text).not.toBe(blocks2[1].text);
  });
});

// ── TASK-063: notes instruction in Block 1 ────────────────────────────────────

describe("buildSystemPrompt — notes instruction for new tasks (TASK-063)", () => {
  const ctx: AssistantContext = { view: "plants", garden: GARDEN };

  it("Block 1 (DE) instructs to populate notes on add (AC #1)", () => {
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("NOTIZEN PFLICHT");
    expect(prompt).toContain("notes");
  });

  it("Block 1 (EN) instructs to populate notes on add (AC #1)", () => {
    const prompt = buildSystemPrompt(ctx, "en");
    expect(prompt).toContain("NOTES REQUIRED");
    expect(prompt).toContain("notes");
  });

  it("DE instruction covers why, priority and alternative (AC #2)", () => {
    const prompt = buildSystemPrompt(ctx, "de");
    expect(prompt).toContain("Warum");
    expect(prompt).toContain("Priorität");
    expect(prompt).toContain("Alternative");
  });

  it("EN instruction covers why, priority and alternative (AC #2)", () => {
    const prompt = buildSystemPrompt(ctx, "en");
    expect(prompt).toContain("Why");
    expect(prompt).toContain("Priority");
    expect(prompt).toContain("Alternative");
  });

  it("instruction references gardener profile adaptation (AC #3)", () => {
    const de = buildSystemPrompt(ctx, "de");
    const en = buildSystemPrompt(ctx, "en");
    expect(de).toContain("Gärtner-Profil");
    expect(en).toContain("gardener profile");
  });

  it("instruction is in Block 1 (static — independent of settings)", () => {
    // Block 1 must contain the notes instruction regardless of context
    const blocks = buildSystemBlocks(ctx, "de");
    expect(blocks[0].text).toContain("NOTIZEN PFLICHT");
  });
});

describe("buildSystemBlocks — backward compat: buildSystemPrompt still works", () => {
  it("buildSystemPrompt returns joined blocks", () => {
    const ctx: AssistantContext = { view: "plants", garden: GARDEN };
    const prompt  = buildSystemPrompt(ctx, "de");
    const blocks  = buildSystemBlocks(ctx, "de");
    const joined  = blocks.map((b) => b.text).join("\n\n---\n\n");
    expect(prompt).toBe(joined);
  });
});

// ── TASK-071: PFLICHT-ANALYSE / PRE-FLIGHT ANALYSIS in Block 1 ────────────────

describe("buildSystemBlocks — pre-flight analysis instruction (TASK-071)", () => {
  const ctx: AssistantContext = { view: "plants", garden: GARDEN };

  it("AC #1/#2: Block 1 (DE) contains PFLICHT-ANALYSE with visibility requirement", () => {
    const block1 = buildSystemBlocks(ctx, "de")[0].text;
    expect(block1).toContain("PFLICHT-ANALYSE");
    expect(block1).toContain("in der Antwort sichtbar");
  });

  it("AC #1/#2: Block 1 (EN) contains PRE-FLIGHT ANALYSIS with visibility requirement", () => {
    const block1 = buildSystemBlocks(ctx, "en")[0].text;
    expect(block1).toContain("PRE-FLIGHT ANALYSIS");
    expect(block1).toContain("visibly in the response");
  });

  it("AC #3: DE Block 1 covers scalar fields with (leer) marker and schedules with UUID", () => {
    const block1 = buildSystemBlocks(ctx, "de")[0].text;
    expect(block1).toContain("(leer)");
    expect(block1).toContain("UUID");
  });

  it("AC #3: EN Block 1 covers scalar fields with (empty) marker and schedules with UUID", () => {
    const block1 = buildSystemBlocks(ctx, "en")[0].text;
    expect(block1).toContain("(empty)");
    expect(block1).toContain("UUID");
  });

  it("AC #4/#5: DE Block 1 instructs to only fill empty fields and only add missing schedules", () => {
    const block1 = buildSystemBlocks(ctx, "de")[0].text;
    expect(block1).toContain("Nur \"(leer)\"-Felder befüllen");
    expect(block1).toContain("Nur eintragen, was im BESTAND fehlt");
  });

  it("AC #4/#5: EN Block 1 instructs to only fill empty fields and only add missing schedules", () => {
    const block1 = buildSystemBlocks(ctx, "en")[0].text;
    expect(block1).toContain('only fill in "(empty)" fields');
    expect(block1).toContain("only add what is absent from CURRENT STATE");
  });

  it("AC #6: DE Block 1 allows schedule update/remove when BESTAND diverges from SOLL", () => {
    const block1 = buildSystemBlocks(ctx, "de")[0].text;
    expect(block1).toContain("BESTAND vom SOLL abweicht");
  });

  it("AC #6: EN Block 1 allows schedule update/remove when CURRENT STATE diverges from TARGET STATE", () => {
    const block1 = buildSystemBlocks(ctx, "en")[0].text;
    expect(block1).toContain("CURRENT STATE diverges from TARGET STATE");
  });

  it("AC #7: redundant duplicate-schedule rule is removed from DE Block 1", () => {
    const block1 = buildSystemBlocks(ctx, "de")[0].text;
    expect(block1).not.toContain("NIEMALS add verwenden für einen Zeitplan, der bereits existiert");
  });

  it("AC #7: redundant duplicate-schedule rule is removed from EN Block 1", () => {
    const block1 = buildSystemBlocks(ctx, "en")[0].text;
    expect(block1).not.toContain("NEVER add a schedule that already exists");
  });
});
