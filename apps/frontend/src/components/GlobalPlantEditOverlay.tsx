/**
 * GlobalPlantEditOverlay — always-mounted plant edit dialog + garden plan.
 *
 * Renders as a fixed full-screen overlay whenever the editPlant AI tool is
 * dispatched from any view (Dashboard, Calendar, Journal, Settings, Plants).
 *
 * The overlay is invisible (renders nothing) when no edit is in progress.
 * It registers the global usePlantEditHandler so the AiPanel can always
 * reach it regardless of which view is currently active.
 */

import { useRef, useCallback }               from "react";
import { PlantEditDialog, type PlantEditDialogHandle } from "@/components/PlantEditDialog";
import { GardenPlanWidget }                  from "@/components/GardenPlanWidget";
import { usePlantEditDialog }                from "@/hooks/usePlantEditDialog";
import { usePlantEditHandler, type PlantEditFields } from "@/hooks/usePlantEditContext";
import { getGardenSnapshot }                 from "@/hooks/useGarden";
import type { Plant }                        from "@api/plant";

interface GlobalPlantEditOverlayProps {
  planUrl:          string | null;
  invalidateGarden: () => void;
}

export function GlobalPlantEditOverlay({ planUrl, invalidateGarden }: GlobalPlantEditOverlayProps) {
  const edit      = usePlantEditDialog();
  const dialogRef = useRef<PlantEditDialogHandle>(null);

  // Stale-closure-safe refs — updated every render, no useEffect needed.
  const editRef   = useRef(edit);
  editRef.current = edit;

  // plantsRef: always holds the latest plants from the garden snapshot.
  const plantsRef = useRef<Plant[]>([]);
  const snapshot  = getGardenSnapshot();
  plantsRef.current = snapshot?.plants ?? [];

  // Stable AI tool handler registered globally.
  const editPlantHandler = useCallback((id: string | null, fields: PlantEditFields) => {
    const applyAfterOpen = () => {
      if (Object.keys(fields).length > 0) {
        setTimeout(() => dialogRef.current?.applyAiFields(fields), 50);
      }
    };
    if (id === null) {
      editRef.current.openNew();
      applyAfterOpen();
    } else {
      const found = plantsRef.current.find((p) => p.id === id);
      if (found) {
        editRef.current.openEdit(found);
        applyAfterOpen();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePlantEditHandler({ editPlant: editPlantHandler });

  // Nothing to render when dialog is closed.
  if (edit.editTarget === undefined) return null;

  return (
    <div
      data-testid="global-plant-edit-overlay"
      style={{
        position:  "absolute",
        inset:     0,
        zIndex:    250,
        display:   "flex",
        overflow:  "hidden",
        background:"var(--cream)",
      }}
    >
      {/* Garden plan — left / center area */}
      <GardenPlanWidget
        planUrl={planUrl}
        pins={edit.positions.map((p, i) => ({ x: p.x, y: p.y, label: String(i + 1) }))}
        pickMode={edit.pickMode}
        onPick={(x, y) => edit.addPosition(x, y)}
      />

      {/* Edit dialog — 360px right panel */}
      <div
        style={{
          width:         "360px",
          minWidth:      "360px",
          flexShrink:    0,
          background:    "var(--warm-white)",
          borderLeft:    "1px solid var(--border)",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        <PlantEditDialog
          ref={dialogRef}
          plant={edit.editTarget}
          onClose={edit.close}
          onSaved={(saved) => {
            void edit.handleSaved(saved, invalidateGarden);
          }}
          positions={edit.positions}
          onPositionsChange={edit.onPositionsChange}
          initialPositions={edit.initialPositions}
          pickMode={edit.pickMode}
          onPickModeChange={edit.onPickModeChange}
        />
      </div>
    </div>
  );
}
