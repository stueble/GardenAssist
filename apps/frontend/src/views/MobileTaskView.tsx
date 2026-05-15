/**
 * MobileTaskView — story-083.
 *
 * Mobile task screen (≤ 768 px). Layout mirrors the HTML mockup exactly:
 *   TopBar → scroll area (search + weather + frost + task sections) →
 *   ChatPanel (in-flow, not overlay) → BottomNav
 *
 * Weather + soil data re-use the singleton caches from DashboardView so
 * no duplicate polling occurs.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Menu, MessageCircle, Search, ChevronDown,
  Check, Plus,
} from "lucide-react";
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
import { topBtnStyle, BottomNav, LeftDrawer, ChatPanel } from "@/components/mobile/MobileParts";

// ── Helpers ────────────────────────────────────────────────────────────────────

function currentWeek(): number {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFn = (key: string, opts?: Record<string, unknown>) => string;

function relativeTaskDate(task: Task, t: TFn): string {
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

// Builds an SVG sparkline for a zone's 14-day moisture history.
function buildSparklineSvg(
  history: SoilMoistureZone["history"],
  warn: boolean,
  fieldCapacity: number,
): string {
  const W = 268, H = 36, PAD = 3;
  const vals = history.map((d) => d.moisture);
  if (vals.length === 0) return "";

  const xs = vals.map((_, i) => PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2));
  const ys = vals.map((v) => H - PAD - (v / 100) * (H - PAD * 2));

  const threshold = fieldCapacity * 0.4; // 40 % of field capacity ≈ dry threshold
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

type TodoEntry = {
  key: string;
  plant: Plant;
  task: Task;
  taskLabel: string;
  taskDate: string;
  status: "overdue" | "due" | "upcoming";
};

// ── Sub-components ─────────────────────────────────────────────────────────────

// TopBar
function TopBar({
  onMenuClick,
  onChatClick,
  chatOpen,
}: {
  onMenuClick: () => void;
  onChatClick: () => void;
  chatOpen: boolean;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      data-testid="mobile-topbar"
      style={{
        background:    "#2d4a2d",
        display:       "flex",
        alignItems:    "center",
        padding:       "0 10px",
        height:        "44px",
        gap:           "4px",
        flexShrink:    0,
      }}
    >
      {/* Hamburger */}
      <button
        data-testid="mobile-hamburger"
        aria-label="Menü öffnen"
        onClick={onMenuClick}
        style={topBtnStyle}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Title */}
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: "18px",
        color:      "#fff",
        fontWeight: 600,
        flex:       1,
      }}>
        {t("mobile.tasks")}
      </div>

      {/* + button (new task — placeholder, task 083 scope excludes new-task sheet) */}
      <button
        data-testid="mobile-add-btn"
        aria-label="Neue Aufgabe"
        style={{ ...topBtnStyle, background: "rgba(255,255,255,.15)" }}
      >
        <Plus size={20} strokeWidth={1.5} />
      </button>

      {/* Chat icon */}
      <button
        data-testid="mobile-chat-btn"
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
            position:     "absolute",
            top:          "5px",
            right:        "5px",
            width:        "7px",
            height:       "7px",
            borderRadius: "50%",
            background:   "#7aab6a",
            border:       "1.5px solid #2d4a2d",
          }} />
        )}
      </button>
    </div>
  );
}



// SearchBar — AC #12
function SearchBar() {
  const { t } = useTranslation("common");
  return (
    <div style={{ padding: "8px 10px 0" }}>
      <div
        data-testid="mobile-search"
        style={{
          background:   "#dde8d8",
          borderRadius: "20px",
          display:      "flex",
          alignItems:   "center",
          gap:          "6px",
          padding:      "6px 12px",
        }}
      >
        <Search size={13} strokeWidth={1.5} color="#4a5e4a" />
        <span style={{ fontSize: "13px", color: "#8a9e8a" }}>
          {t("mobile.search_placeholder")}
        </span>
      </div>
    </div>
  );
}

// WeatherWidgetMobile — AC #3, #4
function WeatherWidgetMobile({ zones }: { zones: string[] }) {
  const { t, i18n } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const tw = t as TFn;

  const weatherState = useWeatherState();
  const soilState    = useSoilState();

  const codeKey =
    weatherState.status === "ok"
      ? resolveWeatherCodeKey(weatherState.status === "ok" ? weatherState.data.current_weather_code : 0)
      : "0";
  const icon  = weatherState.status === "ok" ? tw(`weather.weather_icon.${codeKey}`) : "🌤️";
  const label = weatherState.status === "ok" ? tw(`weather.weather_code.${codeKey}`) : "";

  // Compute warning pills from soil data
  const moistureWarnings: string[] = [];
  if (soilState.status === "ok") {
    for (const z of soilState.data.zones) {
      if (z.status === "dry") {
        moistureWarnings.push(z.zone);
      }
    }
  }

  // Frost pill: any forecast day temp_min < 0
  const hasFrost =
    weatherState.status === "ok" &&
    weatherState.data.forecast.some((d) => d.temp_min < 0);

  const firstFrostDay =
    weatherState.status === "ok"
      ? weatherState.data.forecast.find((d) => d.temp_min < 0)
      : undefined;

  const frostLabel = firstFrostDay
    ? (() => {
        const d = new Date(firstFrostDay.date + "T12:00:00");
        const wd = d.toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-GB", { weekday: "short" });
        return `❄ ${wd} ${firstFrostDay.temp_min}°C`;
      })()
    : t("mobile.frost_pill");

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
          width:          "100%",
          background:     "none",
          border:         "none",
          cursor:         "pointer",
          padding:        "10px 12px",
          display:        "flex",
          alignItems:     "center",
          gap:            "10px",
          textAlign:      "left",
        }}
      >
        {/* Icon + temp/city */}
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

        {/* Warning pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-end", flexShrink: 0 }}>
          {hasFrost && (
            <span style={{ fontSize: "10px", borderRadius: "20px", padding: "2px 7px", fontWeight: 500, whiteSpace: "nowrap", background: "#fdf0ee", color: "#c0392b", border: "1px solid #f5c6c2" }}>
              {frostLabel}
            </span>
          )}
          {moistureWarnings.length > 0 && (
            <span style={{ fontSize: "10px", borderRadius: "20px", padding: "2px 7px", fontWeight: 500, whiteSpace: "nowrap", background: "#e8f0fb", color: "#185fa5", border: "1px solid #b5d4f4" }}>
              {t("mobile.moisture_pill")}
            </span>
          )}
        </div>

        {/* Chevron */}
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
        <div
          data-testid="mobile-weather-expanded"
          style={{ borderTop: "1px solid #eef4eb" }}
        >
          {/* 5-day forecast */}
          {weatherState.status === "ok" && (
            <div style={{ display: "flex", padding: "8px 10px", gap: "3px", borderBottom: "1px solid #eef4eb" }}>
              {weatherState.data.forecast.map((day, idx) => {
                const dk = resolveWeatherCodeKey(day.weather_code);
                const d = new Date(day.date + "T12:00:00");
                const wd = d.toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-GB", { weekday: "short" });
                const isFrost = day.temp_min < 0;
                return (
                  <div
                    key={day.date}
                    style={{
                      flex:           1,
                      display:        "flex",
                      flexDirection:  "column",
                      alignItems:     "center",
                      gap:            "3px",
                      padding:        "5px 2px",
                      borderRadius:   "8px",
                      background:     idx === 0 ? "#eef4eb" : "none",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "#8a9e8a", fontWeight: 500 }}>
                      {idx === 0 ? (i18n.language === "de" ? "Heute" : "Today") : wd}
                    </div>
                    <span style={{ fontSize: "14px", lineHeight: 1 }}>{tw(`weather.weather_icon.${dk}`)}</span>
                    <div style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 500, color: "#1e2e1e" }}>{day.temp_max}°</span>
                      <span style={{ color: "#c8dfc0", margin: "0 1px" }}>/</span>
                      <span style={{ color: isFrost ? "#c0392b" : "#8a9e8a", fontWeight: isFrost ? 500 : 400 }}>
                        {day.temp_min}°
                      </span>
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
                  const svg = buildSparklineSvg(z.history, warn, z.field_capacity);
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

// FrostBanner — AC #5
function FrostBanner({ warnings }: { warnings: FrostWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div
      data-testid="mobile-frost-banner"
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
        {warnings.map((w, i) => (
          <div key={i}><strong style={{ fontWeight: 500 }}>{w.message}</strong>{w.sub ? ` · ${w.sub}` : ""}</div>
        ))}
      </div>
    </div>
  );
}

// Section header — AC #6
function SectionHeader({
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

// Individual task row — AC #7, #8
function TaskRow({
  todo,
  onDone,
  onSkip,
}: {
  todo: TodoEntry;
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

  // Derive bloom color from the plant's bloom schedule (if any)
  const bloomSchedule = todo.plant.schedules.find((s) => s.schedule_type === "bloom");
  const bloomColor = bloomSchedule?.color ?? null;
  const bloomName  = bloomSchedule?.label ?? null;

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
          fontSize: "11px",
          transition:     "all .15s",
        }}
      >
        {checked ? <Check size={10} strokeWidth={2.5} /> : null}
      </button>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 500, color: "#1e2e1e", lineHeight: 1.3 }}>
          {todo.taskLabel}
        </div>
        <div style={{ display: "flex", gap: "4px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Plant tag */}
          <span style={{ fontSize: "10px", color: "#4a5e4a", background: "#eef4eb", borderRadius: "20px", padding: "1px 6px" }}>
            {todo.plant.icon ?? "🌿"} {todo.plant.name_common}
          </span>
          {/* Location */}
          {todo.plant.location && (
            <span style={{ fontSize: "10px", color: "#8a9e8a" }}>
              {todo.plant.location}
            </span>
          )}
          {/* Bloom color pill */}
          {bloomColor && bloomName && (
            <span style={{
              fontSize: "10px",
              borderRadius:"20px",
              padding:     "1px 7px",
              fontWeight:  500,
              border:      "1px solid rgba(0,0,0,.08)",
              background:  bloomColor,
              color:       "#1e2e1e",
            }}>
              {bloomName}
            </span>
          )}
          {/* Relative date */}
          <span style={{ fontSize: "10px", color: dateColor }}>
            {todo.taskDate}
          </span>
        </div>
      </div>

      {/* Skip button — only for overdue */}
      {todo.status === "overdue" && (
        <button
          data-testid="mobile-task-skip"
          onClick={(e) => { e.stopPropagation(); onSkip(todo); }}
          style={{
            fontSize: "10px",
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

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobileTaskViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobileTaskView({ garden, loading, invalidateGarden }: MobileTaskViewProps) {
  const { t, i18n } = useTranslation("common");
  const [chatOpen,   setChatOpen]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const assistantSettings = useAssistantSettings();

  // Frost warnings (recomputed from weather + garden plants)
  const weatherState = useWeatherState();
  const frostWarnings: FrostWarning[] = (() => {
    if (!garden || weatherState.status !== "ok") return [];
    return computeFrostWarnings(
      garden.plants,
      weatherState.data.forecast,
      i18n.language,
      t as TFn,
    );
  })();

  // Build todo entries from garden
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

  const overdue    = todos.filter((t) => t.status === "overdue");
  const thisWeek   = todos.filter((t) => t.status === "due");
  const upcoming   = todos.filter((t) => t.status === "upcoming");

  // Resolve (done / skipped)
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
      data-testid="mobile-task-view"
      style={{
        display:       "flex",
        flexDirection: "column",
        height:        "100%",
        background:    "#f8f4ee",
        position:      "relative",
        overflow:      "hidden",
      }}
    >
      <TopBar
        onMenuClick={() => setDrawerOpen(true)}
        onChatClick={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <SearchBar />

        <WeatherWidgetMobile
          zones={assistantSettings?.irrigation_zones ?? []}
        />

        <FrostBanner warnings={frostWarnings} />

        {loading && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("dashboard.loading")}
          </div>
        )}

        {!loading && (
          <>
            {overdue.length > 0 && (
              <>
                <SectionHeader
                  label={t("mobile.section_overdue")}
                  count={overdue.length}
                  color="#c0392b"
                />
                {overdue.map((todo) => (
                  <TaskRow
                    key={todo.key}
                    todo={todo}
                    onDone={(td) => void resolve(td, "done")}
                    onSkip={(td) => void resolve(td, "skipped")}
                  />
                ))}
              </>
            )}

            {thisWeek.length > 0 && (
              <>
                <SectionHeader
                  label={t("mobile.section_this_week")}
                  count={thisWeek.length}
                  color="#d4850a"
                />
                {thisWeek.map((todo) => (
                  <TaskRow
                    key={todo.key}
                    todo={todo}
                    onDone={(td) => void resolve(td, "done")}
                    onSkip={(td) => void resolve(td, "skipped")}
                  />
                ))}
              </>
            )}

            {upcoming.length > 0 && (
              <>
                <SectionHeader
                  label={t("mobile.section_upcoming")}
                  count={upcoming.length}
                  color="#4a78c0"
                />
                {upcoming.map((todo) => (
                  <TaskRow
                    key={todo.key}
                    todo={todo}
                    onDone={(td) => void resolve(td, "done")}
                    onSkip={(td) => void resolve(td, "skipped")}
                  />
                ))}
              </>
            )}

            {todos.length === 0 && (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
                {t("dashboard.tasks_empty")}
              </div>
            )}
          </>
        )}

        <div style={{ height: "8px" }} />
      </div>

      {/* In-flow chat panel — pushes scroll area up, not an overlay */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/" />

      {/* Left drawer — positioned absolute within this container */}
      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
