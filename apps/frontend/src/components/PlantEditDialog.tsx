/**
 * PlantEditDialog — story-026: Grunddaten & Icon.
 *
 * Opens as a left panel following ADR-006 layout order (AC #1).
 * Handles both creating a new plant (plant=null) and editing an existing one.
 *
 * This story implements:
 *   - Dialog shell: header, collapsible sections, save/cancel bar (AC #6)
 *   - Grunddaten section: all scalar fields (AC #2)
 *   - Icon picker: 20 emoji options, auto-suggestion from category (AC #3)
 *   - Enum dropdowns populated from i18n (AC #4)
 *   - Category + watering zone from Settings (AC #5)
 *
 * Later stories add: Bilder, Positionen, Schedule sections (story-027, #028, #029).
 */

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Plant } from "@api/plant";
import type { Schedule, ScheduleType } from "@api/schedule";
import type { ColorPreset } from "@api/color-preset";
import type { Attachment, AttachmentCategory } from "@api/attachment";
import type { PlantInput } from "@api/api";
import type { PendingPlantEdit } from "@api/assistant-context";
import { apiClient } from "@/api/client";
import { applyAiSuggestions } from "@/lib/applyAiSuggestions";
import type { PlantEditFields } from "@/hooks/usePlantEditContext";

// ── Icon library (AC #3) ──────────────────────────────────────────────────────

const ICON_OPTIONS = [
  "🌹","🌸","🌺","🌻","🌼","💐","🌷","🌿",
  "🌱","🌳","🌲","🎋","🍃","🍂","🍎","🍋",
  "🌵","🪴","🌾","🎍",
];

/** Auto-suggest icon from category (AC #3) */
function autoIcon(category: string | null): string {
  if (!category) return "🌿";
  const c = category.toLowerCase();
  if (c.includes("baum"))        return "🌳";
  if (c.includes("nadelbaum"))   return "🌲";
  if (c.includes("obstbaum"))    return "🍎";
  if (c.includes("strauch"))     return "🌹";
  if (c.includes("staude"))      return "🌸";
  if (c.includes("blume"))       return "🌼";
  if (c.includes("einjährig"))   return "🌱";
  return "🌿";
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

const MONTH_ABBR = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
/** 48 week labels: W1 Jan … W4 Dez */
export const WEEK_LABELS: string[] = MONTH_ABBR.flatMap((m) =>
  [1,2,3,4].map((w) => `W${w} ${m}`)
);

/** week number (1-based ISO) → index in WEEK_LABELS (0-based) */
export function weekToIdx(week: number): number {
  return Math.max(0, Math.min(47, week - 1));
}
/** index (0-based) → ISO week number (1-based, 1–48) */
export function idxToWeek(idx: number): number {
  return idx + 1;
}

/** Local form representation of one schedule entry. */
export type ScheduleRow = {
  /** Client-generated UUID for new entries; server id for existing ones. */
  id:           string;
  scheduleType: ScheduleType;
  startIdx:   number;   // 0-based index into WEEK_LABELS
  endIdx:     number;   // 0-based index into WEEK_LABELS
  color:      string;
  label:      string;
  notes:      string;
  /**
   * Set when this row was inserted/modified/removed by the AI assistant.
   *   "add"    — row added by AI; × removes it (revert)
   *   "remove" — existing row marked for deletion by AI; displayed struck through; × restores it
   *   "update" — existing row patched by AI; × restores previous values
   * undefined  — normal user row, no AI involvement
   */
  aiAction?:  "add" | "remove" | "update";
  /** Previous field values before an AI "update", used for × revert. */
  aiPrev?:    Partial<Pick<ScheduleRow, "startIdx" | "endIdx" | "color" | "label" | "notes">>;
};

type ScheduleSectionConfig = {
  type:         ScheduleType;
  accent:       string;
  hasColor:     boolean;
  defaultColor: string;
  i18nSection:  string;  // key under edit.schedule.*
  i18nAdd:      string;
};

const SCHEDULE_SECTIONS: ScheduleSectionConfig[] = [
  { type: "bloom",         accent: "#c0392b", hasColor: true, defaultColor: "#c0392b", i18nSection: "section_bloom",         i18nAdd: "add_bloom"         },
  { type: "growth",        accent: "#2e7d32", hasColor: true, defaultColor: "#2e7d32", i18nSection: "section_growth",        i18nAdd: "add_growth"        },
  { type: "foliage",       accent: "#1b5e20", hasColor: true, defaultColor: "#a8d5a2", i18nSection: "section_foliage",       i18nAdd: "add_foliage"       },
  { type: "pruning",       accent: "#27ae60", hasColor: true, defaultColor: "#27ae60", i18nSection: "section_pruning",       i18nAdd: "add_pruning"       },
  { type: "fertilization", accent: "#2980b9", hasColor: true, defaultColor: "#2980b9", i18nSection: "section_fertilization", i18nAdd: "add_fertilization" },
  { type: "misc",          accent: "#7f8c8d", hasColor: true, defaultColor: "#e67e22", i18nSection: "section_misc",          i18nAdd: "add_misc"          },
];

function schedulesToRows(schedules: Schedule[]): ScheduleRow[] {
  return schedules.map((s) => ({
    id:           s.id ?? crypto.randomUUID(),
    scheduleType: s.schedule_type,
    startIdx:     weekToIdx(s.start_week),
    endIdx:       weekToIdx(s.end_week),
    color:        s.color ?? SCHEDULE_SECTIONS.find((c) => c.type === s.schedule_type)?.defaultColor ?? "#7f8c8d",
    label:        s.label ?? "",
    notes:        s.notes ?? "",
  }));
}

function rowsToScheduleInputs(rows: ScheduleRow[]): PlantInput["schedules"] {
  return rows.map((r) => ({
    id:            r.id,
    schedule_type: r.scheduleType,
    start_week:    idxToWeek(r.startIdx),
    end_week:      idxToWeek(r.endIdx),
    color:         r.color || null,
    label:         r.label.trim() || null,
    notes:         r.notes.trim() || null,
    created_at:    "",
    updated_at:    "",
  }));
}

// ── Form state type ───────────────────────────────────────────────────────────

type EditForm = {
  icon:                    string;
  name_common:             string;
  name_botanical:          string;
  description:             string;
  category:                string;
  origin_type:             string;
  lifecycle:               string;
  location:                string;
  watering_zone:           string;
  purchase_date:           string;
  purchase_price:          string;
  sun_demand:              string;
  water_demand:            string;
  frost_tolerance_min_c:   string;
  soil_type:               string;
  health_status:           string;
  temperature_protected:   boolean;
  care_notes:              string;
};

function plantToForm(plant: Plant | null): EditForm {
  if (!plant) {
    return {
      icon: "🌿", name_common: "", name_botanical: "", description: "",
      category: "", origin_type: "", lifecycle: "", location: "",
      watering_zone: "", purchase_date: "", purchase_price: "",
      sun_demand: "", water_demand: "", frost_tolerance_min_c: "",
      soil_type: "", health_status: "", temperature_protected: false,
      care_notes: "",
    };
  }
  return {
    icon:                  plant.icon ?? "🌿",
    name_common:           plant.name_common,
    name_botanical:        plant.name_botanical ?? "",
    description:           plant.description ?? "",
    category:              plant.category ?? "",
    origin_type:           plant.origin_type ?? "",
    lifecycle:             plant.lifecycle ?? "",
    location:              plant.location ?? "",
    watering_zone:         plant.watering_zone ?? "",
    purchase_date:         plant.purchase_date ?? "",
    purchase_price:        plant.purchase_price != null ? String(plant.purchase_price) : "",
    sun_demand:            plant.sun_demand ?? "",
    water_demand:          plant.water_demand ?? "",
    frost_tolerance_min_c: plant.frost_tolerance_min_c != null ? String(plant.frost_tolerance_min_c) : "",
    soil_type:             plant.soil_type ?? "",
    health_status:         plant.health_status ?? "",
    temperature_protected: plant.temperature_protected,
    care_notes:            plant.care_notes ?? "",
  };
}

function formToInput(form: EditForm): PlantInput {
  return {
    icon:                    form.icon || null,
    name_common:             form.name_common.trim(),
    name_botanical:          form.name_botanical.trim() || null,
    description:             form.description.trim() || null,
    category:                form.category || null,
    origin_type:             (form.origin_type as PlantInput["origin_type"]) || null,
    lifecycle:               (form.lifecycle as PlantInput["lifecycle"]) || null,
    location:                form.location.trim() || null,
    watering_zone:           form.watering_zone || null,
    purchase_date:           form.purchase_date || null,
    purchase_price:          form.purchase_price ? parseFloat(form.purchase_price) : null,
    sun_demand:              (form.sun_demand as PlantInput["sun_demand"]) || null,
    water_demand:            (form.water_demand as PlantInput["water_demand"]) || null,
    frost_tolerance_min_c:   form.frost_tolerance_min_c ? parseInt(form.frost_tolerance_min_c) : null,
    soil_type:               (form.soil_type as PlantInput["soil_type"]) || null,
    health_status:           (form.health_status as PlantInput["health_status"]) || null,
    temperature_protected:   form.temperature_protected,
    care_notes:              form.care_notes.trim() || null,
    // Later stories fill these:
    positions:   [],
    attachments: [],
    schedules:   [],
  };
}

// ── Position row type ─────────────────────────────────────────────────────────

export type PositionRow = { x: number; y: number };

// ── Attachment row type ───────────────────────────────────────────────────────

/** An existing saved attachment (from plant.attachments). */
type SavedAttachment = Attachment & { _kind: "saved" };
/** A new local file not yet uploaded. */
type LocalAttachment = {
  _kind:    "local";
  localId:  string;   // crypto.randomUUID() — used as React key
  file:     File;
  previewUrl: string; // blob: URL for image preview
  category: AttachmentCategory;
};
export type AttachmentRow = SavedAttachment | LocalAttachment;

// ── AI enum normalization ─────────────────────────────────────────────────────

/**
 * Maps common German/English display labels to their API enum values.
 * Guards against the LLM returning translated labels instead of API keys.
 */
const ENUM_NORMALIZE: Partial<Record<AiSuggestableField, Record<string, string>>> = {
  sun_demand: {
    sonnig: "sunny", sunny: "sunny",
    "halbschattig": "partial_shade", "partial shade": "partial_shade", partial_shade: "partial_shade",
    schattig: "shady", shady: "shady",
  },
  water_demand: {
    niedrig: "low", gering: "low", low: "low",
    mittel: "medium", medium: "medium",
    hoch: "high", high: "high",
  },
  soil_type: {
    lehmig: "loamy", loamy: "loamy",
    sandig: "sandy", sandy: "sandy",
    humusreich: "humus_rich", "humus-reich": "humus_rich", humus_rich: "humus_rich",
    kalkhaltig: "calcareous", calcareous: "calcareous",
    sauer: "acidic", acidic: "acidic",
  },
  health_status: {
    gut: "good", good: "good",
    beobachten: "watch", watch: "watch",
    behandlung: "needs_treatment", "needs treatment": "needs_treatment", needs_treatment: "needs_treatment",
  },
  origin_type: {
    heimisch: "native", native: "native",
    neophyt: "neophyte", neophyte: "neophyte",
    "invasiver neophyt": "invasive_neophyte", invasive_neophyte: "invasive_neophyte",
  },
  lifecycle: {
    einjährig: "annual", annual: "annual",
    zweijährig: "biennial", biennial: "biennial",
    mehrjährig: "perennial", perennial: "perennial",
    staude: "perennial",
  },
};

function normalizeEnumValue(key: AiSuggestableField, value: string): string {
  const map = ENUM_NORMALIZE[key];
  if (!map) return value;
  return map[value.toLowerCase()] ?? value;
}

// ── AI suggestion types ───────────────────────────────────────────────────────

/** Keys of EditForm that AI can suggest (subset of scalar fields, no icon/checkbox). */
export type AiSuggestableField = Exclude<keyof EditForm, "icon" | "temperature_protected">;
export type AiSuggestionsMap   = Partial<Record<AiSuggestableField, true>>;
export type AiPrevMap          = Partial<Record<AiSuggestableField, string>>;

/** Imperative handle exposed to parent/context via forwardRef. */
export type PlantEditDialogHandle = {
  /** Returns true if dialog is open (always true when mounted). */
  isOpen: () => boolean;
  /** Push AI-suggested fields into the dialog; marks them visually. */
  applyAiFields: (fields: PlantEditFields) => void;
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PlantEditDialogProps {
  /** null = new plant, Plant = edit existing */
  plant:               Plant | null;
  onClose:             () => void;
  onSaved:             (plant: Plant) => void;
  /** story-028: positions are owned by PlantsView so GardenPlanWidget can use them */
  positions:           PositionRow[];
  onPositionsChange:   (rows: PositionRow[]) => void;
  initialPositions:    PositionRow[];   // snapshot at dialog open — for dirty check
  pickMode:            boolean;
  onPickModeChange:    (active: boolean) => void;
  /**
   * Called whenever the set of AI-staged (pending) changes changes.
   * Receives null when the dialog closes or all AI suggestions are reverted.
   * Used by parent views to include pending changes in the AI system prompt
   * so the assistant knows what it has already suggested.
   */
  onPendingChange?:    (pending: PendingPlantEdit | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PlantEditDialog = forwardRef<PlantEditDialogHandle, PlantEditDialogProps>(
function PlantEditDialog({
  plant, onClose, onSaved,
  positions, onPositionsChange, initialPositions,
  pickMode, onPickModeChange,
  onPendingChange,
}: PlantEditDialogProps, ref) {
  const { t } = useTranslation("plants");
  const { t: tc } = useTranslation("common");

  const [form,         setForm]         = useState<EditForm>(() => plantToForm(plant));
  const formRef = useRef<EditForm>(form);
  // Keep formRef in sync so applyAiFields always reads the latest form without closures.
  formRef.current = form;
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [iconManual,    setIconManual]    = useState(!!plant?.icon);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [categories,    setCategories]    = useState<string[]>([]);
  const [zones,         setZones]         = useState<string[]>([]);
  const [nameError,     setNameError]     = useState(false);
  const [scheduleRows,  setScheduleRows]  = useState<ScheduleRow[]>(() => schedulesToRows(plant?.schedules ?? []));
  const [colorPresets,  setColorPresets]  = useState<ColorPreset[]>([]);
  const [attachmentRows, setAttachmentRows] = useState<AttachmentRow[]>(
    () => (plant?.attachments ?? []).map((a) => ({ ...a, _kind: "saved" as const }))
  );
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // AI suggestion state: which fields are marked + their pre-AI values for revert
  const [aiMarked, setAiMarked] = useState<AiSuggestionsMap>({});
  const [aiPrev,   setAiPrev]   = useState<AiPrevMap>({});

  // Helper: clear pending state whenever the dialog closes for any reason.
  const clearPending = useCallback(() => {
    onPendingChange?.(null);
  }, [onPendingChange]);

  // Notify parent whenever the set of pending AI changes updates.
  // This lets the assistant context (Block 5) reflect what has already been staged.
  useEffect(() => {
    if (!onPendingChange) return;

    const scalarFields: Record<string, string> = {};
    for (const key of Object.keys(aiMarked) as AiSuggestableField[]) {
      if (aiMarked[key]) scalarFields[key] = form[key] as string ?? "";
    }

    const pendingSchedules = scheduleRows
      .filter((r) => r.aiAction !== undefined)
      .map((r) => ({
        action:        r.aiAction as "add" | "remove" | "update",
        id:            r.id,
        isTemporaryId: r.aiAction === "add",
        schedule_type: r.scheduleType,
        start_week:    r.aiAction !== "remove" ? r.startIdx + 1 : undefined,
        end_week:      r.aiAction !== "remove" ? r.endIdx + 1   : undefined,
        label:         r.label || null,
        color:         r.color || null,
      }));

    const hasScalar    = Object.keys(scalarFields).length > 0;
    const hasSchedules = pendingSchedules.length > 0;

    if (!hasScalar && !hasSchedules) {
      onPendingChange(null);
    } else {
      onPendingChange({
        plantId:      plant?.id ?? null,
        scalarFields,
        schedules:    pendingSchedules,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMarked, scheduleRows]);

  // Imperative handle for AiPanel / PlantEditContext
  useImperativeHandle(ref, () => ({
    isOpen: () => true,
    applyAiFields: (fields: PlantEditFields) => {
      // ── Scalar fields ──────────────────────────────────────────────────────
      const suggestable: Partial<EditForm> = {};
      const keys: AiSuggestableField[] = [
        "name_common", "name_botanical", "description", "category",
        "origin_type", "lifecycle", "location", "watering_zone",
        "purchase_date", "purchase_price", "sun_demand", "water_demand",
        "frost_tolerance_min_c", "soil_type", "health_status", "care_notes",
      ];
      for (const k of keys) {
        if (fields[k] !== undefined) suggestable[k] = normalizeEnumValue(k, fields[k] as string);
      }
      const { nextForm, nextMarked, prevValues } = applyAiSuggestions(formRef.current, suggestable);
      setForm(nextForm);
      setAiMarked((m) => ({ ...m, ...nextMarked }));
      setAiPrev((p) => ({ ...p, ...prevValues }));

      // ── Schedule operations ────────────────────────────────────────────────
      if (fields.schedules && fields.schedules.length > 0) {
        setScheduleRows((prev) => {
          let rows = [...prev];
          for (const op of fields.schedules!) {
            // Normalise id: strip the "[id:...]" or "[temp-id:...]" wrapper the
            // model copies verbatim from the system prompt serialisation.
            const opId = op.id
              ? op.id.replace(/^\[(?:temp-)?id:(.+)\]$/, "$1")
              : op.id;

            if (op.action === "add") {
              const sectionCfg = SCHEDULE_SECTIONS.find((c) => c.type === op.schedule_type);
              const newRow: ScheduleRow = {
                id:           crypto.randomUUID(),
                scheduleType: (op.schedule_type as ScheduleType) ?? "misc",
                startIdx:     weekToIdx(op.start_week ?? 1),
                endIdx:       weekToIdx(op.end_week ?? 4),
                color:        op.color ?? sectionCfg?.defaultColor ?? "#7f8c8d",
                label:        op.label ?? "",
                notes:        op.notes ?? "",
                aiAction:     "add",
              };
              rows = [...rows, newRow];

            } else if (op.action === "remove" && opId) {
              rows = rows.map((r) =>
                r.id === opId ? { ...r, aiAction: "remove" as const } : r
              );

            } else if (op.action === "update" && opId) {
              rows = rows.map((r) => {
                if (r.id !== opId) return r;
                const aiPrev: ScheduleRow["aiPrev"] = {};
                const patch: Partial<ScheduleRow> = { aiAction: "update" as const, aiPrev };
                if (op.start_week !== undefined) { aiPrev.startIdx = r.startIdx; patch.startIdx = weekToIdx(op.start_week); }
                if (op.end_week   !== undefined) { aiPrev.endIdx   = r.endIdx;   patch.endIdx   = weekToIdx(op.end_week);   }
                if (op.color      !== undefined) { aiPrev.color    = r.color;    patch.color    = op.color ?? r.color;      }
                if (op.label      !== undefined) { aiPrev.label    = r.label;    patch.label    = op.label ?? "";           }
                if (op.notes      !== undefined) { aiPrev.notes    = r.notes;    patch.notes    = op.notes ?? "";           }
                return { ...r, ...patch };
              });
            }
          }
          return rows;
        });
      }
    },
  }));

  // Load settings for category + zone dropdowns (AC #5) and color presets (AC #3)
  useEffect(() => {
    apiClient.getSettings().then((s) => {
      setCategories(s.plant_categories);
      setZones(s.irrigation_zones);
      setColorPresets(s.color_presets);
    }).catch(() => {});
  }, []);

  // Schedule state handlers
  function addScheduleRow(type: ScheduleType) {
    const cfg = SCHEDULE_SECTIONS.find((c) => c.type === type)!;
    setScheduleRows((prev) => [...prev, {
      id: crypto.randomUUID(), scheduleType: type,
      startIdx: 0, endIdx: 3,
      color: cfg.defaultColor, label: "", notes: "",
    }]);
  }

  function updateScheduleRow(idx: number, patch: Partial<ScheduleRow>) {
    setScheduleRows((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function deleteScheduleRow(idx: number) {
    setScheduleRows((prev) => {
      const row = prev[idx];
      // For AI-added rows: revert = remove the row entirely
      // For AI-removed rows: revert = clear the aiAction flag (restore)
      // For AI-updated rows: revert = restore previous values
      // For normal rows: just remove
      if (row?.aiAction === "remove") {
        return prev.map((r, i) => i === idx ? { ...r, aiAction: undefined, aiPrev: undefined } : r);
      }
      if (row?.aiAction === "update" && row.aiPrev) {
        return prev.map((r, i) => i === idx
          ? { ...r, ...row.aiPrev, aiAction: undefined, aiPrev: undefined }
          : r
        );
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  // Auto-update icon when category changes, unless manually overridden (AC #3)
  useEffect(() => {
    if (!iconManual) {
      setForm((f) => ({ ...f, icon: autoIcon(f.category) }));
    }
  }, [form.category, iconManual]);

  const dirty =
    JSON.stringify(form) !== JSON.stringify(plantToForm(plant)) ||
    JSON.stringify(scheduleRows) !== JSON.stringify(schedulesToRows(plant?.schedules ?? [])) ||
    JSON.stringify(positions) !== JSON.stringify(initialPositions) ||
    attachmentRows.some((r) => r._kind === "local") ||
    // a saved attachment was deleted
    (plant?.attachments ?? []).some((a) => !attachmentRows.find((r) => r._kind === "saved" && r.id === a.id)) ||
    // order of saved attachments changed
    attachmentRows.some((r, i) => r._kind === "saved" && plant?.attachments[i]?.id !== r.id);

  function handleClose() {
    if (dirty && !confirm(t("edit.unsaved_confirm"))) return;
    clearPending();
    onClose();
  }

  function patch(key: keyof EditForm, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "name_common") setNameError(false);
  }

  async function handleSave() {
    if (!form.name_common.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    setError(null);
    setAttachmentError(null);
    try {
      // 1. Build attachment payload with sort_order = position in the list.
      // The user controls order by dragging; backend persists sort_order.
      const savedRows = attachmentRows.filter((r) => r._kind === "saved") as SavedAttachment[];
      const attachmentsWithOrder = savedRows.map((r, idx) => ({ ...r, sort_order: idx }));

      const input: ReturnType<typeof formToInput> = {
        ...formToInput(form),
        // Exclude rows marked for AI-removal before saving
        schedules:   rowsToScheduleInputs(scheduleRows.filter((r) => r.aiAction !== "remove")),
        positions:   positions.map((r) => ({ x_percent: r.x, y_percent: r.y })),
        attachments: attachmentsWithOrder,
      };

      // 2. Save plant (create or update)
      const saved = plant
        ? await apiClient.updatePlant(plant.id, input)
        : await apiClient.createPlant(input);

      // 3. Upload new local files
      const localRows = attachmentRows.filter((r) => r._kind === "local") as LocalAttachment[];
      if (localRows.length > 0) {
        try {
          await Promise.all(localRows.map((r) =>
            apiClient.uploadAttachment("plant", saved.id, {
              file:       r.file,
              category:   r.category,
              updated_at: "",
            })
          ));
        } catch {
          // Uploads failed — plant is saved, but images are missing
          setAttachmentError(t("edit.attachments.upload_error"));
          setSaving(false);
          // Still close dialog — plant data is saved; images can be re-added later
          clearPending();
          onSaved(saved);
          return;
        }
      }

      clearPending();
      onSaved(saved);
    } catch {
      setError("Speichern fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setSaving(false);
    }
  }

  const title = plant
    ? t("edit.title_edit", { name: plant.name_common })
    : t("edit.title_new");

  const aiSuggestionCount =
    Object.keys(aiMarked).filter((k) => aiMarked[k as AiSuggestableField]).length +
    scheduleRows.filter((r) => r.aiAction !== undefined).length;

  function revertAiField(key: AiSuggestableField) {
    setForm((f) => ({ ...f, [key]: aiPrev[key] ?? "" }));
    setAiMarked((m) => { const n = { ...m }; delete n[key]; return n; });
    setAiPrev((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  return (
    <>
      {/* ── Header ── */}
      <div
        style={{
          padding:        "13px 16px 10px",
          borderBottom:   "1px solid var(--border)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          flexShrink:     0,
          background:     "var(--warm-white)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "15px",
            color:      "var(--green-deep)",
            fontWeight: 600,
            display:    "flex",
            alignItems: "center",
            gap:        "8px",
          }}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={handleClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", fontSize: "16px", lineHeight: 1, transition: "color .15s" }}
          className="hover:text-text-dark"
          aria-label={t("edit.ai_suggestions.close_dialog")}
          data-testid="edit-close"
        >
          ✕
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Error banners */}
        {error && (
          <div style={{ margin: "12px 16px 0", padding: "8px 12px", borderRadius: "8px", background: "var(--red-soft)", border: "1px solid var(--red-warn)", fontSize: "12px", color: "var(--red-warn)" }}>
            {error}
          </div>
        )}
        {attachmentError && (
          <div data-testid="attachment-error" style={{ margin: "12px 16px 0", padding: "8px 12px", borderRadius: "8px", background: "var(--yellow-soft)", border: "1px solid var(--yellow-warn)", fontSize: "12px", color: "var(--yellow-warn)" }}>
            {attachmentError}
          </div>
        )}

        {/* Grunddaten section */}
        <EditSection
          title={t("edit.section_basic")}
          accent="#4a7c4a"
          defaultOpen
        >
          <GrunddatenFields
            form={form}
            patch={patch}
            pickerOpen={pickerOpen}
            setPickerOpen={setPickerOpen}
            iconManual={iconManual}
            setIconManual={setIconManual}
            categories={categories}
            zones={zones}
            nameError={nameError}
            aiMarked={aiMarked}
            onRevertAiField={revertAiField}
            t={t}
          />
        </EditSection>

        {/* Bilder section — story-029 */}
        <EditSection
          title={t("edit.attachments.section_title")}
          accent="#4a78c0"
          count={attachmentRows.length}
        >
          <BilderSection
            rows={attachmentRows}
            onRowsChange={setAttachmentRows}
            maxSizeMb={10}
            t={t}
          />
        </EditSection>

        {/* Positionen section — story-028 */}
        <EditSection
          title={t("edit.positions.section_title")}
          accent="#7d3c98"
          count={positions.length}
        >
          <PositionenSection
            positions={positions}
            pickMode={pickMode}
            onPickModeChange={onPickModeChange}
            onPositionsChange={onPositionsChange}
            t={t}
          />
        </EditSection>

        {/* Schedule sections — story-027 (AC #1–#6) */}
        {SCHEDULE_SECTIONS.map((cfg) => (
          <ScheduleSection
            key={cfg.type}
            config={cfg}
            rows={scheduleRows.filter((r) => r.scheduleType === cfg.type)}
            colorPresets={colorPresets}
            onAdd={() => addScheduleRow(cfg.type)}
            onChange={(idx, patch) => {
              // idx is local to this type — convert to global index
              const globalIdx = scheduleRows.reduce<number[]>((acc, r, i) => {
                if (r.scheduleType === cfg.type) acc.push(i);
                return acc;
              }, [])[idx];
              updateScheduleRow(globalIdx, patch);
            }}
            onDelete={(idx) => {
              const globalIdx = scheduleRows.reduce<number[]>((acc, r, i) => {
                if (r.scheduleType === cfg.type) acc.push(i);
                return acc;
              }, [])[idx];
              deleteScheduleRow(globalIdx);
            }}
            t={t}
          />
        ))}

      </div>

      {/* ── AI suggestion status bar ── */}
      {aiSuggestionCount > 0 && (
        <div
          data-testid="ai-suggestion-bar"
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "6px",
            padding:      "6px 12px",
            background:   "#fff4e6",
            borderTop:    "1px solid #f0c080",
            fontSize:     "11px",
            color:        "#a05000",
            flexShrink:   0,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "13px" }}>✦</span>
          <span>
            {(() => {
              const scalarCount   = Object.keys(aiMarked).filter((k) => aiMarked[k as AiSuggestableField]).length;
              const scheduleCount = scheduleRows.filter((r) => r.aiAction !== undefined).length;
              const parts: string[] = [];
              if (scalarCount > 0)   parts.push(t("edit.ai_suggestions.fields_other", { count: scalarCount }));
              if (scheduleCount > 0) parts.push(t("edit.ai_suggestions.schedules_other", { count: scheduleCount }));
              return parts.join(", ");
            })()}
          </span>
        </div>
      )}

      {/* ── Actions ── */}
      <div
        style={{
          display:    "flex",
          gap:        "8px",
          padding:    "10px 12px",
          borderTop:  "1px solid var(--border)",
          flexShrink: 0,
          alignItems: "center",
          background: "var(--warm-white)",
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={saving}
          style={actionBtnStyle}
          data-testid="edit-cancel"
        >
          <span>✕</span>{t("edit.btn_cancel")}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ ...actionBtnStyle, background: "var(--green-deep)", color: "white", borderColor: "var(--green-deep)" }}
          data-testid="edit-save"
        >
          {saving ? <><span>⏳</span>…</> : <><span>✓</span>{t("edit.btn_save")}</>}
        </button>
      </div>
    </>
  );
});

// ── EditSection ───────────────────────────────────────────────────────────────

interface EditSectionProps {
  title:        string;
  accent:       string;
  defaultOpen?: boolean;
  count?:       number;
  children?:    React.ReactNode;
}

function EditSection({ title, accent, defaultOpen = false, count, children }: EditSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  // If defaultOpen flips to true after mount (e.g. AI inserts rows), open automatically.
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}
        style={{
          padding:     "10px 18px",
          display:     "flex",
          alignItems:  "center",
          gap:         "8px",
          cursor:      "pointer",
          userSelect:  "none",
        }}
        className="hover:bg-green-mist"
      >
        <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", color: "var(--text-light)", flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
          {title}
          {count !== undefined && count > 0 && (
            <span style={{ fontSize: "10px", background: "var(--green-mist)", color: "var(--text-mid)", padding: "2px 6px", borderRadius: "10px", fontWeight: 600, letterSpacing: 0 }}>
              {count}
            </span>
          )}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-light)", transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </div>
      {open && children && (
        <div style={{ padding: "4px 18px 14px" }}>{children}</div>
      )}
    </div>
  );
}

// ── AiField ───────────────────────────────────────────────────────────────────
// Must be defined as a top-level component (not inside GrunddatenFields) to
// prevent React from treating it as a new component type on every re-render,
// which would unmount/remount the wrapped input and lose focus on every keystroke.

interface AiFieldProps {
  fieldKey:        AiSuggestableField;
  children:        React.ReactNode;
  isSelect?:       boolean;
  selectRef?:      React.RefObject<HTMLSelectElement | null>;
  aiMarked:        AiSuggestionsMap;
  onRevertAiField: (key: AiSuggestableField) => void;
}

function AiField({
  fieldKey, children, isSelect = false, selectRef,
  aiMarked, onRevertAiField,
}: AiFieldProps) {
  const { t } = useTranslation("plants");
  if (!aiMarked[fieldKey]) return <>{children}</>;

  function handleRevert() {
    onRevertAiField(fieldKey);
    if (isSelect && selectRef?.current) {
      // Open the dropdown after revert so the user can immediately pick a value.
      // setTimeout 0 lets React flush the state update (restoring original value) first.
      setTimeout(() => selectRef.current?.focus(), 0);
    }
  }

  return (
    <div style={{ position: "relative" }} data-testid={`ai-field-${fieldKey}`}>
      <div style={{
        background:   "#fff4e6",
        border:       "1.5px solid #e07b00",
        borderRadius: "8px",
        padding:      "1px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 4px 0 6px" }}>
          <span aria-hidden="true" style={{ fontSize: "11px", color: "#e07b00", flexShrink: 0 }}>✦</span>
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleRevert}
        data-testid={`ai-revert-${fieldKey}`}
        title={t("edit.ai_suggestions.revert_title")}
        aria-label={t("edit.ai_suggestions.revert_aria")}
        style={{
          position:     "absolute",
          right:        isSelect ? "6px" : "4px",
          top:          "50%",
          transform:    "translateY(-50%)",
          background:   "none",
          border:       "none",
          cursor:       "pointer",
          color:        "#e07b00",
          // For selects: match the size of a typical native dropdown arrow
          fontSize:     isSelect ? "13px" : "15px",
          lineHeight:   1,
          padding:      "2px 4px",
          borderRadius: "4px",
          zIndex:       1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── GrunddatenFields ──────────────────────────────────────────────────────────

interface GrunddatenProps {
  form:              EditForm;
  patch:             (key: keyof EditForm, value: string | boolean) => void;
  pickerOpen:        boolean;
  setPickerOpen:     (v: boolean) => void;
  iconManual:        boolean;
  setIconManual:     (v: boolean) => void;
  categories:        string[];
  zones:             string[];
  nameError:         boolean;
  aiMarked:          AiSuggestionsMap;
  onRevertAiField:   (key: AiSuggestableField) => void;
  t:                 TFunction<"plants">;
}

function GrunddatenFields({
  form, patch, pickerOpen, setPickerOpen,
  iconManual, setIconManual, categories, zones, nameError,
  aiMarked, onRevertAiField, t,
}: GrunddatenProps) {

  // Refs for select elements — used by AiField to focus/open after revert
  const refCategory   = useRef<HTMLSelectElement>(null);
  const refOrigin     = useRef<HTMLSelectElement>(null);
  const refLifecycle  = useRef<HTMLSelectElement>(null);
  const refHealth     = useRef<HTMLSelectElement>(null);
  const refWatering   = useRef<HTMLSelectElement>(null);
  const refSun        = useRef<HTMLSelectElement>(null);
  const refWater      = useRef<HTMLSelectElement>(null);
  const refSoil       = useRef<HTMLSelectElement>(null);

  /**
   * Returns style overrides for an input/select/textarea that is inside an AiField wrapper.
   * Removes the field's own border and background so the orange wrapper shows through cleanly.
   */
  function aiInputStyle(fieldKey: AiSuggestableField, isSelect = false): React.CSSProperties {
    if (!aiMarked[fieldKey]) return {};
    return {
      border:      "none",
      background:  "transparent",
      outline:     "none",
      // Hide the native dropdown arrow — the ▾ button in AiField replaces it
      ...(isSelect ? { appearance: "none" as const, paddingRight: "28px" } : {}),
    };
  }

  function selectIcon(emoji: string) {
    patch("icon", emoji);
    setIconManual(true);
    setPickerOpen(false);
  }

  return (
    <div>
      {/* Icon row (AC #3) */}
      <div style={{ marginBottom: "11px" }}>
        <div style={fieldLabelStyle}>{t("edit.icon_label")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            data-testid="icon-preview"
            style={{
              width: "48px", height: "48px", borderRadius: "10px",
              background: "var(--green-mist)", border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "26px", cursor: "pointer", flexShrink: 0,
              transition: "border-color .15s",
            }}
            className="hover:border-green-mid"
            aria-label={t("edit.ai_suggestions.icon_change")}
          >
            {form.icon || "🌿"}
          </button>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-mid)", lineHeight: 1.4 }}>
              {iconManual ? t("edit.icon_click_hint") : t("edit.icon_auto_hint")}
            </div>
            {iconManual && (
              <button
                type="button"
                onClick={() => { setIconManual(false); patch("icon", autoIcon(form.category)); }}
                style={{ fontSize: "10px", color: "var(--text-light)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "2px", textDecoration: "underline" }}
              >
                {t("edit.ai_suggestions.auto_suggest")}
              </button>
            )}
          </div>
        </div>
        {/* Emoji picker */}
        {pickerOpen && (
          <div
            style={{
              display: "flex", flexWrap: "wrap", gap: "5px",
              marginTop: "8px", background: "white",
              border: "1.5px solid var(--border)", borderRadius: "10px",
              padding: "10px", maxHeight: "120px", overflowY: "auto",
            }}
            data-testid="icon-picker"
          >
            {ICON_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => selectIcon(emoji)}
                style={{
                  fontSize: "20px", cursor: "pointer", padding: "3px 5px",
                  borderRadius: "6px", border: "none",
                  background: form.icon === emoji ? "var(--green-pale)" : "none",
                  lineHeight: 1,
                }}
                className="hover:bg-green-mist"
                data-testid={`icon-opt-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Name + Botanical */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_name")}</div>
          <AiField fieldKey="name_common" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <input
              type="text"
              value={form.name_common}
              onChange={(e) => patch("name_common", e.target.value)}
              placeholder={t("edit.ai_suggestions.name_placeholder")}
              data-testid="field-name"
              style={{
                ...fieldInputStyle,
                ...aiInputStyle("name_common"),
                borderColor: nameError ? "var(--red-warn)" : undefined,
              }}
            />
          </AiField>
          {nameError && <div style={{ fontSize: "10px", color: "var(--red-warn)", marginTop: "3px" }}>{t("edit.name_required")}</div>}
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_botanical")}</div>
          <AiField fieldKey="name_botanical" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <input
              type="text"
              value={form.name_botanical}
              onChange={(e) => patch("name_botanical", e.target.value)}
              placeholder={t("edit.ai_suggestions.botanical_placeholder")}
              data-testid="field-botanical"
              style={{ ...fieldInputStyle, ...aiInputStyle("name_botanical") }}
            />
          </AiField>
        </div>
      </div>

      {/* Description */}
      <FieldRow label={t("edit.field_description")}>
        <AiField fieldKey="description" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
          <textarea
            value={form.description}
            onChange={(e) => patch("description", e.target.value)}
            placeholder={t("edit.ai_suggestions.description_placeholder")}
            rows={3}
            data-testid="field-description"
            style={{ ...fieldTextareaStyle, ...aiInputStyle("description") }}
          />
        </AiField>
      </FieldRow>

      {/* Category (AC #5 — from Settings) + Origin (AC #4 — from i18n) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_category")}</div>
          <AiField fieldKey="category" isSelect selectRef={refCategory} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refCategory}
              value={form.category}
              onChange={(e) => patch("category", e.target.value)}
              data-testid="field-category"
              style={{ ...fieldSelectStyle, ...aiInputStyle("category", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </AiField>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_origin")}</div>
          <AiField fieldKey="origin_type" isSelect selectRef={refOrigin} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refOrigin}
              value={form.origin_type}
              onChange={(e) => patch("origin_type", e.target.value)}
              data-testid="field-origin"
              style={{ ...fieldSelectStyle, ...aiInputStyle("origin_type", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              <option value="native">{t("origin_type.native")}</option>
              <option value="neophyte">{t("origin_type.neophyte")}</option>
              <option value="invasive_neophyte">{t("origin_type.invasive_neophyte")}</option>
            </select>
          </AiField>
        </div>
      </div>

      {/* Lifecycle + Health */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_lifecycle")}</div>
          <AiField fieldKey="lifecycle" isSelect selectRef={refLifecycle} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refLifecycle}
              value={form.lifecycle}
              onChange={(e) => patch("lifecycle", e.target.value)}
              data-testid="field-lifecycle"
              style={{ ...fieldSelectStyle, ...aiInputStyle("lifecycle", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              <option value="annual">{t("lifecycle.annual")}</option>
              <option value="biennial">{t("lifecycle.biennial")}</option>
              <option value="perennial">{t("lifecycle.perennial")}</option>
            </select>
          </AiField>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_health")}</div>
          <AiField fieldKey="health_status" isSelect selectRef={refHealth} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refHealth}
              value={form.health_status}
              onChange={(e) => patch("health_status", e.target.value)}
              data-testid="field-health"
              style={{ ...fieldSelectStyle, ...aiInputStyle("health_status", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              <option value="good">{t("health_status.good")}</option>
              <option value="watch">{t("health_status.watch")}</option>
              <option value="needs_treatment">{t("health_status.needs_treatment")}</option>
            </select>
          </AiField>
        </div>
      </div>

      {/* Location + Watering zone (AC #5 — from Settings) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_location")}</div>
          <AiField fieldKey="location" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <input
              type="text"
              value={form.location}
              onChange={(e) => patch("location", e.target.value)}
              placeholder={t("edit.ai_suggestions.location_placeholder")}
              data-testid="field-location"
              style={{ ...fieldInputStyle, ...aiInputStyle("location") }}
            />
          </AiField>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_watering")}</div>
          <AiField fieldKey="watering_zone" isSelect selectRef={refWatering} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refWatering}
              value={form.watering_zone}
              onChange={(e) => patch("watering_zone", e.target.value)}
              data-testid="field-watering"
              style={{ ...fieldSelectStyle, ...aiInputStyle("watering_zone", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </AiField>
        </div>
      </div>

      {/* Sun + Water demand (AC #4) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_sun")}</div>
          <AiField fieldKey="sun_demand" isSelect selectRef={refSun} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refSun}
              value={form.sun_demand}
              onChange={(e) => patch("sun_demand", e.target.value)}
              data-testid="field-sun"
              style={{ ...fieldSelectStyle, ...aiInputStyle("sun_demand", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              <option value="sunny">{t("sun_demand.sunny")}</option>
              <option value="partial_shade">{t("sun_demand.partial_shade")}</option>
              <option value="shady">{t("sun_demand.shady")}</option>
            </select>
          </AiField>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_water")}</div>
          <AiField fieldKey="water_demand" isSelect selectRef={refWater} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refWater}
              value={form.water_demand}
              onChange={(e) => patch("water_demand", e.target.value)}
              data-testid="field-water"
              style={{ ...fieldSelectStyle, ...aiInputStyle("water_demand", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              <option value="low">{t("water_demand.low")}</option>
              <option value="medium">{t("water_demand.medium")}</option>
              <option value="high">{t("water_demand.high")}</option>
            </select>
          </AiField>
        </div>
      </div>

      {/* Soil type + Min temp (AC #4) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_soil")}</div>
          <AiField fieldKey="soil_type" isSelect selectRef={refSoil} aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <select
              ref={refSoil}
              value={form.soil_type}
              onChange={(e) => patch("soil_type", e.target.value)}
              data-testid="field-soil"
              style={{ ...fieldSelectStyle, ...aiInputStyle("soil_type", true) }}
            >
              <option value="">{t("edit.select_none")}</option>
              <option value="loamy">{t("soil_type.loamy")}</option>
              <option value="sandy">{t("soil_type.sandy")}</option>
              <option value="humus_rich">{t("soil_type.humus_rich")}</option>
              <option value="calcareous">{t("soil_type.calcareous")}</option>
              <option value="acidic">{t("soil_type.acidic")}</option>
            </select>
          </AiField>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_temp")}</div>
          <AiField fieldKey="frost_tolerance_min_c" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <input
              type="number"
              value={form.frost_tolerance_min_c}
              onChange={(e) => patch("frost_tolerance_min_c", e.target.value)}
              placeholder="-15"
              data-testid="field-temp"
              style={{ ...fieldInputStyle, ...aiInputStyle("frost_tolerance_min_c") }}
            />
          </AiField>
        </div>
      </div>

      {/* Frost protection */}
      <div style={{ marginBottom: "11px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-dark)" }}>
          <input
            type="checkbox"
            checked={form.temperature_protected}
            onChange={(e) => patch("temperature_protected", e.target.checked)}
            data-testid="field-frost"
            style={{ width: "16px", height: "16px", accentColor: "var(--green-mid)" }}
          />
          {t("edit.field_frost")}
        </label>
      </div>

      {/* Purchase date + price */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_purchase_date")}</div>
          <AiField fieldKey="purchase_date" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => patch("purchase_date", e.target.value)}
              data-testid="field-purchase-date"
              style={{ ...fieldInputStyle, ...aiInputStyle("purchase_date") }}
            />
          </AiField>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_purchase_price")}</div>
          <AiField fieldKey="purchase_price" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.purchase_price}
              onChange={(e) => patch("purchase_price", e.target.value)}
              placeholder="0.00"
              data-testid="field-purchase-price"
              style={{ ...fieldInputStyle, ...aiInputStyle("purchase_price") }}
            />
          </AiField>
        </div>
      </div>

      {/* Care notes */}
      <FieldRow label={t("edit.field_care_notes")}>
        <AiField fieldKey="care_notes" aiMarked={aiMarked} onRevertAiField={onRevertAiField}>
          <textarea
            value={form.care_notes}
            onChange={(e) => patch("care_notes", e.target.value)}
            placeholder={t("edit.ai_suggestions.care_notes_placeholder")}
            rows={3}
            data-testid="field-care-notes"
            style={{ ...fieldTextareaStyle, ...aiInputStyle("care_notes") }}
          />
        </AiField>
      </FieldRow>
    </div>
  );
}

// ── PositionenSection ─────────────────────────────────────────────────────────

interface PositionenSectionProps {
  positions:          PositionRow[];
  pickMode:           boolean;
  onPickModeChange:   (active: boolean) => void;
  onPositionsChange:  (rows: PositionRow[]) => void;
  t:                  TFunction<"plants">;
}

function PositionenSection({ positions, pickMode, onPickModeChange, onPositionsChange, t }: PositionenSectionProps) {
  function updateRow(idx: number, field: "x" | "y", raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    const clamped = Math.max(0, Math.min(100, v));
    onPositionsChange(positions.map((r, i) => i === idx ? { ...r, [field]: clamped } : r));
  }

  function deleteRow(idx: number) {
    onPositionsChange(positions.filter((_, i) => i !== idx));
  }

  function addRow() {
    onPositionsChange([...positions, { x: 50, y: 50 }]);
  }

  return (
    <div>
      {/* Hint */}
      <div style={{ fontSize: "11px", color: "var(--text-light)", marginBottom: "10px", lineHeight: 1.5 }}>
        {t("edit.positions.hint")}
      </div>

      {/* Pick-mode toggle */}
      <button
        type="button"
        data-testid="positions-pick-mode-btn"
        onClick={() => onPickModeChange(!pickMode)}
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "6px",
          background:     pickMode ? "var(--green-deep)" : "none",
          border:         pickMode ? "1.5px solid var(--green-deep)" : "1.5px dashed var(--border)",
          borderRadius:   "8px",
          padding:        "7px 12px",
          fontSize:       "12px",
          fontWeight:     500,
          fontFamily:     "var(--font-body)",
          color:          pickMode ? "white" : "var(--text-light)",
          cursor:         "pointer",
          width:          "100%",
          marginBottom:   "10px",
          transition:     "all .15s",
        }}
      >
        {pickMode ? t("edit.positions.pick_btn_active") : t("edit.positions.pick_btn_idle")}
      </button>

      {/* Position rows */}
      {positions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
          {positions.map((row, idx) => (
            <div
              key={idx}
              data-testid="position-row"
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "6px",
                background:   "var(--green-mist)",
                border:       "1.5px solid var(--border)",
                borderRadius: "8px",
                padding:      "7px 10px",
              }}
            >
              {/* Number label */}
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-light)", minWidth: "16px" }}>
                {idx + 1}
              </span>
              {/* X input */}
              <span style={{ fontSize: "11px", color: "var(--text-light)" }}>X</span>
              <input
                type="number"
                min={0} max={100} step={0.1}
                value={row.x}
                data-testid="position-x"
                onChange={(e) => updateRow(idx, "x", e.target.value)}
                style={{
                  flex: 1, background: "white", border: "1.5px solid var(--border)",
                  borderRadius: "6px", padding: "4px 6px", fontSize: "12px",
                  fontFamily: "var(--font-body)", color: "var(--text-dark)",
                  outline: "none", textAlign: "center", minWidth: 0,
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-light)" }}>%</span>
              <span style={{ fontSize: "12px", color: "var(--text-light)", margin: "0 2px" }}>·</span>
              {/* Y input */}
              <span style={{ fontSize: "11px", color: "var(--text-light)" }}>Y</span>
              <input
                type="number"
                min={0} max={100} step={0.1}
                value={row.y}
                data-testid="position-y"
                onChange={(e) => updateRow(idx, "y", e.target.value)}
                style={{
                  flex: 1, background: "white", border: "1.5px solid var(--border)",
                  borderRadius: "6px", padding: "4px 6px", fontSize: "12px",
                  fontFamily: "var(--font-body)", color: "var(--text-dark)",
                  outline: "none", textAlign: "center", minWidth: 0,
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-light)" }}>%</span>
              {/* Delete */}
              <button
                type="button"
                data-testid="position-delete"
                onClick={() => deleteRow(idx)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-light)", fontSize: "13px", lineHeight: 1,
                  padding: 0, flexShrink: 0,
                }}
                className="hover:text-red-warn"
                aria-label={t("edit.ai_suggestions.delete_position")}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        data-testid="positions-add-btn"
        onClick={addRow}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          background: "none", border: "1.5px dashed var(--border)", borderRadius: "8px",
          padding: "7px 12px", fontSize: "12px", fontWeight: 500,
          fontFamily: "var(--font-body)", color: "var(--text-light)",
          cursor: "pointer", width: "100%", transition: "all .15s",
        }}
        className="hover:border-green-mid hover:text-green-deep hover:bg-green-mist"
      >
        {t("edit.positions.add_btn")}
      </button>
    </div>
  );
}

// ── BilderSection ─────────────────────────────────────────────────────────────

const ATTACHMENT_CATEGORIES: AttachmentCategory[] = ["main", "bloom", "leaf", "problem", "invoice"];
const ATTACHMENT_ACCEPT = "image/png,image/jpeg,image/webp,application/pdf";

interface BilderSectionProps {
  rows:        AttachmentRow[];
  onRowsChange:(rows: AttachmentRow[]) => void;
  maxSizeMb:   number;
  t:           TFunction<"plants">;
}

function BilderSection({ rows, onRowsChange, maxSizeMb, t }: BilderSectionProps) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const dragIndexRef  = useRef<number | null>(null);
  const [insertBefore, setInsertBefore] = useState<number | null>(null);
  const [sizeError,    setSizeError]    = useState<string | null>(null);

  // ── drag handlers (same pattern as ColorPresetsSection) ──────────────────────

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid  = rect.top + rect.height / 2;
    setInsertBefore(e.clientY < mid ? index : index + 1);
  }

  function handleDragLeaveList() {
    setInsertBefore(null);
  }

  function handleDropOnList(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || insertBefore === null) {
      dragIndexRef.current = null;
      setInsertBefore(null);
      return;
    }
    const to = insertBefore > from ? insertBefore - 1 : insertBefore;
    dragIndexRef.current = null;
    setInsertBefore(null);
    if (from === to) return;
    const updated = [...rows];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onRowsChange(updated);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setInsertBefore(null);
  }

  // ── other handlers ────────────────────────────────────────────────────────────

  function categoryLabel(cat: AttachmentCategory | null): string {
    if (!cat) return "—";
    return (t as (k: string) => string)(`edit.attachments.category_${cat}`);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > maxSizeMb * 1024 * 1024) {
      setSizeError(t("edit.attachments.size_error"));
      return;
    }
    setSizeError(null);
    const isImage = file.type.startsWith("image/");
    const newRow: LocalAttachment = {
      _kind:      "local",
      localId:    crypto.randomUUID(),
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : "",
      category:   "main",
    };
    onRowsChange([...rows, newRow]);
  }

  function updateCategory(idx: number, cat: AttachmentCategory) {
    onRowsChange(rows.map((r, i) => i === idx ? { ...r, category: cat } : r));
  }

  async function handleDelete(idx: number) {
    const row = rows[idx];
    if (row._kind === "saved") {
      try {
        await apiClient.deleteAttachment(row.id);
      } catch {
        return;
      }
    } else {
      if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
    }
    onRowsChange(rows.filter((_, i) => i !== idx));
  }

  function thumbnailContent(row: AttachmentRow): React.ReactNode {
    if (row._kind === "saved") {
      if (row.attachment_type === "pdf") return <span style={{ fontSize: "24px" }}>📄</span>;
      return <img src={row.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />;
    }
    if (row.file.type === "application/pdf") return <span style={{ fontSize: "24px" }}>📄</span>;
    if (row.previewUrl) return <img src={row.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />;
    return <span style={{ fontSize: "24px" }}>📷</span>;
  }

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        style={{ display: "none" }}
        data-testid="attachment-file-input"
        onChange={handleFileChange}
      />

      {/* Size error */}
      {sizeError && (
        <div style={{ fontSize: "11px", color: "var(--red-warn)", marginBottom: "8px" }}>
          {sizeError}
        </div>
      )}

      {/* Sortable attachment rows */}
      {rows.length > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeaveList}
          onDrop={handleDropOnList}
          style={{ marginBottom: "10px" }}
        >
          {rows.map((row, idx) => (
            <div key={row._kind === "saved" ? row.id : row.localId}>
              {/* Insert-line ABOVE this item */}
              <AttachmentInsertLine
                visible={insertBefore === idx && dragIndexRef.current !== idx}
              />

              <div
                draggable
                data-testid="attachment-row"
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "8px",
                  background:   "var(--green-mist)",
                  border:       "1.5px solid var(--border)",
                  borderRadius: "8px",
                  padding:      "7px 10px",
                  marginBottom: "7px",
                  cursor:       "grab",
                }}
              >
                {/* Drag handle */}
                <span
                  style={{
                    color:      "var(--text-light)",
                    fontSize:   "14px",
                    cursor:     "grab",
                    flexShrink: 0,
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                  title={t("edit.ai_suggestions.drag_handle")}
                >
                  ⠿
                </span>

                {/* Thumbnail */}
                <div
                  style={{
                    width: "48px", height: "48px", borderRadius: "8px",
                    background: "white", border: "1.5px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, overflow: "hidden",
                  }}
                >
                  {thumbnailContent(row)}
                </div>

                {/* Category select */}
                <select
                  value={row.category ?? "main"}
                  data-testid="attachment-category"
                  onChange={(e) => updateCategory(idx, e.target.value as AttachmentCategory)}
                  style={{
                    flex: 1, background: "white", border: "1.5px solid var(--border)",
                    borderRadius: "6px", padding: "5px 8px", fontSize: "12px",
                    fontFamily: "var(--font-body)", color: "var(--text-dark)", outline: "none",
                  }}
                >
                  {ATTACHMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>

                {/* Badge for local (not yet uploaded) */}
                {row._kind === "local" && (
                  <span style={{
                    fontSize: "9px", fontWeight: 700,
                    background: "var(--blue-soft)", color: "var(--blue-mid)",
                    padding: "2px 5px", borderRadius: "4px", whiteSpace: "nowrap",
                  }}>
                    neu
                  </span>
                )}

                {/* Delete */}
                <button
                  type="button"
                  data-testid="attachment-delete"
                  onClick={() => void handleDelete(idx)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-light)", fontSize: "13px", lineHeight: 1,
                    padding: 0, flexShrink: 0,
                  }}
                  className="hover:text-red-warn"
                  aria-label={t("edit.ai_suggestions.delete_attachment")}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Insert-line AFTER the last item */}
          <AttachmentInsertLine
            visible={
              insertBefore === rows.length &&
              dragIndexRef.current !== rows.length - 1
            }
          />
        </div>
      )}

      {/* Hint */}
      <div style={{ fontSize: "11px", color: "var(--text-light)", marginBottom: "8px", lineHeight: 1.4 }}>
        {t("edit.attachments.hint")}
      </div>

      {/* Add button */}
      <button
        type="button"
        data-testid="attachment-add-btn"
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          background: "none", border: "1.5px dashed var(--border)", borderRadius: "8px",
          padding: "7px 12px", fontSize: "12px", fontWeight: 500,
          fontFamily: "var(--font-body)", color: "var(--text-light)",
          cursor: "pointer", width: "100%", transition: "all .15s",
        }}
        className="hover:border-green-mid hover:text-green-deep hover:bg-green-mist"
      >
        {t("edit.attachments.add_btn")}
      </button>
    </div>
  );
}

function AttachmentInsertLine({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      height: "2px", background: "var(--green-mid)",
      borderRadius: "2px", margin: "2px 0", position: "relative",
    }}>
      <div style={{
        position: "absolute", left: "-3px", top: "50%",
        transform: "translateY(-50%)",
        width: "8px", height: "8px", borderRadius: "50%",
        background: "var(--green-mid)",
      }} />
    </div>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "11px" }}>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
    </div>
  );
}

// ── ColorPopup ────────────────────────────────────────────────────────────────

interface ColorPopupProps {
  color:    string;
  presets:  ColorPreset[];
  onChange: (hex: string, name?: string) => void;
  onClose:  () => void;
}

function ColorPopup({ color, presets, onChange, onClose }: ColorPopupProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  // Sync hex text field when native picker changes
  function handleNativePicker(hex: string) {
    if (hexRef.current) hexRef.current.value = hex;
    onChange(hex);
  }

  // Validate and apply hex text field input
  function handleHexInput(v: string) {
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  }

  return (
    <div
      ref={ref}
      data-testid="color-popup"
      style={{
        position: "absolute", top: "26px", left: 0, zIndex: 200,
        background: "white", border: "1.5px solid var(--border)",
        borderRadius: "10px", padding: "10px",
        boxShadow: "var(--shadow-ga-lg)", minWidth: "240px",
      }}
    >
      {/* Preset swatches */}
      {presets.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 10px", marginBottom: "10px" }}>
          {presets.map((p) => (
            <button
              key={p.color + p.name}
              type="button"
              title={p.name}
              data-testid={`color-preset-${p.name}`}
              onClick={() => { onChange(p.color, p.name); onClose(); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: "24px", height: "24px", borderRadius: "4px",
                  border: p.color === color ? "2px solid var(--green-deep)" : "2px solid transparent",
                  boxShadow: p.color === color ? "0 0 0 2px var(--green-pale)" : "none",
                  background: p.color, display: "block", transition: "transform .12s",
                }}
                className="hover:scale-110"
              />
              <span style={{ fontSize: "9px", color: "var(--text-light)", whiteSpace: "nowrap", maxWidth: "40px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Custom color row: native picker + hex input */}
      <div style={{
        borderTop: presets.length > 0 ? "1px solid var(--border)" : "none",
        paddingTop: presets.length > 0 ? "8px" : 0,
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        <span style={{ fontSize: "10px", color: "var(--text-light)", fontWeight: 600, whiteSpace: "nowrap" }}>
          Eigene Farbe
        </span>
        {/* Native color picker — opens system color chooser */}
        <input
          type="color"
          value={color}
          data-testid="color-native-picker"
          onChange={(e) => handleNativePicker(e.target.value)}
          style={{
            width: "28px", height: "28px", padding: "1px",
            border: "1.5px solid var(--border)", borderRadius: "6px",
            cursor: "pointer", background: "none", flexShrink: 0,
          }}
          title="Farbe wählen"
        />
        {/* Hex text input — synced with native picker */}
        <input
          ref={hexRef}
          type="text"
          defaultValue={color}
          placeholder="#rrggbb"
          data-testid="color-hex-input"
          style={{
            flex: 1, border: "1.5px solid var(--border)", borderRadius: "6px",
            padding: "3px 6px", fontSize: "11px", fontFamily: "var(--font-body)",
            outline: "none", color: "var(--text-dark)",
          }}
          onInput={(e) => handleHexInput((e.target as HTMLInputElement).value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleHexInput((e.target as HTMLInputElement).value.trim());
              onClose();
            }
          }}
        />
      </div>
    </div>
  );
}

// ── ScheduleEntryRow ──────────────────────────────────────────────────────────

interface ScheduleEntryRowProps {
  row:        ScheduleRow;
  hasColor:   boolean;
  presets:    ColorPreset[];
  onChange:   (patch: Partial<ScheduleRow>) => void;
  onDelete:   () => void;
  t:          TFunction<"plants">;
}

function ScheduleEntryRow({ row, hasColor, presets, onChange, onDelete, t }: ScheduleEntryRowProps) {
  const { t: tc } = useTranslation("common");
  const [popupOpen, setPopupOpen] = useState(false);
  const colorWrapRef = useRef<HTMLDivElement>(null);

  const handleColorChange = useCallback((hex: string, name?: string) => {
    onChange({ color: hex });
    if (name !== undefined) {
      onChange({ color: hex, label: row.label.trim() === "" || isPresetName(row.label, presets) ? name : row.label });
    }
  }, [row.label, presets, onChange]);

  const isWrap    = row.startIdx > row.endIdx;
  const isAi      = row.aiAction !== undefined;
  const isRemoved = row.aiAction === "remove";

  // Styles that depend on AI state
  const cardBorder     = isAi ? "1.5px solid #e07b00" : "1.5px solid var(--border)";
  const cardBackground = isAi ? "#fff4e6" : "var(--green-mist)";
  const contentOpacity = isRemoved ? 0.45 : 1;
  const strikeStyle: React.CSSProperties = isRemoved
    ? { textDecoration: "line-through", textDecorationColor: "#e07b00" }
    : {};

  return (
    <div
      data-testid="schedule-entry"
      data-ai-action={row.aiAction}
      style={{
        background:    cardBackground,
        border:        cardBorder,
        borderRadius:  "10px",
        padding:       "10px 11px",
        display:       "flex",
        flexDirection: "column",
        gap:           "8px",
        opacity:       contentOpacity,
        transition:    "opacity .2s",
      }}
    >
      {/* Top row: [✦] color swatch | week range | [×/✕] */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

        {/* AI sparkle icon */}
        {isAi && (
          <span
            aria-hidden="true"
            title={isRemoved ? t("edit.ai_suggestions.row_remove") : t("edit.ai_suggestions.row_suggested")}
            style={{ fontSize: "11px", color: "#e07b00", flexShrink: 0 }}
          >
            ✦
          </span>
        )}

        {hasColor && !isRemoved && (
          <div ref={colorWrapRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              data-testid="color-swatch-btn"
              onClick={() => setPopupOpen((o) => !o)}
              style={{
                width: "22px", height: "22px", borderRadius: "5px",
                border: "2px solid rgba(0,0,0,.12)", cursor: "pointer",
                background: row.color, transition: "transform .15s",
              }}
              className="hover:scale-110"
              aria-label="Farbe wählen"
            />
            {popupOpen && (
              <ColorPopup
                color={row.color}
                presets={presets}
                onChange={handleColorChange}
                onClose={() => setPopupOpen(false)}
              />
            )}
          </div>
        )}

        {/* Week selects — shown as plain text when removed */}
        {isRemoved ? (
          <span style={{ fontSize: "11px", color: "#e07b00", ...strikeStyle }}>
            {WEEK_LABELS[row.startIdx]} → {WEEK_LABELS[row.endIdx]}
            {row.label ? ` · ${row.label}` : ""}
          </span>
        ) : (
          <>
            <select
              value={row.startIdx}
              data-testid="week-start"
              onChange={(e) => onChange({ startIdx: Number(e.target.value) })}
              style={weekSelectStyle}
            >
              {WEEK_LABELS.map((lbl, i) => (
                <option key={i} value={i}>{lbl}</option>
              ))}
            </select>

            <span style={{ fontSize: "11px", color: "var(--text-light)", flexShrink: 0 }}>
              {t("edit.schedule.week_arrow")}
            </span>

            <select
              value={row.endIdx}
              data-testid="week-end"
              onChange={(e) => onChange({ endIdx: Number(e.target.value) })}
              style={weekSelectStyle}
            >
              {WEEK_LABELS.map((lbl, i) => (
                <option key={i} value={i}>{lbl}</option>
              ))}
            </select>

            {isWrap && (
              <span
                data-testid="wrap-indicator"
                title={t("edit.schedule.wrap_hint")}
                style={{ fontSize: "11px", color: "var(--text-light)", flexShrink: 0 }}
              >
                ↻
              </span>
            )}
          </>
        )}

        {/* Delete / Revert button */}
        <button
          type="button"
          data-testid="schedule-entry-delete"
          onClick={onDelete}
          title={isAi ? t("edit.ai_suggestions.revert_title") : tc("actions.delete")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color:      isAi ? "#e07b00" : "var(--text-light)",
            fontSize:   "13px", lineHeight: 1, marginLeft: "auto",
            flexShrink: 0, padding: 0,
          }}
          className={isAi ? "" : "hover:text-red-warn"}
          aria-label={isAi ? t("edit.ai_suggestions.revert_aria") : tc("actions.delete")}
        >
          ✕
        </button>
      </div>

      {/* Label + Notes — hidden for "remove" rows (summary already shown above) */}
      {!isRemoved && (
        <>
          <input
            type="text"
            value={row.label}
            placeholder={t("edit.schedule.field_label_placeholder")}
            data-testid="schedule-label"
            onChange={(e) => onChange({ label: e.target.value })}
            style={{
              width: "100%", background: "white", border: "1.5px solid var(--border)",
              borderRadius: "6px", padding: "5px 8px", fontSize: "12px",
              fontFamily: "var(--font-body)", color: "var(--text-dark)", outline: "none",
              boxSizing: "border-box",
            }}
          />
          <textarea
            value={row.notes}
            placeholder={t("edit.schedule.field_notes_placeholder")}
            data-testid="schedule-notes"
            rows={2}
            onChange={(e) => onChange({ notes: e.target.value })}
            style={{
              width: "100%", background: "white", border: "1.5px solid var(--border)",
              borderRadius: "6px", padding: "5px 8px", fontSize: "12px",
              fontFamily: "var(--font-body)", color: "var(--text-dark)", outline: "none",
              resize: "vertical", minHeight: "48px", lineHeight: "1.5",
              boxSizing: "border-box",
            }}
          />
        </>
      )}
    </div>
  );
}

function isPresetName(label: string, presets: ColorPreset[]): boolean {
  return presets.some((p) => p.name === label.trim());
}

// ── ScheduleSection ───────────────────────────────────────────────────────────

interface ScheduleSectionProps {
  config:       ScheduleSectionConfig;
  rows:         ScheduleRow[];
  colorPresets: ColorPreset[];
  onAdd:        () => void;
  onChange:     (idx: number, patch: Partial<ScheduleRow>) => void;
  onDelete:     (idx: number) => void;
  t:            TFunction<"plants">;
}

function ScheduleSection({ config, rows, colorPresets, onAdd, onChange, onDelete, t }: ScheduleSectionProps) {
  const typePresets = colorPresets.filter((p) => p.schedule_type === config.type);
  // Auto-open the section when the AI has inserted or marked rows in it
  const hasAiRows = rows.some((r) => r.aiAction !== undefined);

  return (
    <EditSection
      title={(t as (k: string) => string)(`edit.schedule.${config.i18nSection}`)}
      accent={config.accent}
      count={rows.length}
      defaultOpen={hasAiRows}
      data-testid={`section-${config.type}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: rows.length > 0 ? "10px" : 0 }}>
        {rows.map((row, idx) => (
          <ScheduleEntryRow
            key={row.id}
            row={row}
            hasColor={config.hasColor}
            presets={typePresets}
            onChange={(patch) => onChange(idx, patch)}
            onDelete={() => onDelete(idx)}
            t={t}
          />
        ))}
      </div>
      <button
        type="button"
        data-testid={`add-schedule-${config.type}`}
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          background: "none", border: "1.5px dashed var(--border)", borderRadius: "8px",
          padding: "7px 12px", fontSize: "12px", fontWeight: 500,
          fontFamily: "var(--font-body)", color: "var(--text-light)",
          cursor: "pointer", width: "100%", transition: "all .15s",
        }}
        className="hover:border-green-mid hover:text-green-deep hover:bg-green-mist"
      >
        {(t as (k: string) => string)(`edit.schedule.${config.i18nAdd}`)}
      </button>
    </EditSection>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const fieldLabelStyle: React.CSSProperties = {
  fontSize:      "10px",
  fontWeight:    700,
  letterSpacing: ".6px",
  textTransform: "uppercase",
  color:         "var(--text-light)",
  marginBottom:  "5px",
};

const fieldInputStyle: React.CSSProperties = {
  width:        "100%",
  background:   "var(--green-mist)",
  border:       "1.5px solid var(--border)",
  borderRadius: "8px",
  padding:      "7px 11px",
  fontSize:     "13px",
  fontFamily:   "var(--font-body)",
  color:        "var(--text-dark)",
  outline:      "none",
};

const fieldSelectStyle: React.CSSProperties = {
  ...fieldInputStyle,
  cursor: "pointer",
};

const fieldTextareaStyle: React.CSSProperties = {
  ...fieldInputStyle,
  resize:     "vertical",
  minHeight:  "68px",
  lineHeight: "1.55",
};

const weekSelectStyle: React.CSSProperties = {
  background:   "white",
  border:       "1.5px solid var(--border)",
  borderRadius: "6px",
  padding:      "3px 4px",
  fontSize:     "11px",
  fontFamily:   "var(--font-body)",
  color:        "var(--text-dark)",
  outline:      "none",
  cursor:       "pointer",
  flex:         1,
  minWidth:     0,
};

const actionBtnStyle: React.CSSProperties = {
  height:         "32px",
  padding:        "0 18px",
  borderRadius:   "8px",
  fontSize:       "13px",
  fontWeight:     500,
  fontFamily:     "var(--font-body)",
  cursor:         "pointer",
  border:         "1.5px solid var(--border)",
  background:     "none",
  color:          "var(--text-mid)",
  flex:           1,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  gap:            "4px",
  whiteSpace:     "nowrap",
};
