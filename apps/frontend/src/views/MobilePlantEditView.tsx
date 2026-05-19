/**
 * MobilePlantEditView
 *
 * Fullscreen mobile plant edit screen. Wraps PlantEditDialog without the
 * GardenPlanWidget shell used on desktop.
 *
 * Routes:
 *   /plants/:id/edit  — edit existing plant
 *   /plants/new       — create new plant
 *
 * Layout:
 *   TopBar (✕ close | plant name | ✓ save) → PlantEditDialog body (scrollable)
 */

import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation }           from "react-i18next";
import { X, Check, MessageCircle }  from "lucide-react";
import { useAiPanelState }          from "@/hooks/useAiPanelState";
import { useAssistantSettings }     from "@/hooks/useAssistantSettings";
import { setAssistantContext }      from "@/hooks/useAssistantContext";
import type { Garden }              from "@api/garden";
import type { Plant }               from "@api/plant";
import {
  PlantEditDialog,
  type PlantEditDialogHandle,
}                                   from "@/components/PlantEditDialog";
import { topBtnStyle }              from "@/components/mobile/MobileParts";
import type { PlantEditFields }     from "@/hooks/usePlantEditContext";

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({
  title,
  saving,
  chatOpen,
  onClose,
  onChatClick,
  onSave,
}: {
  title:       string;
  saving:      boolean;
  chatOpen:    boolean;
  onClose:     () => void;
  onChatClick: () => void;
  onSave:      () => void;
}) {
  const { t } = useTranslation("plants");

  return (
    <div
      data-testid="mobile-plant-edit-topbar"
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
      {/* Close — no dirty check on mobile */}
      <button
        data-testid="mobile-plant-edit-close"
        aria-label={t("edit.btn_cancel")}
        onClick={onClose}
        style={topBtnStyle}
        disabled={saving}
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      {/* Title */}
      <div style={{
        flex:         1,
        textAlign:    "center",
        fontFamily:   "var(--font-display)",
        fontSize:     "16px",
        color:        "#fff",
        fontWeight:   600,
        overflow:     "hidden",
        textOverflow: "ellipsis",
        whiteSpace:   "nowrap",
      }}>
        {title}
      </div>

      {/* Chat */}
      <button
        data-testid="mobile-plant-edit-chat"
        aria-label="Assistent"
        onClick={onChatClick}
        style={{
          ...topBtnStyle,
          background: chatOpen ? "rgba(255,255,255,.30)" : "rgba(255,255,255,.15)",
        }}
      >
        <MessageCircle size={20} strokeWidth={1.5} />
      </button>

      {/* Save */}
      <button
        data-testid="mobile-plant-edit-save"
        aria-label={t("edit.btn_save")}
        onClick={onSave}
        disabled={saving}
        style={{
          ...topBtnStyle,
          background: saving ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.20)",
          color:      saving ? "rgba(255,255,255,.4)" : "#fff",
        }}
      >
        <Check size={20} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobilePlantEditViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobilePlantEditView({ garden, invalidateGarden }: MobilePlantEditViewProps) {
  const { id }       = useParams<{ id?: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { t }        = useTranslation("plants");
  const dialogRef    = useRef<PlantEditDialogHandle>(null);
  const [saving, setSaving] = useState(false);
  const { open: chatOpen, setOpen: setChatOpen } = useAiPanelState();
  const assistantSettings = useAssistantSettings();

  // Apply AI prefill fields passed via location.state from MobilePlantEditBridge.
  // Uses a small delay (50 ms) to ensure PlantEditDialog has fully mounted —
  // identical to the pattern in GlobalPlantEditOverlay on desktop.
  // Apply AI prefill fields passed via location.state from MobilePlantEditBridge.
  // Depends on location.key so it re-fires on every navigate() call — even when
  // the path stays the same (same route, new AI fields from the assistant).
  useEffect(() => {
    const aiFields = (location.state as { aiFields?: PlantEditFields } | null)?.aiFields;
    if (!aiFields || Object.keys(aiFields).length === 0) return;
    const timer = setTimeout(() => {
      dialogRef.current?.applyAiFields(aiFields);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Positions state — owned here (same pattern as GlobalPlantEditOverlay)
  const plant: Plant | null = id ? (garden?.plants.find((p) => p.id === id) ?? null) : null;

  // Publish assistant context so the AI knows which plant is being edited
  useEffect(() => {
    setAssistantContext(
      garden && plant
        ? { view: "plants", garden, selectedPlant: plant, settings: assistantSettings }
        : undefined
    );
  }, [garden, plant, assistantSettings]);
  const [positions,        setPositions]        = useState(() => plant?.positions.map((p) => ({ x: p.x_percent, y: p.y_percent })) ?? []);
  const [initialPositions] = useState(() => plant?.positions.map((p) => ({ x: p.x_percent, y: p.y_percent })) ?? []);

  const title = plant
    ? t("edit.title_edit", { name: plant.name_common })
    : t("edit.title_new");

  function handleClose() {
    navigate(-1);
  }

  function handleSave() {
    setSaving(true);
    dialogRef.current?.save();
  }

  function handleSaved(saved: Plant) {
    setSaving(false);
    invalidateGarden();
    // Navigate to the detail view of the saved plant
    navigate(`/plants/${saved.id}`, { replace: true });
  }

  function handleSaveError() {
    // PlantEditDialog shows its own error banner — we just reset saving state
    setSaving(false);
  }
  void handleSaveError; // used implicitly via dialog state

  return (
    <div
      data-testid="mobile-plant-edit-view"
      style={{
        display:       "flex",
        flexDirection: "column",
        flex:          1,
        minHeight:     0,
        overflow:      "hidden",
        background:    "var(--warm-white)",
      }}
    >
      <TopBar
        title={title}
        saving={saving}
        chatOpen={chatOpen}
        onClose={handleClose}
        onChatClick={() => setChatOpen(!chatOpen)}
        onSave={handleSave}
      />

      {/* PlantEditDialog body fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PlantEditDialog
          ref={dialogRef}
          plant={plant}
          onClose={handleClose}
          onSaved={handleSaved}
          positions={positions}
          onPositionsChange={setPositions}
          initialPositions={initialPositions}
          pickMode={false}
          onPickModeChange={() => {}}
          hideHeader
          hideFooter
          hidePickMode
          scrollPaddingBottom="var(--mobile-chat-height, 0px)"
        />
      </div>
    </div>
  );
}
