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

// ── Public API ────────────────────────────────────────────────────────────────

export function buildSystemPrompt(ctx: AssistantContext, lang: "de" | "en"): string {
  return [
    PERSONA[lang],
    APP_DESCRIPTION[lang],
    buildSituation(ctx, lang),
  ].join("\n\n---\n\n");
}
