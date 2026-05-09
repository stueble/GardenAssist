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
  // Strip: icon, thumbnail_attachment_id, attachments URLs, positions, created_at, updated_at
  let out = `## ${p.name_common}${p.name_botanical ? ` (${p.name_botanical})` : ""}\n`;
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
  de: `Du hast Zugriff auf folgende Werkzeuge, um den Benutzer direkt in der App zu unterstützen.
Verwende sie wenn der Benutzer dich bittet, eine Pflanze zu erstellen, zu öffnen oder Felder zu befüllen.
Der Benutzer muss immer selbst auf Speichern klicken — du schreibst nie direkt in die Datenbank.

WICHTIG: Antworte mit einem normalen Satz UND direkt danach dem Tool-Aufruf als JSON-Block.

Verfügbare Werkzeuge:

1. openPlantEdit — öffnet den Pflanzbearbeiten-Dialog
   Parameter:
     plant_id  (optional, string): ID der zu bearbeitenden Pflanze (aus den Gartendaten)
     prefill   (optional, object): Felder zum Vorausfüllen beim Erstellen einer neuen Pflanze
       Mögliche Felder: name_common, name_botanical, description, category, origin_type,
       lifecycle, location, watering_zone, purchase_date, purchase_price, sun_demand,
       water_demand, frost_tolerance_min_c, soil_type, health_status, care_notes

2. updatePlantEdit — setzt Felder im aktuell geöffneten Dialog (der Dialog muss bereits offen sein)
   Parameter:
     fields (object): Felder mit neuen Werten (gleiche Feldnamen wie bei openPlantEdit.prefill)

Format für Tool-Aufrufe (immer als JSON-Block am Ende der Antwort):
\`\`\`tool
{"tool":"openPlantEdit","plant_id":"<id>"}
\`\`\`
oder
\`\`\`tool
{"tool":"openPlantEdit","prefill":{"name_common":"Rose","sun_demand":"sunny"}}
\`\`\`
oder
\`\`\`tool
{"tool":"updatePlantEdit","fields":{"water_demand":"medium","care_notes":"Regelmäßig düngen."}}
\`\`\`

Wenn kein Dialog offen ist und updatePlantEdit aufgerufen werden soll, antworte stattdessen auf Deutsch, dass zuerst ein Dialog geöffnet werden muss.`,

  en: `You have access to the following tools to help the user directly within the app.
Use them when the user asks you to create, open, or fill in plant fields.
The user must always click Save themselves — you never write directly to the database.

IMPORTANT: Respond with a normal sentence AND directly after that the tool call as a JSON block.

Available tools:

1. openPlantEdit — opens the plant edit dialog
   Parameters:
     plant_id  (optional, string): ID of the plant to edit (from garden data)
     prefill   (optional, object): fields to pre-fill when creating a new plant
       Possible fields: name_common, name_botanical, description, category, origin_type,
       lifecycle, location, watering_zone, purchase_date, purchase_price, sun_demand,
       water_demand, frost_tolerance_min_c, soil_type, health_status, care_notes

2. updatePlantEdit — sets fields in the currently open dialog (the dialog must already be open)
   Parameters:
     fields (object): fields with new values (same field names as openPlantEdit.prefill)

Format for tool calls (always as a JSON block at the end of the response):
\`\`\`tool
{"tool":"openPlantEdit","plant_id":"<id>"}
\`\`\`
or
\`\`\`tool
{"tool":"openPlantEdit","prefill":{"name_common":"Rose","sun_demand":"sunny"}}
\`\`\`
or
\`\`\`tool
{"tool":"updatePlantEdit","fields":{"water_demand":"medium","care_notes":"Water regularly."}}
\`\`\`

If no dialog is open and updatePlantEdit is requested, reply instead that the dialog must be opened first.`,
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
