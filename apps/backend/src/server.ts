import { serve } from "@hono/node-server";
import app from "./index.js";

const PORT = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`GardenAssist backend running on http://localhost:${PORT}`);
});
