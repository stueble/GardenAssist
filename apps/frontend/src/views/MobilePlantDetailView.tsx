/**
 * MobilePlantDetailView — TASK-089
 *
 * Fullscreen mobile plant detail screen.
 * Layout: TopBar → PlantDetailContent (scrollable) → ChatPanel (in-flow) → BottomNav
 *
 * Accessed via /plants/:id. Back arrow returns to /plants.
 */

import { useState }        from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation }  from "react-i18next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import type { Garden }     from "@api/garden";
import { PlantDetailContent } from "@/components/PlantDetailPanel";
import { topBtnStyle, BottomNav, ChatPanel } from "@/components/mobile/MobileParts";

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({
  nameCommon,
  nameBotanical,
  onBack,
  onChatClick,
  chatOpen,
}: {
  nameCommon:    string;
  nameBotanical: string | null;
  onBack:        () => void;
  onChatClick:   () => void;
  chatOpen:      boolean;
}) {
  const { t } = useTranslation("plants");
  const { t: tc } = useTranslation("common");

  return (
    <div
      data-testid="mobile-plant-detail-topbar"
      style={{
        background:    "#2d4a2d",
        display:       "flex",
        alignItems:    "center",
        padding:       "0 10px",
        height:        "54px",
        gap:           "4px",
        flexShrink:    0,
        zIndex:        10,
      }}
    >
      {/* Back */}
      <button
        data-testid="mobile-plant-detail-back"
        aria-label={tc("mobile.settings_back")}
        onClick={onBack}
        style={topBtnStyle}
      >
        <ArrowLeft size={20} strokeWidth={1.5} />
      </button>

      {/* Plant name — centered, two lines */}
      <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
        <div style={{
          fontFamily:   "var(--font-display)",
          fontSize:     "16px",
          color:        "#fff",
          fontWeight:   600,
          lineHeight:   1.2,
          overflow:     "hidden",
          textOverflow: "ellipsis",
          whiteSpace:   "nowrap",
        }}>
          {nameCommon}
        </div>
        {nameBotanical && (
          <div style={{
            fontSize:     "11px",
            color:        "#c8dfc0",
            fontStyle:    "italic",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {nameBotanical}
          </div>
        )}
      </div>

      {/* Edit — stub (AC #3, full wiring in future task) */}
      <button
        data-testid="mobile-plant-detail-edit"
        aria-label={t("detail.btn_edit")}
        style={{ ...topBtnStyle, background: "rgba(255,255,255,.15)", fontSize: "16px" }}
      >
        ✏️
      </button>

      {/* Chat */}
      <button
        data-testid="mobile-plant-detail-chat"
        aria-label={tc("ai.panel_label")}
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

export interface MobilePlantDetailViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobilePlantDetailView({ garden }: MobilePlantDetailViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  const plant = garden?.plants.find((p) => p.id === id) ?? null;

  // Plant not found (garden still loading or invalid id) — show minimal placeholder
  if (!plant) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div style={{
          background: "#2d4a2d", height: "54px", flexShrink: 0,
          display: "flex", alignItems: "center", padding: "0 10px",
        }}>
          <button onClick={() => navigate("/plants")} style={topBtnStyle}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "13px", color: "var(--text-light)" }}>…</span>
        </div>
        <BottomNav activePath="/plants" />
      </div>
    );
  }

  return (
    <div
      data-testid="mobile-plant-detail-view"
      style={{
        display:       "flex",
        flexDirection: "column",
        flex:          1,
        minHeight:     0,
        overflow:      "hidden",
        background:    "#fff",
      }}
    >
      <TopBar
        nameCommon={plant.name_common}
        nameBotanical={plant.name_botanical}
        onBack={() => navigate("/plants")}
        onChatClick={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      {/* Scrollable content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <PlantDetailContent plant={plant} />
      </div>

      {/* In-flow chat panel — pushes content up */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/plants" />
    </div>
  );
}
