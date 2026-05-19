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
import { relativeTaskDate } from "@/components/TaskSidebar";

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

export const SCHEDULE_ICON: Record<string, string> = {
  bloom:         "🌸",
  growth:        "🌱",
  foliage:       "🍃",
  pruning:       "✂️",
  fertilization: "✨",
  misc:          "📋",
};

// ── Style helpers ─────────────────────────────────────────────────────────────

const sectionTitleStyle: React.CSSProperties = {
  fontSize:      "10px",
  fontWeight:    700,
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  color:         "var(--text-light)",
  marginBottom:  "9px",
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
  const { t }  = useTranslation("plants");
  const { t: ts } = useTranslation("settings");
  const { t: tc } = useTranslation("common");

  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  const bloom      = bloomPeriod(plant.schedules);
  const bloomColor = bloomColorLabel(plant.schedules);

  // ── Images ──────────────────────────────────────────────────────────────────
  const imgs = plant.attachments.filter((a) => a.attachment_type === "image");
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
  const imgSlots = [
    { slotLabel: t("detail.img_plant"), preferred: byCategory("main")  },
    { slotLabel: t("detail.img_bloom"), preferred: byCategory("bloom") },
    { slotLabel: t("detail.img_leaf"),  preferred: byCategory("leaf")  },
  ];
  const usedIds = new Set(imgSlots.map((s) => s.preferred?.id).filter(Boolean));
  const remaining = imgs.filter((a) => !usedIds.has(a.id));
  const resolvedImgs = imgSlots.map((s) => {
    if (s.preferred) {
      return { slotLabel: s.slotLabel, url: s.preferred.url, realLabel: catLabel[s.preferred.category ?? ""] ?? s.slotLabel };
    }
    const fallback = remaining.shift();
    if (fallback) usedIds.add(fallback.id);
    return { slotLabel: s.slotLabel, url: fallback?.url ?? null, realLabel: fallback ? (catLabel[fallback.category ?? ""] ?? s.slotLabel) : s.slotLabel };
  });

  // ── Extra images (beyond first 3 slots) ────────────────────────────────────
  const catPriority = ["main", "bloom", "leaf"];
  const extraUsedIds = new Set<string>();
  for (const cat of catPriority) {
    const found = imgs.find((a) => a.category === cat && !extraUsedIds.has(a.id));
    if (found) extraUsedIds.add(found.id);
  }
  for (const img of imgs) {
    if (extraUsedIds.size >= 3) break;
    if (!extraUsedIds.has(img.id)) extraUsedIds.add(img.id);
  }
  const extraImgs = imgs.filter((a) => !extraUsedIds.has(a.id));

  // ── Non-image attachments ───────────────────────────────────────────────────
  const docAttachments = plant.attachments.filter((a) => a.attachment_type !== "image");

  // ── Tasks (derived, open only) ──────────────────────────────────────────────
  const openTasks = [...plant.tasks].sort((a, b) => {
    const order = { overdue: 0, due: 1, upcoming: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  // expandedTaskIds: task notes are collapsed by default; adding an id expands them
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  function toggleTask(id: string) {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // ── Journal (last 3 entries) ────────────────────────────────────────────────
  const recentJournal = [...plant.journal_entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  // ── Facts helpers ───────────────────────────────────────────────────────────
  const waterDemandLevel = plant.water_demand === "low" ? 2 : plant.water_demand === "medium" ? 3 : plant.water_demand === "high" ? 5 : 0;

  const factCell = (label: string, value: React.ReactNode) => (
    <div key={label} style={{ background: "var(--green-mist)", borderRadius: "6px", padding: "5px 8px" }}>
      <div style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", color: "var(--text-light)", lineHeight: 1, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-dark)", lineHeight: 1.25 }}>{value}</div>
    </div>
  );

  // ── Health pill style ───────────────────────────────────────────────────────
  const healthPillStyle = (status: string | null): React.CSSProperties => {
    if (status === "good")            return { background: "#e6f4e6", borderColor: "#b6d9b6", color: "var(--green-mid)" };
    if (status === "needs_treatment") return { background: "var(--red-soft)", borderColor: "#f0c0bc", color: "var(--red-warn)" };
    return { background: "var(--yellow-soft)", borderColor: "#f0d9a0", color: "var(--yellow-warn)" };
  };

  // ── Task timing color ────────────────────────────────────────────────────────
  const taskTimingColor = (status: string): string => {
    if (status === "overdue") return "var(--red-warn)";
    if (status === "due")     return "var(--yellow-warn)";
    return "var(--text-light)";
  };

  // ── Journal dot style ────────────────────────────────────────────────────────
  const jDotColor = (type: string): string => {
    if (type === "done") return "var(--green-mid)";
    if (type === "skipped") return "var(--text-light)";
    if (type === "problem") return "var(--red-warn)";
    return "var(--blue-mid)";
  };

  return (
    <>
      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Cold protection badge */}
        {plant.temperature_protected && (
          <div style={{ padding: "10px 18px 0" }}>
            <span
              data-testid="protected-badge"
              style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "3px 10px", borderRadius: "12px",
                fontSize: "11px", fontWeight: 500,
                background: "#e8f0fe", color: "#3a5ea8",
              }}
            >
              🏠 {t("detail.protected_badge")}
            </span>
          </div>
        )}

        {/* Meta-Pills */}
        {(plant.location || plant.watering_zone || plant.category || plant.health_status) && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "5px",
            padding: "10px 18px",
            borderBottom: "1px solid var(--border)",
          }}>
            {plant.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, border: "1.5px solid var(--border)", background: "var(--green-mist)", color: "var(--text-mid)", whiteSpace: "nowrap" }}>
                📍 {ts(`defaults.zones.${plant.location}`, { defaultValue: plant.location })}
              </span>
            )}
            {plant.watering_zone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, border: "1.5px solid var(--border)", background: "var(--green-mist)", color: "var(--text-mid)", whiteSpace: "nowrap" }}>
                💧 {ts(`defaults.zones.${plant.watering_zone}`, { defaultValue: plant.watering_zone })}
              </span>
            )}
            {plant.category && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "3px 9px", borderRadius: "20px", fontSize: "11px", fontWeight: 500, border: "1.5px solid var(--border)", background: "var(--green-mist)", color: "var(--text-mid)", whiteSpace: "nowrap" }}>
                🌿 {ts(`defaults.categories.${plant.category}`, { defaultValue: plant.category })}
              </span>
            )}
            {plant.health_status && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px",
                padding: "3px 9px", borderRadius: "20px",
                fontSize: "11px", fontWeight: 600,
                border: "1.5px solid",
                whiteSpace: "nowrap",
                ...healthPillStyle(plant.health_status),
              }}>
                {plant.health_status === "good" ? "✓" : "⚠"} {t(`health_status.${plant.health_status}` as any)}
              </span>
            )}
          </div>
        )}

        {/* Images */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={sectionTitleStyle}>{t("detail.section_images")}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {resolvedImgs.map(({ slotLabel, url, realLabel }) => (
              <div
                key={slotLabel}
                style={{
                  flex: 1, aspectRatio: "1", borderRadius: "10px",
                  background: "var(--green-mist)", border: "1.5px solid var(--border)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: "5px", overflow: "hidden", position: "relative",
                  cursor: url ? "pointer" : "default",
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
                    <span style={{ fontSize: "28px" }}>
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

        {/* Open Tasks */}
        {openTasks.length > 0 && (
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={sectionTitleStyle}>{t("detail.section_tasks")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {openTasks.map((task) => {
                const s = task.schedule;
                const hasNotes = !!s.notes;
                const isExpanded = expandedTaskIds.has(task.week + s.id);
                return (
                  <div
                    key={task.week + s.id}
                    style={{ border: "1.5px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--warm-white)" }}
                  >
                    {/* Task header */}
                    <div
                      role={hasNotes ? "button" : undefined}
                      tabIndex={hasNotes ? 0 : undefined}
                      data-testid={`task-row-${s.id}`}
                      onClick={hasNotes ? () => toggleTask(task.week + s.id) : undefined}
                      onKeyDown={hasNotes ? (e) => (e.key === "Enter" || e.key === " ") && toggleTask(task.week + s.id) : undefined}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 10px",
                        cursor: hasNotes ? "pointer" : "default",
                        background: "var(--green-mist)",
                        touchAction: hasNotes ? "manipulation" : undefined,
                        userSelect: "none",
                      }}
                    >
                      <span style={{ fontSize: "15px", flexShrink: 0 }}>
                        {SCHEDULE_ICON[s.schedule_type] ?? "📌"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-dark)" }}>
                          {s.label ?? s.schedule_type}
                        </div>
                        <div style={{ fontSize: "11px", marginTop: "2px", fontWeight: task.status !== "upcoming" ? 500 : 400, color: taskTimingColor(task.status) }}>
                          {relativeTaskDate(task, tc as any)}
                        </div>
                      </div>
                      {hasNotes && (
                        <span
                          data-testid={`task-toggle-${s.id}`}
                          style={{ fontSize: "10px", color: "var(--text-light)", transition: "transform .2s", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                        >
                          ▾
                        </span>
                      )}
                    </div>
                    {/* Task notes */}
                    {hasNotes && isExpanded && (
                      <div
                        data-testid={`task-notes-${s.id}`}
                        style={{ padding: "9px 10px", fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.55, borderTop: "1px solid var(--border)" }}
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

        {/* Journal / Verlauf */}
        {recentJournal.length > 0 && (
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={sectionTitleStyle}>{t("detail.section_history")}</div>
            <div>
              {recentJournal.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    padding: "5px 0",
                    borderBottom: i < recentJournal.length - 1 ? "0.5px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", marginTop: "4px", flexShrink: 0, background: jDotColor(entry.entry_type) }} />
                  <div style={{ flex: 1, fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.4 }}>
                    {entry.title || t(`detail.last_${entry.entry_type === "done" ? "cut" : "fert"}` as any, { defaultValue: entry.entry_type })}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-light)", flexShrink: 0 }}>
                    {new Date(entry.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pflegehinweise */}
        {plant.care_notes && (
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={sectionTitleStyle}>{t("detail.section_notes")}</div>
            <p style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.6, margin: 0 }}>{plant.care_notes}</p>
          </div>
        )}

        {/* Steckbrief / Facts */}
        <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={sectionTitleStyle}>{t("detail.section_facts")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {factCell(
              t("detail.fact_water"),
              plant.water_demand ? (
                <div style={{ display: "flex", gap: "2px", marginTop: "3px" }}>
                  {[1,2,3,4,5].map((n) => (
                    <div key={n} style={{ width: "8px", height: "8px", borderRadius: "2px", background: n <= waterDemandLevel ? "var(--green-mid)" : "var(--border)" }} />
                  ))}
                </div>
              ) : "–"
            )}
            {factCell(t("detail.fact_sun"),       plant.sun_demand    ? t(`sun_demand.${plant.sun_demand}` as any)       : "–")}
            {factCell(t("detail.fact_soil"),       plant.soil_type     ? t(`soil_type.${plant.soil_type}` as any)         : "–")}
            {factCell(t("detail.fact_temp"),       plant.frost_tolerance_min_c != null ? `${plant.frost_tolerance_min_c}°C` : "–")}
            {factCell(t("detail.fact_bloom"),      bloom)}
            {factCell(t("detail.fact_origin"),     plant.origin_type   ? t(`origin_type.${plant.origin_type}` as any)    : "–")}
            {factCell(t("detail.fact_lifecycle"),  plant.lifecycle     ? t(`lifecycle.${plant.lifecycle}` as any)         : "–")}
            {factCell(t("fields.purchase_date"),   plant.purchase_date  ? new Date(plant.purchase_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) : "–")}
            {factCell(t("fields.purchase_price"),  plant.purchase_price != null ? `${plant.purchase_price.toLocaleString("de-DE")} €` : "–")}
          </div>
        </div>

        {/* Beschreibung */}
        {plant.description && (
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={sectionTitleStyle}>{t("detail.section_description")}</div>
            <p style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.6, margin: 0 }}>{plant.description}</p>
          </div>
        )}

        {/* Weitere Anhänge (PDFs / Dokumente) */}
        {docAttachments.length > 0 && (
          <div style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
            <div style={sectionTitleStyle}>{t("detail.section_attachments")}</div>
            <div>
              {docAttachments.map((att, i) => (
                <div
                  key={att.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "9px",
                    padding: "6px 0",
                    borderBottom: i < docAttachments.length - 1 ? "0.5px solid var(--border)" : "none",
                  }}
                >
                  <span style={{ fontSize: "17px", flexShrink: 0 }}>
                    {att.category === "invoice" ? "📄" : "📎"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-dark)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {att.url.split("/").pop() ?? att.url}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-light)", marginTop: "1px" }}>
                      {catLabel[att.category ?? ""] ?? att.category ?? ""}
                    </div>
                  </div>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: "5px", padding: "2px 7px", fontSize: "11px", color: "var(--text-mid)", cursor: "pointer", textDecoration: "none", flexShrink: 0 }}
                  >
                    ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weitere Bilder — only shown when additional images exist */}
        {extraImgs.length > 0 && (
          <div style={{ padding: "0 18px" }}>
            <CollapsibleSection label={t("detail.section_gallery")}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {extraImgs.map((img) => (
                  <div key={img.id} style={{ width: "72px", height: "72px", borderRadius: "8px", overflow: "hidden", border: "1.5px solid var(--border)", flexShrink: 0 }}>
                    <img src={img.url} alt={img.category ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* Delete — at the very bottom */}
        <div style={{ padding: "13px 18px", display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
          {deleteError && (
            <div
              data-testid="detail-delete-error"
              style={{ fontSize: "11px", color: "var(--red-warn)", marginBottom: "8px", background: "var(--red-soft)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
            >
              {deleteError}
            </div>
          )}
          {confirmOpen ? (
            <div
              data-testid="detail-delete-confirm"
              style={{ background: "var(--red-soft)", border: "1px solid var(--red-warn)", borderRadius: "8px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}
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
                  style={{ ...detailBtnStyle, flex: 1, background: "var(--red-warn)", color: "white", borderColor: "var(--red-warn)" }}
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
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "12px", color: "var(--red-warn)", fontFamily: "var(--font-body)", textDecoration: "underline", textUnderlineOffset: "2px" }}
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
      {/* Header — Emoji + Name/Latin + Close */}
      <div
        style={{
          padding: "16px 18px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "stretch",
          justifyContent: "space-between", flexShrink: 0,
          gap: "12px",
        }}
      >
        {/* Emoji + Names */}
        <div style={{ display: "flex", alignItems: "stretch", gap: "12px", flex: 1 }}>
          {plant.icon && (
            <div style={{ fontSize: "34px", lineHeight: 1, display: "flex", alignItems: "center", flexShrink: 0, paddingTop: "2px" }}>
              {plant.icon}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "19px", color: "var(--green-deep)", fontWeight: 600, lineHeight: 1.2 }}>
              {plant.name_common}
            </div>
            {plant.name_botanical && (
              <div style={{ fontSize: "12px", color: "var(--text-light)", fontStyle: "italic", marginTop: "3px" }}>
                {plant.name_botanical}
              </div>
            )}
          </div>
        </div>
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", fontSize: "16px", padding: "2px", flexShrink: 0, alignSelf: "flex-start", lineHeight: 1 }}
          aria-label={tc("actions.cancel")}
          data-testid="detail-close"
        >
          ✕
        </button>
      </div>

      <PlantDetailContent plant={plant} onDelete={onDelete} />

      {/* Desktop-only edit button — pinned below the scroll area */}
      <div style={{ padding: "11px 18px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          type="button"
          style={{ width: "100%", height: "32px", padding: "0 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500, fontFamily: "var(--font-body)", cursor: "pointer", border: "1.5px solid var(--green-deep)", background: "var(--green-deep)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
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
export { bloomPeriod, bloomColorLabel, lastJournalDate };
export { nextCareTask, STATUS_COLOR };
export type { PlantStatus };
