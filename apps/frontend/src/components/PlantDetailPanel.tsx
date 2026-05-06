/**
 * PlantDetailPanel — shared component (story-025, story-040).
 *
 * Accepts a Plant object as prop and an apiClient for deletePlant (AC #5).
 * Used in: Plants Overview, Calendar (future), Dashboard (future).
 *
 * Props:
 *   plant    — the plant to display
 *   onClose  — called when the ✕ button is clicked
 *   onEdit   — called when "Bearbeiten" is clicked
 *   onDelete — called after the plant has been successfully deleted
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Plant } from "@api/plant";
import type { Schedule } from "@api/schedule";
import { apiClient } from "@/api/client";
import { nextCareTask, STATUS_COLOR, type PlantStatus } from "@/lib/plantStatus";

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEK_TO_MONTH_DE = [
  "", "Jan","Jan","Jan","Jan",
  "Feb","Feb","Feb","Feb",
  "Mär","Mär","Mär","Mär",
  "Apr","Apr","Apr","Apr",
  "Mai","Mai","Mai","Mai","Mai",
  "Jun","Jun","Jun","Jun",
  "Jul","Jul","Jul","Jul",
  "Aug","Aug","Aug","Aug","Aug",
  "Sep","Sep","Sep","Sep",
  "Okt","Okt","Okt","Okt",
  "Nov","Nov","Nov","Nov",
  "Dez","Dez","Dez","Dez","Dez",
];

function weekToMonth(week: number): string {
  return WEEK_TO_MONTH_DE[Math.min(week, 52)] ?? "–";
}

export function weekRangeLabel(startWeek: number, endWeek: number): string {
  const s = weekToMonth(startWeek);
  const e = weekToMonth(endWeek);
  return s === e ? s : `${s}–${e}`;
}

function bloomPeriod(schedules: Schedule[]): string {
  const bloom = schedules.filter((s) => s.schedule_type === "bloom");
  if (!bloom.length) return "–";
  const min = Math.min(...bloom.map((s) => s.start_week));
  const max = Math.max(...bloom.map((s) => s.end_week));
  return weekRangeLabel(min, max);
}

function bloomColorLabel(schedules: Schedule[]): string {
  return schedules
    .filter((s) => s.schedule_type === "bloom" && s.label)
    .map((s) => s.label!)
    .join(", ") || "–";
}

function lastJournalDate(
  plant: Plant,
  type: "pruning" | "fertilization",
): string {
  const scheduleIds = new Set(
    plant.schedules
      .filter((s) =>
        type === "pruning"
          ? s.schedule_type === "pruning"
          : s.schedule_type === "fertilization"
      )
      .map((s) => s.id)
  );
  const entries = plant.journal_entries
    .filter((e) => e.schedule_id && scheduleIds.has(e.schedule_id) && e.entry_type === "done")
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) return "–";
  return new Date(entries[0].date).toLocaleDateString("de-DE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const SCHEDULE_ICON: Record<string, string> = {
  bloom:         "🌸",
  growth:        "🌱",
  foliage:       "🍃",
  pruning:       "✂️",
  fertilization: "💧",
  misc:          "📋",
};

const TASK_TYPES = ["pruning", "fertilization", "misc"];

// ── Style helpers ─────────────────────────────────────────────────────────────

const sectionTitleStyle: React.CSSProperties = {
  fontSize:      "10px",
  fontWeight:    700,
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  color:         "var(--text-light)",
  marginBottom:  "8px",
};

const detailBtnStyle: React.CSSProperties = {
  flex:           1,
  padding:        "0 12px",
  lineHeight:     "32px",
  borderRadius:   "8px",
  fontSize:       "12px",
  fontWeight:     500,
  fontFamily:     "var(--font-body)",
  cursor:         "pointer",
  border:         "1.5px solid var(--border)",
  background:     "none",
  color:          "var(--text-mid)",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  gap:            "4px",
  whiteSpace:     "nowrap",
};

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: "1px solid var(--border)", marginTop: "4px" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0 6px",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.8px",
          textTransform: "uppercase", color: "var(--text-light)",
        }}
      >
        {label}
        <span style={{
          fontSize: "11px", transition: "transform .2s", display: "inline-block",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>▾</span>
      </button>
      {open && <div style={{ paddingBottom: "8px" }}>{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface PlantDetailPanelProps {
  plant:      Plant;
  onClose:    () => void;
  onEdit?:    (plant: Plant) => void;
  onDelete?:  () => void;   // called after successful deletion (AC #6)
}

export function PlantDetailPanel({ plant, onClose, onEdit, onDelete }: PlantDetailPanelProps) {
  const { t } = useTranslation("plants");

  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  const bloom      = bloomPeriod(plant.schedules);
  const lastCut    = lastJournalDate(plant, "pruning");
  const lastFert   = lastJournalDate(plant, "fertilization");
  const bloomColor = bloomColorLabel(plant.schedules);

  const sortedSchedules = [...plant.schedules]
    .filter((s) => TASK_TYPES.includes(s.schedule_type))
    .sort((a, b) => a.start_week - b.start_week);

  const factCell = (label: string, value: string) => (
    <div key={label} style={{ background: "var(--green-mist)", borderRadius: "8px", padding: "8px 10px" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--text-light)", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-dark)" }}>{value}</div>
    </div>
  );

  return (
    <>
      {/* Header — AC #1, #8 */}
      <div
        style={{
          padding: "16px 18px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--green-deep)", fontWeight: 600, lineHeight: 1.2 }}>
            {plant.name_common}
          </div>
          {plant.name_botanical && (
            <div style={{ fontSize: "12px", color: "var(--text-light)", fontStyle: "italic", marginTop: "2px" }}>
              {plant.name_botanical}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", fontSize: "16px", padding: "2px", flexShrink: 0 }}
          aria-label="Detailansicht schließen"
          data-testid="detail-close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Description */}
        {plant.description && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_description")}</div>
            <div style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.5 }}>{plant.description}</div>
          </div>
        )}

        {/* Images — AC #2 */}
        <div>
          <div style={sectionTitleStyle}>{t("detail.section_images")}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { emoji: plant.icon ?? "🌿", label: t("detail.img_plant") },
              { emoji: "🌸",               label: t("detail.img_bloom") },
              { emoji: "🍃",               label: t("detail.img_leaf")  },
            ].map(({ emoji, label }) => (
              <div
                key={label}
                style={{
                  flex: 1, aspectRatio: "1", borderRadius: "10px",
                  background: "var(--green-mist)", border: "1.5px solid var(--border)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: "4px", fontSize: "26px", cursor: "pointer",
                }}
              >
                {emoji}
                <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-light)" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Facts — AC #3 */}
        <div>
          <div style={sectionTitleStyle}>{t("detail.section_facts")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: t("detail.fact_origin"),    value: plant.origin_type   ? t(`origin_type.${plant.origin_type}` as any)   : "–" },
              { label: t("detail.fact_lifecycle"), value: plant.lifecycle     ? t(`lifecycle.${plant.lifecycle}` as any)         : "–" },
              { label: t("detail.fact_watering"),  value: plant.watering_zone ?? "–" },
              { label: t("detail.fact_sun"),       value: plant.sun_demand    ? t(`sun_demand.${plant.sun_demand}` as any)       : "–" },
              { label: t("detail.fact_water"),     value: plant.water_demand  ? t(`water_demand.${plant.water_demand}` as any)  : "–" },
              { label: t("detail.fact_soil"),      value: plant.soil_type     ? t(`soil_type.${plant.soil_type}` as any)         : "–" },
              { label: t("detail.fact_health"),    value: plant.health_status ? t(`health_status.${plant.health_status}` as any) : "–" },
              { label: t("detail.fact_temp"),      value: plant.frost_tolerance_min_c != null ? `${plant.frost_tolerance_min_c}°C` : "–" },
            ].map(({ label, value }) => factCell(label, value))}
          </div>
        </div>

        {/* Care notes — AC #4 */}
        {plant.care_notes && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_notes")}</div>
            <div style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.5 }}>{plant.care_notes}</div>
          </div>
        )}

        {/* Tasks — AC #5 */}
        {sortedSchedules.length > 0 && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_tasks")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 12px auto", alignItems: "center", rowGap: "6px", columnGap: "6px" }}>
              {sortedSchedules.map((s) => (
                <>
                  <span key={`${s.id}-icon`} style={{ fontSize: "13px", textAlign: "center" }}>
                    {SCHEDULE_ICON[s.schedule_type] ?? "📌"}
                  </span>
                  <span key={`${s.id}-label`} style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-dark)" }}>
                    {s.label ?? s.schedule_type}
                  </span>
                  <div key={`${s.id}-swatch`} style={{
                    width: "10px", height: "10px", borderRadius: "2px",
                    background: s.color ?? "var(--border)",
                    border: "1px solid rgba(0,0,0,.1)", justifySelf: "center",
                  }} />
                  <span key={`${s.id}-period`} style={{ fontSize: "11px", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                    {weekRangeLabel(s.start_week, s.end_week)}
                  </span>
                </>
              ))}
            </div>
          </div>
        )}

        {/* Weitere Infos — collapsible */}
        <CollapsibleSection label={t("detail.section_more")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {factCell(t("detail.fact_type"),    plant.category ?? "–")}
            {factCell(t("detail.fact_location"), plant.location ?? "–")}
            {factCell(t("detail.fact_bloom"),    bloom)}
            {factCell(t("detail.fact_color"),    bloomColor)}
          </div>
        </CollapsibleSection>

        {/* Pflege-Historie — collapsible */}
        <CollapsibleSection label={t("detail.section_history")}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { icon: "✂️", label: t("detail.last_cut"),  value: lastCut  },
              { icon: "💧", label: t("detail.last_fert"), value: lastFert },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--green-mist)", borderRadius: "8px", gap: "8px" }}>
                <span>{icon}</span>
                <span style={{ fontSize: "12.5px", fontWeight: 500, flex: 1 }}>{label}</span>
                <span style={{ fontSize: "11px", color: "var(--text-light)" }}>{value}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Weitere Bilder — collapsible */}
        <CollapsibleSection label={t("detail.section_gallery")}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1, aspectRatio: "1", borderRadius: "8px",
                  background: "var(--green-mist)", border: "1.5px dashed var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", cursor: "pointer", color: "var(--text-light)",
                }}
              >
                +
              </div>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "6px" }}>
            Bilder-Upload folgt in einer späteren Version.
          </div>
        </CollapsibleSection>

      </div>

      {/* Actions — AC #6 */}
      <div style={{ display: "flex", gap: "8px", padding: "12px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          type="button"
          style={{ ...detailBtnStyle, background: "var(--green-deep)", color: "white", borderColor: "var(--green-deep)" }}
          onClick={() => onEdit?.(plant)}
          data-testid="detail-btn-edit"
        >
          {t("detail.btn_edit")}
        </button>
      </div>

      {/* Delete — AC #3, #4, #5, #7 */}
      <div style={{ padding: "0 18px 14px", flexShrink: 0 }}>
        {deleteError && (
          <div
            data-testid="detail-delete-error"
            style={{ fontSize: "11px", color: "var(--red-warn)", marginBottom: "8px",
                     background: "var(--red-soft)", borderRadius: "6px", padding: "6px 10px" }}
          >
            {deleteError}
          </div>
        )}
        {!confirmOpen ? (
          <button
            type="button"
            data-testid="detail-btn-delete"
            onClick={() => { setDeleteError(null); setConfirmOpen(true); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: "12px", color: "var(--red-warn)", fontFamily: "var(--font-body)",
              textDecoration: "underline", textUnderlineOffset: "2px",
            }}
          >
            {t("detail.btn_delete")}
          </button>
        ) : (
          <div
            data-testid="detail-delete-confirm"
            style={{
              background: "var(--red-soft)", border: "1px solid var(--red-warn)",
              borderRadius: "8px", padding: "10px 12px", display: "flex",
              flexDirection: "column", gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--red-warn)" }}>
              {t("detail.delete_confirm_title")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-mid)" }}>
              {t("detail.delete_confirm_body")}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                data-testid="detail-delete-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                style={{ ...detailBtnStyle, flex: 1 }}
              >
                {t("detail.delete_confirm_cancel")}
              </button>
              <button
                type="button"
                data-testid="detail-delete-ok"
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError(null);
                  try {
                    await apiClient.deletePlant(plant.id);
                    onDelete?.();
                  } catch {
                    setDeleteError(t("detail.delete_error"));
                    setConfirmOpen(false);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                style={{
                  ...detailBtnStyle, flex: 1,
                  background: "var(--red-warn)", color: "white", borderColor: "var(--red-warn)",
                }}
              >
                {deleting ? "…" : t("detail.delete_confirm_ok")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Re-export helpers for use in PlantsView (avoids duplication)
export { bloomPeriod, bloomColorLabel, lastJournalDate, SCHEDULE_ICON };
export { nextCareTask, STATUS_COLOR };
export type { PlantStatus };
