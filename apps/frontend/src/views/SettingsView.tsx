import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/SettingsSection";
import { SaveBar } from "@/components/SaveBar";
import { AiPanel } from "@/components/AiPanel";
import { useSettings } from "@/hooks/useSettings";
import { useGardenPlan } from "@/hooks/useGardenPlan";
import { LocationSection }    from "@/components/settings/LocationSection";
import { ZonesSection }       from "@/components/settings/ZonesSection";
import { CategoriesSection }  from "@/components/settings/CategoriesSection";
import { AiSection }            from "@/components/settings/AiSection";
import { DataSection }          from "@/components/settings/DataSection";
import { GardenPlanSection }    from "@/components/settings/GardenPlanSection";
import { ColorPresetsSection }  from "@/components/settings/ColorPresetsSection";
import { LanguageSection }      from "@/components/settings/LanguageSection";
import { apiClient }          from "@/api/client";

export function SettingsView() {
  const { t, i18n } = useTranslation("settings");
  const { form, dirty: settingsDirty, status, loading, error, updateForm, save: saveSettings, discard: discardSettings } = useSettings();
  const plan = useGardenPlan();

  const dirty = settingsDirty || plan.dirty;

  async function save() {
    // Run plan save and settings save in parallel; both must succeed
    await Promise.all([
      plan.dirty ? plan.save() : Promise.resolve(),
      saveSettings(),
    ]);
  }

  function discard() {
    plan.discard();
    discardSettings();
  }

  // Apply language whenever form.language changes (initial load or user selection).
  // The NavBar LanguageSwitcher has been removed, so there is no competing updater.
  useEffect(() => {
    if (form?.language && form.language !== i18n.language) {
      i18n.changeLanguage(form.language);
      localStorage.setItem("ga_language", form.language);
    }
  }, [form?.language, i18n]);

  async function handleExportJson() {
    const blob = await apiClient.exportJson();
    downloadBlob(blob, "gardenassist-export.json");
  }

  async function handleExportCsv() {
    const blob = await apiClient.exportPlantsCsv();
    downloadBlob(blob, "plants.csv");
  }

  function handleImportJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await apiClient.importJson(file);
    };
    input.click();
  }

  function handleDeleteAll() {
    if (confirm("Wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      // TODO: implement delete-all endpoint in future story
      alert("Noch nicht implementiert.");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-cream">
        <span className="text-[13px] text-text-light">Einstellungen werden geladen …</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-cream">

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0">

        <div className="flex-1 overflow-y-auto" style={{ padding: "28px 32px" }}>
          <div style={{ maxWidth: "860px" }}>

            {/* Backend error banner */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-soft border-[1.5px] border-red-warn text-[13px] text-red-warn">
                ⚠️ Backend nicht erreichbar — Änderungen können nicht gespeichert werden.
              </div>
            )}

            {/* Page title */}
            <div
              className="text-green-deep mb-[6px]"
              style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600 }}
            >
              ⚙️ {t("title")}
            </div>
            <div className="text-[13px] text-text-light mb-7">
              {t("subtitle")}
            </div>

            {/* Gartenplan */}
            <SettingsSection
              icon="🗺️"
              title={t("sections.garden_plan")}
              subtitle={t("section_subtitles.garden_plan")}
              defaultOpen={true}
            >
              <GardenPlanSection plan={plan} />
            </SettingsSection>

            {/* Standort */}
            <SettingsSection
              icon="📍"
              title={t("sections.location")}
              subtitle={t("section_subtitles.location")}
              defaultOpen={true}
            >
              {form && <LocationSection form={form} onChange={updateForm} />}
            </SettingsSection>

            {/* Bewässerungszonen */}
            <SettingsSection
              icon="💧"
              title={t("sections.irrigation_zones")}
              subtitle={t("section_subtitles.irrigation_zones")}
              defaultOpen={true}
            >
              {form && <ZonesSection form={form} onChange={updateForm} />}
            </SettingsSection>

            {/* Pflanzenkategorien */}
            <SettingsSection
              icon="📂"
              title={t("sections.plant_categories")}
              subtitle={t("section_subtitles.plant_categories")}
              defaultOpen={true}
            >
              {form && <CategoriesSection form={form} onChange={updateForm} />}
            </SettingsSection>

            {/* Farb-Presets */}
            <SettingsSection
              icon="🎨"
              title={t("sections.color_presets")}
              subtitle={t("section_subtitles.color_presets")}
              defaultOpen={true}
            >
              {form && <ColorPresetsSection form={form} onChange={updateForm} />}
            </SettingsSection>

            {/* KI-Assistent */}
            <SettingsSection
              icon="🤖"
              title={t("sections.ai")}
              subtitle={t("section_subtitles.ai")}
              defaultOpen={false}
            >
              {form && <AiSection form={form} onChange={updateForm} />}
            </SettingsSection>

            {/* Sprache */}
            <SettingsSection
              icon="🌐"
              title={t("sections.language")}
              subtitle={t("section_subtitles.language")}
              defaultOpen={false}
            >
              {form && <LanguageSection form={form} onChange={updateForm} />}
            </SettingsSection>

            {/* Daten & Backup */}
            <SettingsSection
              icon="💾"
              title={t("sections.data")}
              subtitle={t("section_subtitles.data")}
              defaultOpen={false}
            >
              <DataSection
                onExportJson={handleExportJson}
                onExportCsv={handleExportCsv}
                onImportJson={handleImportJson}
                onDeleteAll={handleDeleteAll}
              />
            </SettingsSection>

          </div>
        </div>

        <SaveBar dirty={dirty} status={status} onSave={() => void save()} onDiscard={discard} />
      </div>

      <AiPanel context={`⚙️ ${t("title")}`} />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
