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

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AiPanel } from "@/components/AiPanel";
import { useAiPanelState } from "@/hooks/useAiPanelState";
import { GardenPlanWidget, type PlanPin } from "@/components/GardenPlanWidget";
import { PlantDetailPanel } from "@/components/PlantDetailPanel";
import { apiClient } from "@/api/client";
import type { Plant } from "@api/plant";
import type { Garden } from "@api/garden";
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
/** Returns the time/status part based on schedule window vs. current week. */
function relativeTaskSub(task: Task): string {
  const cw = currentWeek();
  const { start_week, end_week } = task.schedule;
  if (end_week < cw) {
    // overdue: window has passed
    const weeks = Math.max(1, cw - end_week);
    return weeks === 1 ? "Überfällig seit 1 Woche" : `Überfällig seit ${weeks} Wochen`;
  }
  if (start_week > cw) {
    // upcoming: not yet started — weeks until end of window
    const weeksLeft = end_week - cw;
    if (weeksLeft <= 1) return "In 1 Woche";
    return `In ${weeksLeft} Wochen`;
  }
  // due: currently within window
  return "Aktuell";
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

export function DashboardView() {
  const { t }             = useTranslation("common");
  const { setOpen: setAiOpen } = useAiPanelState();

  const [garden,   setGarden]   = useState<Garden | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<Plant | null>(null);

  // currentWeek month index (0-based)
  const cw = currentWeek();

  useEffect(() => {
    apiClient.getGarden()
      .then((g) => { setGarden(g); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

  // Build monthly schedule summary
  const monthTasks: Array<Array<{ icon: string; label: string; color: string }>> =
    Array.from({ length: 12 }, () => []);
  if (garden) {
    for (const plant of garden.plants) {
      for (const s of plant.schedules) {
        const mIdx = weekToMonthIdx(s.start_week);
        monthTasks[mIdx].push({
          icon:  SCHEDULE_ICON[s.schedule_type] ?? "📌",
          label: s.label ? `${plant.name_common} — ${s.label}` : plant.name_common,
          color: s.color ?? "var(--green-mid)",
        });
      }
    }
  }

  const aiContext = selected
    ? `${selected.icon ?? "🌿"} ${selected.name_common}`
    : `🏠 ${t("nav.dashboard")}`;

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

        {/* Detail panel OR todo list */}
        {selected ? (
          <PlantDetailPanel
            plant={selected}
            onClose={handleDetailClose}
            onEdit={() => {/* navigate to plants view in future story */}}
            onDelete={() => {
              setGarden((g) => g
                ? { ...g, plants: g.plants.filter((p) => p.id !== selected.id) }
                : g
              );
              setSelected(null);
            }}
          />
        ) : (
          <TodoList garden={garden} loading={loading} onTaskResolved={() => {
            apiClient.getGarden()
              .then((g) => setGarden(g))
              .catch(() => {});
          }} />
        )}
      </div>

      {/* ── Center: garden plan + monthly band ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Garden plan (AC #1) */}
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
              legend
            />
          )}
        </div>

        {/* Monthly band */}
        <MonthBand monthTasks={monthTasks} currentMonthIdx={weekToMonthIdx(cw)} />
      </div>

      <AiPanel context={aiContext} />
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
}

function TodoList({ garden, loading, onTaskResolved }: TodoListProps) {
  // Keys of items currently animating out
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const resolve = useCallback(async (todo: TodoEntry, entryType: "done" | "skipped") => {
    const key = todo.key;
    // Start slide-out animation
    setResolving((prev) => new Set([...prev, key]));
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
      // After animation (~300ms), reload
      setTimeout(() => {
        setResolving((prev) => { const s = new Set(prev); s.delete(key); return s; });
        onTaskResolved?.();
      }, 320);
    } catch {
      // Revert animation on error
      setResolving((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  }, [onTaskResolved]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", fontSize: "12px" }}>
        Wird geladen …
      </div>
    );
  }

  if (!garden) return null;

  const todos: TodoEntry[] = [];
  for (const plant of garden.plants) {
    const status = derivePlantStatus(plant);
    if (status === "ok") continue;
    const task = nextCareTask(plant);
    if (!task) continue;
    const key = `${plant.id}-${task.schedule.id}-${task.week}`;
    const typeLabel: Record<string, string> = {
      pruning: "Schneiden", fertilization: "Düngen", misc: "Aufgabe",
    };
    const taskName = task.schedule.label ?? typeLabel[task.schedule.schedule_type] ?? task.schedule.schedule_type;
    todos.push({
      key,
      plant,
      task,
      taskLabel: `${plant.name_common} — ${taskName}`,
      taskSub:   relativeTaskSub(task),
      status:    status as "overdue" | "due" | "upcoming",
    });
  }

  const order = { overdue: 0, due: 1, upcoming: 2 };
  todos.sort((a, b) => order[a.status] - order[b.status]);

  if (todos.length === 0) {
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

      {todos.map((todo) => {
        const isResolving = resolving.has(todo.key);
        return (
          <div
            key={todo.key}
            data-testid="todo-item"
            style={{
              display:    "flex",
              gap:        "7px",
              padding:    "10px 14px 10px 12px",
              borderLeft: `3px solid ${STATUS_COLOR[todo.status]}`,
              background: todo.status === "overdue" ? "var(--red-soft)" : "none",
              transition: "opacity .25s ease, transform .25s ease",
              opacity:    isResolving ? 0 : 1,
              transform:  isResolving ? "translateX(-20px)" : "none",
              overflow:   "hidden",
            }}
          >
            {/* Icon column — acts as bullet point */}
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
                    onClick={() => void resolve(todo, "done")}
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
                    onClick={() => void resolve(todo, "skipped")}
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
            </div>{/* /content column */}
          </div>
        );
      })}

      <div style={{ height: "1px", background: "var(--border)", margin: "6px 18px" }} />
    </div>
  );
}

// ── MonthBand ─────────────────────────────────────────────────────────────────

interface MonthBandProps {
  monthTasks:      Array<Array<{ icon: string; label: string; color: string }>>;
  currentMonthIdx: number;
}

function MonthBand({ monthTasks, currentMonthIdx }: MonthBandProps) {
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
        overflowX:   "auto",
        position:    "relative",
        zIndex:      10,
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
        const tasks   = monthTasks[idx];
        const current = idx === currentMonthIdx;
        return (
          <div
            key={month}
            data-testid={`month-cell-${idx}`}
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
              padding:       "4px 2px",
              cursor:        tasks.length > 0 ? "default" : "default",
              position:      "relative",
            }}
          >
            <div style={{
              fontSize:   "11px",
              fontWeight: 600,
              color:      current ? "var(--green-pale)" : "var(--text-light)",
            }}>
              {month}
            </div>
            {/* Task dots */}
            <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", justifyContent: "center", maxWidth: "40px" }}>
              {tasks.slice(0, 6).map((task, ti) => (
                <div
                  key={ti}
                  title={task.label}
                  style={{
                    width:        "6px",
                    height:       "6px",
                    borderRadius: "50%",
                    background:   current ? "rgba(255,255,255,.6)" : task.color,
                    flexShrink:   0,
                  }}
                />
              ))}
            </div>
            {tasks.length > 6 && (
              <div style={{ fontSize: "9px", color: current ? "var(--green-pale)" : "var(--text-light)" }}>
                +{tasks.length - 6}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
