/**
 * MobilePlanView — story-087 / story-090.
 *
 * Fullscreen interactive garden plan for mobile.
 * Reuses GardenPlanWidget (pan, pinch-zoom, pins, zoom buttons, legend)
 * and MobileParts (TopBar primitives, BottomNav, LeftDrawer, ChatPanel).
 *
 * Pin interaction (story-090):
 *   First tap  → confirmation chip above pin (emoji + name + status + next task)
 *   Chip tap   → navigate to MobilePlantDetailView (/plants/:id)
 *   Same pin   → navigate directly (chip already shown)
 *   Background → dismiss chip
 *   Other pin  → dismiss previous chip, show new chip
 *
 * Layout:
 *   TopBar → plan-area (flex 1, no padding) → ChatPanel (in-flow) → BottomNav
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle, Plus } from "lucide-react";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";
import { GardenPlanWidget, type PlanPin } from "@/components/GardenPlanWidget";
import { plantToPin } from "@/lib/plantToPin";
import { topBtnStyle, BottomNav, LeftDrawer, ChatPanel } from "@/components/mobile/MobileParts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PinEntry {
  pin:   PlanPin;
  plant: Plant;
}

interface ChipState {
  pinIdx:  number;
  plant:   Plant;
  pin:     PlanPin;
  /** Viewport clientX of the pin element centre — used to position the chip */
  x:       number;
  /** Viewport clientY of the pin element top — chip appears above this */
  y:       number;
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

      <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "#fff", fontWeight: 600, flex: 1 }}>
        {t("mobile.plan")}
      </div>

      {/* + button — gap before chat icon */}
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

// ── Pin chip — shown above tapped pin before navigation ───────────────────────

function PinChip({
  chip,
  onNavigate,
  onDismiss,
}: {
  chip:       ChipState;
  onNavigate: () => void;
  onDismiss:  () => void;
}) {
  const { pin } = chip;
  const hasTask = !!pin.tooltip?.nextTask;

  return (
    <>
      {/* Transparent backdrop — tap outside chip dismisses it */}
      <div
        data-testid="chip-backdrop"
        onClick={onDismiss}
        style={{
          position:      "fixed",
          inset:         0,
          zIndex:        9998,
          background:    "transparent",
          pointerEvents: "auto",
        }}
      />

      {/* Chip itself */}
      <div
        data-testid="pin-chip"
        onClick={(e) => { e.stopPropagation(); onNavigate(); }}
        style={{
          position:      "fixed",
          left:          chip.x,
          top:           chip.y - 10,
          transform:     "translate(-50%, -100%)",
          zIndex:        9999,
          background:    "var(--green-deep)",
          color:         "white",
          borderRadius:  "20px",
          padding:       "7px 12px",
          cursor:        "pointer",
          pointerEvents: "auto",
          whiteSpace:    "nowrap",
          boxShadow:     "0 4px 16px rgba(0,0,0,.3)",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           "3px",
          minWidth:      "120px",
          maxWidth:      "240px",
        }}
      >
        {/* Top row: emoji + name + optional status dot */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        "6px",
          fontWeight: 600,
          fontSize:   "13px",
          lineHeight: 1.2,
        }}>
          <span>{pin.emoji}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{pin.name}</span>
          {pin.taskStatus && (
            <span style={{
              width:        "8px",
              height:       "8px",
              borderRadius: "50%",
              flexShrink:   0,
              background:   pin.taskStatus === "overdue" ? "var(--red-warn)" : "var(--yellow-warn)",
              border:       "1.5px solid rgba(255,255,255,.5)",
            }} />
          )}
        </div>

        {/* Status label */}
        {pin.tooltip?.status && (
          <div style={{
            fontSize:  "11px",
            color:     "rgba(255,255,255,.75)",
            alignSelf: "flex-start",
          }}>
            {pin.tooltip.status}
          </div>
        )}

        {/* Next task */}
        {hasTask && (
          <div style={{
            fontSize:  "11px",
            color:     "#f5c0b8",
            fontWeight: 500,
            alignSelf: "flex-start",
          }}>
            {pin.tooltip!.nextTask}
          </div>
        )}

        {/* Arrow pointing down */}
        <div style={{
          position:           "absolute",
          top:                "100%",
          left:               "50%",
          transform:          "translateX(-50%)",
          border:             "5px solid transparent",
          borderTopColor:     "var(--green-deep)",
          borderBottom:       "none",
        }} />
      </div>
    </>
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
  const [chip,       setChip]       = useState<ChipState | null>(null);

  const navigate         = useNavigate();
  const { t: tPlants }   = useTranslation("plants");

  // Build pins — same logic as DashboardView (plantToPin) so rendering is identical:
  // halftransparent background, photo override, task-status dot, nextTask tooltip.
  const pinEntries: PinEntry[] = useMemo(() => {
    if (!garden) return [];
    const result: PinEntry[] = [];
    for (const plant of garden.plants) {
      for (let i = 0; i < plant.positions.length; i++) {
        const pin = plantToPin(plant, i, null);
        // Translate raw status key → display label (same pattern as DashboardView)
        if (pin.tooltip?.status) {
          pin.tooltip.status = tPlants(`status.${pin.tooltip.status}` as any);
        }
        result.push({ pin, plant });
      }
    }
    return result;
  }, [garden, tPlants]);

  // ── Pin interaction (AC #1–#4) ──────────────────────────────────────────────

  function handlePinClick(_pin: PlanPin, idx: number) {
    const entry = pinEntries[idx];
    if (!entry) return;

    // Same pin tapped again while chip is visible → navigate immediately (AC #2)
    if (chip?.pinIdx === idx) {
      navigate(`/plants/${entry.plant.id}`);
      return;
    }

    // Get viewport position of the pin element for chip placement
    const pinEl = document.querySelector<HTMLElement>(`[data-testid="plan-pin-${idx}"]`);
    const rect  = pinEl?.getBoundingClientRect();
    const x     = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2;
    const y     = rect ? rect.top                    : window.innerHeight  / 2;

    // First tap (or different pin) → show chip (AC #1, #4)
    setChip({ pinIdx: idx, plant: entry.plant, pin: entry.pin, x, y });
  }

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

      {/* Plan area — fills all space between TopBar and ChatPanel/BottomNav.
          display:flex is required so the widget's own flex:1 takes effect.
          Chip dismiss on background tap is handled by the chip's backdrop overlay. */}
      <div
        data-testid="mobile-plan-area"
        style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
      >
        <GardenPlanWidget
          planUrl={garden?.plan_url ?? null}
          pins={pinEntries.map((e) => e.pin)}
          legend={true}
          onPinClick={handlePinClick}
        />
      </div>

      {/* Confirmation chip — position:fixed so it escapes overflow:hidden (AC #1) */}
      {chip && (
        <PinChip
          chip={chip}
          onNavigate={() => navigate(`/plants/${chip.plant.id}`)}
          onDismiss={() => setChip(null)}
        />
      )}

      {/* In-flow chat panel */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/plan" />

      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
