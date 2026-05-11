import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getPlantEditHandler } from "@/hooks/usePlantEditContext";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import type { Plant }            from "@api/plant";
import type { Garden }           from "@api/garden";
import type { PendingPlantEdit } from "@api/assistant-context";
import { invalidateGarden }      from "@/hooks/useGarden";
import type { Schedule } from "@api/schedule";
import {
  derivePlantStatus,
  STATUS_BG,
  STATUS_TEXT,
  STATUS_ICON,
} from "@/lib/plantStatus";
import {
  PlantDetailPanel,
  bloomPeriod,
  bloomColorLabel,
  lastJournalDate,
  nextCareTask,
  STATUS_COLOR,
  weekRangeLabel,
  SCHEDULE_ICON,
  type PlantStatus,
} from "@/components/PlantDetailPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "name_common" | "category" | "location" | "status";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "card";

// ── Helpers (local-only) ──────────────────────────────────────────────────────

function bloomColors(schedules: Schedule[]): string[] {
  return schedules
    .filter((s) => s.schedule_type === "bloom" && s.color)
    .map((s) => s.color!);
}

// ── Main component ────────────────────────────────────────────────────────────

interface PlantsViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function PlantsView({ garden, loading }: PlantsViewProps) {
  const { t } = useTranslation("plants");
  const assistantSettings = useAssistantSettings();

  // Derive plants from the shared garden prop.
  const plants = garden?.plants ?? [];

  const error = !loading && garden === null;
  const [search,    setSearch]    = useState("");
  const [view,      setView]      = useState<ViewMode>("table");
  const [sortKey,   setSortKey]   = useState<SortKey>("name_common");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");
  const [selected,  setSelected]  = useState<Plant | null>(null);
  const [pendingPlantEdit, setPendingPlantEdit] = useState<PendingPlantEdit | null>(null);

  // Keep selected in sync with garden updates (e.g. after save)
  useEffect(() => {
    if (selected && garden) {
      const fresh = garden.plants.find((p) => p.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plants.filter(
      (p) => {
        if (!q) return true;
        // Collect all searchable text from all visible columns
        const careTaskLabel = nextCareTask(p)?.schedule.label ?? "";
        const taskMonth     = (() => {
          const t = nextCareTask(p);
          return t ? weekRangeLabel(t.schedule.start_week, t.schedule.end_week) : "";
        })();
        const fields = [
          p.name_common,
          p.name_botanical ?? "",
          p.category ?? "",
          p.location ?? "",
          p.health_status ?? "",
          p.watering_zone ?? "",
          bloomPeriod(p.schedules),
          bloomColorLabel(p.schedules),
          lastJournalDate(p, "pruning"),
          lastJournalDate(p, "fertilization"),
          careTaskLabel,
          taskMonth,
          // schedule labels for all care tasks
          ...p.schedules.map((s) => s.label ?? ""),
        ];
        return fields.some((f) => f.toLowerCase().includes(q));
      });
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


  useEffect(() => {
    setAssistantContext(
      garden
        ? { view: "plants", garden, selectedPlant: selected ?? undefined, settings: assistantSettings, pendingPlantEdit: pendingPlantEdit ?? undefined }
        : undefined
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden, selected, assistantSettings, pendingPlantEdit]);

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

        {/* Main area: garden plan (when editing) or table/card list */}
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
                      <SortHeader label={t("table.col_name")}     col="name_common" current={sortKey} dir={sortDir} onSort={handleSort} width="220px" />
                      <SortHeader label={t("table.col_category")} col="category"    current={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label={t("table.col_location")} col="location"    current={sortKey} dir={sortDir} onSort={handleSort} />
                      <th style={thStyle(false)}>{t("table.col_health")}</th>
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
          onClick={() => getPlantEditHandler()?.editPlant(null, {})}
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
          width:        selected ? "360px" : "0",
          minWidth:     selected ? "360px" : "0",
          overflow:     "hidden",
          background:   "var(--warm-white)",
          borderLeft:   selected ? "1px solid var(--border)" : "none",
          display:      "flex",
          flexDirection:"column",
          transition:   "width .3s ease, min-width .3s ease",
          flexShrink:   0,
        }}
      >
        {selected && (
          <PlantDetailPanel
            plant={selected}
            onClose={() => setSelected(null)}
            onEdit={(p) => { getPlantEditHandler()?.editPlant(p.id, {}); }}
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
  label:    string;
  col:      SortKey;
  current:  SortKey;
  dir:      SortDir;
  onSort:   (k: SortKey) => void;
  width?:   string;
}

function SortHeader({ label, col, current, dir, onSort, width }: SortHeaderProps) {
  const active = col === current;
  return (
    <th
      style={{ ...thStyle(active), cursor: "pointer", ...(width ? { width, minWidth: width } : {}) }}
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

  // Thumbnail: first image in sort_order (backend returns attachments sorted by sort_order)
  const thumbImg = plant.attachments.find((a) => a.attachment_type === "image");

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
      {/* Thumbnail + Name (combined, like Calendar) */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              overflow:       "hidden",
              position:       "relative",
            }}
          >
            {thumbImg
              ? <img src={thumbImg.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : plant.icon ?? "🌿"
            }
            {plant.temperature_protected && (
              <div
                title={t("detail.protected_badge")}
                style={{ position: "absolute", bottom: "-2px", left: "-2px", fontSize: "10px", lineHeight: 1, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.4))", userSelect: "none" }}
              >🏠</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: "var(--text-dark)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {plant.name_common}
            </span>
            {plant.name_botanical && (
              <span style={{ fontSize: "10px", color: "var(--text-light)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {plant.name_botanical}
              </span>
            )}
          </div>
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

      {/* Health */}
      <td style={{ padding: "10px 14px" }}>
        {plant.health_status ? (
          <HealthBadge status={plant.health_status} t={t} />
        ) : (
          <span style={{ color: "var(--text-light)" }}>–</span>
        )}
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

      {/* Next care task — Icon (centered) | top: Text | bottom: Swatch + Zeitraum */}
      <td style={{ padding: "10px 14px" }}>
        {careTask ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Icon — vertically centered */}
            <span style={{ fontSize: "15px", flexShrink: 0 }}>
              {SCHEDULE_ICON[careTask.schedule.schedule_type] ?? "📌"}
            </span>
            {/* Two text lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {/* Line 1: Label */}
              <span style={{ fontSize: "11.5px", color: "var(--text-mid)", fontWeight: 500 }}>
                {careTask.schedule.label ?? careTask.schedule.schedule_type}
              </span>
              {/* Line 2: Swatch + month range */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "2px", flexShrink: 0,
                  background: careTask.schedule.color ?? STATUS_COLOR[careTask.status as PlantStatus],
                  border: "1px solid rgba(0,0,0,.12)",
                }} />
                <span style={{ fontSize: "11px", color: "var(--text-light)" }}>
                  {weekRangeLabel(careTask.schedule.start_week, careTask.schedule.end_week)}
                </span>
              </div>
            </div>
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

  // Thumbnail: first image in sort_order (backend returns attachments sorted by sort_order)
  const firstImage = plant.attachments.find((a) => a.attachment_type === "image");

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
          overflow:       "hidden",
        }}
      >
        {firstImage ? (
          <img
            src={firstImage.url}
            alt={plant.name_common}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          plant.icon ?? "🌿"
        )}
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
          {plant.temperature_protected && (
            <span
              data-testid="card-protected-badge"
              style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "4px",
                padding:      "3px 10px",
                borderRadius: "12px",
                fontSize:     "10px",
                fontWeight:   500,
                background:   "#e8f0fe",
                color:        "#3a5ea8",
              }}
            >
              🏠 {_t("detail.protected_badge")}
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

// ── HealthBadge ───────────────────────────────────────────────────────────────

const HEALTH_STYLE: Record<string, { bg: string; color: string }> = {
  good:            { bg: "var(--green-mist)",  color: "var(--green-mid)"   },
  watch:           { bg: "var(--yellow-soft)", color: "var(--yellow-warn)" },
  needs_treatment: { bg: "var(--red-soft)",    color: "var(--red-warn)"    },
};

function HealthBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslation<"plants">>["t"] }) {
  const style = HEALTH_STYLE[status] ?? { bg: "var(--green-mist)", color: "var(--text-light)" };
  return (
    <span style={{
      display:      "inline-flex",
      alignItems:   "center",
      padding:      "3px 8px",
      borderRadius: "12px",
      fontSize:     "11px",
      fontWeight:   500,
      whiteSpace:   "nowrap",
      background:   style.bg,
      color:        style.color,
    }}>
      {t(`health_status.${status}` as any)}
    </span>
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

// DetailPanel, CollapsibleSection, MoreInfoSection moved to PlantDetailPanel.tsx

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
