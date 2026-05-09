/**
 * AI system-prompt builder — STORY-043
 *
 * Builds a three-layer system prompt for every chat request:
 *   Layer 1 — Persona         (static, hardcoded, de/en)
 *   Layer 2 — App Description (static, hardcoded, de/en)
 *   Layer 3 — Current Situation (dynamic: view + selected plant + garden)
 *
 * Garden serialization strips fields that waste tokens and are irrelevant
 * for the assistant: created_at, updated_at, attachment URLs,
 * thumbnail_attachment_id, position coordinates, icons/SVG.
 */

import type { Garden }           from "@api/garden";
import type { Plant }            from "@api/plant";
import type { Schedule }         from "@api/schedule";
import type { JournalEntry }     from "@api/journal-entry";
import type { Task }             from "@api/task";
import type { AssistantContext } from "@api/assistant-context";

// ── Layer 1 — Persona ─────────────────────────────────────────────────────────

const PERSONA: Record<"de" | "en", string> = {
  de: `Du bist ein sachkundiger Gartenassistent für die App GardenAssist. \
Du hilfst dem Benutzer mit Pflanzenpflege, Gartenplänen und Pflegeaufgaben. \
Nutze immer zuerst die dir bekannten Gartendaten, bevor du allgemeines Wissen verwendest. \
Antworte präzise und auf Deutsch. Verwende keine Markdown-Formatierung außer einfachen Listen.`,

  en: `You are a knowledgeable garden assistant for the app GardenAssist. \
You help the user with plant care, garden planning, and care tasks. \
Always use the garden data provided to you first before drawing on general knowledge. \
Reply concisely in English. Avoid Markdown formatting except simple lists.`,
};

// ── Layer 2 — App Description ─────────────────────────────────────────────────

const APP_DESCRIPTION: Record<"de" | "en", string> = {
  de: `GardenAssist ist eine lokale Gartenverwaltungs-App mit folgenden Ansichten:
- Dashboard: Gartenplan mit Pflanzenpins, offene Aufgaben (überfällig/fällig/bevorstehend), 12-Monats-Aufgabenband, Warnungen.
- Pflanzen: vollständige Pflanzenliste, Detailpanel mit Steckbrief und Pflegeterminen.
- Kalender: Gantt-Ansicht aller Pflegeintervalle über 12 Monate.
- Tagebuch: chronologisches Pflegeprotokoll (erledigt, übersprungen, Beobachtung, Problem).

Aufgaben werden nicht gespeichert – sie werden aus Zeitplänen (Schedules) abgeleitet. \
Ein Tagebucheintrag vom Typ "erledigt" oder "übersprungen" löst die zugehörige Aufgabe auf.`,

  en: `GardenAssist is a local garden management app with the following views:
- Dashboard: garden plan with plant pins, open tasks (overdue/due/upcoming), 12-month task band, warnings.
- Plants: full plant list, detail panel with fact sheet and care schedules.
- Calendar: Gantt view of all care intervals across 12 months.
- Journal: chronological care log (done, skipped, observation, problem).

Tasks are not stored — they are derived from schedules at runtime. \
A journal entry of type "done" or "skipped" resolves the associated task.`,
};

// ── Layer 3 helpers — Garden serialization ────────────────────────────────────

function nl(label: string, value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `  ${label}: ${value}\n`;
}

function serializeSchedule(s: Schedule): string {
  let out = `    - Typ: ${s.schedule_type}, KW ${s.start_week}–${s.end_week}`;
  if (s.label) out += `, Label: ${s.label}`;
  if (s.notes) out += `\n      Notizen: ${s.notes}`;
  return out;
}

function serializeJournalEntry(e: JournalEntry): string {
  let out = `    - [${e.date}] ${e.entry_type}`;
  if (e.title) out += `: ${e.title}`;
  if (e.notes) out += `\n      ${e.notes}`;
  return out;
}

function serializeTask(t: Task): string {
  const s = t.schedule;
  return `    - ${t.status}: ${s.schedule_type}${s.label ? ` (${s.label})` : ""}, KW ${s.start_week}–${s.end_week}`;
}

function serializePlant(p: Plant): string {
  // Strip: icon, attachments URLs, positions, created_at, updated_at
  // Keep: id (required for editPlant tool calls)
  let out = `## ${p.name_common}${p.name_botanical ? ` (${p.name_botanical})` : ""}\n`;
  out += nl("id", p.id);
  out += nl("Standort", p.location);
  out += nl("Kategorie", p.category);
  out += nl("Lebenszyklus", p.lifecycle);
  out += nl("Herkunft", p.origin_type);
  out += nl("Gesundheit", p.health_status);
  out += nl("Sonne", p.sun_demand);
  out += nl("Wasser", p.water_demand);
  out += nl("Boden", p.soil_type);
  out += nl("Frosttoleranz", p.frost_tolerance_min_c !== null ? `${p.frost_tolerance_min_c}°C` : null);
  out += nl("Winterschutz nötig", p.temperature_protected ? "ja" : null);
  out += nl("Kaufdatum", p.purchase_date);
  out += nl("Kaufpreis", p.purchase_price !== null ? `${p.purchase_price} €` : null);
  if (p.description) out += `  Beschreibung: ${p.description}\n`;
  if (p.care_notes)  out += `  Pflegehinweise: ${p.care_notes}\n`;

  if (p.schedules.length > 0) {
    out += "  Zeitpläne:\n";
    out += p.schedules.map(serializeSchedule).join("\n") + "\n";
  }

  const openTasks = p.tasks.filter((t) => t.status !== "upcoming" || true); // include all
  if (openTasks.length > 0) {
    out += "  Offene Aufgaben:\n";
    out += openTasks.map(serializeTask).join("\n") + "\n";
  }

  if (p.journal_entries.length > 0) {
    out += "  Tagebuch:\n";
    out += p.journal_entries.map(serializeJournalEntry).join("\n") + "\n";
  }

  return out;
}

export function serializeGarden(garden: Garden): string {
  let out = "";
  if (garden.plan_name) out += `Gartenname: ${garden.plan_name}\n\n`;

  if (garden.plants.length === 0) {
    out += "Keine Pflanzen erfasst.\n";
  } else {
    out += garden.plants.map(serializePlant).join("\n");
  }

  // Garden-wide journal entries (plant_id === null)
  const gardenEntries = garden.journal_entries.filter((e) => !e.plant_id);
  if (gardenEntries.length > 0) {
    out += "\n## Gartenweite Tagebucheinträge\n";
    out += gardenEntries.map(serializeJournalEntry).join("\n") + "\n";
  }

  return out.trim();
}

// ── Layer 3 — Current Situation ───────────────────────────────────────────────

const VIEW_LABEL: Record<string, Record<"de" | "en", string>> = {
  dashboard: { de: "Dashboard",  en: "Dashboard"  },
  plants:    { de: "Pflanzen",   en: "Plants"     },
  calendar:  { de: "Kalender",   en: "Calendar"   },
  journal:   { de: "Tagebuch",   en: "Journal"    },
  settings:  { de: "Einstellungen", en: "Settings" },
};

function buildSituation(ctx: AssistantContext, lang: "de" | "en"): string {
  const isDE = lang === "de";
  const viewLabel = VIEW_LABEL[ctx.view]?.[lang] ?? ctx.view;

  let out = isDE
    ? `Aktuelle Ansicht: ${viewLabel}\n`
    : `Current view: ${viewLabel}\n`;

  if (ctx.selectedPlant) {
    const p = ctx.selectedPlant;
    const id = [
      p.name_common,
      p.name_botanical ? `(${p.name_botanical})` : null,
      p.location       ? (isDE ? `Standort: ${p.location}` : `Location: ${p.location}`) : null,
    ].filter(Boolean).join(" — ");
    out += isDE
      ? `Ausgewählte Pflanze: ${id}\n`
      : `Selected plant: ${id}\n`;
  }

  out += "\n";
  out += isDE ? "Gartendaten:\n" : "Garden data:\n";
  out += serializeGarden(ctx.garden);

  return out;
}

// ── Layer 4 — Tool descriptions ───────────────────────────────────────────────

const TOOLS_DESCRIPTION: Record<"de" | "en", string> = {
  de: `Du hast Zugriff auf ein Werkzeug, um den Benutzer direkt in der App zu unterstützen.
Verwende es, wenn der Benutzer dich bittet, eine Pflanze zu erstellen, zu öffnen oder Felder zu befüllen.
Der Benutzer muss immer selbst auf Speichern klicken — du schreibst nie direkt in die Datenbank.

WICHTIG: Antworte mit einem normalen erklärenden Satz UND direkt danach dem Tool-Aufruf als JSON-Block.

Werkzeug: editPlant
  id     (string | null): ID der Pflanze aus den Gartendaten, oder null für eine neue Pflanze
  fields (object):        Felder die vorausgefüllt oder überschrieben werden sollen

  Mögliche Felder und ERLAUBTE WERTE (immer exakt diese API-Werte verwenden, nie deutsche Übersetzungen):
    name_common            (string)
    name_botanical         (string)
    description            (string)
    category               (string, freier Text)
    location               (string, freier Text)
    watering_zone          (string, freier Text)
    purchase_date          (string, Format YYYY-MM-DD)
    purchase_price         (string, Zahl als Text, z.B. "12.50")
    frost_tolerance_min_c  (string, Zahl als Text, z.B. "-15")
    care_notes             (string)
    origin_type            (genau einer von: "native" | "neophyte" | "invasive_neophyte")
    lifecycle              (genau einer von: "annual" | "biennial" | "perennial")
    sun_demand             (genau einer von: "sunny" | "partial_shade" | "shady")
    water_demand           (genau einer von: "low" | "medium" | "high")
    soil_type              (genau einer von: "loamy" | "sandy" | "humus_rich" | "calcareous" | "acidic")
    health_status          (genau einer von: "good" | "watch" | "needs_treatment")

Beispiele:

Neue Pflanze erstellen und vorausfüllen:
\`\`\`tool
{"tool":"editPlant","id":null,"fields":{"name_common":"Rose","sun_demand":"sunny","water_demand":"medium"}}
\`\`\`

Bestehende Pflanze öffnen und Felder setzen (id aus den Gartendaten):
\`\`\`tool
{"tool":"editPlant","id":"<plant-id>","fields":{"care_notes":"Regelmäßig düngen.","health_status":"good"}}
\`\`\`

Wenn die Pflanzenverwaltung nicht geöffnet ist, teile dem Benutzer mit, dass er zuerst zur Pflanzenansicht wechseln soll.`,

  en: `You have access to one tool to help the user directly within the app.
Use it when the user asks you to create, open, or fill in plant fields.
The user must always click Save themselves — you never write directly to the database.

IMPORTANT: Respond with a normal explanatory sentence AND directly after that the tool call as a JSON block.

Tool: editPlant
  id     (string | null): ID of the plant from garden data, or null for a new plant
  fields (object):        fields to pre-fill or overwrite

  Possible fields and ALLOWED VALUES (always use these exact API values, never translated labels):
    name_common            (string)
    name_botanical         (string)
    description            (string)
    category               (string, free text)
    location               (string, free text)
    watering_zone          (string, free text)
    purchase_date          (string, format YYYY-MM-DD)
    purchase_price         (string, number as text, e.g. "12.50")
    frost_tolerance_min_c  (string, number as text, e.g. "-15")
    care_notes             (string)
    origin_type            (exactly one of: "native" | "neophyte" | "invasive_neophyte")
    lifecycle              (exactly one of: "annual" | "biennial" | "perennial")
    sun_demand             (exactly one of: "sunny" | "partial_shade" | "shady")
    water_demand           (exactly one of: "low" | "medium" | "high")
    soil_type              (exactly one of: "loamy" | "sandy" | "humus_rich" | "calcareous" | "acidic")
    health_status          (exactly one of: "good" | "watch" | "needs_treatment")

Examples:

Create and pre-fill a new plant:
\`\`\`tool
{"tool":"editPlant","id":null,"fields":{"name_common":"Rose","sun_demand":"sunny","water_demand":"medium"}}
\`\`\`

Open an existing plant and set fields (id from garden data):
\`\`\`tool
{"tool":"editPlant","id":"<plant-id>","fields":{"care_notes":"Water regularly.","health_status":"good"}}
\`\`\`

If the Plants view is not open, tell the user to switch there first.`,
};

// ── Public API ────────────────────────────────────────────────────────────────

export function buildSystemPrompt(ctx: AssistantContext, lang: "de" | "en"): string {
  return [
    PERSONA[lang],
    APP_DESCRIPTION[lang],
    buildSituation(ctx, lang),
    TOOLS_DESCRIPTION[lang],
  ].join("\n\n---\n\n");
}
