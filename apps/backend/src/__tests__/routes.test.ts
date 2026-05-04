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
  const validEntry = {
    plant_id:       null,
    schedule_id:    null,
    week:           null,
    entry_type:     "manual",
    date:           "2026-05-04",
    title:          "Test",
    notes:          null,
    attachment_ids: [],
  };

  it("POST /api/journal creates an entry and returns 201", async () => {
    const res = await app.request("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEntry),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("entry_type");
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
