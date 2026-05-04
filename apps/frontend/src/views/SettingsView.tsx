import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/SettingsSection";
import { SaveBar } from "@/components/SaveBar";
import { AiPanel } from "@/components/AiPanel";

// Section definitions — icon + i18n key
// All open by default, matching the mockup
const SECTIONS = [
  { icon: "🗺️", key: "garden_plan"     },
  { icon: "📍", key: "location"         },
  { icon: "💧", key: "irrigation_zones" },
  { icon: "📂", key: "plant_categories" },
  { icon: "🎨", key: "color_presets"    },
  { icon: "🤖", key: "ai"              },
  { icon: "💾", key: "data"            },
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
    // ADR-006: Main → (no context dialog) → Assistant panel
    // Background: cream (#f8f4ee) matching mockup body background
    <div className="flex flex-1 min-h-0 overflow-hidden bg-cream">

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Scrollable section list — mockup: padding 28px 32px, max-width 860px */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "28px 32px" }}>
          <div style={{ maxWidth: "860px" }}>

            {/* Page title — mockup: Playfair Display 24px 600, color green-deep */}
            <div
              className="text-green-deep mb-[6px]"
              style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 600 }}
            >
              ⚙️ {t("title")}
            </div>

            {/* Subtitle — mockup: 13px text-light, margin-bottom 28px */}
            <div className="text-[13px] text-text-light mb-7">
              {t("subtitle")}
            </div>

            {/* Sections — all open by default (matching mockup) */}
            {SECTIONS.map(({ icon, key }) => (
              <SettingsSection
                key={key}
                icon={icon}
                title={t(`sections.${key}`)}
                subtitle={t(`section_subtitles.${key}`)}
                defaultOpen={true}
              >
                {/* Placeholder — filled in future stories */}
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
