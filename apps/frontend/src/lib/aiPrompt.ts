/**
 * AI system-prompt builder — TASK-043 / TASK-056
 *
 * Builds the system prompt as 5 ordered blocks, static first → dynamic last.
 * This ordering maximises prefix-cache hits across all providers:
 *
 *   Block 1 — Persona + App description + Tools   (never changes)
 *   Block 2 — Settings (zones, categories, presets) (changes on settings save)
 *   Block 3 — Plant base data (names, location, …)  (changes on plant edit)
 *   Block 4 — Dynamic plant data (tasks, journal, schedules) (changes often)
 *   Block 5 — Current situation (view + selected plant) (changes on nav)
 *
 * For OpenAI:       blocks are joined into a single system string (implicit prefix caching).
 * For Anthropic /
 *     OpenRouter:   blocks are sent as a structured array; cache_control "ephemeral"
 *                   is set on blocks 1–4 for explicit prompt caching.
 *
 * buildSystemPrompt() is kept as a backward-compatible wrapper (returns a single string).
 */

import type { Garden }           from "@api/garden";
import type { Plant }            from "@api/plant";
import type { Schedule }         from "@api/schedule";
import type { JournalEntry }     from "@api/journal-entry";
import type { Task }             from "@api/task";
import type { AssistantContext, PendingPlantEdit } from "@api/assistant-context";
import type { GardenerProfile }                   from "@api/settings";

// ── Public types ──────────────────────────────────────────────────────────────

/** One cacheable block of the system prompt. */
export type SystemBlock = { text: string };

// ── Block 1 — Persona + App description + Tools ───────────────────────────────
// Hardcoded strings — never changes at runtime.

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

const TOOLS_DESCRIPTION: Record<"de" | "en", string> = {
  de: `Du hast Zugriff auf ein Werkzeug, um den Benutzer direkt in der App zu unterstützen.
Verwende es, wenn der Benutzer dich bittet, eine Pflanze zu erstellen, zu öffnen, Felder zu befüllen oder Zeitpläne zu bearbeiten.
Der Benutzer muss immer selbst auf Speichern klicken — du schreibst nie direkt in die Datenbank.

WICHTIG: Antworte mit einem normalen erklärenden Satz UND direkt danach dem Tool-Aufruf als JSON-Block.

Werkzeug: editPlant
  id     (string | null): ID der Pflanze aus den Gartendaten, oder null für eine neue Pflanze
  fields (object):        Felder die vorausgefüllt oder überschrieben werden sollen

  Skalare Felder und ERLAUBTE WERTE (immer exakt diese API-Werte verwenden, nie deutsche Übersetzungen):
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

  Zeitpläne (fields.schedules): DIFFERENZIELL — nur explizit genannte Einträge werden geändert.
    Nicht genannte Zeitpläne bleiben unberührt. Lies die vorhandenen IDs aus den Gartendaten.

    PFLICHTREGELN:
    1. bloom, foliage, growth: add ist erlaubt, wenn noch KEIN Eintrag dieses Typs existiert.
       remove und update nur auf ausdrückliche Anweisung des Benutzers.
       Diese Typen sind rein informativ (Kalender/Gantt) — sie erzeugen KEINE Aufgaben.
       Aufgaben entstehen nur aus: pruning, fertilization, misc.
    2. NIEMALS add verwenden für einen Zeitplan, der bereits existiert (erkennbar an Typ + Wochenbereich).
       Prüfe zuerst die vorhandenen Zeitpläne der Pflanze.
    3. Bei remove/update: UUID exakt so verwenden wie in den Gartendaten angegeben.
    4. Der Benutzer sagt "Aufgaben reduzieren" → nur pruning/fertilization/misc anpassen, nie bloom/foliage/growth.
    5. NOTIZEN PFLICHT: Bei jedem add von pruning, fertilization oder misc das Feld notes IMMER befüllen.
       Die Notiz muss enthalten:
         a) Warum — kurze Begründung (z.B. "Fördert kräftige Blütenbildung vor der Hauptblüte")
         b) Priorität — wichtig oder optional? (z.B. "Optional — einmaliges Auslassen schadet der Pflanze nicht")
         c) Alternative — einfachere oder seltener nötige Option (z.B. "Für pflegeleichte Gärten reicht eine Gabe Langzeit-Dünger im Frühling")
       Passe Länge und Detailtiefe dem aktiven Gärtner-Profil an: Hobbyist → kurz und simpel, Experte → detaillierter.

    Felder pro Operation:
      action         (genau eines von: "add" | "remove" | "update")
      id             (string, nur bei remove/update: die UUID direkt aus den Gartendaten, z.B. "a1b2c3d4-...")
      schedule_type  (bei add/update: genau eines von "bloom"|"growth"|"foliage"|"pruning"|"fertilization"|"misc")
      start_week     (bei add/update: Kalenderwoche 1–53)
      end_week       (bei add/update: Kalenderwoche 1–53; wenn start_week > end_week = Jahresübergang, z.B. KW 48–6)
      color          (optional, Hex-String z.B. "#c0392b"; bei Blüten aus dem Kontext ableiten, sonst weglassen)
      label          (optional, kurzer Text)
      notes          (optional, Freitext)

Beispiele:

Neue Pflanze erstellen und vorausfüllen:
\`\`\`tool
{"tool":"editPlant","id":null,"fields":{"name_common":"Rose","sun_demand":"sunny","water_demand":"medium"}}
\`\`\`

Bestehende Pflanze öffnen und Blüte + Schnitt eintragen:
\`\`\`tool
{"tool":"editPlant","id":"<plant-id>","fields":{"schedules":[{"action":"add","schedule_type":"bloom","start_week":17,"end_week":36,"color":"#c0392b","label":"Hauptblüte"},{"action":"add","schedule_type":"pruning","start_week":9,"end_week":10}]}}
\`\`\`

Bestehenden Zeitplan entfernen (UUID aus den Gartendaten):
\`\`\`tool
{"tool":"editPlant","id":"<plant-id>","fields":{"schedules":[{"action":"remove","id":"<uuid-aus-gartendaten>"}]}}
\`\`\`

Wenn die Pflanzenverwaltung nicht geöffnet ist, teile dem Benutzer mit, dass er zuerst zur Pflanzenansicht wechseln soll.`,

  en: `You have access to one tool to help the user directly within the app.
Use it when the user asks you to create, open, fill in plant fields, or manage schedules.
The user must always click Save themselves — you never write directly to the database.

IMPORTANT: Respond with a normal explanatory sentence AND directly after that the tool call as a JSON block.

Tool: editPlant
  id     (string | null): ID of the plant from garden data, or null for a new plant
  fields (object):        fields to pre-fill or overwrite

  Scalar fields and ALLOWED VALUES (always use these exact API values, never translated labels):
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

  Schedules (fields.schedules): DIFFERENTIAL — only explicitly listed entries are changed.
    Unlisted schedules remain untouched. Read existing IDs from the garden data.

    MANDATORY RULES:
    1. bloom, foliage, growth: add is allowed if NO entry of that type exists yet for the plant.
       remove and update only on explicit user instruction.
       These types are purely informational (calendar/Gantt) — they do NOT generate tasks.
       Tasks are only generated from: pruning, fertilization, misc.
    2. NEVER add a schedule that already exists (identifiable by type + week range).
       Always check the plant's existing schedules first.
    3. For remove/update: use the UUID exactly as shown in the garden data.
    4. If the user says "reduce tasks" → only adjust pruning/fertilization/misc, never bloom/foliage/growth.
    5. NOTES REQUIRED: When adding pruning, fertilization or misc, ALWAYS populate the notes field.
       The note must include:
         a) Why — short reason (e.g. "Supports strong bloom formation before the main flowering period")
         b) Priority — important or optional? (e.g. "Optional — skipping once will not harm the plant")
         c) Alternative — a simpler or less frequent option (e.g. "A single slow-release fertilizer in spring is sufficient for low-maintenance gardens")
       Adapt length and detail to the active gardener profile: Hobbyist → short and simple, Expert → more detailed.

    Fields per operation:
      action         (exactly one of: "add" | "remove" | "update")
      id             (string, only for remove/update: the UUID directly from garden data, e.g. "a1b2c3d4-...")
      schedule_type  (for add/update: exactly one of "bloom"|"growth"|"foliage"|"pruning"|"fertilization"|"misc")
      start_week     (for add/update: week number 1–53)
      end_week       (for add/update: week number 1–53; if start_week > end_week = year-wrap, e.g. W48–W06)
      color          (optional, hex string e.g. "#c0392b"; derive from context for bloom, omit otherwise)
      label          (optional, short text)
      notes          (optional, free text)

Examples:

Create and pre-fill a new plant:
\`\`\`tool
{"tool":"editPlant","id":null,"fields":{"name_common":"Rose","sun_demand":"sunny","water_demand":"medium"}}
\`\`\`

Open existing plant and add bloom + pruning schedule:
\`\`\`tool
{"tool":"editPlant","id":"<plant-id>","fields":{"schedules":[{"action":"add","schedule_type":"bloom","start_week":17,"end_week":36,"color":"#c0392b","label":"Main bloom"},{"action":"add","schedule_type":"pruning","start_week":9,"end_week":10}]}}
\`\`\`

Remove an existing schedule (UUID from garden data):
\`\`\`tool
{"tool":"editPlant","id":"<plant-id>","fields":{"schedules":[{"action":"remove","id":"<uuid-from-garden-data>"}]}}
\`\`\`

If the Plants view is not open, tell the user to switch there first.`,
};

function buildBlock1(lang: "de" | "en"): string {
  return [PERSONA[lang], APP_DESCRIPTION[lang], TOOLS_DESCRIPTION[lang]].join("\n\n---\n\n");
}

// ── Block 2 — Settings ────────────────────────────────────────────────────────
// Changes only when the user saves Settings.

// ── Gardener profile sentences ─────────────────────────────────────────────────

const GARDENER_PROFILE_TEXT: Record<GardenerProfile, Record<"de" | "en", string>> = {
  hobbyist: {
    de: "Der Benutzer ist ein Hobbygärtner mit etwa 1 Stunde pro Woche für die Gartenpflege. " +
        "Halte alle Empfehlungen einfach und zeitsparend. Empfehle höchstens eine Düngung pro Saison. " +
        "Vermeide mehrstufige oder häufige Pflegemaßnahmen.",
    en: "The user is a hobbyist gardener with about 1 hour per week available for garden care. " +
        "Keep all recommendations simple and time-efficient. Recommend at most one fertilization per season. " +
        "Avoid multi-step or frequent interventions.",
  },
  engaged: {
    de: "Der Benutzer ist ein engagierter Hobbygärtner mit 2–4 Stunden pro Woche für die Gartenpflege. " +
        "Regelmäßige saisonale Pflege ist akzeptabel. Standardmäßige Düngungs- und Schnittpläne sind geeignet.",
    en: "The user is an engaged hobbyist gardener with 2–4 hours per week available for garden care. " +
        "Regular seasonal care is acceptable. Standard fertilization and pruning schedules are appropriate.",
  },
  expert: {
    de: "Der Benutzer ist ein erfahrener Gärtner mit mehr als 5 Stunden pro Woche für die Gartenpflege. " +
        "Optimale Pflegeroutinen und professionelle Zeitpläne sind erwünscht. " +
        "Mehrfache Düngungen, detaillierte Schnittfenster und aufwändige Maßnahmen sind willkommen.",
    en: "The user is an expert gardener with 5 or more hours per week available for garden care. " +
        "Optimal care routines and professional-grade schedules are welcome. " +
        "Multiple fertilizations, detailed pruning windows, and complex interventions are appropriate.",
  },
};

function buildBlock2(ctx: AssistantContext, lang: "de" | "en"): string {
  const s = ctx.settings;
  if (!s) return "";

  const isDE = lang === "de";
  const lines: string[] = [];

  // Gardener profile — always first, controls overall tone
  const profile = s.gardener_profile ?? "engaged";
  lines.push(GARDENER_PROFILE_TEXT[profile][lang]);

  if (s.location_city || s.location_zip) {
    const loc = [s.location_city, s.location_zip].filter(Boolean).join(", ");
    lines.push(isDE ? `Standort: ${loc}` : `Location: ${loc}`);
  }
  if (s.plant_categories.length > 0) {
    lines.push(
      isDE
        ? `Pflanzenkategorien: ${s.plant_categories.join(", ")}`
        : `Plant categories: ${s.plant_categories.join(", ")}`
    );
  }
  if (s.irrigation_zones.length > 0) {
    lines.push(
      isDE
        ? `Bewässerungszonen: ${s.irrigation_zones.join(", ")}`
        : `Irrigation zones: ${s.irrigation_zones.join(", ")}`
    );
  }
  if (s.color_presets.length > 0) {
    const presetLines = s.color_presets.map(
      (p) => `  - ${p.schedule_type}: ${p.name} (${p.color})`
    );
    lines.push(
      isDE
        ? `Farb-Presets:\n${presetLines.join("\n")}`
        : `Color presets:\n${presetLines.join("\n")}`
    );
  }

  return (isDE ? "Einstellungen:\n" : "Settings:\n") + lines.join("\n");
}

// ── Block 3 — Plant base data ─────────────────────────────────────────────────
// Changes when the user edits a plant's scalar fields.

function nl(label: string, value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `  ${label}: ${value}\n`;
}

function serializePlantBase(p: Plant): string {
  let out = `## ${p.name_common}${p.name_botanical ? ` (${p.name_botanical})` : ""}\n`;
  out += nl("id", p.id);
  out += nl("Botanischer Name", p.name_botanical);
  out += nl("Standort", p.location);
  out += nl("Bewässerungszone", p.watering_zone);
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
  return out;
}

function buildBlock3(ctx: AssistantContext, lang: "de" | "en"): string {
  const isDE = lang === "de";
  const { garden } = ctx;

  if (garden.plants.length === 0) {
    return isDE ? "Keine Pflanzen erfasst." : "No plants recorded.";
  }

  let out = isDE ? "Pflanzenstammdaten:\n" : "Plant base data:\n";
  if (garden.plan_name) out = (isDE ? `Gartenname: ${garden.plan_name}\n\n` : `Garden name: ${garden.plan_name}\n\n`) + out;
  out += garden.plants.map(serializePlantBase).join("\n");
  return out.trim();
}

// ── Block 4 — Dynamic plant data ──────────────────────────────────────────────
// Changes when tasks are resolved, journal entries added, or schedules edited.

function serializeSchedule(s: Schedule): string {
  let out = `    - id:${s.id} | ${s.schedule_type}, KW ${s.start_week}–${s.end_week}`;
  if (s.color) out += `, Farbe: ${s.color}`;
  if (s.label) out += `, Label: ${s.label}`;
  if (s.notes) out += `\n      Notizen: ${s.notes}`;
  return out;
}

function serializeJournalEntry(e: JournalEntry): string {
  let out = `    - [${e.date}]`;
  if (e.week) out += ` [Woche: ${e.week}]`;
  out += ` ${e.entry_type}`;
  if (e.schedule_id) out += ` [schedule_id: ${e.schedule_id}]`;
  if (e.title) out += `: ${e.title}`;
  if (e.notes) out += `\n      ${e.notes}`;
  return out;
}

function serializeTask(t: Task): string {
  const s = t.schedule;
  return `    - ${t.status}: ${s.schedule_type}${s.label ? ` (${s.label})` : ""}, KW ${s.start_week}–${s.end_week} [Woche: ${t.week}]`;
}

function serializePlantDynamic(p: Plant): string {
  let out = `## ${p.name_common}\n`;

  if (p.schedules.length > 0) {
    out += "  Zeitpläne:\n";
    out += p.schedules.map(serializeSchedule).join("\n") + "\n";
  }

  const openTasks = p.tasks.filter(() => true); // include all
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

function buildBlock4(ctx: AssistantContext, lang: "de" | "en"): string {
  const isDE = lang === "de";
  const { garden } = ctx;

  const plantParts = garden.plants
    .filter((p) => p.schedules.length > 0 || p.tasks.length > 0 || p.journal_entries.length > 0)
    .map(serializePlantDynamic);

  const gardenEntries = garden.journal_entries.filter((e) => !e.plant_id);
  const gardenPart = gardenEntries.length > 0
    ? (isDE ? "\n## Gartenweite Tagebucheinträge\n" : "\n## Garden-wide journal entries\n") +
      gardenEntries.map(serializeJournalEntry).join("\n")
    : "";

  if (plantParts.length === 0 && !gardenPart) return "";

  const header = isDE ? "Dynamische Pflanzendaten:\n" : "Dynamic plant data:\n";
  return (header + plantParts.join("\n") + gardenPart).trim();
}

// ── Block 5 — Current situation ───────────────────────────────────────────────
// Changes on every view switch or plant selection — never cached.

const VIEW_LABEL: Record<string, Record<"de" | "en", string>> = {
  dashboard: { de: "Dashboard",       en: "Dashboard"   },
  plants:    { de: "Pflanzen",        en: "Plants"      },
  calendar:  { de: "Kalender",        en: "Calendar"    },
  journal:   { de: "Tagebuch",        en: "Journal"     },
  settings:  { de: "Einstellungen",   en: "Settings"    },
};

function serializePendingPlantEdit(pending: PendingPlantEdit, lang: "de" | "en"): string {
  const isDE = lang === "de";

  const header = isDE
    ? "Ausstehende Änderungen im Bearbeitungsdialog (noch NICHT gespeichert):\n"
    : "Pending changes in the edit dialog (NOT yet saved):\n";

  let out = header;

  const scalarKeys = Object.keys(pending.scalarFields);
  if (scalarKeys.length > 0) {
    out += isDE ? "  Skalare Felder (bereits vorgeschlagen — NICHT nochmal vorschlagen):\n"
                : "  Scalar fields (already suggested — do NOT suggest again):\n";
    for (const key of scalarKeys) {
      out += `    ${key}: ${pending.scalarFields[key]}\n`;
    }
  }

  if (pending.schedules.length > 0) {
    out += isDE ? "  Zeitpläne (bereits vorgeschlagen — NICHT nochmal vorschlagen):\n"
                : "  Schedules (already suggested — do NOT suggest again):\n";
    for (const s of pending.schedules) {
      const idNote = s.isTemporaryId
        ? isDE ? `id:${s.id} (temporäre ID — nutzbar für weitere Operationen in diesem Dialog)`
               : `id:${s.id} (temporary ID — usable for further operations in this dialog)`
        : `id:${s.id}`;
      const weekRange = s.start_week !== undefined && s.end_week !== undefined
        ? `, KW ${s.start_week}–${s.end_week}` : "";
      const label = s.label ? `, Label: ${s.label}` : "";
      const color = s.color ? `, Farbe: ${s.color}` : "";
      out += `    - ${s.action.toUpperCase()} ${idNote} ${s.schedule_type ?? ""}${weekRange}${label}${color}\n`;
    }
    if (pending.schedules.some((s) => s.isTemporaryId)) {
      out += isDE
        ? "  HINWEIS: Temporäre IDs sind bis zum Speichern stabil und können für remove/update genutzt werden.\n"
        : "  NOTE: Temporary IDs are stable until Save and can be used for remove/update.\n";
    }
  }

  return out.trimEnd();
}

function buildBlock5(ctx: AssistantContext, lang: "de" | "en"): string {
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
      p.location ? (isDE ? `Standort: ${p.location}` : `Location: ${p.location}`) : null,
    ].filter(Boolean).join(" — ");
    out += isDE
      ? `Ausgewählte Pflanze: ${id}\n`
      : `Selected plant: ${id}\n`;
  }

  if (ctx.pendingPlantEdit) {
    out += "\n" + serializePendingPlantEdit(ctx.pendingPlantEdit, lang) + "\n";
  }

  return out.trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the system prompt as 5 ordered blocks.
 * Empty blocks (e.g. Block 2 when settings are absent) are omitted.
 * The last non-empty block never gets cache_control on the backend.
 */
export function buildSystemBlocks(ctx: AssistantContext, lang: "de" | "en"): SystemBlock[] {
  return [
    buildBlock1(lang),
    buildBlock2(ctx, lang),
    buildBlock3(ctx, lang),
    buildBlock4(ctx, lang),
    buildBlock5(ctx, lang),
  ]
    .filter((text) => text.length > 0)
    .map((text) => ({ text }));
}

/**
 * Backward-compatible wrapper — returns a single joined string.
 * Used by tests and any caller that doesn't need block-level caching.
 */
export function buildSystemPrompt(ctx: AssistantContext, lang: "de" | "en"): string {
  return buildSystemBlocks(ctx, lang).map((b) => b.text).join("\n\n---\n\n");
}

/**
 * Exported for tests — serializes the full garden as a single string
 * (blocks 3 + 4 joined).
 */
export function serializeGarden(garden: Garden): string {
  const ctx: AssistantContext = { view: "plants", garden };
  return [buildBlock3(ctx, "de"), buildBlock4(ctx, "de")]
    .filter(Boolean)
    .join("\n\n");
}
