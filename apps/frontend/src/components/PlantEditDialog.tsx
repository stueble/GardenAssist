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

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Plant } from "@api/plant";
import type { Schedule, ScheduleType } from "@api/schedule";
import type { ColorPreset } from "@api/color-preset";
import type { PlantInput } from "@api/api";
import { apiClient } from "@/api/client";

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
    positions:               [],
    attachments:             [],
    schedules:               [],
    thumbnail_attachment_id: null,
  };
}

// ── Position row type ─────────────────────────────────────────────────────────

export type PositionRow = { x: number; y: number };

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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlantEditDialog({
  plant, onClose, onSaved,
  positions, onPositionsChange, initialPositions,
  pickMode, onPickModeChange,
}: PlantEditDialogProps) {
  const { t } = useTranslation("plants");

  const [form,         setForm]         = useState<EditForm>(() => plantToForm(plant));
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [iconManual,    setIconManual]    = useState(!!plant?.icon);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [categories,    setCategories]    = useState<string[]>([]);
  const [zones,         setZones]         = useState<string[]>([]);
  const [nameError,     setNameError]     = useState(false);
  const [scheduleRows,  setScheduleRows]  = useState<ScheduleRow[]>(() => schedulesToRows(plant?.schedules ?? []));
  const [colorPresets,  setColorPresets]  = useState<ColorPreset[]>([]);

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
    setScheduleRows((prev) => prev.filter((_, i) => i !== idx));
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
    JSON.stringify(positions) !== JSON.stringify(initialPositions);

  function handleClose() {
    if (dirty && !confirm(t("edit.unsaved_confirm"))) return;
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
    try {
      const input: ReturnType<typeof formToInput> = {
        ...formToInput(form),
        schedules:  rowsToScheduleInputs(scheduleRows),
        positions:  positions.map((r) => ({ x_percent: r.x, y_percent: r.y })),
      };
      const saved = plant
        ? await apiClient.updatePlant(plant.id, input)
        : await apiClient.createPlant(input);
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
          aria-label="Dialog schließen"
          data-testid="edit-close"
        >
          ✕
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* Error banner */}
        {error && (
          <div style={{ margin: "12px 16px 0", padding: "8px 12px", borderRadius: "8px", background: "var(--red-soft)", border: "1px solid var(--red-warn)", fontSize: "12px", color: "var(--red-warn)" }}>
            {error}
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
            t={t}
          />
        </EditSection>

        {/* Placeholder sections for later stories */}
        <EditSection title="Bilder" accent="#4a78c0" />

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
}

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

// ── GrunddatenFields ──────────────────────────────────────────────────────────

interface GrunddatenProps {
  form:           EditForm;
  patch:          (key: keyof EditForm, value: string | boolean) => void;
  pickerOpen:     boolean;
  setPickerOpen:  (v: boolean) => void;
  iconManual:     boolean;
  setIconManual:  (v: boolean) => void;
  categories:     string[];
  zones:          string[];
  nameError:      boolean;
  t:              TFunction<"plants">;
}

function GrunddatenFields({
  form, patch, pickerOpen, setPickerOpen,
  iconManual, setIconManual, categories, zones, nameError, t,
}: GrunddatenProps) {

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
            aria-label="Icon ändern"
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
                Auto-Vorschlag
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
          <input
            type="text"
            value={form.name_common}
            onChange={(e) => patch("name_common", e.target.value)}
            placeholder="z.B. Rote Rose"
            data-testid="field-name"
            style={{
              ...fieldInputStyle,
              borderColor: nameError ? "var(--red-warn)" : undefined,
            }}
          />
          {nameError && <div style={{ fontSize: "10px", color: "var(--red-warn)", marginTop: "3px" }}>{t("edit.name_required")}</div>}
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_botanical")}</div>
          <input
            type="text"
            value={form.name_botanical}
            onChange={(e) => patch("name_botanical", e.target.value)}
            placeholder="z.B. Rosa"
            data-testid="field-botanical"
            style={fieldInputStyle}
          />
        </div>
      </div>

      {/* Description */}
      <FieldRow label={t("edit.field_description")}>
        <textarea
          value={form.description}
          onChange={(e) => patch("description", e.target.value)}
          placeholder="Beschreibung der Pflanze …"
          rows={3}
          data-testid="field-description"
          style={fieldTextareaStyle}
        />
      </FieldRow>

      {/* Category (AC #5 — from Settings) + Origin (AC #4 — from i18n) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_category")}</div>
          <select
            value={form.category}
            onChange={(e) => patch("category", e.target.value)}
            data-testid="field-category"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_origin")}</div>
          <select
            value={form.origin_type}
            onChange={(e) => patch("origin_type", e.target.value)}
            data-testid="field-origin"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            <option value="native">{t("origin_type.native")}</option>
            <option value="neophyte">{t("origin_type.neophyte")}</option>
            <option value="invasive_neophyte">{t("origin_type.invasive_neophyte")}</option>
          </select>
        </div>
      </div>

      {/* Lifecycle + Health */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_lifecycle")}</div>
          <select
            value={form.lifecycle}
            onChange={(e) => patch("lifecycle", e.target.value)}
            data-testid="field-lifecycle"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            <option value="annual">{t("lifecycle.annual")}</option>
            <option value="biennial">{t("lifecycle.biennial")}</option>
            <option value="perennial">{t("lifecycle.perennial")}</option>
            <option value="evergreen">{t("lifecycle.evergreen")}</option>
          </select>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_health")}</div>
          <select
            value={form.health_status}
            onChange={(e) => patch("health_status", e.target.value)}
            data-testid="field-health"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            <option value="good">{t("health_status.good")}</option>
            <option value="watch">{t("health_status.watch")}</option>
            <option value="needs_treatment">{t("health_status.needs_treatment")}</option>
          </select>
        </div>
      </div>

      {/* Location + Watering zone (AC #5 — from Settings) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_location")}</div>
          <input
            type="text"
            value={form.location}
            onChange={(e) => patch("location", e.target.value)}
            placeholder="z.B. Westbeet"
            data-testid="field-location"
            style={fieldInputStyle}
          />
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_watering")}</div>
          <select
            value={form.watering_zone}
            onChange={(e) => patch("watering_zone", e.target.value)}
            data-testid="field-watering"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            {zones.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
      </div>

      {/* Sun + Water demand (AC #4) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_sun")}</div>
          <select
            value={form.sun_demand}
            onChange={(e) => patch("sun_demand", e.target.value)}
            data-testid="field-sun"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            <option value="sunny">{t("sun_demand.sunny")}</option>
            <option value="partial_shade">{t("sun_demand.partial_shade")}</option>
            <option value="shady">{t("sun_demand.shady")}</option>
          </select>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_water")}</div>
          <select
            value={form.water_demand}
            onChange={(e) => patch("water_demand", e.target.value)}
            data-testid="field-water"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            <option value="low">{t("water_demand.low")}</option>
            <option value="medium">{t("water_demand.medium")}</option>
            <option value="high">{t("water_demand.high")}</option>
          </select>
        </div>
      </div>

      {/* Soil type + Min temp (AC #4) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "11px" }}>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_soil")}</div>
          <select
            value={form.soil_type}
            onChange={(e) => patch("soil_type", e.target.value)}
            data-testid="field-soil"
            style={fieldSelectStyle}
          >
            <option value="">{t("edit.select_none")}</option>
            <option value="loamy">{t("soil_type.loamy")}</option>
            <option value="sandy">{t("soil_type.sandy")}</option>
            <option value="humus_rich">{t("soil_type.humus_rich")}</option>
            <option value="calcareous">{t("soil_type.calcareous")}</option>
            <option value="acidic">{t("soil_type.acidic")}</option>
          </select>
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_temp")}</div>
          <input
            type="number"
            value={form.frost_tolerance_min_c}
            onChange={(e) => patch("frost_tolerance_min_c", e.target.value)}
            placeholder="-15"
            data-testid="field-temp"
            style={fieldInputStyle}
          />
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
          <input
            type="date"
            value={form.purchase_date}
            onChange={(e) => patch("purchase_date", e.target.value)}
            data-testid="field-purchase-date"
            style={fieldInputStyle}
          />
        </div>
        <div>
          <div style={fieldLabelStyle}>{t("edit.field_purchase_price")}</div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.purchase_price}
            onChange={(e) => patch("purchase_price", e.target.value)}
            placeholder="0.00"
            data-testid="field-purchase-price"
            style={fieldInputStyle}
          />
        </div>
      </div>

      {/* Care notes */}
      <FieldRow label={t("edit.field_care_notes")}>
        <textarea
          value={form.care_notes}
          onChange={(e) => patch("care_notes", e.target.value)}
          placeholder="Pflegehinweise, Besonderheiten …"
          rows={3}
          data-testid="field-care-notes"
          style={fieldTextareaStyle}
        />
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
                aria-label="Position löschen"
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
  const [popupOpen, setPopupOpen] = useState(false);
  const colorWrapRef = useRef<HTMLDivElement>(null);

  const handleColorChange = useCallback((hex: string, name?: string) => {
    onChange({ color: hex });
    // Auto-fill label for bloom if empty or matches a preset name
    if (name !== undefined) {
      onChange({ color: hex, label: row.label.trim() === "" || isPresetName(row.label, presets) ? name : row.label });
    }
  }, [row.label, presets, onChange]);

  const isWrap = row.startIdx > row.endIdx;

  return (
    <div
      data-testid="schedule-entry"
      style={{
        background: "var(--green-mist)", border: "1.5px solid var(--border)",
        borderRadius: "10px", padding: "10px 11px", display: "flex", flexDirection: "column", gap: "8px",
      }}
    >
      {/* Top row: color swatch | week range | delete */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {hasColor && (
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

        {/* Week selects */}
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

        {/* Year-wrap indicator (AC #4) */}
        {isWrap && (
          <span
            data-testid="wrap-indicator"
            title={t("edit.schedule.wrap_hint")}
            style={{ fontSize: "11px", color: "var(--text-light)", flexShrink: 0 }}
          >
            ↻
          </span>
        )}

        {/* Delete */}
        <button
          type="button"
          data-testid="schedule-entry-delete"
          onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", fontSize: "13px", lineHeight: 1, marginLeft: "auto", flexShrink: 0, padding: 0 }}
          className="hover:text-red-warn"
          aria-label="Eintrag löschen"
        >
          ✕
        </button>
      </div>

      {/* Label + Notes */}
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

  return (
    <EditSection
      title={(t as (k: string) => string)(`edit.schedule.${config.i18nSection}`)}
      accent={config.accent}
      count={rows.length}
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
