/**
 * MobileSettingsView — mobile wrapper around SettingsView.
 *
 * Top bar: ← back button, title, chat button (MessageCircle).
 * ChatPanel slides in from below (same pattern as MobileTaskView),
 * shrinking the SettingsView scroll area.
 */

import { useState }        from "react";
import { useNavigate }     from "react-router-dom";
import { useTranslation }  from "react-i18next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SettingsView }    from "@/views/SettingsView";
import { topBtnStyle } from "@/components/mobile/MobileParts";
import { useAiPanelState } from "@/hooks/useAiPanelState";
import type { Garden }     from "@api/garden";

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({
  onBack,
  onChatClick,
  chatOpen,
}: {
  onBack:      () => void;
  onChatClick: () => void;
  chatOpen:    boolean;
}) {
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

      <button
        data-testid="mobile-settings-chat-btn"
        aria-label={t("ai.panel_label")}
        onClick={onChatClick}
        style={{
          ...topBtnStyle,
          background: chatOpen ? "rgba(255,255,255,.30)" : "rgba(255,255,255,.15)",
          position:   "relative",
        }}
      >
        <MessageCircle size={20} strokeWidth={1.5} />
        {!chatOpen && (
          <span style={{
            position:     "absolute",
            top:          "5px",
            right:        "5px",
            width:        "7px",
            height:       "7px",
            borderRadius: "50%",
            background:   "#7aab6a",
            border:       "1.5px solid #2d4a2d",
          }} />
        )}
      </button>
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
  const { open: chatOpen, setOpen: setChatOpen } = useAiPanelState();

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <TopBar
        onBack={() => navigate("/")}
        onChatClick={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
      />
      <SettingsView {...props} hideTitle compactPadding />

    </div>
  );
}
