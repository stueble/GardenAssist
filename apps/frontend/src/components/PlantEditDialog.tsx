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

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Plant } from "@api/plant";
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

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PlantEditDialogProps {
  /** null = new plant, Plant = edit existing */
  plant:    Plant | null;
  onClose:  () => void;
  onSaved:  (plant: Plant) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlantEditDialog({ plant, onClose, onSaved }: PlantEditDialogProps) {
  const { t } = useTranslation("plants");

  const [form,         setForm]         = useState<EditForm>(() => plantToForm(plant));
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [iconManual,   setIconManual]   = useState(!!plant?.icon);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [categories,   setCategories]   = useState<string[]>([]);
  const [zones,        setZones]        = useState<string[]>([]);
  const [nameError,    setNameError]    = useState(false);

  // Load settings for category + zone dropdowns (AC #5)
  useEffect(() => {
    apiClient.getSettings().then((s) => {
      setCategories(s.plant_categories);
      setZones(s.irrigation_zones);
    }).catch(() => {});
  }, []);

  // Auto-update icon when category changes, unless manually overridden (AC #3)
  useEffect(() => {
    if (!iconManual) {
      setForm((f) => ({ ...f, icon: autoIcon(f.category) }));
    }
  }, [form.category, iconManual]);

  const dirty = JSON.stringify(form) !== JSON.stringify(plantToForm(plant));

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
      const input = formToInput(form);
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
        <EditSection title="Bilder"        accent="#4a78c0" />
        <EditSection title="Positionen"    accent="#8b6f47" />
        <EditSection title="Blütezeiten"   accent="#c0392b" />
        <EditSection title="Wachstum"      accent="#2e7d32" />
        <EditSection title="Blätter"       accent="#1b5e20" />
        <EditSection title="Schnittzeiten" accent="#27ae60" />
        <EditSection title="Düngezeiten"   accent="#2980b9" />
        <EditSection title="Sonstiges"     accent="#7f8c8d" />

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
          {t("edit.btn_cancel")}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ ...actionBtnStyle, background: "var(--green-deep)", color: "white", borderColor: "var(--green-deep)" }}
          data-testid="edit-save"
        >
          {saving ? "⏳ …" : t("edit.btn_save")}
        </button>
      </div>
    </>
  );
}

// ── EditSection ───────────────────────────────────────────────────────────────

interface EditSectionProps {
  title:       string;
  accent:      string;
  defaultOpen?: boolean;
  children?:   React.ReactNode;
}

function EditSection({ title, accent, defaultOpen = false, children }: EditSectionProps) {
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
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", color: "var(--text-light)", flex: 1 }}>
          {title}
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

// ── FieldRow ──────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "11px" }}>
      <div style={fieldLabelStyle}>{label}</div>
      {children}
    </div>
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

const actionBtnStyle: React.CSSProperties = {
  height:       "32px",
  padding:      "0 18px",
  borderRadius: "8px",
  fontSize:     "13px",
  fontWeight:   500,
  fontFamily:   "var(--font-body)",
  cursor:       "pointer",
  border:       "1.5px solid var(--border)",
  background:   "none",
  color:        "var(--text-mid)",
  flex:         1,
};
