import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { GardenInputSchema } from "../schemas/index.js";
import { mockGarden } from "../mock/index.js";
import { db } from "../db/index.js";
import { getGarden } from "../services/garden.service.js";

export const gardenRoutes = new Hono()

  // GET /api/garden — real implementation
  .get("/", async (c) => {
    const garden = await getGarden(db);
    return c.json(garden);
  })

  // PATCH /api/garden — stub (story-016 scope: read only)
  .patch("/", zValidator("json", GardenInputSchema), (c) => {
    return c.json(mockGarden());
  })

  // POST /api/garden/plan — stub
  .post("/plan", (c) => c.json(mockGarden()))

  // DELETE /api/garden/plan — stub
  .delete("/plan", (c) => {
    const garden = mockGarden();
    return c.json({ ...garden, plan_url: null });
  });
