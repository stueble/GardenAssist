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
import { serializeGarden, buildSystemPrompt } from "../lib/aiPrompt";
import type { Garden }           from "@api/garden";
import type { Plant }            from "@api/plant";
import type { AssistantContext } from "@api/assistant-context";

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
  thumbnail_attachment_id: "att-1",
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
  attachments:     [{ id: "att-1", attachment_type: "image", category: null, url: "/static/plan.jpg", created_at: "2023-01-01T00:00:00Z", updated_at: "2023-01-01T00:00:00Z" }],
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

  it("does not include thumbnail_attachment_id", () => {
    const result = serializeGarden(GARDEN);
    expect(result).not.toContain("att-1");
    expect(result).not.toContain("thumbnail_attachment_id");
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
  it("adds one identifying line for selected plant, not a duplicate of full data", () => {
    const ctx: AssistantContext = {
      view:          "plants",
      garden:        GARDEN,
      selectedPlant: PLANT,
    };
    const prompt = buildSystemPrompt(ctx, "de");

    // The identifying line appears in layer 3 (situation)
    expect(prompt).toContain("Ausgewählte Pflanze");
    expect(prompt).toContain("Rote Rose");

    // Full plant data is in garden serialization — name appears but not duplicated
    // as a separate full block; we verify it's in the prompt but only one "## Rote Rose" heading
    const headingCount = (prompt.match(/## Rote Rose/g) ?? []).length;
    expect(headingCount).toBe(1); // only in garden list, not as a second block
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
