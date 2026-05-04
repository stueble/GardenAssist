import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { GardenInputSchema } from "../schemas/index.js";
import { mockGarden } from "../mock/index.js";

export const gardenRoutes = new Hono()

  // GET /api/garden
  .get("/", (c) => c.json(mockGarden()))

  // PATCH /api/garden
  .patch("/", zValidator("json", GardenInputSchema), (c) => {
    return c.json(mockGarden());
  })

  // POST /api/garden/plan  (multipart upload)
  .post("/plan", (c) => c.json(mockGarden()))

  // DELETE /api/garden/plan
  .delete("/plan", (c) => {
    const garden = mockGarden();
    return c.json({ ...garden, plan_url: null });
  });
