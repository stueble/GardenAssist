import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/index.js";
import { plants } from "../db/schema.js";
import { exportJsonData, exportBackupTarGz } from "../services/export.service.js";
import { importJsonData, importBackupTarGz } from "../services/import.service.js";
import type { ExportData } from "../services/export.service.js";
import type { ImportResult } from "../services/import.service.js";

const DATA_DIR = process.env.DATA_DIR ?? "./data";

export const exportRoutes = new Hono()

  // GET /api/export/json
  .get("/json", async (c) => {
    try {
      const jsonData = await exportJsonData(db);
      const jsonStr = JSON.stringify(jsonData, null, 2);
      return new Response(jsonStr, {
        status: 200,
        headers: {
          "Content-Type":        "application/json",
          "Content-Disposition": 'attachment; filename="gardenassist-export.json"',
        },
      });
    } catch (err) {
      console.error("Export JSON error:", err);
      return c.json({ error: String(err) }, 500);
    }
  })

  // POST /api/export/backup — full backup as tar.gz
  .post("/backup", async (c) => {
    try {
      const buffer = await exportBackupTarGz(db, DATA_DIR);
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5); // Remove .000Z
      const filename = `gardenassist-backup-${timestamp}.tar.gz`;

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type":        "application/gzip",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (err) {
      console.error("Export backup error:", err);
      return c.json({ error: String(err) }, 500);
    }
  })

  // GET /api/export/plants.csv
  .get("/plants.csv", (c) => {
    try {
      const plantRows = db.select().from(plants).all();

      // Build CSV
      const headers = [
        "id",
        "name_common",
        "name_botanical",
        "icon",
        "category",
        "lifecycle",
        "location",
        "watering_zone",
        "purchase_date",
        "created_at",
      ];
      const rows = plantRows.map((p) => [
        p.id,
        p.name_common,
        p.name_botanical ?? "",
        p.icon ?? "",
        p.category ?? "",
        p.lifecycle,
        p.location ?? "",
        p.watering_zone ?? "",
        p.purchase_date ?? "",
        p.created_at,
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type":        "text/csv",
          "Content-Disposition": 'attachment; filename="plants.csv"',
        },
      });
    } catch (err) {
      console.error("Export CSV error:", err);
      return c.json({ error: String(err) }, 500);
    }
  })

  // POST /api/import/json (multipart/form-data with `file` field)
  .post("/import/json", async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

      const jsonStr = await file.text();
      const jsonData = JSON.parse(jsonStr) as ExportData;

      const result = await importJsonData(db, jsonData, { skipErrors: true });
      return c.json(result, 200);
    } catch (err) {
      console.error("Import JSON error:", err);
      return c.json({ error: String(err) }, 500);
    }
  })

  // POST /api/import/backup (multipart/form-data with `file` field)
  .post("/import/backup", async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

      const buffer = await file.arrayBuffer();
      const result = await importBackupTarGz(db, Buffer.from(buffer), DATA_DIR, {
        skipErrors: true,
      });
      return c.json(result, 200);
    } catch (err) {
      console.error("Import backup error:", err);
      return c.json({ error: String(err) }, 500);
    }
  });
