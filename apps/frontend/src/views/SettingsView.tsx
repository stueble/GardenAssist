import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/SettingsSection";
import { SaveBar } from "@/components/SaveBar";
import { AiPanel } from "@/components/AiPanel";

// Section definitions — icon + i18n key + defaultOpen
const SECTIONS = [
  { icon: "🗺️", key: "garden_plan",       defaultOpen: true  },
  { icon: "📍", key: "location",           defaultOpen: false },
  { icon: "💧", key: "irrigation_zones",   defaultOpen: false },
  { icon: "📂", key: "plant_categories",   defaultOpen: false },
  { icon: "🎨", key: "color_presets",      defaultOpen: false },
  { icon: "🤖", key: "ai",                 defaultOpen: false },
  { icon: "💾", key: "data",               defaultOpen: false },
] as const;

export function SettingsView() {
  const { t } = useTranslation("settings");
  const [dirty, setDirty] = useState(false);

  function handleSave() {
    // TODO: persist settings via API (future story)
    setDirty(false);
  }

  function handleDiscard() {
    // TODO: reset form state (future story)
    setDirty(false);
  }

  return (
    // ADR-006: Main → (no context dialog here) → Assistant panel
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Scrollable section list */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="max-w-[860px]">

            {/* Page title */}
            <div
              className="text-green-deep font-semibold mb-[6px]"
              style={{ fontFamily: "var(--font-display)", fontSize: "24px" }}
            >
              ⚙️ {t("title")}
            </div>
            <div className="text-[13px] text-text-light mb-7">
              {t("subtitle")}
            </div>

            {/* Sections */}
            {SECTIONS.map(({ icon, key, defaultOpen }) => (
              <SettingsSection
                key={key}
                icon={icon}
                title={t(`sections.${key}`)}
                defaultOpen={defaultOpen}
              >
                {/* Placeholder content — filled in future stories */}
                <p className="text-[13px] text-text-light">
                  {t(`sections.${key}`)} — Inhalt folgt.
                </p>
              </SettingsSection>
            ))}
          </div>
        </div>

        {/* Fixed save bar */}
        <SaveBar dirty={dirty} onSave={handleSave} onDiscard={handleDiscard} />
      </div>

      {/* ── AI Assistant panel (ADR-006: rightmost) ── */}
      <AiPanel context={`⚙️ ${t("title")}`} />
    </div>
  );
}
