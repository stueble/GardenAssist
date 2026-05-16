/**
 * plantToPin — shared utility for building a PlanPin from a Plant.
 *
 * Used by DashboardView (desktop) and MobilePlanView (mobile) so both
 * views render pins identically: halftransparent background, photo
 * override, task status dot, translated tooltip.
 *
 * The `tooltip.status` value is intentionally left as the raw status key
 * (e.g. "overdue") so the caller can translate it via
 * `tPlants("status.<status>")` in the appropriate i18n namespace.
 */

import type { Plant } from "@api/plant";
import type { PlanPin } from "@/components/GardenPlanWidget";
import { derivePlantStatus, nextCareTask } from "@/lib/plantStatus";
import { weekRangeLabel, SCHEDULE_ICON } from "@/components/PlantDetailPanel";

export function plantToPin(
  plant:      Plant,
  posIdx:     number,
  selectedId: string | null,
): PlanPin {
  const pos    = plant.positions[posIdx];
  const status = derivePlantStatus(plant);
  const task   = nextCareTask(plant);

  const taskStr = task
    ? `${SCHEDULE_ICON[task.schedule.schedule_type] ?? "📌"} ${task.schedule.label ?? ""} (${weekRangeLabel(task.schedule.start_week, task.schedule.end_week)})`
    : undefined;

  const firstPhoto = plant.attachments.find((a) => a.attachment_type === "image");

  return {
    x:          pos.x_percent,
    y:          pos.y_percent,
    emoji:      plant.icon ?? "🌿",
    photoUrl:   firstPhoto?.url,
    name:       plant.name_common,
    color:      "rgba(255,255,255,.15)",
    taskStatus: (status === "overdue" || status === "due") ? status : undefined,
    protected:  plant.temperature_protected || undefined,
    selected:   selectedId === plant.id,
    tooltip:    { status, nextTask: taskStr },
  };
}
