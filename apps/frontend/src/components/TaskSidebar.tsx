/**
 * TaskSidebar — shared task + weather panel.
 *
 * Used by:
 *   - DashboardView (desktop): rendered in the 320 px left column
 *   - MobileTaskView (mobile):  rendered inside the scrollable content area
 *
 * Contains:
 *   - WeatherWidgetCompact  (accordion: current conditions + 5-day + soil sparklines)
 *   - WarningsBanner        (frost warnings + dry-soil zone warnings)
 *   - Task list             (Überfällig / Diese Woche / Demnächst sections + TaskRow)
 *
 * Does NOT contain any navigation chrome (TopBar, BottomNav, LeftDrawer, ChatPanel).
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check, Thermometer } from "lucide-react";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";
import type { Task } from "@api/task";
import type { SoilMoistureZone } from "@api/weather";
import { apiClient } from "@/api/client";
import { derivePlantStatus, nextCareTask } from "@/lib/plantStatus";
import {
  computeFrostWarnings,
  useWeatherState,
  useSoilState,
  type FrostWarning,
} from "@/views/DashboardView";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentWeek(): number {
  const now  = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, opts?: Record<string, unknown>) => string;

export function relativeTaskDate(task: Task, t: TFn): string {
  const cw = currentWeek();
  const { start_week, end_week } = task.schedule;
  if (task.status === "overdue") {
    const weeks = Math.max(1, cw - end_week);
    return t("dashboard.task_overdue_other", { count: weeks });
  }
  if (task.status === "upcoming") {
    const weeksUntil = start_week - cw;
    return t("dashboard.task_due_other", { count: Math.max(1, weeksUntil) });
  }
  const weeksLeft = end_week - cw;
  if (weeksLeft <= 0) return t("dashboard.task_current");
  return t("dashboard.task_within_other", { count: weeksLeft });
}

function resolveWeatherCodeKey(code: number): string {
  const known = [0,1,2,3,45,48,51,53,55,61,63,65,71,73,75,80,81,82,85,86,95,96,99];
  if (known.includes(code)) return String(code);
  const lower = [...known].reverse().find((k) => k <= code);
  return String(lower ?? 0);
}

export function buildSparklineSvg(
  history: SoilMoistureZone["history"],
  warn: boolean,
  fieldCapacity: number,
  dryThresholdPct: number,
): string {
  const W = 268, H = 36, PAD = 3;
  const vals = history.map((d) => d.moisture);
  if (vals.length === 0) return "";

  const xs = vals.map((_, i) => PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2));
  const ys = vals.map((v) => H - PAD - (v / 100) * (H - PAD * 2));

  const threshold = fieldCapacity * (dryThresholdPct / 100);
  const ty = H - PAD - (threshold / 100) * (H - PAD * 2);

  const areaPath =
    `M${xs[0]},${ys[0]}` +
    xs.slice(1).map((x, i) => `L${x},${ys[i + 1]}`).join("") +
    ` L${xs[xs.length - 1]},${H - PAD} L${xs[0]},${H - PAD} Z`;

  const linePath =
    `M${xs[0]},${ys[0]}` +
    xs.slice(1).map((x, i) => `L${x},${ys[i + 1]}`).join("");

  const lc = warn ? "#d4850a" : "#4a7c4a";
  const fc = warn ? "rgba(212,133,10,.12)" : "rgba(74,124,74,.12)";
  const lx = xs[xs.length - 1];
  const ly = ys[ys.length - 1];

  const labels = [0, Math.floor(vals.length / 2), vals.length - 1]
    .map((i) => {
      const label = i === vals.length - 1 ? "heute" : `-${vals.length - 1 - i}d`;
      return `<text x="${xs[i].toFixed(1)}" y="${H + 9}" font-size="7" fill="#8a9e8a" text-anchor="middle">${label}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H + 12}" width="100%" height="48" xmlns="http://www.w3.org/2000/svg">
    <line x1="${PAD}" y1="${ty.toFixed(1)}" x2="${W - PAD}" y2="${ty.toFixed(1)}" stroke="${warn ? "#f5c6c2" : "#c8dfc0"}" stroke-width="1" stroke-dasharray="3,2"/>
    <path d="${areaPath}" fill="${fc}"/>
    <path d="${linePath}" fill="none" stroke="${lc}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${lc}"/>
    ${labels}
  </svg>`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TodoEntry = {
  key:       string;
  plant:     Plant;
  task:      Task;
  taskLabel: string;
  taskDate:  string;
  status:    "overdue" | "due" | "upcoming";
};

// ── WeatherWidgetCompact ──────────────────────────────────────────────────────

export function WeatherWidgetCompact({
  zones,
  dryThresholdPct,
}: {
  zones:           string[];
  dryThresholdPct: number;
}) {
  const { t, i18n } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const tw = t as TFn;

  const weatherState = useWeatherState();
  const soilState    = useSoilState();

  const codeKey =
    weatherState.status === "ok"
      ? resolveWeatherCodeKey(weatherState.data.current_weather_code)
      : "0";
  const icon  = weatherState.status === "ok" ? tw(`weather.weather_icon.${codeKey}`) : "🌤️";
  const label = weatherState.status === "ok" ? tw(`weather.weather_code.${codeKey}`) : "";

  const soilZones = soilState.status === "ok"
    ? soilState.data.zones.filter((z) => zones.includes(z.zone))
    : [];
  const dryZones   = soilZones.filter((z) => z.status === "dry");
  const hasDry     = dryZones.length > 0;
  const soilValues = soilZones.map((z) => z.current);
  const soilMax    = soilValues.length > 0 ? Math.max(...soilValues) : null;
  const soilMin    = soilValues.length > 0 ? Math.min(...soilValues) : null;

  const forecast = weatherState.status === "ok" ? weatherState.data.forecast : [];
  const tempMax  = forecast.length > 0 ? Math.max(...forecast.map((d) => d.temp_max)) : null;
  const tempMin  = forecast.length > 0 ? Math.min(...forecast.map((d) => d.temp_min)) : null;
  const hasFrost = tempMin !== null && tempMin < 0;

  return (
    <div
      data-testid="mobile-weather"
      style={{
        background:   "#fff",
        margin:       "8px 10px 0",
        borderRadius: "12px",
        border:       "1px solid #dde8d8",
        overflow:     "hidden",
      }}
    >
      {/* Collapsed row */}
      <button
        data-testid="mobile-weather-toggle"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width:      "100%",
          background: "none",
          border:     "none",
          cursor:     "pointer",
          padding:    "10px 12px",
          display:    "flex",
          alignItems: "center",
          gap:        "10px",
          textAlign:  "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "22px", lineHeight: 1 }}>{String(icon)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {weatherState.status === "ok" ? (
              <>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#1e2e1e" }}>
                  {weatherState.data.current_temp}°C · {weatherState.data.city}
                </div>
                <div style={{ fontSize: "11px", color: "#8a9e8a" }}>{String(label)}</div>
              </>
            ) : (
              <div style={{ fontSize: "12px", color: "#8a9e8a" }}>
                {weatherState.status === "loading" ? t("weather.loading") : t("weather.no_location")}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-end", flexShrink: 0 }}>
          {tempMax !== null && tempMin !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", color: hasFrost ? "#c0392b" : "#1e2e1e" }}>
              <Thermometer size={12} strokeWidth={1.5} color={hasFrost ? "#c0392b" : "#e07b00"} />
              {tempMax}°/{tempMin}°
            </span>
          )}
          {soilMax !== null && soilMin !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap", color: hasDry ? "#c0392b" : "#4a7c4a" }}>
              <span style={{ fontSize: "12px", lineHeight: 1 }}>💧</span>
              {soilMax}%/{soilMin}%
            </span>
          )}
        </div>

        <span style={{
          color:      "#8a9e8a",
          flexShrink: 0,
          transition: "transform .2s",
          transform:  expanded ? "rotate(180deg)" : "none",
          display:    "flex",
        }}>
          <ChevronDown size={14} strokeWidth={1.5} />
        </span>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div data-testid="mobile-weather-expanded" style={{ borderTop: "1px solid #eef4eb" }}>
          {/* 5-day forecast */}
          {weatherState.status === "ok" && (
            <div style={{ display: "flex", padding: "8px 10px", gap: "3px", borderBottom: "1px solid #eef4eb" }}>
              {weatherState.data.forecast.map((day, idx) => {
                const dk      = resolveWeatherCodeKey(day.weather_code);
                const d       = new Date(day.date + "T12:00:00");
                const wd      = d.toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-GB", { weekday: "short" });
                const isFrost = day.temp_min < 0;
                return (
                  <div
                    key={day.date}
                    style={{
                      flex:          1,
                      display:       "flex",
                      flexDirection: "column",
                      alignItems:    "center",
                      gap:           "3px",
                      padding:       "5px 2px",
                      borderRadius:  "8px",
                      background:    idx === 0 ? "#eef4eb" : "none",
                    }}
                  >
                    <div style={{ fontSize: "10px", color: "#8a9e8a", fontWeight: 500 }}>
                      {idx === 0 ? (i18n.language === "de" ? "Heute" : "Today") : wd}
                    </div>
                    <span style={{ fontSize: "15px", lineHeight: 1 }}>{tw(`weather.weather_icon.${dk}`)}</span>
                    <div style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 500, color: "#1e2e1e" }}>{day.temp_max}°</span>
                      <span style={{ color: "#c8dfc0", margin: "0 1px" }}>/</span>
                      <span style={{ color: isFrost ? "#c0392b" : "#8a9e8a", fontWeight: isFrost ? 500 : 400 }}>
                        {day.temp_min}°
                      </span>
                    </div>
                    <div style={{ fontSize: "9px", color: "#5b8fc9", whiteSpace: "nowrap" }}>
                      {tw("weather.precipitation", { mm: day.precipitation })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Soil moisture sparklines */}
          {zones.length > 0 && soilState.status === "ok" && (
            <div style={{ padding: "10px 12px 12px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".7px", textTransform: "uppercase", color: "#8a9e8a", marginBottom: "8px" }}>
                {t("mobile.moisture_title")}
              </div>
              {soilState.data.zones
                .filter((z) => zones.includes(z.zone))
                .map((z) => {
                  const warn = z.status === "dry";
                  const svg  = buildSparklineSvg(z.history, warn, z.field_capacity, dryThresholdPct);
                  return (
                    <div key={z.zone} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 500, color: "#1e2e1e" }}>{z.zone}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 500, color: warn ? "#d4850a" : "#4a7c4a" }}>
                            {z.current} %
                          </span>
                          {warn && (
                            <span style={{ fontSize: "10px", color: "#c0392b", background: "#fdf0ee", borderRadius: "20px", padding: "1px 6px" }}>
                              ⚠ trocken
                            </span>
                          )}
                        </div>
                      </div>
                      {/* eslint-disable-next-line react/no-danger */}
                      <div dangerouslySetInnerHTML={{ __html: svg }} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── WarningsBanner ────────────────────────────────────────────────────────────

/** Combined frost + dry-soil warnings banner. */
export function WarningsBanner({
  frostWarnings,
  dryZones,
}: {
  frostWarnings: FrostWarning[];
  dryZones:      string[];
}) {
  const { t } = useTranslation("common");
  if (frostWarnings.length === 0 && dryZones.length === 0) return null;

  return (
    <div
      data-testid="warnings-banner"
      style={{
        margin:       "6px 10px 0",
        background:   "#fdf0ee",
        border:       "1px solid #f5c6c2",
        borderRadius: "10px",
        padding:      "7px 10px",
        display:      "flex",
        gap:          "7px",
        alignItems:   "flex-start",
      }}
    >
      <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠️</span>
      <div style={{ fontSize: "11px", color: "#c0392b", lineHeight: 1.4 }}>
        {frostWarnings.map((w, i) => (
          <div key={`frost-${i}`}>
            <strong style={{ fontWeight: 500 }}>{w.message}</strong>
            {w.sub ? ` · ${w.sub}` : ""}
          </div>
        ))}
        {dryZones.map((zone) => (
          <div key={`dry-${zone}`}>
            <strong style={{ fontWeight: 500 }}>
              {t("mobile.dry_zone_warning", { zone })}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

export function SectionHeader({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div style={{ padding: "10px 12px 4px", display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: ".8px", textTransform: "uppercase", color }}>
        {label}
      </span>
      <span style={{ fontSize: "10px", color: "#8a9e8a" }}>{count}</span>
    </div>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

export function TaskRow({
  todo,
  onDone,
  onSkip,
}: {
  todo:   TodoEntry;
  onDone: (todo: TodoEntry) => void;
  onSkip: (todo: TodoEntry) => void;
}) {
  const { t } = useTranslation("common");
  const [checked, setChecked] = useState(false);

  const checkColor =
    todo.status === "overdue" ? "#c0392b" :
    todo.status === "due"     ? "#d4850a" : "#4a78c0";

  const dateColor =
    todo.status === "overdue" ? "#c0392b" :
    todo.status === "due"     ? "#d4850a" : "#8a9e8a";

  const bloomSchedule = todo.plant.schedules.find((s) => s.schedule_type === "bloom");
  const bloomColor    = bloomSchedule?.color ?? null;
  const bloomName     = bloomSchedule?.label ?? null;

  return (
    <div
      data-testid="mobile-task-row"
      style={{
        background:   "#fff",
        margin:       "0 10px 4px",
        borderRadius: "10px",
        border:       "1px solid #dde8d8",
        padding:      "8px 10px",
        display:      "flex",
        gap:          "8px",
        alignItems:   "flex-start",
        opacity:      checked ? 0.4 : 1,
        transition:   "opacity .2s",
      }}
    >
      {/* Circular checkbox */}
      <button
        data-testid="mobile-task-checkbox"
        aria-label={t("dashboard.task_done")}
        onClick={() => { setChecked(true); setTimeout(() => onDone(todo), 200); }}
        style={{
          width:          "18px",
          height:         "18px",
          borderRadius:   "50%",
          border:         `2px solid ${checked ? "#4a7c4a" : checkColor}`,
          background:     checked ? "#4a7c4a" : "none",
          color:          "#fff",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          cursor:         "pointer",
          flexShrink:     0,
          marginTop:      "1px",
          fontSize:       "11px",
          transition:     "all .15s",
        }}
      >
        {checked ? <Check size={10} strokeWidth={2.5} /> : null}
      </button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px", lineHeight: 1.3 }}>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#1e2e1e", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {todo.taskLabel}
          </span>
          <span style={{ fontSize: "10px", color: dateColor, flexShrink: 0, whiteSpace: "nowrap" }}>
            {todo.taskDate}
          </span>
        </div>
        <div style={{ display: "flex", gap: "4px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#4a5e4a", background: "#eef4eb", borderRadius: "20px", padding: "1px 6px" }}>
            {todo.plant.icon ?? "🌿"} {todo.plant.name_common}
          </span>
          {todo.plant.location && (
            <span style={{ fontSize: "11px", color: "#8a9e8a" }}>
              {todo.plant.location}
            </span>
          )}
          {bloomColor && bloomName && (
            <span style={{
              fontSize:     "11px",
              borderRadius: "20px",
              padding:      "1px 7px",
              fontWeight:   500,
              border:       "1px solid rgba(0,0,0,.08)",
              background:   bloomColor,
              color:        "#1e2e1e",
            }}>
              {bloomName}
            </span>
          )}
        </div>
      </div>

      {/* Skip button */}
      {(todo.status === "overdue" || todo.status === "due") && (
        <button
          data-testid="mobile-task-skip"
          onClick={(e) => { e.stopPropagation(); onSkip(todo); }}
          style={{
            fontSize:     "10px",
            color:        "#8a9e8a",
            padding:      "1px 6px",
            border:       "1px solid #dde8d8",
            borderRadius: "20px",
            background:   "#fff",
            cursor:       "pointer",
            flexShrink:   0,
            marginTop:    "1px",
          }}
        >
          {t("mobile.task_skip")}
        </button>
      )}
    </div>
  );
}

// ── TaskSidebar ───────────────────────────────────────────────────────────────

export interface TaskSidebarProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function TaskSidebar({ garden, loading, invalidateGarden }: TaskSidebarProps) {
  const { t, i18n } = useTranslation("common");

  const assistantSettings = useAssistantSettings();
  const weatherState      = useWeatherState();
  const soilState         = useSoilState();

  const zones           = assistantSettings?.irrigation_zones ?? [];
  const dryThresholdPct = assistantSettings?.soil_moisture_dry_threshold_pct ?? 40;

  // Frost warnings
  const frostWarnings: FrostWarning[] = (() => {
    if (!garden || weatherState.status !== "ok") return [];
    return computeFrostWarnings(
      garden.plants,
      weatherState.data.forecast,
      i18n.language,
      t as TFn,
    );
  })();

  // Dry-zone warnings from soil state
  const dryZones: string[] = (() => {
    if (soilState.status !== "ok" || zones.length === 0) return [];
    return soilState.data.zones
      .filter((z) => zones.includes(z.zone) && z.status === "dry")
      .map((z) => z.zone);
  })();

  // Build todo entries
  const todos: TodoEntry[] = (() => {
    if (!garden) return [];
    const result: TodoEntry[] = [];
    for (const plant of garden.plants) {
      const status = derivePlantStatus(plant);
      if (status === "ok") continue;
      const task = nextCareTask(plant);
      if (!task) continue;
      const key = `${plant.id}-${task.schedule.id}-${task.week}`;
      const taskName =
        task.schedule.label ??
        (t as TFn)(`schedule_type.${task.schedule.schedule_type}`) ??
        task.schedule.schedule_type;
      result.push({
        key,
        plant,
        task,
        taskLabel: taskName,
        taskDate:  relativeTaskDate(task, t as TFn),
        status:    status as "overdue" | "due" | "upcoming",
      });
    }
    const order = { overdue: 0, due: 1, upcoming: 2 };
    result.sort((a, b) => order[a.status] - order[b.status]);
    return result;
  })();

  const overdue  = todos.filter((td) => td.status === "overdue");
  const thisWeek = todos.filter((td) => td.status === "due");
  const upcoming = todos.filter((td) => td.status === "upcoming");

  const resolve = useCallback(async (todo: TodoEntry, entryType: "done" | "skipped") => {
    try {
      await apiClient.createJournalEntry({
        plant_id:       todo.plant.id,
        schedule_id:    todo.task.schedule.id,
        week:           todo.task.week,
        entry_type:     entryType,
        title:          null,
        notes:          null,
        date:           new Date().toISOString().slice(0, 10),
        attachment_ids: [],
      });
      invalidateGarden();
    } catch {
      // Silently ignore — garden will retain the task until next refresh
    }
  }, [invalidateGarden]);

  return (
    <div
      data-testid="task-sidebar"
      style={{
        display:       "flex",
        flexDirection: "column",
        width:         "100%",
        height:        "100%",
        background:    "#f8f4ee",
        overflow:      "hidden",
      }}
    >
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <WeatherWidgetCompact zones={zones} dryThresholdPct={dryThresholdPct} />

        <WarningsBanner frostWarnings={frostWarnings} dryZones={dryZones} />

        {loading && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("dashboard.loading")}
          </div>
        )}

        {!loading && (
          <>
            {/* todo-list wrapper preserves existing dashboard test testid */}
            <div data-testid="todo-list">
              {overdue.length > 0 && (
                <>
                  <SectionHeader label={t("mobile.section_overdue")}   count={overdue.length}  color="#c0392b" />
                  {overdue.map((todo) => (
                    <TaskRow key={todo.key} todo={todo} onDone={(td) => void resolve(td, "done")} onSkip={(td) => void resolve(td, "skipped")} />
                  ))}
                </>
              )}

              {thisWeek.length > 0 && (
                <>
                  <SectionHeader label={t("mobile.section_this_week")} count={thisWeek.length} color="#d4850a" />
                  {thisWeek.map((todo) => (
                    <TaskRow key={todo.key} todo={todo} onDone={(td) => void resolve(td, "done")} onSkip={(td) => void resolve(td, "skipped")} />
                  ))}
                </>
              )}

              {upcoming.length > 0 && (
                <>
                  <SectionHeader label={t("mobile.section_upcoming")}  count={upcoming.length} color="#4a78c0" />
                  {upcoming.map((todo) => (
                    <TaskRow key={todo.key} todo={todo} onDone={(td) => void resolve(td, "done")} onSkip={(td) => void resolve(td, "skipped")} />
                  ))}
                </>
              )}

              {todos.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
                  {t("dashboard.tasks_empty")}
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ height: "8px" }} />
      </div>
    </div>
  );
}
