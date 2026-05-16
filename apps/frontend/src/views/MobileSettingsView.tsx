/**
 * MobileSettingsView — mobile wrapper around SettingsView.
 *
 * Adds a top bar with a back button (← navigates to "/") and a title,
 * matching the pattern used by other mobile views (MobilePlanView, etc.).
 * The existing SettingsView is rendered below, scrollable.
 */

import { useNavigate }     from "react-router-dom";
import { useTranslation }  from "react-i18next";
import { ArrowLeft }       from "lucide-react";
import { SettingsView }    from "@/views/SettingsView";
import { topBtnStyle }     from "@/components/mobile/MobileParts";
import type { Garden }     from "@api/garden";

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div
      data-testid="mobile-settings-topbar"
      style={{
        background: "#2d4a2d",
        display:    "flex",
        alignItems: "center",
        padding:    "0 10px",
        height:     "44px",
        gap:        "4px",
        flexShrink: 0,
        zIndex:     10,
      }}
    >
      <button
        data-testid="mobile-settings-back"
        aria-label={t("mobile.settings_back")}
        onClick={onBack}
        style={topBtnStyle}
      >
        <ArrowLeft size={20} strokeWidth={1.5} />
      </button>

      <div style={{
        fontFamily: "var(--font-display)",
        fontSize:   "18px",
        color:      "#fff",
        fontWeight: 600,
        flex:       1,
      }}>
        {t("mobile.settings")}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobileSettingsViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobileSettingsView(props: MobileSettingsViewProps) {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <TopBar onBack={() => navigate("/")} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <SettingsView {...props} hideTitle compactPadding />
      </div>
    </div>
  );
}
