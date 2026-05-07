/**
 * Route tests — verify that all API endpoints respond with the correct
 * HTTP status and return data that matches the expected TypeScript shapes.
 *
 * Uses Hono's built-in test helper (app.request) — no real server needed.
 */

import { describe, it, expect } from "vitest";
import app from "../index.js";

// Helper: parse JSON from a Response
async function json(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({ status: "ok" });
  });
});

describe("Garden routes", () => {
  it("GET /api/garden returns a garden object", async () => {
    const res = await app.request("/api/garden");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toHaveProperty("plants");
    expect(body).toHaveProperty("journal_entries");
    expect(body).toHaveProperty("attachments");
    expect(Array.isArray(body.plants)).toBe(true);
  });

  it("PATCH /api/garden with valid input returns a garden object", async () => {
    const res = await app.request("/api/garden", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_name: "Mein Garten" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toHaveProperty("plants");
  });

  it("PATCH /api/garden with invalid input returns 400", async () => {
    const res = await app.request("/api/garden", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_name: 999 }), // wrong type
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/garden/plan returns garden with null plan_url", async () => {
    const res = await app.request("/api/garden/plan", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.plan_url).toBeNull();
  });
});

describe("Plant routes", () => {
  const validPlant = {
    name_common:             "Rote Rose",
    name_botanical:          null,
    icon:                    null,
    origin_type:             null,
    category:                null,
    lifecycle:               null,
    description:             null,
    care_notes:              null,
    sun_demand:              null,
    water_demand:            null,
    soil_type:               null,
    frost_tolerance_min_c:   null,
    temperature_protected:   false,
    health_status:           null,
    location:                null,
    watering_zone:           null,
    purchase_date:           null,
    purchase_price:          null,
    thumbnail_attachment_id: null,
    positions:               [],
    attachments:             [],
    schedules:               [],
  };

  it("POST /api/plants creates a plant and returns 201", async () => {
    const res = await app.request("/api/plants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPlant),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("name_common");
  });

  it("POST /api/plants with missing name_common returns 400", async () => {
    const res = await app.request("/api/plants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPlant, name_common: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/plants/:id returns 204", async () => {
    const res = await app.request("/api/plants/plant-001", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});

describe("Journal routes", () => {
  const manualEntry = {
    plant_id:       null,
    schedule_id:    null,
    week:           null,
    entry_type:     "manual",
    date:           "2026-05-04",
    title:          "Test",
    notes:          null,
    attachment_ids: [],
  };

  it("POST /api/journal creates a manual entry and returns 201 (AC #1)", async () => {
    const res = await app.request("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualEntry),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body).toHaveProperty("id");
    expect(body.entry_type).toBe("manual");
    expect(body.title).toBe("Test");
  });

  it("POST /api/journal persists entry — appears in getGarden() journal_entries (AC #3, #4)", async () => {
    const before = await app.request("/api/garden");
    const gardenBefore = await before.json() as Record<string, unknown>;
    const countBefore = (gardenBefore.journal_entries as unknown[]).length;

    await app.request("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualEntry),
    });

    const after = await app.request("/api/garden");
    const gardenAfter = await after.json() as Record<string, unknown>;
    expect((gardenAfter.journal_entries as unknown[]).length).toBeGreaterThan(countBefore);
  });

  it("POST /api/journal 'done' auto-generates title from entry_type (AC #5)", async () => {
    const res = await app.request("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...manualEntry,
        entry_type: "done",
        title:      null,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    // Title should start with "Erledigt" when no plant/schedule available
    expect(typeof body.title).toBe("string");
    expect((body.title as string)).toContain("Erledigt");
  });

  it("POST /api/journal 'skipped' auto-generates title (AC #2, #5)", async () => {
    const res = await app.request("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...manualEntry,
        entry_type: "skipped",
        title:      null,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect((body.title as string)).toContain("Übersprungen");
  });

  it("PUT /api/journal/:id updates an existing entry", async () => {
    // Create first
    const create = await app.request("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualEntry),
    });
    const created = await create.json() as Record<string, unknown>;
    const id = created.id as string;

    // Update
    const res = await app.request(`/api/journal/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...manualEntry, title: "Updated title" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBe(id);
    expect(body.title).toBe("Updated title");
  });

  it("PUT /api/journal/:nonexistent returns 404", async () => {
    const res = await app.request("/api/journal/00000000-0000-0000-0000-000000000000", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manualEntry),
    });
    expect(res.status).toBe(404);
  });
});

describe("Settings routes", () => {
  it("GET /api/settings returns settings object", async () => {
    const res = await app.request("/api/settings");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toHaveProperty("task_lookback_weeks");
    expect(body).toHaveProperty("color_presets");
    expect(Array.isArray(body.color_presets)).toBe(true);
  });
});

describe("Attachments routes", () => {
  it("DELETE /api/attachments/:id returns 204", async () => {
    const res = await app.request("/api/attachments/att-001", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});

describe("Export routes", () => {
  it("GET /api/export/json returns a JSON file download", async () => {
    const res = await app.request("/api/export/json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain("attachment");
  });

  it("GET /api/export/plants.csv returns a CSV file download", async () => {
    const res = await app.request("/api/export/plants.csv");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
  });
});
