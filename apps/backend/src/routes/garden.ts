import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { GardenInputSchema } from "../schemas/index.js";
import { mockGarden } from "../mock/index.js";
import { db } from "../db/index.js";
import { garden } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getGarden } from "../services/garden.service.js";
import { deleteAllData } from "../services/delete.service.js";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Read at call time so tests can override DATA_DIR via vi.stubEnv.
// Files are stored under <DATA_DIR>/static/garden/ so that serveStatic
// (root: DATA_DIR) serves them at /static/garden/<file>.
function gardenPlanDir(): string {
  return join(process.env.DATA_DIR ?? "./data", "static", "garden");
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/png":                "png",
  "image/jpeg":               "jpg",
  "image/jpg":                "jpg",
  "image/svg+xml":            "svg",
};

export const gardenRoutes = new Hono()

  // GET /api/garden — real implementation
  .get("/", async (c) => {
    const g = await getGarden(db);
    return c.json(g);
  })

  // PATCH /api/garden — stub (story-016 scope: read only)
  .patch("/", zValidator("json", GardenInputSchema), (c) => {
    return c.json(mockGarden());
  })

  // POST /api/garden/plan — upload or replace the garden plan image
  .post("/plan", async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return c.json({ error: "Missing file field" }, 400);
    }

    const mimeType = file.type;
    const ext = ALLOWED_TYPES[mimeType];
    if (!ext) {
      return c.json({ error: "Unsupported file type. Accepted: PNG, JPG, SVG" }, 400);
    }

    const planDir = gardenPlanDir();

    // Ensure directory exists
    if (!existsSync(planDir)) {
      await mkdir(planDir, { recursive: true });
    }

    // Remove any existing plan file (regardless of extension)
    for (const oldExt of ["png", "jpg", "svg"]) {
      const oldPath = join(planDir, `plan.${oldExt}`);
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => undefined);
      }
    }

    // Save new file
    const fileName = `plan.${ext}`;
    const filePath = join(planDir, fileName);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    const planUrl  = `/static/garden/${fileName}`;
    const planName = file.name ?? fileName;

    // Update DB
    db.update(garden)
      .set({ plan_url: planUrl, plan_name: planName })
      .where(eq(garden.id, "garden"))
      .run();

    const g = await getGarden(db);
    return c.json(g);
  })

  // DELETE /api/garden/plan — remove the garden plan image
  .delete("/plan", async (c) => {
    const planDir = gardenPlanDir();
    // Remove all possible plan files
    for (const ext of ["png", "jpg", "svg"]) {
      const filePath = join(planDir, `plan.${ext}`);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => undefined);
      }
    }

    // Clear DB
    db.update(garden)
      .set({ plan_url: null, plan_name: null })
      .where(eq(garden.id, "garden"))
      .run();

    const g = await getGarden(db);
    return c.json(g);
  })

  // DELETE /api/garden/all — delete all user data (plants, journal entries, attachments)
  .delete("/all", async (c) => {
    try {
      const dataDir = process.env.DATA_DIR ?? "./data";
      const g = await deleteAllData(db, dataDir);
      return c.json(g);
    } catch (err) {
      console.error("Delete all data error:", err);
      return c.json({ error: String(err) }, 500);
    }
  });
