/**
 * CalendarView — story-033: Gantt Structure & Plant Rows.
 *
 * AC #1  Plant rows from Garden.plants[], one row per plant
 * AC #2  12 month columns with month name headers
 * AC #3  Sticky plant name column (220px) with thumbnail, name, botanical name
 * AC #4  Current month highlighted (header tint + faint column background)
 * AC #5  Live search filters rows by plant name
 * AC #6  Click row opens PlantDetailPanel overlaying from left
 */

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AiPanel } from "@/components/AiPanel";
import { useAiPanelState } from "@/hooks/useAiPanelState";
import { PlantDetailPanel } from "@/components/PlantDetailPanel";
import { PlantEditDialog } from "@/components/PlantEditDialog";
import { GardenPlanWidget } from "@/components/GardenPlanWidget";
import { usePlantEditDialog } from "@/hooks/usePlantEditDialog";
import { apiClient } from "@/api/client";
import type { Plant } from "@api/plant";
import type { Schedule } from "@api/schedule";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS_DE = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

const SCHEDULE_TYPES: Array<{ type: Schedule["schedule_type"]; icon: string; labelKey: string }> = [
  { type: "bloom",         icon: "🌸", labelKey: "bloom"         },
  { type: "growth",        icon: "🌿", labelKey: "growth"        },
  { type: "foliage",       icon: "🍃", labelKey: "foliage"       },
  { type: "fertilization", icon: "💧", labelKey: "fertilization" },
  { type: "pruning",       icon: "✂️", labelKey: "pruning"       },
  { type: "misc",          icon: "📋", labelKey: "misc"          },
];

const TOTAL_WEEKS = 52;

/** Week number (1-based) → left-offset % within the 12-month band */
function weekToPercent(week: number): number {
  return ((week - 1) / TOTAL_WEEKS) * 100;
}

/** Duration in weeks → width % */
function durationToPercent(startWeek: number, endWeek: number): number {
  // Handle year-wrap (end < start)
  const dur = endWeek >= startWeek
    ? endWeek - startWeek + 1
    : (TOTAL_WEEKS - startWeek + 1) + endWeek;
  return (dur / TOTAL_WEEKS) * 100;
}

/** Current ISO week number */
function currentWeekNumber(): number {
  const now  = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

/** Week number → month index (0-based, approximate) */
function weekToMonthIdx(week: number): number {
  return Math.min(11, Math.floor((week - 1) / (TOTAL_WEEKS / 12)));
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CalendarView() {
  const { t } = useTranslation("calendar");
  const { setOpen: setAiOpen } = useAiPanelState();

  const [plants,    setPlants]   = useState<Plant[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [search,    setSearch]   = useState("");
  const [activeType, setActiveType] = useState<Schedule["schedule_type"]>("bloom");
  const [selected,  setSelected] = useState<Plant | null>(null);
  const [planUrl,   setPlanUrl]  = useState<string | null>(null);

  const edit = usePlantEditDialog();

  const cw           = currentWeekNumber();
  const currentMonth = weekToMonthIdx(cw);

  useEffect(() => {
    apiClient.getGarden()
      .then((g) => { setPlants(g.plants); setPlanUrl(g.plan_url); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Filter + sort: plants with bars for active type first, then alphabetical
  const filtered = plants.filter((p) =>
    p.name_common.toLowerCase().includes(search.toLowerCase()) ||
    (p.name_botanical ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aHas = a.schedules.some((s) => s.schedule_type === activeType);
    const bHas = b.schedules.some((s) => s.schedule_type === activeType);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return a.name_common.localeCompare(b.name_common);
  });

  const aiContext = edit.editTarget
    ? `✏️ ${edit.editTarget.name_common}`
    : selected
    ? `${selected.icon ?? "🌿"} ${selected.name_common}`
    : `📅 ${t("title")}`;

  return (
    <div
      data-testid="calendar-view"
      style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", background: "var(--cream)" }}
    >
      {/* ── Main Gantt area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Subheader: search + type toggles */}
        <div
          style={{
            background:   "var(--warm-white)",
            borderBottom: "1px solid var(--border)",
            padding:      "10px 16px",
            display:      "flex",
            alignItems:   "center",
            gap:          "12px",
            flexShrink:   0,
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", width: "260px", flexShrink: 0 }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "var(--text-light)", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pflanze suchen …"
              data-testid="calendar-search"
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

          {/* Schedule type toggles */}
          <div style={{ display: "flex", gap: "4px" }}>
            {SCHEDULE_TYPES.map(({ type, icon, labelKey }) => (
              <button
                key={type}
                type="button"
                data-testid={`schedule-toggle-${type}`}
                onClick={() => setActiveType(type)}
                style={{
                  padding:      "6px 12px",
                  borderRadius: "20px",
                  border:       "1.5px solid var(--border)",
                  background:   activeType === type ? "var(--green-deep)" : "none",
                  color:        activeType === type ? "white" : "var(--text-mid)",
                  fontSize:     "12px",
                  fontWeight:   500,
                  fontFamily:   "var(--font-body)",
                  cursor:       "pointer",
                  transition:   "all .15s",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "4px",
                  whiteSpace:   "nowrap",
                }}
              >
                {icon} {(t as (k: string) => string)(`schedule_type.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Garden plan — replaces Gantt while edit dialog is open */}
        {edit.editTarget !== undefined && (
          <GardenPlanWidget
            planUrl={planUrl}
            pins={edit.positions.map((p, i) => ({ x: p.x, y: p.y, label: String(i + 1) }))}
            pickMode={edit.pickMode}
            onPick={(x, y) => edit.addPosition(x, y)}
          />
        )}

        {/* Gantt table — hidden when edit dialog is open */}
        {edit.editTarget === undefined && loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", fontSize: "13px" }}>
            Wird geladen …
          </div>
        ) : edit.editTarget === undefined ? (
          <div style={{ flex: 1, overflow: "auto" }}>
            <table
              data-testid="calendar-table"
              style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}
            >
              {/* Header */}
              <thead>
                <tr>
                  {/* Plant column header */}
                  <th
                    style={{
                      width:       "220px",
                      minWidth:    "220px",
                      padding:     "10px 16px",
                      textAlign:   "left",
                      fontSize:    "10px",
                      fontWeight:  700,
                      letterSpacing: ".8px",
                      textTransform: "uppercase",
                      color:       "var(--text-light)",
                      background:  "var(--warm-white)",
                      position:    "sticky",
                      top:         0,
                      left:        0,
                      zIndex:      30,
                      borderBottom:"2px solid var(--border)",
                      borderRight: "2px solid var(--border)",
                    }}
                  >
                    Pflanze
                  </th>
                  {/* Month headers */}
                  {MONTHS_DE.map((month, idx) => (
                    <th
                      key={month}
                      data-testid={`month-header-${idx}`}
                      style={{
                        padding:     "8px 0",
                        textAlign:   "center",
                        fontSize:    "11px",
                        fontWeight:  600,
                        color:       idx === currentMonth ? "var(--green-deep)" : "var(--text-mid)",
                        letterSpacing: ".3px",
                        borderLeft:  "1px solid var(--border)",
                        borderBottom:"2px solid var(--border)",
                        background:  idx === currentMonth ? "var(--green-mist)" : "var(--warm-white)",
                        position:    "sticky",
                        top:         0,
                        zIndex:      20,
                        whiteSpace:  "nowrap",
                      }}
                    >
                      {month}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Plant rows */}
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: "40px", textAlign: "center", color: "var(--text-light)", fontSize: "13px" }}>
                      {search ? "Keine Pflanzen gefunden." : "Noch keine Pflanzen vorhanden."}
                    </td>
                  </tr>
                ) : (
                  sorted.map((plant) => (
                    <PlantRow
                      key={plant.id}
                      plant={plant}
                      activeType={activeType}
                      currentMonth={currentMonth}
                      selected={selected?.id === plant.id}
                      onClick={() => setSelected((prev) => prev?.id === plant.id ? null : plant)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* ── Detail/Edit panel — right of center, left of AiPanel (AC #6) ── */}
      <div
        data-testid="calendar-detail-panel"
        style={{
          width:         (selected && edit.editTarget === undefined) || edit.editTarget !== undefined ? "360px" : "0",
          minWidth:      (selected && edit.editTarget === undefined) || edit.editTarget !== undefined ? "360px" : "0",
          overflow:      "hidden",
          background:    "var(--warm-white)",
          borderLeft:    selected || edit.editTarget !== undefined ? "1px solid var(--border)" : "none",
          display:       "flex",
          flexDirection: "column",
          transition:    "width .3s ease, min-width .3s ease",
          flexShrink:    0,
        }}
      >
        {selected && edit.editTarget === undefined && (
          <PlantDetailPanel
            plant={selected}
            onClose={() => setSelected(null)}
            onEdit={(p) => { edit.openEdit(p); setSelected(null); }}
            onDelete={() => {
              setPlants((prev) => prev.filter((p) => p.id !== selected.id));
              setSelected(null);
            }}
          />
        )}
        {edit.editTarget !== undefined && (
          <PlantEditDialog
            plant={edit.editTarget}
            onClose={edit.close}
            onSaved={(saved) => {
              void edit.handleSaved(saved, (g) => {
                setPlants(g.plants);
              }).then((fresh) => setSelected(fresh));
            }}
            positions={edit.positions}
            onPositionsChange={edit.onPositionsChange}
            initialPositions={edit.initialPositions}
            pickMode={edit.pickMode}
            onPickModeChange={edit.onPickModeChange}
          />
        )}
      </div>

      <AiPanel context={aiContext} />
    </div>
  );
}

// ── PlantRow ──────────────────────────────────────────────────────────────────

interface PlantRowProps {
  plant:       Plant;
  activeType:  Schedule["schedule_type"];
  currentMonth:number;
  selected:    boolean;
  onClick:     () => void;
}

function PlantRow({ plant, activeType, currentMonth, selected, onClick }: PlantRowProps) {
  const bars = plant.schedules.filter((s) => s.schedule_type === activeType);

  // Thumbnail: first image attachment or icon
  const firstImg = plant.attachments.find((a) => a.attachment_type === "image");

  return (
    <tr
      data-testid="calendar-plant-row"
      onClick={onClick}
      style={{
        borderBottom: "1px solid var(--border)",
        cursor:       "pointer",
        background:   selected ? "rgba(228,240,224,.6)" : "none",
        transition:   "background .12s",
      }}
      className={selected ? "" : "hover:bg-green-mist"}
    >
      {/* Sticky plant name column (AC #3) */}
      <td
        style={{
          padding:    "10px 16px",
          width:      "220px",
          minWidth:   "220px",
          borderRight:"2px solid var(--border)",
          position:   "sticky",
          left:       0,
          background: selected ? "rgba(228,240,224,.6)" : "var(--warm-white)",
          zIndex:     10,
          verticalAlign: "middle",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Thumbnail */}
          <div
            style={{
              width:       "36px",
              height:      "36px",
              borderRadius:"8px",
              background:  "var(--green-mist)",
              border:      "1.5px solid var(--border)",
              display:     "flex",
              alignItems:  "center",
              justifyContent: "center",
              fontSize:    "20px",
              flexShrink:  0,
              overflow:    "hidden",
            }}
          >
            {firstImg ? (
              <img src={firstImg.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              plant.icon ?? "🌿"
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {plant.name_common}
            </div>
            {plant.name_botanical && (
              <div style={{ fontSize: "10px", color: "var(--text-light)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {plant.name_botanical}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Gantt bars cell spanning all 12 months (AC #2, #4) */}
      <td
        colSpan={12}
        style={{
          padding:       0,
          position:      "relative",
          verticalAlign: "middle",
          overflow:      "visible",
          height:        "56px",
        }}
      >
        {/* Month grid lines + current month tint */}
        <div
          style={{
            position:              "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display:               "grid",
            gridTemplateColumns:   "repeat(12, 1fr)",
            pointerEvents:         "none",
          }}
        >
          {MONTHS_DE.map((_, idx) => (
            <div
              key={idx}
              style={{
                borderLeft:  idx > 0 ? "1px solid var(--border)" : "none",
                background:  idx === currentMonth ? "rgba(238,244,235,.5)" : "none",
              }}
            />
          ))}
        </div>

        {/* Bars */}
        <div style={{ position: "relative", height: "100%", padding: "8px 0" }}>
          {bars.length === 0 ? null : (
            bars.map((s) => {
              const left  = weekToPercent(s.start_week);
              const width = durationToPercent(s.start_week, s.end_week);
              const color = s.color ?? "var(--green-mid)";
              return (
                <div
                  key={s.id}
                  data-testid="calendar-bar"
                  title={s.label ?? ""}
                  style={{
                    position:    "absolute",
                    left:        `${left}%`,
                    width:       `${width}%`,
                    top:         "50%",
                    transform:   "translateY(-50%)",
                    height:      "28px",
                    background:  color,
                    borderRadius:"6px",
                    display:     "flex",
                    alignItems:  "center",
                    padding:     "0 8px",
                    fontSize:    "10px",
                    fontWeight:  600,
                    color:       "white",
                    boxShadow:   "0 1px 4px rgba(0,0,0,.15)",
                    overflow:    "hidden",
                    whiteSpace:  "nowrap",
                    textOverflow:"ellipsis",
                    textShadow:  "0 1px 2px rgba(0,0,0,.2)",
                    cursor:      "pointer",
                    zIndex:      10,
                  }}
                >
                  {s.label ?? ""}
                </div>
              );
            })
          )}
        </div>
      </td>
    </tr>
  );
}
