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

// ── PlantDetailContent (shared body — AC #1) ─────────────────────────────────

export interface PlantDetailContentProps {
  plant:     Plant;
  onDelete?: () => void;
}

export function PlantDetailContent({ plant, onDelete }: PlantDetailContentProps) {
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

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  function toggleNotes(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const factCell = (label: string, value: string) => (
    <div key={label} style={{ background: "var(--green-mist)", borderRadius: "8px", padding: "8px 10px" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--text-light)", marginBottom: "3px" }}>{label}</div>
      <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-dark)" }}>{value}</div>
    </div>
  );

  return (
    <>
      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Cold protection badge — top of body, before images */}
        {plant.temperature_protected && (
          <div>
            <span
              data-testid="protected-badge"
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "4px",
                padding:      "3px 10px",
                borderRadius: "12px",
                fontSize:     "11px",
                fontWeight:   500,
                background:   "#e8f0fe",
                color:        "#3a5ea8",
              }}
            >
              🏠 {t("detail.protected_badge")}
            </span>
          </div>
        )}

        {/* Description */}
        {plant.description && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_description")}</div>
            <div style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.5 }}>{plant.description}</div>
          </div>
        )}

        {/* Images — AC #2 */}
        {(() => {
          const imgs = plant.attachments.filter((a) => a.attachment_type === "image");
          // i18n label per attachment category
          const catLabel: Record<string, string> = {
            main:    t("detail.img_plant"),
            bloom:   t("detail.img_bloom"),
            leaf:    t("detail.img_leaf"),
            problem: t("edit.attachments.category_problem"),
            invoice: t("edit.attachments.category_invoice"),
          };
          const fallbackEmoji: Record<string, string> = {
            main: plant.icon ?? "🌿", bloom: "🌸", leaf: "🍃",
          };
          const byCategory = (cat: string) => imgs.find((a) => a.category === cat);
          const slots = [
            { slotLabel: t("detail.img_plant"), preferred: byCategory("main")  },
            { slotLabel: t("detail.img_bloom"), preferred: byCategory("bloom") },
            { slotLabel: t("detail.img_leaf"),  preferred: byCategory("leaf")  },
          ];
          // Fill empty slots with remaining images in order, no duplicates
          const used = new Set(slots.map((s) => s.preferred?.id).filter(Boolean));
          const remaining = imgs.filter((a) => !used.has(a.id));
          const resolved = slots.map((s) => {
            if (s.preferred) {
              return {
                slotLabel: s.slotLabel,
                url:       s.preferred.url,
                realLabel: catLabel[s.preferred.category ?? ""] ?? s.slotLabel,
              };
            }
            const fallback = remaining.shift();
            if (fallback) used.add(fallback.id);
            return {
              slotLabel: s.slotLabel,
              url:       fallback?.url ?? null,
              realLabel: fallback ? (catLabel[fallback.category ?? ""] ?? s.slotLabel) : s.slotLabel,
            };
          });
          return (
            <div>
              <div style={sectionTitleStyle}>{t("detail.section_images")}</div>
              <div style={{ display: "flex", gap: "8px" }}>
                {resolved.map(({ slotLabel, url, realLabel }) => (
                  <div
                    key={slotLabel}
                    style={{
                      flex: 1, aspectRatio: "1", borderRadius: "10px",
                      background: "var(--green-mist)", border: "1.5px solid var(--border)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: "4px", overflow: "hidden", position: "relative",
                    }}
                  >
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={realLabel}
                          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                        />
                        <span style={{
                          position: "absolute", bottom: "4px", left: 0, right: 0,
                          textAlign: "center", fontSize: "9px", fontWeight: 600,
                          textTransform: "uppercase", letterSpacing: "0.5px",
                          color: "white", textShadow: "0 1px 3px rgba(0,0,0,.5)",
                        }}>
                          {realLabel}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "26px" }}>
                          {fallbackEmoji[slotLabel === t("detail.img_plant") ? "main" : slotLabel === t("detail.img_bloom") ? "bloom" : "leaf"] ?? "🖼️"}
                        </span>
                        <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-light)" }}>
                          {slotLabel}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Facts — AC #3 */}
        <div>
          <div style={sectionTitleStyle}>{t("detail.section_facts")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: t("detail.fact_origin"),    value: plant.origin_type   ? t(`origin_type.${plant.origin_type}` as any)   : "–" },
              { label: t("detail.fact_lifecycle"), value: plant.lifecycle     ? t(`lifecycle.${plant.lifecycle}` as any)         : "–" },
              { label: t("detail.fact_watering"),  value: plant.watering_zone ? t(`defaults.zones.${plant.watering_zone}`, { defaultValue: plant.watering_zone, ns: "settings" }) : "–" },
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
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sortedSchedules.map((s) => {
                const hasNotes   = !!s.notes;
                const isCollapsed = collapsedIds.has(s.id);
                return (
                  <div key={s.id}>
                    {/* Header row — always visible */}
                    <div
                      role={hasNotes ? "button" : undefined}
                      tabIndex={hasNotes ? 0 : undefined}
                      data-testid={`task-row-${s.id}`}
                      onClick={hasNotes ? () => toggleNotes(s.id) : undefined}
                      onKeyDown={hasNotes ? (e) => (e.key === "Enter" || e.key === " ") && toggleNotes(s.id) : undefined}
                      style={{
                        display:     "grid",
                        gridTemplateColumns: "20px 1fr 12px auto" + (hasNotes ? " 14px" : ""),
                        alignItems:  "center",
                        columnGap:   "6px",
                        cursor:      hasNotes ? "pointer" : "default",
                        borderRadius: "6px",
                        padding:     "2px 0",
                      }}
                    >
                      <span style={{ fontSize: "13px", textAlign: "center" }}>
                        {SCHEDULE_ICON[s.schedule_type] ?? "📌"}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-dark)" }}>
                        {s.label ?? s.schedule_type}
                      </span>
                      <div style={{
                        width: "10px", height: "10px", borderRadius: "2px",
                        background: s.color ?? "var(--border)",
                        border: "1px solid rgba(0,0,0,.1)", justifySelf: "center",
                      }} />
                      <span style={{ fontSize: "11px", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                        {weekRangeLabel(s.start_week, s.end_week)}
                      </span>
                      {hasNotes && (
                        <span
                          data-testid={`task-toggle-${s.id}`}
                          style={{
                            fontSize:   "11px",
                            color:      "var(--text-light)",
                            transition: "transform .15s",
                            display:    "inline-block",
                            transform:  isCollapsed ? "rotate(-90deg)" : "none",
                          }}
                        >
                          ▾
                        </span>
                      )}
                    </div>

                    {/* Notes — shown by default, hidden when collapsed */}
                    {hasNotes && !isCollapsed && (
                      <div
                        data-testid={`task-notes-${s.id}`}
                        style={{
                          marginLeft:  "26px",
                          marginTop:   "3px",
                          marginBottom:"4px",
                          fontSize:    "11.5px",
                          color:       "var(--text-mid)",
                          lineHeight:  1.55,
                          background:  "var(--green-mist)",
                          borderRadius:"6px",
                          padding:     "6px 10px",
                        }}
                      >
                        {s.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weitere Infos — collapsible */}
        <CollapsibleSection label={t("detail.section_more")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {factCell(t("detail.fact_type"),     plant.category ? t(`defaults.categories.${plant.category}`, { defaultValue: plant.category, ns: "settings" }) : "–")}
            {factCell(t("detail.fact_location"), plant.location  ? t(`defaults.zones.${plant.location}`,    { defaultValue: plant.location,  ns: "settings" }) : "–")}
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

         {/* Weitere Bilder — only shown when additional images exist beyond the first 3 slots */}
         {(() => {
           const imgs = plant.attachments.filter((a) => a.attachment_type === "image");
           // Determine which IDs are already shown in the 3 main slots
           const catPriority = ["main", "bloom", "leaf"];
           const usedIds = new Set<string>();
           for (const cat of catPriority) {
             const found = imgs.find((a) => a.category === cat && !usedIds.has(a.id));
             if (found) usedIds.add(found.id);
           }
           // Fill remaining main slots from absolute order
           for (const img of imgs) {
             if (usedIds.size >= 3) break;
             if (!usedIds.has(img.id)) usedIds.add(img.id);
           }
           const extras = imgs.filter((a) => !usedIds.has(a.id));
           if (extras.length === 0) return null;
           return (
             <CollapsibleSection label={t("detail.section_gallery")}>
               <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                 {extras.map((img) => (
                   <div
                     key={img.id}
                     style={{
                       width: "72px", height: "72px", borderRadius: "8px",
                       overflow: "hidden", border: "1.5px solid var(--border)",
                       flexShrink: 0,
                     }}
                   >
                     <img
                       src={img.url}
                       alt={img.category ?? ""}
                       style={{ width: "100%", height: "100%", objectFit: "cover" }}
                     />
                   </div>
                 ))}
               </div>
             </CollapsibleSection>
           );
         })()}

        {/* Delete — at the very bottom of the scroll area */}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: "8px", paddingTop: "16px", paddingBottom: "8px" }}>
          {deleteError && (
            <div
              data-testid="detail-delete-error"
              style={{ fontSize: "11px", color: "var(--red-warn)", marginBottom: "8px",
                       background: "var(--red-soft)", borderRadius: "6px", padding: "6px 10px" }}
            >
              {deleteError}
            </div>
          )}
          {confirmOpen ? (
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
          ) : (
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
          )}
        </div>

      </div>
    </>
  );
}

// ── PlantDetailPanel (desktop wrapper — AC #2) ────────────────────────────────

export interface PlantDetailPanelProps {
  plant:      Plant;
  onClose:    () => void;
  onEdit?:    (plant: Plant) => void;
  onDelete?:  () => void;
}

export function PlantDetailPanel({ plant, onClose, onEdit, onDelete }: PlantDetailPanelProps) {
  const { t }     = useTranslation("plants");
  const { t: tc } = useTranslation("common");

  return (
    <>
      {/* Header */}
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
          aria-label={tc("actions.cancel")}
          data-testid="detail-close"
        >
          ✕
        </button>
      </div>

      <PlantDetailContent plant={plant} onDelete={onDelete} />

      {/* Desktop-only edit button — pinned below the scroll area */}
      <div style={{ padding: "10px 18px 12px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          type="button"
          style={{ ...detailBtnStyle, background: "var(--green-deep)", color: "white", borderColor: "var(--green-deep)", width: "100%" }}
          onClick={() => onEdit?.(plant)}
          data-testid="detail-btn-edit"
        >
          {t("detail.btn_edit")}
        </button>
      </div>
    </>
  );
}

// Re-export helpers for use in PlantsView (avoids duplication)
export { bloomPeriod, bloomColorLabel, lastJournalDate, SCHEDULE_ICON };
export { nextCareTask, STATUS_COLOR };
export type { PlantStatus };
