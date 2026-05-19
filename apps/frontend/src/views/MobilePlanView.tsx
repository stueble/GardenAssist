/**
 * MobilePlanView — story-087 / story-090 / story-094.
 *
 * Fullscreen interactive garden plan for mobile.
 * Reuses GardenPlanWidget (pan, pinch-zoom, pins, zoom buttons, legend)
 * and MobileParts (TopBar primitives, BottomNav, LeftDrawer, ChatPanel).
 *
 * Pin interaction (story-094 — replaces story-090 PinChip):
 *   First tap on pin → peek snap-sheet from bottom (~25vh)
 *     Sheet header: emoji + plant name + botanical name + edit button + close button
 *     Sheet body:   PlantDetailContent (overflow:hidden — shows description + images)
 *   Swipe up on sheet → expanded state (~85vh, PlantDetailContent fully scrollable)
 *   Swipe down on expanded → back to peek
 *   Swipe down on peek → dismiss
 *   Tap map area (outside sheet) → dismiss
 *   Tap different pin → dismiss current sheet, open new peek for new pin
 *   Edit button → navigate to /plants/:id/edit
 *
 * Layout:
 *   TopBar → plan-area (flex 1, no padding) → ChatPanel (in-flow) → BottomNav
 *   PlanSnapSheet rendered as position:fixed overlay (escapes overflow:hidden)
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle, Plus, Pencil, X } from "lucide-react";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";
import { GardenPlanWidget, type PlanPin } from "@/components/GardenPlanWidget";
import { PlantDetailContent } from "@/components/PlantDetailPanel";
import { plantToPin } from "@/lib/plantToPin";
import { topBtnStyle, BottomNav, LeftDrawer, MOBILE_CHAT_HEIGHT } from "@/components/mobile/MobileParts";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { useAiPanelState } from "@/hooks/useAiPanelState";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PinEntry {
  pin:   PlanPin;
  plant: Plant;
}

type SheetMode = "peek" | "expanded";

interface SheetState {
  plant: Plant;
  pin:   PlanPin;
  mode:  SheetMode;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// When ChatPanel is open (--mobile-chat-height = 210px), the expanded sheet
// shrinks by the same amount so the map strip above remains always visible.
const EXPANDED_HEIGHT = "calc(90vh - var(--mobile-chat-height, 0px))";
/** Minimum swipe distance (px) to trigger a mode transition */
const SWIPE_THRESHOLD = 50;

/**
 * Peek height in px — tall enough to fully show description + image slots
 * in PlantDetailContent without overflow.
 */
const PEEK_HEIGHT_PX = 420;

// ── TopBar ────────────────────────────────────────────────────────────────────

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

      {/* + button */}
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

// ── PlanSnapSheet ─────────────────────────────────────────────────────────────

function PlanSnapSheet({
  sheet,
  onExpand,
  onPeek,
  onDismiss,
  onEdit,
  invalidateGarden,
}: {
  sheet:            SheetState;
  onExpand:         () => void;
  onPeek:           () => void;
  onDismiss:        () => void;
  onEdit:           () => void;
  invalidateGarden: () => void;
}) {
  const { plant, pin, mode } = sheet;

  // ── Slide-in animation: start off-screen, animate to visible after mount ──
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Swipe gesture via pointer events on the drag handle ───────────────────
  const dragStartY = useRef<number | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    // setPointerCapture keeps events flowing even if pointer leaves the element
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* JSDOM stub */ }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY; // positive = swipe up
    dragStartY.current = null;

    if (delta > SWIPE_THRESHOLD) {
      // Swipe up
      if (mode === "peek") onExpand();
    } else if (delta < -SWIPE_THRESHOLD) {
      // Swipe down
      if (mode === "expanded") onPeek();
      else onDismiss();
    }
  }

  return (
    <>
      {/* Sheet — no backdrop div so pin clicks (stopPropagation in widget)
          never get intercepted. Dismiss via X-button, swipe-down, or
          mobile-plan-area onClick. */}
      <div
        data-testid="plan-snap-sheet"
        data-mode={mode}
        onClick={(e) => e.stopPropagation()}
        style={{
          position:      "fixed",
          bottom:        "var(--mobile-chat-height, 0px)",
          left:          0,
          right:         0,
          height:        mode === "peek" ? `${PEEK_HEIGHT_PX}px` : EXPANDED_HEIGHT,
          transform:     visible ? "translateY(0)" : "translateY(100%)",
          transition:    "transform .3s cubic-bezier(.4,0,.2,1), height .3s cubic-bezier(.4,0,.2,1), bottom .25s ease",
          background:    "var(--warm-white)",
          borderRadius:  "14px 14px 0 0",
          boxShadow:     "0 -4px 24px rgba(0,0,0,.18)",
          zIndex:        101,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        {/* Drag handle */}
        <div
          data-testid="sheet-drag-handle"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          style={{
            flexShrink:     0,
            display:        "flex",
            justifyContent: "center",
            alignItems:     "center",
            height:         "20px",
            cursor:         "grab",
            touchAction:    "none",
          }}
        >
          <div style={{
            width:        "36px",
            height:       "4px",
            borderRadius: "2px",
            background:   "#d0d0d0",
          }} />
        </div>

        {/* Sheet header: emoji + names + edit + close */}
        <div
          data-testid="sheet-header"
          style={{
            flexShrink:    0,
            display:       "flex",
            alignItems:    "flex-start",
            gap:           "10px",
            padding:       "0 14px 10px",
            borderBottom:  "1px solid var(--border)",
          }}
        >
          {/* Emoji */}
          <span style={{ fontSize: "28px", lineHeight: 1, marginTop: "2px", flexShrink: 0 }}>
            {pin.emoji}
          </span>

          {/* Names */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily:   "var(--font-display)",
              fontSize:     "16px",
              fontWeight:   600,
              color:        "var(--text-dark)",
              lineHeight:   1.2,
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}>
              {plant.name_common}
            </div>
            {plant.name_botanical && (
              <div style={{
                fontSize:     "12px",
                color:        "var(--text-light)",
                fontStyle:    "italic",
                overflow:     "hidden",
                textOverflow: "ellipsis",
                whiteSpace:   "nowrap",
                marginTop:    "2px",
              }}>
                {plant.name_botanical}
              </div>
            )}
          </div>

          {/* Edit button */}
          <button
            data-testid="sheet-edit-btn"
            aria-label="Pflanze bearbeiten"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{
              ...topBtnStyle,
              color:      "var(--green-deep)",
              flexShrink: 0,
              marginTop:  "-2px",
            }}
          >
            <Pencil size={17} strokeWidth={1.8} />
          </button>

          {/* Close button */}
          <button
            data-testid="sheet-close-btn"
            aria-label="Schließen"
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            style={{
              ...topBtnStyle,
              color:      "var(--text-light)",
              flexShrink: 0,
              marginTop:  "-2px",
            }}
          >
            <X size={17} strokeWidth={1.8} />
          </button>
        </div>

        {/* Plant detail content — overflow:hidden in peek (shows partial content),
            overflow:auto in expanded (fully scrollable) */}
        <div
          data-testid="sheet-content"
          style={{
            flex:       1,
            minHeight:  0,
            overflowY:  "auto",
          }}
        >
          <PlantDetailContent
            plant={plant}
            onDelete={() => { invalidateGarden(); onDismiss(); }}
          />
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface MobilePlanViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobilePlanView({ garden, invalidateGarden }: MobilePlanViewProps) {
  const { open: chatOpen, setOpen: setChatOpen } = useAiPanelState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheet,      setSheet]      = useState<SheetState | null>(null);

  const navigate           = useNavigate();
  const { t: tPlants }     = useTranslation("plants");
  const assistantSettings  = useAssistantSettings();

  // Publish assistant context — selected plant from the open snap-sheet
  useEffect(() => {
    setAssistantContext(
      garden
        ? { view: "dashboard", garden, selectedPlant: sheet?.plant ?? undefined, settings: assistantSettings }
        : undefined
    );
  }, [garden, sheet?.plant, assistantSettings]);

  // Compute how much the plan area needs to shrink when the ChatPanel opens.
  // ChatPanel is position:fixed and overlaps BottomNav (which stays in-flow).
  // The plan should only shrink by the portion of the ChatPanel that sticks
  // out above the BottomNav: max(0, chatHeight - navHeight).
  useEffect(() => {
    const navEl = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav"]');
    const navH  = navEl ? navEl.getBoundingClientRect().height : 56;
    const offset = chatOpen ? Math.max(0, MOBILE_CHAT_HEIGHT - navH) : 0;
    document.documentElement.style.setProperty(
      "--mobile-chat-plan-offset",
      `${offset}px`,
    );
    return () => {
      document.documentElement.style.setProperty("--mobile-chat-plan-offset", "0px");
    };
  }, [chatOpen]);

  // Build pins — same logic as DashboardView (plantToPin): halftransparent
  // background, photo override, task-status dot, nextTask tooltip.
  const pinEntries: PinEntry[] = useMemo(() => {
    if (!garden) return [];
    const result: PinEntry[] = [];
    for (const plant of garden.plants) {
      for (let i = 0; i < plant.positions.length; i++) {
        const pin = plantToPin(plant, i, null);
        if (pin.tooltip?.status) {
          pin.tooltip.status = tPlants(`status.${pin.tooltip.status}` as any);
        }
        result.push({ pin, plant });
      }
    }
    return result;
  }, [garden, tPlants]);

  // ── Pin interaction ──────────────────────────────────────────────────────────

  function handlePinClick(_pin: PlanPin, idx: number) {
    const entry = pinEntries[idx];
    if (!entry) return;
    setSheet((prev) => {
      if (prev && prev.plant.id === entry.plant.id) {
        // Same pin tapped again → expand the sheet
        return { ...prev, mode: "expanded" };
      }
      // Different pin or first tap → open in peek mode
      return { plant: entry.plant, pin: entry.pin, mode: "peek" };
    });
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
        onChatClick={() => setChatOpen(!chatOpen)}
      />

      {/* Plan area — outer wrapper shrinks by the portion of ChatPanel that
          sticks above BottomNav (var(--mobile-chat-plan-offset)).
          No overflow:hidden on outer so paddingBottom takes effect.
          Inner div holds overflow:hidden for GardenPlanWidget.
          Tapping outer area dismisses the snap-sheet. */}
      <div
        data-testid="mobile-plan-area"
        onClick={() => setSheet(null)}
        style={{
          flex:           1,
          minHeight:      0,
          display:        "flex",
          flexDirection:  "column",
          paddingBottom:  "var(--mobile-chat-plan-offset, 0px)",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        <GardenPlanWidget
          planUrl={garden?.plan_url ?? null}
          pins={pinEntries.map((e) => e.pin)}
          legend={true}
          onPinClick={handlePinClick}
          centerOnPin={sheet
            ? sheet.mode === "expanded"
              ? {
                  x:         sheet.pin.x,
                  y:         sheet.pin.y,
                  // Expanded: sheet covers 90vh. Visible strip above ≈ 10vh.
                  // Centre of that strip in widget coords (widget top = viewport top + 44px topbar).
                  // targetYPx = (vh * 0.10 / 2) - 44  clamped to min 24px
                  targetYPx: Math.max(24, window.innerHeight * 0.05 - 44),
                }
              : {
                  x:            sheet.pin.x,
                  y:            sheet.pin.y,
                  // Peek: sheet covers ~420px from bottom; pin centred in upper plan strip
                  targetYRatio: 0.28,
                }
            : null}
        />
        </div>
      </div>

      {/* Snap-sheet — position:fixed so it floats above the plan area */}
      {sheet && (
        <PlanSnapSheet
          sheet={sheet}
          onExpand={() => setSheet((s) => s ? { ...s, mode: "expanded" } : s)}
          onPeek={()   => setSheet((s) => s ? { ...s, mode: "peek" } : s)}
          onDismiss={() => setSheet(null)}
          onEdit={() => navigate(`/plants/${sheet.plant.id}/edit`)}
          invalidateGarden={invalidateGarden}
        />
      )}

      {/* In-flow chat panel */}


      <BottomNav activePath="/plan" />

      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
