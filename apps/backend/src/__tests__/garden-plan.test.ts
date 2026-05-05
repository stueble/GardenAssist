/**
 * Garden plan upload / delete route tests.
 *
 * Tests POST /api/garden/plan and DELETE /api/garden/plan using real
 * in-memory SQLite + a temporary file system directory.
 *
 * DATA_DIR is set via vi.stubEnv so the route writes to an isolated tmp
 * directory. The app is imported statically; garden.ts reads DATA_DIR
 * at call time (not at module load time), so the env is in effect.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, readdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import app from "../index.js";
import { db } from "../db/index.js";
import { garden } from "../db/schema.js";
import { eq } from "drizzle-orm";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "gardenassist-test-"));
  await mkdir(join(tmpDir, "garden"), { recursive: true });
  vi.stubEnv("DATA_DIR", tmpDir);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(tmpDir, { recursive: true, force: true });
});

// Reset db garden row before each test (plan_url / plan_name back to null)
beforeEach(async () => {
  db.update(garden).set({ plan_url: null, plan_name: null }).where(eq(garden.id, "garden")).run();
  // Remove any leftover plan files
  const gardenDir = join(tmpDir, "garden");
  if (existsSync(gardenDir)) {
    const files = await readdir(gardenDir);
    for (const f of files) {
      await unlink(join(gardenDir, f)).catch(() => undefined);
    }
  }
});

async function jsonBody(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

function makePngFile(name = "gartenplan.png"): File {
  // Minimal 1×1 PNG (67 bytes)
  const PNG_1x1 = new Uint8Array([
    0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,
    0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
    0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,
    0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,
    0x00,0x00,0x02,0x00,0x01,0xe2,0x21,0xbc,
    0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
    0x44,0xae,0x42,0x60,0x82,
  ]);
  return new File([PNG_1x1], name, { type: "image/png" });
}

describe("POST /api/garden/plan", () => {
  it("returns 400 when no file is provided", async () => {
    const form = new FormData();
    const res = await app.request("/api/garden/plan", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported file type", async () => {
    const form = new FormData();
    form.append("file", new File(["hello"], "plan.txt", { type: "text/plain" }));
    const res = await app.request("/api/garden/plan", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("accepts a PNG upload and returns the updated garden (AC #4)", async () => {
    const form = new FormData();
    form.append("file", makePngFile("gartenplan.png"));
    const res = await app.request("/api/garden/plan", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(typeof body.plan_url).toBe("string");
    expect((body.plan_url as string).endsWith(".png")).toBe(true);
    expect(body.plan_name).toBe("gartenplan.png");
  });

  it("saves the file to the garden directory", async () => {
    const form = new FormData();
    form.append("file", makePngFile("gartenplan.png"));
    await app.request("/api/garden/plan", { method: "POST", body: form });

    const files = await readdir(join(tmpDir, "garden"));
    expect(files).toContain("plan.png");
  });

  it("replaces an existing plan file on re-upload", async () => {
    const form1 = new FormData();
    form1.append("file", makePngFile());
    await app.request("/api/garden/plan", { method: "POST", body: form1 });

    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    const form2 = new FormData();
    form2.append("file", new File([svgContent], "new-plan.svg", { type: "image/svg+xml" }));
    const res2 = await app.request("/api/garden/plan", { method: "POST", body: form2 });
    expect(res2.status).toBe(200);

    const files = await readdir(join(tmpDir, "garden"));
    // Old .png should be gone, new .svg present
    expect(files).not.toContain("plan.png");
    expect(files).toContain("plan.svg");
  });
});

describe("DELETE /api/garden/plan", () => {
  it("returns 200 with plan_url null when no plan exists", async () => {
    const res = await app.request("/api/garden/plan", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.plan_url).toBeNull();
  });

  it("removes an uploaded plan and returns null plan_url (AC #4)", async () => {
    // Upload first
    const form = new FormData();
    form.append("file", makePngFile());
    await app.request("/api/garden/plan", { method: "POST", body: form });

    // Confirm file exists
    expect(existsSync(join(tmpDir, "garden", "plan.png"))).toBe(true);

    // Delete
    const res = await app.request("/api/garden/plan", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.plan_url).toBeNull();
    expect(body.plan_name).toBeNull();

    // File should be gone
    expect(existsSync(join(tmpDir, "garden", "plan.png"))).toBe(false);
  });
});
