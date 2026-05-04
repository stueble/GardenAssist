import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { SettingsSchema } from "../schemas/index.js";
import { mockSettings } from "../mock/index.js";

export const settingsRoutes = new Hono()

  // GET /api/settings
  .get("/", (c) => c.json(mockSettings()))

  // PUT /api/settings
  .put("/", zValidator("json", SettingsSchema), (c) => {
    return c.json(mockSettings());
  });
