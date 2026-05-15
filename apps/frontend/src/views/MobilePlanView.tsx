/**
 * MobilePlanView — story-087.
 *
 * Fullscreen interactive garden plan for mobile.
 * Reuses GardenPlanWidget (pan, pinch-zoom, pins, zoom buttons, legend)
 * and MobileParts (TopBar primitives, BottomNav, LeftDrawer, ChatPanel).
 *
 * Layout:
 *   TopBar → plan-area (flex 1, no padding) → ChatPanel (in-flow) → BottomNav
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle, Plus } from "lucide-react";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";
import { GardenPlanWidget, type PlanPin } from "@/components/GardenPlanWidget";
import { derivePlantStatus } from "@/lib/plantStatus";
import { topBtnStyle, BottomNav, LeftDrawer, ChatPanel } from "@/components/mobile/MobileParts";

// ── Pin color per task status (AC #3) ─────────────────────────────────────────

function pinColor(status: ReturnType<typeof derivePlantStatus>): string {
  if (status === "overdue") return "#c0392b";
  if (status === "due")     return "#d4850a";
  return "rgba(30,46,30,0.55)";  // semi-transparent dark green
}

/** Build a PlanPin for mobile — simplified vs. desktop (no tooltip content). */
function buildPin(plant: Plant, posIdx: number): PlanPin {
  const pos    = plant.positions[posIdx];
  const status = derivePlantStatus(plant);
  return {
    x:          pos.x_percent,
    y:          pos.y_percent,
    emoji:      plant.icon ?? "🌿",
    name:       plant.name_common,
    color:      pinColor(status),
    taskStatus: (status === "overdue" || status === "due") ? status : undefined,
    selected:   false,
    tooltip:    {
      status: status === "overdue" ? "Überfällig" : status === "due" ? "Aktuell" : "",
    },
  };
}

// ── TopBar — AC #1 ─────────────────────────────────────────────────────────────

function TopBar({
  chatOpen,
  onMenuClick,
  onChatClick,
}: {
  chatOpen:    boolean;
  onMenuClick: () => void;
  onChatClick: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      data-testid="mobile-plan-topbar"
      style={{
        background: "#2d4a2d",
        display:    "flex",
        alignItems: "center",
        padding:    "0 10px",
        height:     "44px",
        gap:        "4px",
        flexShrink: 0,
        zIndex:     10,
        position:   "relative",
      }}
    >
      <button
        data-testid="mobile-plan-hamburger"
        aria-label="Menü öffnen"
        onClick={onMenuClick}
        style={topBtnStyle}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#fff", fontWeight: 600, flex: 1 }}>
        {t("mobile.plan")}
      </div>

      {/* + button — gap before chat icon (AC #1) */}
      <button
        data-testid="mobile-plan-add-btn"
        aria-label="Neue Pflanze"
        style={{ ...topBtnStyle, background: "rgba(255,255,255,.15)", marginLeft: "2px" }}
      >
        <Plus size={20} strokeWidth={1.5} />
      </button>

      {/* Chat button */}
      <button
        data-testid="mobile-plan-chat-btn"
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
            position: "absolute", top: "5px", right: "5px",
            width: "7px", height: "7px", borderRadius: "50%",
            background: "#7aab6a", border: "1.5px solid #2d4a2d",
          }} />
        )}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobilePlanViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobilePlanView({ garden }: MobilePlanViewProps) {
  const [chatOpen,   setChatOpen]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Build pins from all plant positions
  const pins: PlanPin[] = useMemo(() => {
    if (!garden) return [];
    const result: PlanPin[] = [];
    for (const plant of garden.plants) {
      for (let i = 0; i < plant.positions.length; i++) {
        result.push(buildPin(plant, i));
      }
    }
    return result;
  }, [garden]);

  return (
    <div
      data-testid="mobile-plan-view"
      style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100%",
        overflow:      "hidden",
        position:      "relative",
      }}
    >
      <TopBar
        chatOpen={chatOpen}
        onMenuClick={() => setDrawerOpen(true)}
        onChatClick={() => setChatOpen((v) => !v)}
      />

      {/* Plan area — fills all space between TopBar and ChatPanel/BottomNav (AC #2) */}
      <div
        data-testid="mobile-plan-area"
        style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}
      >
        <GardenPlanWidget
          planUrl={garden?.plan_url ?? null}
          pins={pins}
          legend={true}
        />
      </div>

      {/* In-flow chat panel — AC #8 */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/plan" />

      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
