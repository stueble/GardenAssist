import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { PlantInputSchema } from "../schemas/index.js";
import { db } from "../db/index.js";
import { createPlant, updatePlant, deletePlant } from "../services/plant.service.js";

export const plantRoutes = new Hono()

  // POST /api/plants — create a new plant
  .post("/", zValidator("json", PlantInputSchema), async (c) => {
    const data = c.req.valid("json");
    const plant = await createPlant(db, data);
    return c.json(plant, 201);
  })

  // PUT /api/plants/:id — update an existing plant (patch-replace semantics)
  .put("/:id", zValidator("json", PlantInputSchema), async (c) => {
    const id   = c.req.param("id");
    const data = c.req.valid("json");
    const plant = await updatePlant(db, id, data);
    return c.json(plant);
  })

  // DELETE /api/plants/:id — delete a plant
  .delete("/:id", (c) => {
    deletePlant(db, c.req.param("id"));
    return c.body(null, 204);
  });
