/**
 * DashboardView — story-030.
 *
 * Layout: 280px left column (weather + todo list OR plant detail) +
 *         flex center (garden plan + monthly band) +
 *         AI chat strip (right).
 *
 * AC #1  Garden plan from Garden.plan_url; placeholder if not uploaded
 * AC #2  Plant pins at x/y positions with emoji + colored ring
 * AC #3  Red dot on pin if plant has overdue/current tasks
 * AC #4  Hover tooltip: name, status, next task
 * AC #5  Click pin opens PlantDetailPanel in left column
 * AC #6  ↕ ↔ zoom buttons
 * AC #7  Legend bottom-left
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { GardenPlanWidget, type PlanPin } from "@/components/GardenPlanWidget";
import { PlantDetailPanel } from "@/components/PlantDetailPanel";
import { apiClient, getWeather } from "@/api/client";
import type { WeatherData }  from "@api/weather";
import { getPlantEditHandler } from "@/hooks/usePlantEditContext";
import type { Plant } from "@api/plant";
import type { Garden, Warning } from "@api/garden";
import type { Task } from "@api/task";
import {
  derivePlantStatus,
  nextCareTask,
  STATUS_COLOR,
  STATUS_TEXT,
  STATUS_ICON,
} from "@/lib/plantStatus";
import { weekRangeLabel, SCHEDULE_ICON } from "@/components/PlantDetailPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Current ISO week number (1–53). */
function currentWeek(): number {
  const now  = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

/** Week number → approximate month index (0-based). */
function weekToMonthIdx(week: number): number {
  return Math.min(11, Math.floor((week - 1) / 4.33));
}

// Month arrays are now read from i18n — this constant is removed.

/**
 * Build the sub-line text for a todo item.
 * - overdue: "Überfällig seit N Wochen · Pflanzename"  (weeks since end_week)
 * - due:     "Jetzt fällig · Pflanzename"
 * - upcoming:"Demnächst · Pflanzename"
 */
/** Returns the time/status part using task.status + schedule window for counts.
 *  t() is passed in from the component to keep this function pure. */
function relativeTaskSub(task: Task, t: TFn): string {
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
  // due: within window
  const weeksLeft = end_week - cw;
  if (weeksLeft <= 0) return t("dashboard.task_current");
  return t("dashboard.task_within_other", { count: weeksLeft });
}

/** Build a PlanPin from a plant position for the Dashboard. */
function plantToPin(plant: Plant, posIdx: number, selectedId: string | null): PlanPin {
  const pos    = plant.positions[posIdx];
  const status = derivePlantStatus(plant);
  const task   = nextCareTask(plant);

  const taskStr = task
    ? `${SCHEDULE_ICON[task.schedule.schedule_type] ?? "📌"} ${task.schedule.label ?? ""} (${weekRangeLabel(task.schedule.start_week, task.schedule.end_week)})`
    : undefined;

  const statusLabel = status; // translated in useMemo below using tPlants("status.<status>")

  const firstPhoto = plant.attachments.find((a) => a.attachment_type === "image");

  return {
    x:        pos.x_percent,
    y:        pos.y_percent,
    emoji:    plant.icon ?? "🌿",
    photoUrl: firstPhoto?.url,
    name:     plant.name_common,
    color:      "rgba(255,255,255,.15)",
    taskStatus:  (status === "overdue" || status === "due") ? status : undefined,
    protected:   plant.temperature_protected || undefined,
    selected:    selectedId === plant.id,
    tooltip:     { status: statusLabel, nextTask: taskStr },
  };
}

// ── Frost warnings ────────────────────────────────────────────────────────────

/**
 * Computes frost warnings from the 5-day weather forecast for plants that:
 * - have a frost_tolerance_min_c set
 * - are NOT cold-protected (temperature_protected === false)
 *
 * Returns one Warning per affected plant, showing the first day the
 * forecast temp_min falls below the plant's limit.
 */
/** Warning extended with an optional plant ID for click-to-select behaviour. */
export type FrostWarning = Warning & { plantId?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, opts?: Record<string, unknown>) => string;

export function computeFrostWarnings(
  plants: Plant[],
  forecast: import("@api/weather").WeatherDay[],
  language: string,
  t: TFn,
): FrostWarning[] {
  const locale = language === "de" ? "de-DE" : "en-GB";
  const warnings: FrostWarning[] = [];

  for (const plant of plants) {
    if (plant.temperature_protected) continue;
    if (plant.frost_tolerance_min_c === null) continue;

    const limit = plant.frost_tolerance_min_c;
    const firstDay = forecast.find((day) => day.temp_min < limit);
    if (!firstDay) continue;

    const d = new Date(firstDay.date + "T12:00:00");
    const weekday = d.toLocaleDateString(locale, { weekday: "long" });
    const dateStr = d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });

    const name = plant.location
      ? `${plant.name_common} (${plant.location})`
      : plant.name_common;

    const sub = t("dashboard.frost_warning", {
      weekday,
      date: dateStr,
      plant: name,
      min: limit,
      forecast: firstDay.temp_min,
    });

    warnings.push({ message: `❄️ ${name}`, sub, plantId: plant.id });
  }

  return warnings;
}

// ── Main component ─────────────────────────────────────────────────────────────

interface DashboardViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function DashboardView({ garden, loading, invalidateGarden }: DashboardViewProps) {
  const { t, i18n }       = useTranslation("common");
  const { t: tPlants }    = useTranslation("plants");
  const assistantSettings = useAssistantSettings();

  const [selected, setSelected] = useState<Plant | null>(null);
  const [weather,  setWeather]  = useState<WeatherData | null>(null);

  // Frost warnings — recomputed whenever garden plants or weather forecast changes
  const frostWarnings = useMemo(
    () => (garden && weather)
      ? computeFrostWarnings(garden.plants, weather.forecast, i18n.language, t as TFn)
      : [],
    [garden, weather, i18n.language, t],
  );

  // Keep selected in sync with garden updates (e.g. after save via GlobalPlantEditOverlay)
  useEffect(() => {
    if (selected && garden) {
      const fresh = garden.plants.find((p) => p.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden]);

  // currentWeek month index (0-based)
  const cw = currentWeek();

  // Build pin list: one pin per position per plant
  const pins: Array<{ pin: PlanPin; plant: Plant }> = [];
  if (garden) {
    for (const plant of garden.plants) {
      for (let i = 0; i < plant.positions.length; i++) {
        const pin = plantToPin(plant, i, selected?.id ?? null);
        // Translate the status key into the display label
        if (pin.tooltip?.status) {
          pin.tooltip.status = tPlants(`status.${pin.tooltip.status}` as any);
        }
        pins.push({ pin, plant });
      }
    }
  }

  function handlePinClick(_pin: PlanPin, idx: number) {
    const { plant } = pins[idx];
    setSelected((prev) => prev?.id === plant.id ? null : plant);
  }

  function handleDetailClose() {
    setSelected(null);
  }

  // Build monthly schedule data for the MonthBand (AC #3, #4, #5)
  // One dot per schedule type per month (deduplicated); spans all months the schedule covers.
  const CARE_SCHEDULE_TYPES = new Set(["pruning", "fertilization", "misc"]);
  type MonthGroup = { icon: string; color: string; plants: string[] };
  type MonthData = { dots: Array<{ type: string; color: string }>; groups: Map<string, MonthGroup> };

  const monthData: MonthData[] = Array.from({ length: 12 }, () => ({
    dots:   [],
    groups: new Map<string, MonthGroup>(),
  }));

  if (garden) {
    for (const plant of garden.plants) {
      for (const s of plant.schedules) {
        if (!CARE_SCHEDULE_TYPES.has(s.schedule_type)) continue;
        const icon  = SCHEDULE_ICON[s.schedule_type] ?? "📋";
        const color = s.color ?? "var(--green-mid)";
        const typeLabel: Record<string, string> = {
          pruning: "Schneiden", fertilization: "Düngen",
          misc: "Sonstiges",
        };

        // Determine all months this schedule spans (start_week → end_week)
        const startM = weekToMonthIdx(s.start_week);
        const endM   = weekToMonthIdx(s.end_week);
        const months: number[] = [];
        if (endM >= startM) {
          for (let m = startM; m <= endM; m++) months.push(m);
        } else {
          // Year-wrap: e.g. Nov → Feb
          for (let m = startM; m <= 11; m++) months.push(m);
          for (let m = 0; m <= endM; m++) months.push(m);
        }

        for (const mIdx of months) {
          const md = monthData[mIdx];
          // One dot per type (deduplicated)
          if (!md.dots.find((d) => d.type === s.schedule_type)) {
            md.dots.push({ type: s.schedule_type, color });
          }
          // Tooltip group
          const grpKey = s.schedule_type;
          if (!md.groups.has(grpKey)) {
            md.groups.set(grpKey, { icon, color, plants: [] });
          }
          const grp = md.groups.get(grpKey)!;
          const plantLabel = s.label ? `${plant.name_common} — ${s.label}` : plant.name_common;
          if (!grp.plants.includes(plantLabel)) grp.plants.push(plantLabel);
        }
      }
    }
  }


  useEffect(() => {
    setAssistantContext(
      garden
        ? {
            view:         "dashboard",
            garden,
            selectedPlant: selected ?? undefined,
            settings:     assistantSettings,
            weather:      weather ?? undefined,
          }
        : undefined
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, selected, assistantSettings, weather]);

  return (
    <div
      data-testid="dashboard-view"
      style={{
        display:   "flex",
        flex:      1,
        minHeight: 0,
        overflow:  "hidden",
        background:"var(--cream)",
      }}
    >
      {/* ── Left column ── */}
      <div
        data-testid="dashboard-sidebar"
        style={{
          width:         "320px",
          flexShrink:    0,
          background:    "var(--warm-white)",
          borderRight:   "1px solid var(--border)",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        {/* Weather widget */}
        <WeatherWidget onWeatherLoaded={setWeather} />

        <div style={{ height: "1px", background: "var(--border)", flexShrink: 0 }} />

        {/* Frost warnings — computed from weather forecast × plant frost limits */}
        {frostWarnings.length > 0 && (
          <WarningsSection
            warnings={frostWarnings}
            onPlantSelect={(plantId) => {
              const plant = garden?.plants.find((p) => p.id === plantId);
              if (plant) setSelected((prev) => prev?.id === plantId ? null : plant);
            }}
          />
        )}

        {/* Todo list always in left column */}
        <TodoList
          garden={garden}
          loading={loading}
          onTaskResolved={invalidateGarden}
          onPlantSelect={(plant) => {
            setSelected((prev) => prev?.id === plant.id ? null : plant);
          }}
        />
      </div>

      {/* ── Center: garden plan + monthly band ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "visible" }}>

        {/* Garden plan */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", fontSize: "13px" }}>
              Wird geladen …
            </div>
          ) : (
            <GardenPlanWidget
              planUrl={garden?.plan_url ?? null}
              pins={pins.map((p) => p.pin)}
              onPinClick={handlePinClick}
              legend={true}
            />
          )}
        </div>

        {/* Monthly band */}
        <MonthBand monthData={monthData} currentMonthIdx={weekToMonthIdx(cw)} />
      </div>

      {/* ── Right panel: Detail view ── */}
      <div
        data-testid="dashboard-detail-panel"
        style={{
          width:         selected ? "360px" : "0",
          minWidth:      selected ? "360px" : "0",
          overflow:      "hidden",
          background:    "var(--warm-white)",
          borderLeft:    selected ? "1px solid var(--border)" : "none",
          display:       "flex",
          flexDirection: "column",
          transition:    "width .3s ease, min-width .3s ease",
          flexShrink:    0,
        }}
      >
        {selected && (
          <PlantDetailPanel
            plant={selected}
            onClose={handleDetailClose}
            onEdit={(p) => getPlantEditHandler()?.editPlant(p.id, {})}
            onDelete={() => {
              invalidateGarden();
              setSelected(null);
            }}
          />
        )}
      </div>

      {/* AiPanel is rendered once in App.tsx — not here */}
    </div>
  );
}

// ── WeatherWidget — module-level singleton cache ──────────────────────────────
// State survives navigation (Dashboard unmount/remount) — no loading flash.
// Polling runs once globally; components just subscribe to the cached state.

const WEATHER_POLL_MS = 60 * 60 * 1000; // 60 minutes

type WeatherState =
  | { status: "loading" }
  | { status: "no_location" }
  | { status: "error" }
  | { status: "ok"; data: WeatherData };

// Singleton state + listener set (same pattern as useAiPanelState)
let _weatherState: WeatherState = { status: "loading" };
let _weatherInterval: ReturnType<typeof setInterval> | null = null;
let _weatherFetching = false;
const _weatherListeners = new Set<(s: WeatherState) => void>();

function setWeatherState(s: WeatherState) {
  _weatherState = s;
  _weatherListeners.forEach((fn) => fn(s));
}

function startWeatherPolling(onLoaded: (data: WeatherData | null) => void) {
  if (_weatherInterval !== null) return; // already running

  function fetchWeather() {
    if (_weatherFetching) return;
    _weatherFetching = true;
    getWeather()
      .then((data) => {
        _weatherFetching = false;
        if (data === null) {
          setWeatherState({ status: "no_location" });
          onLoaded(null);
        } else {
          setWeatherState({ status: "ok", data });
          onLoaded(data);
        }
      })
      .catch(() => {
        _weatherFetching = false;
        setWeatherState({ status: "error" });
      });
  }

  // Fetch immediately (only if still on initial "loading" — skip if cached)
  if (_weatherState.status === "loading") fetchWeather();

  _weatherInterval = setInterval(fetchWeather, WEATHER_POLL_MS);
}

/** Maps a WMO weather code to the nearest key defined in i18n. */
function resolveWeatherCodeKey(code: number): string {
  const known = [0,1,2,3,45,48,51,53,55,61,63,65,71,73,75,80,81,82,85,86,95,96,99];
  if (known.includes(code)) return String(code);
  const lower = [...known].reverse().find((k) => k <= code);
  return String(lower ?? 0);
}

/** Short weekday label from an ISO date string ("2026-05-11" → "Mo"). */
function shortWeekday(isoDate: string, locale: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", { weekday: "short" });
}

function WeatherWidget({ onWeatherLoaded }: { onWeatherLoaded: (data: WeatherData | null) => void }) {
  const { t, i18n } = useTranslation("common");
  // Subscribe to singleton — starts with cached value (no flash on re-mount)
  const [state, setState] = useState<WeatherState>(_weatherState);

  useEffect(() => {
    _weatherListeners.add(setState);
    // Start polling (no-op if already running)
    startWeatherPolling(onWeatherLoaded);
    // If data is already cached, notify context immediately (no fetch needed)
    if (_weatherState.status === "ok") onWeatherLoaded(_weatherState.data);
    else if (_weatherState.status === "no_location") onWeatherLoaded(null);
    return () => { _weatherListeners.delete(setState); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tw = t as (k: string) => string;
  const codeKey = state.status === "ok"
    ? resolveWeatherCodeKey(state.data.current_weather_code)
    : "0";
  const icon  = state.status === "ok" ? tw(`weather.weather_icon.${codeKey}`) : "🌤️";
  const label = state.status === "ok" ? tw(`weather.weather_code.${codeKey}`) : "";

  return (
    <div
      data-testid="weather-widget"
      style={{ padding: "14px 18px 10px", flexShrink: 0 }}
    >
      {/* Current conditions row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span style={{ fontSize: "26px" }} aria-hidden="true">{String(icon)}</span>

        {/* Temp + description */}
        <div style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden" }}>
          {state.status === "loading" && (
            <div style={{ fontSize: "11px", color: "var(--text-light)" }}>
              {t("weather.loading")}
            </div>
          )}
          {state.status === "error" && (
            <div style={{ fontSize: "11px", color: "var(--text-light)" }}>
              {t("weather.error")}
            </div>
          )}
          {state.status === "no_location" && (
            <>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-mid)" }}>
                {t("weather.no_location")}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-light)", marginTop: "2px" }}>
                {t("weather.no_location_hint")}
              </div>
            </>
          )}
          {state.status === "ok" && (
            <>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--green-deep)", lineHeight: 1 }}>
                {state.data.current_temp}°C
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {state.data.city} · {String(label)}
              </div>
            </>
          )}
        </div>

        {/* Precipitation + wind — right side, only when data available */}
        {state.status === "ok" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0, marginLeft: "4px" }}>
            <div style={{ fontSize: "10px", color: "var(--text-light)", whiteSpace: "nowrap" }}>
              💧 {state.data.current_precipitation} mm
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-light)", whiteSpace: "nowrap" }}>
              💨 {state.data.current_wind_kmh} km/h
            </div>
          </div>
        )}
      </div>

      {/* 5-day forecast */}
      <div style={{ display: "flex", gap: "3px" }}>
        {state.status === "ok"
          ? state.data.forecast.map((day) => {
              const dk = resolveWeatherCodeKey(day.weather_code);
              return (
                <div
                  key={day.date}
                  title={tw(`weather.weather_code.${dk}`)}
                  style={{
                    flex: 1,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: "2px",
                    background: "var(--green-mist)", borderRadius: "7px",
                    padding: "6px 4px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-light)" }}>
                    {shortWeekday(day.date, i18n.language)}
                  </div>
                  <span style={{ fontSize: "22px", lineHeight: 1.2 }} aria-hidden="true">
                    {tw(`weather.weather_icon.${dk}`)}
                  </span>
                  <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-mid)", whiteSpace: "nowrap" }}>
                    {day.temp_max}°/<span style={{ color: "var(--text-light)", fontWeight: 400 }}>{day.temp_min}°</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-light)" }}>
                    {day.precipitation > 0 ? `${day.precipitation} mm` : "0 mm"}
                  </div>
                </div>
              );
            })
          : [1,2,3,4,5].map((i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px", background: "var(--green-mist)", borderRadius: "7px", padding: "6px 4px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-light)" }}>—</div>
                <span style={{ fontSize: "22px", lineHeight: 1.2 }}>—</span>
                <div style={{ fontSize: "11px", color: "var(--text-light)" }}>—°/—°</div>
                <div style={{ fontSize: "10px", color: "var(--text-light)" }}>— mm</div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── WarningsSection ───────────────────────────────────────────────────────────

function WarningsSection({
  warnings,
  onPlantSelect,
}: {
  warnings: FrostWarning[];
  onPlantSelect?: (plantId: string) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div data-testid="warnings-section">
      {/* Section label */}
      <div style={{
        fontSize: "10px", fontWeight: 600, letterSpacing: "1px",
        textTransform: "uppercase", color: "var(--text-light)",
        padding: "8px 18px 4px",
      }}>
        {t("dashboard.warnings_title")}
      </div>

      {warnings.map((w, i) => {
        const clickable = !!(w.plantId && onPlantSelect);
        return (
          <div
            key={i}
            data-testid="warning-item"
            onClick={clickable ? () => onPlantSelect!(w.plantId!) : undefined}
            style={{
              display:    "flex",
              gap:        "7px",
              padding:    "10px 14px 10px 12px",
              borderLeft: "3px solid #e67e22",
              cursor:     clickable ? "pointer" : "default",
              transition: "background .12s",
            }}
            className={clickable ? "hover:bg-green-mist" : ""}
          >
            {/* Orange dot — 20px wide to align with task icon column */}
            <div style={{
              width:          "20px",
              flexShrink:     0,
              display:        "flex",
              alignItems:     "flex-start",
              justifyContent: "center",
              paddingTop:     "5px",
            }}>
              <div style={{
                width:        "8px",
                height:       "8px",
                borderRadius: "50%",
                background:   "#e67e22",
                flexShrink:   0,
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-dark)", lineHeight: 1.35 }}>
                {w.message}
              </div>
              {w.sub && (
                <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px" }}>
                  {w.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ height: "1px", background: "var(--border)", margin: "6px 18px" }} />
    </div>
  );
}

// ── TodoList ──────────────────────────────────────────────────────────────────

type TodoEntry = {
  key:       string;             // unique key for React + resolving set
  plant:     Plant;
  task:      Task;
  taskLabel: string;
  taskSub:   string;
  status:    "overdue" | "due" | "upcoming";
};

interface TodoListProps {
  garden:          Garden | null;
  loading:         boolean;
  onTaskResolved?: () => void;
  onPlantSelect?:  (plant: Plant) => void;
}

function TodoList({ garden, loading, onTaskResolved, onPlantSelect }: TodoListProps) {
  const { t } = useTranslation("common");
  // Own stable copy of todos — only refreshed from garden when nothing is animating
  const [stableTodos, setStableTodos] = useState<TodoEntry[]>([]);
  // Keys currently animating out
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  // Blocks stableTodos updates while an animation + reload cycle is in progress
  const blockUpdateRef = useRef(false);

  // Recompute stableTodos from garden whenever garden changes AND no animation is running
  const computeTodos = useCallback((g: Garden): TodoEntry[] => {
    const result: TodoEntry[] = [];
    for (const plant of g.plants) {
      const status = derivePlantStatus(plant);
      if (status === "ok") continue;
      const task = nextCareTask(plant);
      if (!task) continue;
      const key = `${plant.id}-${task.schedule.id}-${task.week}`;
      const taskName = task.schedule.label ?? (t as TFn)(`schedule_type.${task.schedule.schedule_type}`) ?? task.schedule.schedule_type;
      result.push({
        key,
        plant,
        task,
        taskLabel: `${plant.name_common} — ${taskName}`,
        taskSub:   relativeTaskSub(task, t as TFn),
        status:    status as "overdue" | "due" | "upcoming",
      });
    }
    const order = { overdue: 0, due: 1, upcoming: 2 };
    result.sort((a, b) => order[a.status] - order[b.status]);
    return result;
  }, [t]);

  useEffect(() => {
    if (garden && removing.size === 0 && !blockUpdateRef.current) {
      setStableTodos(computeTodos(garden));
    }
  }, [garden, removing.size, computeTodos]);

  const resolve = useCallback(async (todo: TodoEntry, entryType: "done" | "skipped") => {
    const key = todo.key;
    // Block stableTodos updates during the whole animation + reload cycle
    blockUpdateRef.current = true;
    setRemoving((prev) => new Set([...prev, key]));
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
      // Step 1: animation done → remove item and clear removing flag (single batch)
      setTimeout(() => {
        setStableTodos((prev) => prev.filter((t) => t.key !== key));
        setRemoving((prev) => { const s = new Set(prev); s.delete(key); return s; });
        // Step 2: reload garden, then unblock updates so stableTodos syncs cleanly
        onTaskResolved?.();
        setTimeout(() => { blockUpdateRef.current = false; }, 200);
      }, 380);
    } catch {
      // Revert on error
      blockUpdateRef.current = false;
      setRemoving((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  }, [onTaskResolved]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", fontSize: "12px" }}>
        {t("dashboard.loading")}
      </div>
    );
  }

  if (!garden && stableTodos.length === 0) return null;

  if (stableTodos.length === 0 && !loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", color: "var(--text-light)", fontSize: "12px", textAlign: "center" }}>
        {t("dashboard.tasks_empty")}
      </div>
    );
  }

  return (
    <div data-testid="todo-list" style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
      {/* Tasks heading */}
      <div style={{
        fontSize: "10px", fontWeight: 600, letterSpacing: "1px",
        textTransform: "uppercase", color: "var(--text-light)",
        padding: "8px 18px 4px",
      }}>
        {t("dashboard.tasks_title")}
      </div>

      {stableTodos.map((todo) => {
        const isResolving = removing.has(todo.key);
        return (
          // Outer wrapper: handles slide-out animation (height + opacity + translate)
          <div
            key={todo.key}
            data-testid="todo-item"
            onClick={() => onPlantSelect?.(todo.plant)}
            style={{
              maxHeight:  isResolving ? "0" : "200px",
              opacity:    isResolving ? 0 : 1,
              transform:  isResolving ? "translateX(-24px)" : "none",
              overflow:   "hidden",
              transition: "max-height .35s ease, opacity .25s ease, transform .25s ease",
              cursor:     "pointer",
            }}
          >
            {/* Inner: visual styling (border, background, layout) */}
            <div style={{
              display:    "flex",
              gap:        "7px",
              padding:    "10px 14px 10px 12px",
              borderLeft: `3px solid ${STATUS_COLOR[todo.status]}`,
              background: todo.status === "overdue" ? "var(--red-soft)" : todo.status === "due" ? "var(--yellow-soft)" : "none",
            }}>
              {/* Icon column — bullet point */}
              <div style={{
                width:      "20px",
                flexShrink: 0,
                fontSize:   "15px",
                lineHeight: "1.35",
                paddingTop: "1px",
                userSelect: "none",
              }}>
                {SCHEDULE_ICON[todo.task.schedule.schedule_type] ?? "📋"}
              </div>

              {/* Content column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Line 1: plant name — task */}
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-dark)", lineHeight: 1.35, marginBottom: "2px" }}>
                  {todo.taskLabel}
                </div>

                {/* Line 2: relative time · location */}
                <div style={{ fontSize: "11px", color: "var(--text-light)", marginBottom: "7px" }}>
                  {todo.taskSub}{todo.plant.location ? ` · ${todo.plant.location}` : ""}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    type="button"
                    data-testid="todo-btn-done"
                    disabled={isResolving}
                    onClick={(e) => { e.stopPropagation(); void resolve(todo, "done"); }}
                    style={{
                      padding:      "3px 9px",
                      borderRadius: "5px",
                      border:       "none",
                      background:   "var(--green-pale)",
                      color:        "var(--green-deep)",
                      fontSize:     "11px",
                      fontWeight:   600,
                      fontFamily:   "var(--font-body)",
                      cursor:       isResolving ? "default" : "pointer",
                      opacity:      isResolving ? 0.5 : 1,
                      transition:   "all .15s",
                    }}
                    className="hover:bg-green-mid hover:text-white"
                  >
                     {t("dashboard.task_done")}
                  </button>
                  <button
                    type="button"
                    data-testid="todo-btn-skip"
                    disabled={isResolving}
                    onClick={(e) => { e.stopPropagation(); void resolve(todo, "skipped"); }}
                    style={{
                      padding:      "3px 9px",
                      borderRadius: "5px",
                      border:       "1px solid var(--border)",
                      background:   "none",
                      color:        "var(--text-light)",
                      fontSize:     "11px",
                      fontWeight:   500,
                      fontFamily:   "var(--font-body)",
                      cursor:       isResolving ? "default" : "pointer",
                      opacity:      isResolving ? 0.5 : 1,
                      transition:   "opacity .15s",
                    }}
                  >
                    {t("dashboard.task_skip")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ height: "1px", background: "var(--border)", margin: "6px 18px" }} />
    </div>
  );
}

// ── MonthBand ─────────────────────────────────────────────────────────────────

type MonthDotEntry  = { type: string; color: string };
type MonthGroupEntry = { icon: string; color: string; plants: string[] };

interface MonthBandProps {
  monthData:       Array<{ dots: MonthDotEntry[]; groups: Map<string, MonthGroupEntry> }>;
  currentMonthIdx: number;
}

function MonthBand({ monthData, currentMonthIdx }: MonthBandProps) {
  const { t } = useTranslation("common");
  const monthsShort = t("months_short", { returnObjects: true }) as string[];
  const monthsLong  = t("months_long",  { returnObjects: true }) as string[];
  return (
    <div
      data-testid="month-band"
      style={{
        background:  "var(--warm-white)",
        borderTop:   "1px solid var(--border)",
        display:     "flex",
        alignItems:  "center",
        padding:     "8px 12px",
        gap:         "4px",
        height:      "90px",
        flexShrink:  0,
        overflow:    "visible",   // allow tooltips to escape
        position:    "relative",
        zIndex:      200,
      }}
    >
      {/* Vertical label */}
      <div style={{
        fontSize:        "10px",
        fontWeight:      600,
        letterSpacing:   ".8px",
        textTransform:   "uppercase",
        color:           "var(--text-light)",
        writingMode:     "vertical-rl",
        textOrientation: "mixed",
        transform:       "rotate(180deg)",
        padding:         "8px 0",
        marginRight:     "4px",
        flexShrink:      0,
      }}>
        {t("dashboard.overview_label")}
      </div>

      {monthsShort.map((month, idx) => {
        const md      = monthData[idx];
        const current = idx === currentMonthIdx;
        const groups  = [...md.groups.entries()];
        return (
          <div
            key={month}
            data-testid={`month-cell-${idx}`}
            className={current ? "" : "hover:bg-green-mist"}
            style={{
              flex:          1,
              minWidth:      "44px",
              height:        "100%",
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              justifyContent:"center",
              gap:           "3px",
              borderRadius:  "8px",
              background:    current ? "var(--green-deep)" : "var(--green-mist)",
              boxShadow:     current ? "var(--shadow-ga)" : "none",
              padding:       "4px 2px",
              position:      "relative",
              cursor:        "default",
              transition:    "background .2s",
            }}
          >
            {/* Tooltip (CSS :hover via sibling — use React state for reliability) */}
            <MonthTooltip
              monthName={monthsLong[idx]}
              groups={groups}
            />

            <div style={{
              fontSize:   "11px",
              fontWeight: 600,
              color:      current ? "var(--green-pale)" : "var(--text-light)",
            }}>
              {month}
            </div>

            {/* Colored dots — one per schedule type, keep real color on current month */}
            <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", justifyContent: "center", maxWidth: "40px" }}>
              {md.dots.map((dot) => (
                <div
                  key={dot.type}
                  data-testid="month-dot"
                  style={{
                    width:        "6px",
                    height:       "6px",
                    borderRadius: "50%",
                    background:   dot.color,
                    flexShrink:   0,
                  }}
                />
              ))}
              {md.dots.length === 0 && (
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: current ? "rgba(255,255,255,.2)" : "var(--border)",
                  flexShrink: 0,
                }} />
              )}
            </div>
          </div>
        );
      })}

      {/* CSS for hover-triggered tooltip */}
      <style>{`
        .month-cell-wrap:hover .month-tooltip-popup { display: block !important; }
      `}</style>
    </div>
  );
}

// ── MonthTooltip ──────────────────────────────────────────────────────────────

interface MonthTooltipProps {
  monthName: string;
  groups:    Array<[string, MonthGroupEntry]>;
}

function MonthTooltip({ monthName, groups }: MonthTooltipProps) {
  const { t } = useTranslation("common");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }
  function handleMouseLeave() {
    setRect(null);
  }

  const visible = rect !== null;
  const tipLeft = rect ? rect.left + rect.width / 2 : 0;
  const tipBottom = rect ? window.innerHeight - rect.top + 8 : 0;

  return (
    <div
      ref={triggerRef}
      style={{ position: "absolute", inset: 0, zIndex: 9999 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {visible && (
        <div
          data-testid="month-tooltip"
          style={{
            position:     "fixed",
            bottom:       `${tipBottom}px`,
            left:         `${tipLeft}px`,
            transform:    "translateX(-50%)",
            background:   "var(--green-deep)",
            color:        "white",
            borderRadius: "8px",
            padding:      "10px 12px",
            minWidth:     "160px",
            maxWidth:     "300px",
            zIndex:       99999,
            boxShadow:    "var(--shadow-ga-lg)",
            fontSize:     "11px",
            lineHeight:   "1.6",
            whiteSpace:   "normal",
            pointerEvents:"none",
          }}
        >
          {/* Arrow */}
          <div style={{
            position:    "absolute",
            top:         "100%",
            left:        "50%",
            transform:   "translateX(-50%)",
            border:      "6px solid transparent",
            borderTopColor: "var(--green-deep)",
          }} />

          {/* Title */}
          <div style={{
            fontWeight:    600,
            fontSize:      "12px",
            marginBottom:  "6px",
            color:         "var(--green-pale)",
            borderBottom:  "1px solid rgba(255,255,255,.15)",
            paddingBottom: "5px",
          }}>
            {monthName}
          </div>

          {/* Groups */}
          {groups.length === 0 ? (
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>
              {t("dashboard.month_no_tasks")}
            </div>
          ) : (
            groups.map(([type, grp]) => (
              <div key={type}>
                {/* Type heading — icon + label */}
                <div style={{
                  fontSize:      "10px",
                  fontWeight:    700,
                  letterSpacing: ".8px",
                  textTransform: "uppercase",
                  color:         "rgba(255,255,255,.75)",
                  marginTop:     "8px",
                  marginBottom:  "3px",
                }}>
                  {grp.icon} {(t as TFn)(`schedule_type.${type}`)}
                </div>
                {/* Plant entries — indented, dot in schedule color */}
                {grp.plants.map((name) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "1px 0", fontSize: "11.5px", color: "rgba(255,255,255,.92)", paddingLeft: "14px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: grp.color, flexShrink: 0 }} />
                    {name}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
