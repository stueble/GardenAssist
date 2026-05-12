import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/SettingsSection";
import { SaveBar } from "@/components/SaveBar";
import { useSettings } from "@/hooks/useSettings";
import { useGardenPlan } from "@/hooks/useGardenPlan";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import type { Garden } from "@api/garden";
import { LocationSection }    from "@/components/settings/LocationSection";
import { ZonesSection }       from "@/components/settings/ZonesSection";
import { CategoriesSection }  from "@/components/settings/CategoriesSection";
import { AiSection }            from "@/components/settings/AiSection";
import { DataSection }          from "@/components/settings/DataSection";
import { GardenPlanSection }    from "@/components/settings/GardenPlanSection";
import { ColorPresetsSection }  from "@/components/settings/ColorPresetsSection";
import { LanguageSection }      from "@/components/settings/LanguageSection";
import { apiClient }          from "@/api/client";

interface SettingsViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function SettingsView({ garden, invalidateGarden }: SettingsViewProps) {
  const { t, i18n } = useTranslation("settings");
  const { form, dirty: settingsDirty, status, loading, error, updateForm, save: saveSettings, discard: discardSettings, onSaveRef } = useSettings();
  const plan = useGardenPlan();
  const assistantSettings = useAssistantSettings();

  // Report context to the shared AiPanel in App.tsx; clear on unmount
  useEffect(() => {
    if (garden) {
      setAssistantContext({ view: "settings", garden, settings: assistantSettings });
    }
  }, [garden, assistantSettings]);

  const dirty = settingsDirty || plan.dirty;

  // Wire up language sync: when settings are saved, apply the confirmed
  // language from the server response directly — no useEffect, no stale closure.
  useEffect(() => {
    onSaveRef.current = (updated) => {
      if (updated.language && updated.language !== i18n.language) {
        i18n.changeLanguage(updated.language);
        localStorage.setItem("ga_language", updated.language);
      }
    };
    return () => { onSaveRef.current = null; };
  }, [onSaveRef, i18n]);

  async function save() {
    // Run plan save and settings save in parallel; both must succeed
    await Promise.all([
      plan.dirty ? plan.save() : Promise.resolve(),
      saveSettings(),
    ]);
    // Notify App.tsx so DashboardView picks up the new plan_url
    if (plan.dirty) invalidateGarden();
  }

  function discard() {
    plan.discard();
    discardSettings();
  }

  async function handleExportBackup() {
    try {
      const blob = await apiClient.exportBackup();
      downloadBlob(blob, `gardenassist-export-${new Date().toISOString().split("T")[0]}.tar.gz`);
    } catch (err) {
      console.error("Export failed:", err);
      alert(t("data.export_error", { error: String(err) }));
    }
  }

  function handleImportBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".tar.gz";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const result = await apiClient.importBackup(file);
          if (result.skipped_count > 0) {
            alert(t("data.import_partial", { count: result.skipped_count, errors: result.skipped_errors.join("\n") }));
          } else {
            alert(t("data.import_success"));
          }
          window.location.reload();
        } catch (err) {
          console.error("Import failed:", err);
          alert(t("data.import_error", { error: String(err) }));
        }
      }
    };
    input.click();
  }

  async function handleExportCsv() {
    const blob = await apiClient.exportPlantsCsv();
    downloadBlob(blob, "plants.csv");
  }

  async function handleDeleteAll() {
    if (!confirm(t("data.delete_all_confirm1"))) return;
    if (!confirm(t("data.delete_all_confirm2"))) return;
    try {
      await apiClient.deleteAllData();
      alert(t("data.delete_all_success"));
      window.location.reload();
    } catch (err) {
      console.error("Delete all failed:", err);
      alert(t("data.delete_all_error", { error: String(err) }));
    }
  }

  async function handleInstallDefaults() {
    if (!confirm(t("data.install_defaults_confirm"))) return;
    try {
      await apiClient.installDefaults();
      alert(t("data.install_defaults_success"));
      window.location.reload();
    } catch (err) {
      console.error("Install defaults failed:", err);
      alert(t("data.install_defaults_error", { error: String(err) }));
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-cream">
        <span className="text-[13px] text-text-light">{t("settings_view.loading", { ns: "common" })}</span>
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
                {t("settings_view.backend_error", { ns: "common" })}
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

            {/* Daten & Backup */}
            <SettingsSection
              icon="💾"
              title={t("sections.data")}
              subtitle={t("section_subtitles.data")}
              defaultOpen={false}
            >
              <DataSection
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onExportCsv={handleExportCsv}
                onDeleteAll={handleDeleteAll}
                onInstallDefaults={handleInstallDefaults}
              />
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
              testId="language-section"
            >
              {form && <LanguageSection form={form} onChange={updateForm} />}
            </SettingsSection>

          </div>
        </div>

        <SaveBar dirty={dirty} status={status} onSave={() => void save()} onDiscard={discard} />
      </div>

      {/* AiPanel is rendered once in App.tsx — not here */}
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
