import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PlantInputSchema } from "../schemas/index.js";
import { mockPlant } from "../mock/index.js";

export const plantRoutes = new Hono()

  // POST /api/plants
  .post("/", zValidator("json", PlantInputSchema), (c) => {
    return c.json(mockPlant(), 201);
  })

  // PUT /api/plants/:id
  .put("/:id", zValidator("json", PlantInputSchema), (c) => {
    return c.json(mockPlant({ id: c.req.param("id") }));
  })

  // DELETE /api/plants/:id
  .delete("/:id", (c) => c.body(null, 204));
