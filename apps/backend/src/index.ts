import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { gardenRoutes } from "./routes/garden.js";
import { plantRoutes } from "./routes/plants.js";
import { journalRoutes } from "./routes/journal.js";
import { attachmentRoutes } from "./routes/attachments.js";
import { settingsRoutes } from "./routes/settings.js";
import { exportRoutes } from "./routes/export.js";
import { aiRoutes }     from "./routes/ai.js";

const app = new Hono();

// ── Static file serving ───────────────────────────────────────────────────────
// Serves uploaded attachments and the garden plan image.
// Files are stored in DATA_DIR (default: ./data).

const dataDir = process.env.DATA_DIR ?? "./data";

app.use("/static/*", serveStatic({ root: dataDir }));

// ── API routes ────────────────────────────────────────────────────────────────

app.route("/api/garden",      gardenRoutes);
app.route("/api/plants",      plantRoutes);
app.route("/api/journal",     journalRoutes);
app.route("/api/attachments", attachmentRoutes);
app.route("/api/settings",    settingsRoutes);
app.route("/api/export",      exportRoutes);
app.route("/api/ai",          aiRoutes);

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
