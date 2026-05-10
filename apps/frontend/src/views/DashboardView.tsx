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

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { GardenPlanWidget, type PlanPin } from "@/components/GardenPlanWidget";
import { PlantDetailPanel } from "@/components/PlantDetailPanel";
import { apiClient } from "@/api/client";
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

const MONTHS_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

/**
 * Build the sub-line text for a todo item.
 * - overdue: "Überfällig seit N Wochen · Pflanzename"  (weeks since end_week)
 * - due:     "Jetzt fällig · Pflanzename"
 * - upcoming:"Demnächst · Pflanzename"
 */
/** Returns the time/status part using task.status + schedule window for counts. */
function relativeTaskSub(task: Task): string {
  const cw = currentWeek();
  const { start_week, end_week } = task.schedule;
  if (task.status === "overdue") {
    const weeks = Math.max(1, cw - end_week);
    return weeks === 1 ? "Überfällig seit 1 Woche" : `Überfällig seit ${weeks} Wochen`;
  }
  if (task.status === "upcoming") {
    const weeksUntil = start_week - cw;
    if (weeksUntil <= 1) return "Fällig in 1 Woche";
    return `Fällig in ${weeksUntil} Wochen`;
  }
  // due: within window
  const weeksLeft = end_week - cw;
  if (weeksLeft <= 0) return "Aktuell (letzte Woche)";
  if (weeksLeft === 1) return "Innerhalb 1 Woche";
  return `Innerhalb ${weeksLeft} Wochen`;
}

/** Build a PlanPin from a plant position for the Dashboard. */
function plantToPin(plant: Plant, posIdx: number, selectedId: string | null): PlanPin {
  const pos    = plant.positions[posIdx];
  const status = derivePlantStatus(plant);
  const task   = nextCareTask(plant);

  const taskStr = task
    ? `${SCHEDULE_ICON[task.schedule.schedule_type] ?? "📌"} ${task.schedule.label ?? ""} (${weekRangeLabel(task.schedule.start_week, task.schedule.end_week)})`
    : undefined;

  const statusLabel = { overdue: "Überfällig", due: "Aktuell", upcoming: "Geplant", ok: "OK" }[status];

  return {
    x:        pos.x_percent,
    y:        pos.y_percent,
    emoji:    plant.icon ?? "🌿",
    name:     plant.name_common,
    color:      "rgba(255,255,255,.15)",
    taskStatus: (status === "overdue" || status === "due") ? status : undefined,
    selected: selectedId === plant.id,
    tooltip:  { status: statusLabel, nextTask: taskStr },
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

interface DashboardViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function DashboardView({ garden, loading, invalidateGarden }: DashboardViewProps) {
  const { t }             = useTranslation("common");
  const assistantSettings = useAssistantSettings();

  const [selected, setSelected] = useState<Plant | null>(null);

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
        pins.push({ pin: plantToPin(plant, i, selected?.id ?? null), plant });
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
        ? { view: "dashboard", garden, selectedPlant: selected ?? undefined, settings: assistantSettings }
        : undefined
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, selected, assistantSettings]);

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
          width:         "280px",
          flexShrink:    0,
          background:    "var(--warm-white)",
          borderRight:   "1px solid var(--border)",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
        }}
      >
        {/* Weather widget (stub) */}
        <WeatherWidget />

        <div style={{ height: "1px", background: "var(--border)", flexShrink: 0 }} />

        {/* Warnings section — only shown when warnings exist (AC #1) */}
        {garden?.warnings && garden.warnings.length > 0 && (
          <WarningsSection warnings={garden.warnings} />
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Garden plan */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
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

// ── WeatherWidget (stub) ──────────────────────────────────────────────────────

function WeatherWidget() {
  return (
    <div
      data-testid="weather-widget"
      style={{ padding: "14px 18px 12px", flexShrink: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <span style={{ fontSize: "26px" }}>🌤</span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 600, color: "var(--green-deep)", lineHeight: 1 }}>
            —°C
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "2px" }}>
            Wetterdaten folgen
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {["Mo","Di","Mi","Do","Fr"].map((d) => (
          <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "var(--green-mist)", borderRadius: "7px", padding: "5px 2px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-light)" }}>{d}</div>
            <span style={{ fontSize: "14px" }}>—</span>
            <div style={{ fontSize: "10px", color: "var(--text-light)" }}>—°</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WarningsSection ───────────────────────────────────────────────────────────

function WarningsSection({ warnings }: { warnings: Warning[] }) {
  return (
    <div data-testid="warnings-section">
      {/* Section label */}
      <div style={{
        fontSize: "10px", fontWeight: 600, letterSpacing: "1px",
        textTransform: "uppercase", color: "var(--text-light)",
        padding: "8px 18px 4px",
      }}>
        ⚠️ Warnungen
      </div>

      {warnings.map((w, i) => (
        <div
          key={i}
          data-testid="warning-item"
          style={{
            display:    "flex",
            gap:        "7px",
            padding:    "10px 14px 10px 12px",
            borderLeft: "3px solid #e67e22",
          }}
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
      ))}

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
      const typeLabel: Record<string, string> = {
        pruning: "Schneiden", fertilization: "Düngen", misc: "Aufgabe",
      };
      const taskName = task.schedule.label ?? typeLabel[task.schedule.schedule_type] ?? task.schedule.schedule_type;
      result.push({
        key,
        plant,
        task,
        taskLabel: `${plant.name_common} — ${taskName}`,
        taskSub:   relativeTaskSub(task),
        status:    status as "overdue" | "due" | "upcoming",
      });
    }
    const order = { overdue: 0, due: 1, upcoming: 2 };
    result.sort((a, b) => order[a.status] - order[b.status]);
    return result;
  }, []);

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
        Wird geladen …
      </div>
    );
  }

  if (!garden && stableTodos.length === 0) return null;

  if (stableTodos.length === 0 && !loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", color: "var(--text-light)", fontSize: "12px", textAlign: "center" }}>
        ✅ Keine offenen Aufgaben
      </div>
    );
  }

  return (
    <div data-testid="todo-list" style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
      {/* Single "Aufgaben" heading */}
      <div style={{
        fontSize: "10px", fontWeight: 600, letterSpacing: "1px",
        textTransform: "uppercase", color: "var(--text-light)",
        padding: "8px 18px 4px",
      }}>
        Aufgaben
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
                    ✓ Erledigt
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
                    → Überspringen
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

const MONTHS_FULL_DE = [
  "Januar","Februar","März","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Dezember",
];

function MonthBand({ monthData, currentMonthIdx }: MonthBandProps) {
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
        Überblick
      </div>

      {MONTHS_DE.map((month, idx) => {
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
              monthName={MONTHS_FULL_DE[idx]}
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
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 201 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <div
          data-testid="month-tooltip"
          style={{
            position:     "absolute",
            bottom:       "calc(100% + 8px)",
            left:         "50%",
            transform:    "translateX(-50%)",
            background:   "var(--green-deep)",
            color:        "white",
            borderRadius: "8px",
            padding:      "10px 12px",
            minWidth:     "160px",
            maxWidth:     "220px",
            zIndex:       201,
            boxShadow:    "var(--shadow-ga-lg)",
            fontSize:     "11px",
            lineHeight:   "1.6",
            whiteSpace:   "nowrap",
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
              Keine Aufgaben
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
                  {grp.icon} {type === "pruning" ? "Schneiden" : type === "fertilization" ? "Düngen" : "Sonstiges"}
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
