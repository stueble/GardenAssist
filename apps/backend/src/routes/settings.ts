import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { SettingsSchema } from "../schemas/index.js";
import { db } from "../db/index.js";
import { getSettings, updateSettings } from "../services/settings.service.js";

export const settingsRoutes = new Hono()

  // GET /api/settings — real implementation
  .get("/", (c) => {
    const settings = getSettings(db);
    return c.json(settings);
  })

  // PUT /api/settings — real implementation
  .put("/", zValidator("json", SettingsSchema), (c) => {
    const data = c.req.valid("json");
    const updated = updateSettings(db, data);
    return c.json(updated);
  });
