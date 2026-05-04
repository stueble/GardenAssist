import { Hono } from "hono";
import { mockGarden } from "../mock/index.js";

export const exportRoutes = new Hono()

  // GET /api/export/json
  .get("/json", (c) => {
    return new Response(JSON.stringify({ _mock: true }), {
      status: 200,
      headers: {
        "Content-Type":        "application/json",
        "Content-Disposition": 'attachment; filename="gardenassist-export.json"',
      },
    });
  })

  // GET /api/export/plants.csv
  .get("/plants.csv", (c) => {
    const csv = "id,name_common,name_botanical\nmock-001,Rote Rose,Rosa\n";
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type":        "text/csv",
        "Content-Disposition": 'attachment; filename="plants.csv"',
      },
    });
  })

  // POST /api/import/json  (multipart/form-data with `file` field)
  .post("/import/json", (c) => {
    return c.json(mockGarden());
  });
