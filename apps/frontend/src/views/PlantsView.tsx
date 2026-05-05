import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AiPanel } from "@/components/AiPanel";
import { apiClient } from "@/api/client";
import type { Plant } from "@api/plant";
import type { Schedule } from "@api/schedule";
import {
  derivePlantStatus,
  nextCareTask,
  STATUS_COLOR,
  STATUS_BG,
  STATUS_TEXT,
  STATUS_ICON,
  type PlantStatus,
} from "@/lib/plantStatus";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "name_common" | "category" | "location" | "status";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "card";

// ── Helpers ───────────────────────────────────────────────────────────────────

function plantAge(purchaseDate: string | null): string {
  if (!purchaseDate) return "–";
  const years = new Date().getFullYear() - new Date(purchaseDate).getFullYear();
  return `${years} J.`;
}

// Approximate ISO week → short month name (DE)
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

function weekRangeLabel(startWeek: number, endWeek: number): string {
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
    .join(", ");
}

function bloomColors(schedules: Schedule[]): string[] {
  return schedules
    .filter((s) => s.schedule_type === "bloom" && s.color)
    .map((s) => s.color!);
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
    .filter(
      (e) =>
        e.schedule_id && scheduleIds.has(e.schedule_id) && e.entry_type === "done"
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) return "–";
  return new Date(entries[0].date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlantsView() {
  const { t } = useTranslation("plants");

  const [plants,    setPlants]    = useState<Plant[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [search,    setSearch]    = useState("");
  const [view,      setView]      = useState<ViewMode>("table");
  const [sortKey,   setSortKey]   = useState<SortKey>("name_common");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");
  const [selected,  setSelected]  = useState<Plant | null>(null);

  // Load plants on mount
  useEffect(() => {
    apiClient.getGarden()
      .then((g) => { setPlants(g.plants); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plants.filter(
      (p) =>
        !q ||
        p.name_common.toLowerCase().includes(q) ||
        (p.name_botanical ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q)
    );
  }, [plants, search]);

  // Sort
  const sorted = useMemo(() => {
    const statusOrder: PlantStatus[] = ["overdue", "due", "upcoming", "ok"];
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name_common") {
        cmp = a.name_common.localeCompare(b.name_common);
      } else if (sortKey === "category") {
        cmp = (a.category ?? "").localeCompare(b.category ?? "");
      } else if (sortKey === "location") {
        cmp = (a.location ?? "").localeCompare(b.location ?? "");
      } else if (sortKey === "status") {
        cmp =
          statusOrder.indexOf(derivePlantStatus(a)) -
          statusOrder.indexOf(derivePlantStatus(b));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const openTaskCount = filtered.filter((p) => derivePlantStatus(p) !== "ok").length;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleSelectPlant(plant: Plant) {
    setSelected((prev) => (prev?.id === plant.id ? null : plant));
  }

  const aiContext = selected
    ? `${selected.icon ?? "🌿"} ${selected.name_common}`
    : `🌿 ${t("title")}`;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-cream">
        <span className="text-[13px] text-text-light">{t("overview.loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-cream">

      {/* ── Content column ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative" style={{ minWidth: 0 }}>

        {/* Subheader */}
        <div
          style={{
            background:   "var(--warm-white)",
            borderBottom: "1px solid var(--border)",
            padding:      "10px 20px",
            display:      "flex",
            alignItems:   "center",
            gap:          "12px",
            flexShrink:   0,
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", width: "300px", flexShrink: 0 }}>
            <span
              style={{
                position:       "absolute",
                left:           "11px",
                top:            "50%",
                transform:      "translateY(-50%)",
                fontSize:       "13px",
                color:          "var(--text-light)",
                pointerEvents:  "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("overview.search_placeholder")}
              data-testid="plants-search"
              style={{
                width:        "100%",
                background:   "var(--green-mist)",
                border:       "1.5px solid var(--border)",
                borderRadius: "24px",
                padding:      "7px 14px 7px 32px",
                fontSize:     "13px",
                fontFamily:   "var(--font-body)",
                color:        "var(--text-dark)",
                outline:      "none",
              }}
            />
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Count */}
          {!error && (
            <span
              style={{ fontSize: "12px", color: "var(--text-light)", whiteSpace: "nowrap" }}
              data-testid="plants-count"
            >
              {t("overview.count_other", { count: filtered.length })}
              {openTaskCount > 0 && " " + t("overview.open_tasks_other", { count: openTaskCount })}
            </span>
          )}

          {/* View toggle */}
          <div
            style={{
              display:      "flex",
              background:   "var(--green-mist)",
              border:       "1.5px solid var(--border)",
              borderRadius: "8px",
              overflow:     "hidden",
              flexShrink:   0,
            }}
          >
            {(["table", "card"] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                title={t(`overview.view_${v}`)}
                data-testid={`view-${v}`}
                style={{
                  padding:    "6px 11px",
                  fontSize:   "15px",
                  border:     "none",
                  background: view === v ? "var(--green-deep)" : "none",
                  color:      view === v ? "white" : "var(--text-light)",
                  cursor:     "pointer",
                  transition: "all .15s",
                }}
              >
                {v === "table" ? "☰" : "⊞"}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 px-4 py-3 rounded-lg bg-red-soft border-[1.5px] border-red-warn text-[13px] text-red-warn">
            ⚠️ Pflanzen konnten nicht geladen werden.
          </div>
        )}

        {/* Main area: table/card only (detail panel moved outside content column) */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Table view */}
          {view === "table" && (
            <div style={{ flex: 1, overflow: "auto" }} data-testid="plants-table">
              {sorted.length === 0 ? (
                <EmptyState search={search} t={t} />
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--warm-white)" }}>
                    <tr>
                      <th style={thStyle(false)} />
                      <SortHeader label={t("table.col_name")}     col="name_common" current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label={t("table.col_category")} col="category"    current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label={t("table.col_location")} col="location"    current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th style={thStyle(false)}>{t("table.col_bloom")}</th>
                      <th style={thStyle(false)}>{t("table.col_last_cut")}</th>
                      <th style={thStyle(false)}>{t("table.col_last_fert")}</th>
                      <th style={thStyle(false)}>{t("table.col_task")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((plant) => (
                      <PlantRow
                        key={plant.id}
                        plant={plant}
                        selected={selected?.id === plant.id}
                        onClick={() => handleSelectPlant(plant)}
                        t={t}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Card view */}
          {view === "card" && (
            <div
              style={{
                flex:                1,
                display:             "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap:                 "14px",
                padding:             "16px",
                overflowY:           "auto",
                alignContent:        "start",
              }}
              data-testid="plants-cards"
            >
              {sorted.length === 0 ? (
                <div style={{ gridColumn: "1/-1" }}>
                  <EmptyState search={search} t={t} />
                </div>
              ) : (
                sorted.map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    selected={selected?.id === plant.id}
                    onClick={() => handleSelectPlant(plant)}
                    t={t}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* FAB (AC #6) */}
        <button
          type="button"
          title={t("overview.add_plant")}
          data-testid="fab-add-plant"
          onClick={() => {/* wired up in Plant Edit story */}}
          style={{
            position:       "absolute",
            bottom:         "24px",
            right:          "24px",
            width:          "48px",
            height:         "48px",
            borderRadius:   "12px",
            background:     "var(--green-deep)",
            color:          "white",
            border:         "none",
            fontSize:       "26px",
            fontWeight:     300,
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            boxShadow:      "0 4px 16px rgba(45,74,45,.35)",
            transition:     "background .2s, transform .15s",
            lineHeight:     1,
            zIndex:         10,
          }}
          className="hover:bg-green-mid"
        >
          ＋
        </button>
      </div>

      {/* Detail panel — right of content, left of AI panel, full height */}
      <div
        data-testid="detail-panel"
        style={{
          width:        selected ? "300px" : "0",
          overflow:     "hidden",
          background:   "var(--warm-white)",
          borderLeft:   selected ? "1px solid var(--border)" : "none",
          display:      "flex",
          flexDirection:"column",
          transition:   "width .3s ease",
          flexShrink:   0,
        }}
      >
        {selected && <DetailPanel plant={selected} onClose={() => setSelected(null)} t={t} />}
      </div>

      <AiPanel context={aiContext} />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function thStyle(sorted: boolean): React.CSSProperties {
  return {
    padding:         "10px 14px",
    textAlign:       "left",
    fontSize:        "10px",
    fontWeight:      700,
    letterSpacing:   "0.8px",
    textTransform:   "uppercase",
    color:           sorted ? "var(--green-deep)" : "var(--text-light)",
    borderBottom:    "2px solid var(--border)",
    whiteSpace:      "nowrap",
    userSelect:      "none",
  };
}

interface SortHeaderProps {
  label:   string;
  col:     SortKey;
  current: SortKey;
  dir:     SortDir;
  onSort:  (k: SortKey) => void;
}

function SortHeader({ label, col, current, dir, onSort }: SortHeaderProps) {
  const active = col === current;
  return (
    <th
      style={{ ...thStyle(active), cursor: "pointer" }}
      onClick={() => onSort(col)}
    >
      {label}
      <span style={{ opacity: active ? 1 : 0.4, marginLeft: "4px", fontSize: "10px" }}>
        {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );
}

interface PlantRowProps {
  plant:    Plant;
  selected: boolean;
  onClick:  () => void;
  t:        ReturnType<typeof useTranslation<"plants">>["t"];
}

function PlantRow({ plant, selected, onClick, t }: PlantRowProps) {
  const status    = derivePlantStatus(plant);
  const careTask  = nextCareTask(plant);
  const colors    = bloomColors(plant.schedules);
  const colorName = bloomColorLabel(plant.schedules);

  return (
    <tr
      onClick={onClick}
      data-testid="plant-row"
      style={{
        borderBottom: "1px solid var(--border)",
        background:   selected ? "#e4f0e0" : undefined,
        cursor:       "pointer",
        transition:   "background .12s",
      }}
      className={selected ? "" : "hover:bg-green-mist"}
    >
      {/* Thumbnail */}
      <td style={{ padding: "10px 14px" }}>
        <div
          style={{
            width:          "40px",
            height:         "40px",
            borderRadius:   "8px",
            border:         "1.5px solid var(--border)",
            fontSize:       "22px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "var(--green-mist)",
            flexShrink:     0,
          }}
        >
          {plant.icon ?? "🌿"}
        </div>
      </td>

      {/* Name */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: "13px" }}>
            {plant.name_common}
          </span>
          {plant.name_botanical && (
            <span style={{ fontSize: "10px", color: "var(--text-light)", fontStyle: "italic" }}>
              {plant.name_botanical}
            </span>
          )}
        </div>
      </td>

      {/* Category */}
      <td style={{ padding: "10px 14px", fontSize: "12.5px", color: "var(--text-mid)" }}>
        {plant.category ?? "–"}
      </td>

      {/* Location */}
      <td style={{ padding: "10px 14px", fontSize: "12.5px", color: "var(--text-mid)" }}>
        {plant.location ?? "–"}
      </td>

      {/* Bloom — swatch left, months top, color name bottom (matches mockup .bloom-cell) */}
      <td style={{ padding: "10px 14px" }}>
        {colors.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width:        "16px",
                height:       "16px",
                borderRadius: "4px",
                border:       "1px solid rgba(0,0,0,.12)",
                flexShrink:   0,
                background:   colors[0],
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--text-mid)" }}>
                {bloomPeriod(plant.schedules)}
              </span>
              {colorName && (
                <span style={{ fontSize: "11.5px", color: "var(--text-light)" }}>
                  {colorName}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span style={{ color: "var(--text-light)" }}>–</span>
        )}
      </td>

      {/* Last cut */}
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: "11.5px", color: "var(--text-mid)", whiteSpace: "nowrap" }}>
          {lastJournalDate(plant, "pruning")}
        </span>
      </td>

      {/* Last fertilization */}
      <td style={{ padding: "10px 14px" }}>
        <span style={{ fontSize: "11.5px", color: "var(--text-mid)", whiteSpace: "nowrap" }}>
          {lastJournalDate(plant, "fertilization")}
        </span>
      </td>

      {/* Next care task (no bloom) — pill + month range below */}
      <td style={{ padding: "10px 14px" }}>
        {careTask ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <TaskPill
              status={careTask.status as PlantStatus}
              label={careTask.schedule.label ?? careTask.schedule.schedule_type}
              scheduleColor={careTask.schedule.color}
              t={t}
            />
            <span style={{ fontSize: "10px", color: "var(--text-light)", paddingLeft: "4px" }}>
              {weekRangeLabel(careTask.schedule.start_week, careTask.schedule.end_week)}
            </span>
          </div>
        ) : (
          <span style={{ color: "var(--text-light)" }}>–</span>
        )}
      </td>

      {/* Status dot — for test assertions; visually hidden via 0 width to not show as column */}
      <td style={{ padding: 0, width: 0, overflow: "hidden" }}>
        <span
          data-testid={`status-dot-${plant.id}`}
          style={{ display: "none", background: STATUS_COLOR[status] }}
        />
      </td>
    </tr>
  );
}

interface PlantCardProps {
  plant:    Plant;
  selected: boolean;
  onClick:  () => void;
  t:        ReturnType<typeof useTranslation<"plants">>["t"];
}

function PlantCard({ plant, selected, onClick, t: _t }: PlantCardProps) {
  const status   = derivePlantStatus(plant);
  const careTask = nextCareTask(plant);

  return (
    <div
      onClick={onClick}
      data-testid="plant-card"
      style={{
        background:   "var(--warm-white)",
        border:       selected
          ? `1.5px solid var(--green-mid)`
          : "1.5px solid var(--border)",
        boxShadow:    selected ? "0 0 0 2px var(--green-pale)" : undefined,
        borderRadius: "12px",
        overflow:     "hidden",
        cursor:       "pointer",
        transition:   "all .2s",
      }}
      className={selected ? "" : "hover:border-green-mid hover:shadow-ga hover:-translate-y-0.5"}
    >
      {/* Image area */}
      <div
        style={{
          height:         "110px",
          background:     "var(--green-mist)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "42px",
          position:       "relative",
        }}
      >
        {plant.icon ?? "🌿"}
        <div
          style={{
            position:     "absolute",
            top:          "8px",
            right:        "8px",
            width:        "10px",
            height:       "10px",
            borderRadius: "50%",
            border:       "2px solid white",
            background:   STATUS_COLOR[status],
          }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-dark)", marginBottom: "2px" }}>
          {plant.name_common}
        </div>
        {plant.name_botanical && (
          <div style={{ fontSize: "10px", color: "var(--text-light)", fontStyle: "italic", marginBottom: "8px" }}>
            {plant.name_botanical}
          </div>
        )}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {plant.category && (
            <span
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                padding:      "3px 8px",
                borderRadius: "12px",
                fontSize:     "10px",
                fontWeight:   500,
                background:   "var(--green-mist)",
                color:        "var(--green-mid)",
              }}
            >
              {plant.category}
            </span>
          )}
          {careTask && (
            <TaskPill
              status={careTask.status as PlantStatus}
              label={careTask.schedule.label ?? careTask.schedule.schedule_type}
              scheduleColor={careTask.schedule.color}
              t={_t}
            />
          )}

        </div>
      </div>
    </div>
  );
}

interface TaskPillProps {
  status:        PlantStatus;
  label:         string;
  scheduleColor: string | null;
  t:             ReturnType<typeof useTranslation<"plants">>["t"];
}

function TaskPill({ status, label, scheduleColor }: TaskPillProps) {
  return (
    <span
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "5px",
        padding:      "3px 8px",
        borderRadius: "12px",
        fontSize:     "11px",
        fontWeight:   500,
        whiteSpace:   "nowrap",
        background:   STATUS_BG[status],
        color:        STATUS_TEXT[status],
      }}
    >
      {/* Color swatch from schedule — replaces the generic status icon */}
      {scheduleColor ? (
        <span
          style={{
            width:        "9px",
            height:       "9px",
            borderRadius: "2px",
            background:   scheduleColor,
            flexShrink:   0,
            display:      "inline-block",
            border:       "1px solid rgba(0,0,0,.15)",
          }}
        />
      ) : (
        STATUS_ICON[status]
      )}
      {label}
    </span>
  );
}

interface DetailPanelProps {
  plant:   Plant;
  onClose: () => void;
  t:       ReturnType<typeof useTranslation<"plants">>["t"];
}

// Schedule type → display icon
const SCHEDULE_ICON: Record<string, string> = {
  bloom:         "🌸",
  growth:        "🌱",
  foliage:       "🍃",
  pruning:       "✂️",
  fertilization: "💧",
  misc:          "📋",
};

function DetailPanel({ plant, onClose, t }: DetailPanelProps) {
  const bloom      = bloomPeriod(plant.schedules);
  const lastCut    = lastJournalDate(plant, "pruning");
  const lastFert   = lastJournalDate(plant, "fertilization");

  const bloomColor = plant.schedules
    .filter((s) => s.schedule_type === "bloom" && s.label)
    .map((s) => s.label)
    .join(", ") || "–";

  // Only care task schedules (no bloom, foliage, growth), sorted by start_week
  const TASK_TYPES = ["pruning", "fertilization", "misc"];
  const sortedSchedules = [...plant.schedules]
    .filter((s) => TASK_TYPES.includes(s.schedule_type))
    .sort((a, b) => a.start_week - b.start_week);

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding:        "16px 18px 12px",
          borderBottom:   "1px solid var(--border)",
          display:        "flex",
          alignItems:     "flex-start",
          justifyContent: "space-between",
          flexShrink:     0,
        }}
      >
        <div>
          <div
            style={{
              fontFamily:  "var(--font-display)",
              fontSize:    "18px",
              color:       "var(--green-deep)",
              fontWeight:  600,
              lineHeight:  1.2,
            }}
          >
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
          style={{
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      "var(--text-light)",
            fontSize:   "16px",
            padding:    "2px",
            flexShrink: 0,
          }}
          aria-label="Detailansicht schließen"
          data-testid="detail-close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex:          1,
          overflowY:     "auto",
          padding:       "16px 18px",
          display:       "flex",
          flexDirection: "column",
          gap:           "16px",
        }}
      >
        {/* Description — first, before images */}
        {plant.description && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_description")}</div>
            <div style={{ fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.5 }}>
              {plant.description}
            </div>
          </div>
        )}

        {/* Images */}
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
                  flex:           1,
                  aspectRatio:    "1",
                  borderRadius:   "10px",
                  background:     "var(--green-mist)",
                  border:         "1.5px solid var(--border)",
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "4px",
                  fontSize:       "26px",
                  cursor:         "pointer",
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

        {/* Facts — Herkunft + Lifecycle statt Alter */}
        <div>
          <div style={sectionTitleStyle}>{t("detail.section_facts")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: t("detail.fact_type"),      value: plant.category ?? "–" },
              { label: t("detail.fact_location"),   value: plant.location ?? "–" },
              { label: t("detail.fact_bloom"),      value: bloom },
              { label: t("detail.fact_color"),      value: bloomColor },
              { label: t("detail.fact_origin"),     value: plant.origin_type ? t(`origin_type.${plant.origin_type}`) : "–" },
              { label: t("detail.fact_lifecycle"),  value: plant.lifecycle   ? t(`lifecycle.${plant.lifecycle}`)     : "–" },
              { label: t("detail.fact_temp"),       value: plant.frost_tolerance_min_c != null ? `${plant.frost_tolerance_min_c}°C` : "–" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "var(--green-mist)", borderRadius: "8px", padding: "8px 10px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--text-light)", marginBottom: "3px" }}>
                  {label}
                </div>
                <div style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-dark)" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Care history */}
        <div>
          <div style={sectionTitleStyle}>{t("detail.section_history")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              { icon: "✂️", label: t("detail.last_cut"),  value: lastCut  },
              { icon: "💧", label: t("detail.last_fert"), value: lastFert },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--green-mist)", borderRadius: "8px", gap: "8px" }}
              >
                <span>{icon}</span>
                <span style={{ fontSize: "12.5px", fontWeight: 500, flex: 1 }}>{label}</span>
                <span style={{ fontSize: "11px", color: "var(--text-light)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Care notes */}
        {plant.care_notes && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_notes")}</div>
            <div
              style={{
                background: "var(--yellow-soft)", border: "1px solid #f0d9a0",
                borderRadius: "8px", padding: "10px 12px",
                fontSize: "12px", color: "var(--text-mid)", lineHeight: 1.5,
              }}
            >
              {plant.care_notes}
            </div>
          </div>
        )}

        {/* Schedules / Tasks — sorted by start_week */}
        {sortedSchedules.length > 0 && (
          <div>
            <div style={sectionTitleStyle}>{t("detail.section_tasks")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {sortedSchedules.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display:     "flex",
                    alignItems:  "center",
                    gap:         "8px",
                    padding:     "8px 10px",
                    background:  "var(--green-mist)",
                    borderRadius:"8px",
                  }}
                >
                  {/* Color swatch */}
                  <div style={{
                    width: "12px", height: "12px", borderRadius: "3px",
                    background: s.color ?? "var(--border)",
                    border: "1px solid rgba(0,0,0,.1)", flexShrink: 0,
                  }} />
                  {/* Icon + label */}
                  <span style={{ fontSize: "13px", flexShrink: 0 }}>
                    {SCHEDULE_ICON[s.schedule_type] ?? "📌"}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 500, flex: 1, color: "var(--text-dark)" }}>
                    {s.label ?? s.schedule_type}
                  </span>
                  {/* Week range */}
                  <span style={{ fontSize: "11px", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                    {weekRangeLabel(s.start_week, s.end_week)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display:     "flex",
          gap:         "8px",
          padding:     "12px 18px",
          borderTop:   "1px solid var(--border)",
          flexShrink:  0,
        }}
      >
        <button type="button" style={detailBtnStyle} data-testid="detail-btn-assistant">
          {t("detail.btn_assistant")}
        </button>
        <button type="button" style={{ ...detailBtnStyle, background: "var(--green-deep)", color: "white", borderColor: "var(--green-deep)" }} data-testid="detail-btn-edit">
          {t("detail.btn_edit")}
        </button>
      </div>
    </>
  );
}

function EmptyState({ search, t }: { search: string; t: ReturnType<typeof useTranslation<"plants">>["t"] }) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "60px 20px",
        color:          "var(--text-light)",
        fontSize:       "13px",
      }}
      data-testid="plants-empty"
    >
      {search ? t("overview.no_results") : t("overview.no_plants")}
    </div>
  );
}

// ── Style constants ───────────────────────────────────────────────────────────

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
  padding:        "8px",
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
};
