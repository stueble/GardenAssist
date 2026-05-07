/**
 * usePlantEditDialog — shared hook for the Plant Edit Dialog flow.
 *
 * Owns editTarget, positions, initialPositions and pickMode state so that
 * GardenPlanWidget (sibling of the dialog in the layout) can share them.
 *
 * Used in: PlantsView, DashboardView, CalendarView.
 */

import { useState, useCallback } from "react";
import type { Plant } from "@api/plant";
import type { PositionRow } from "@/components/PlantEditDialog";
import { apiClient } from "@/api/client";
import type { Garden } from "@api/garden";

export interface UsePlantEditDialogResult {
  /** null = new plant, Plant = edit existing, undefined = closed */
  editTarget:       Plant | null | undefined;
  positions:        PositionRow[];
  initialPositions: PositionRow[];
  pickMode:         boolean;

  /** Open the dialog in edit mode for an existing plant. */
  openEdit:         (plant: Plant) => void;
  /** Open the dialog in create mode (new plant). */
  openNew:          () => void;
  /** Close the dialog without saving. */
  close:            () => void;
  /**
   * Called after a successful save.
   * Reloads the garden, calls onRefresh with the fresh Garden, and
   * returns the fresh Plant object (for re-selecting in the caller).
   */
  handleSaved:      (saved: Plant, onRefresh: (g: Garden) => void) => Promise<Plant>;

  setPositions:     (rows: PositionRow[]) => void;
  addPosition:      (x: number, y: number) => void;
  onPositionsChange:(rows: PositionRow[]) => void;
  setPickMode:      (active: boolean) => void;
  onPickModeChange: (active: boolean) => void;
}

export function usePlantEditDialog(): UsePlantEditDialogResult {
  const [editTarget,       setEditTarget]       = useState<Plant | null | undefined>(undefined);
  const [positions,        setPositions]        = useState<PositionRow[]>([]);
  const [initialPositions, setInitialPositions] = useState<PositionRow[]>([]);
  const [pickMode,         setPickMode]         = useState(false);

  const openEdit = useCallback((plant: Plant) => {
    const rows: PositionRow[] = (plant.positions ?? []).map(
      (pos) => ({ x: pos.x_percent, y: pos.y_percent })
    );
    setPositions(rows);
    setInitialPositions(rows);
    setPickMode(false);
    setEditTarget(plant);
  }, []);

  const openNew = useCallback(() => {
    setPositions([]);
    setInitialPositions([]);
    setPickMode(false);
    setEditTarget(null);
  }, []);

  const close = useCallback(() => {
    setPickMode(false);
    setPositions([]);
    setEditTarget(undefined);
  }, []);

  const handleSaved = useCallback(async (
    saved: Plant,
    onRefresh: (g: Garden) => void,
  ): Promise<Plant> => {
    close();
    try {
      const g = await apiClient.getGarden();
      onRefresh(g);
      return g.plants.find((p) => p.id === saved.id) ?? saved;
    } catch {
      return saved;
    }
  }, [close]);

  function addPosition(x: number, y: number) {
    setPositions((prev) => [...prev, { x, y }]);
  }

  return {
    editTarget,
    positions,
    initialPositions,
    pickMode,
    openEdit,
    openNew,
    close,
    handleSaved,
    setPositions,
    addPosition,
    onPositionsChange: setPositions,
    setPickMode,
    onPickModeChange:  setPickMode,
  };
}
