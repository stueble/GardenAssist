/**
 * MobilePlantsView — story-084.
 *
 * Mobile plants overview (≤ 768 px). Mirrors ui-mockups/mobile/plants/mobile_plants.html.
 *
 * Layout:
 *   TopBar (Hamburger | "Pflanzen" | ViewToggle | + | Chat) →
 *   SearchBar → Divider →
 *   scroll area (list or 2-column card grid) →
 *   ChatPanel (in-flow) → BottomNav
 *
 * View-toggle state is preserved across navigations via a module-level variable.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Menu, MessageCircle, Search, Plus,
  List, LayoutGrid,
} from "lucide-react";
import type { Garden } from "@api/garden";
import type { Plant } from "@api/plant";
import {
  derivePlantStatus,
  nextCareTask,
  STATUS_BG,
  STATUS_TEXT,
} from "@/lib/plantStatus";
import type { PlantStatus } from "@/lib/plantStatus";
import { topBtnStyle, BottomNav, LeftDrawer } from "@/components/mobile/MobileParts";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";
import { setAssistantContext } from "@/hooks/useAssistantContext";
import { useAiPanelState } from "@/hooks/useAiPanelState";

// ── Helpers ────────────────────────────────────────────────────────────────────

const CARE_SCHEDULE_TYPES = new Set(["pruning", "fertilization", "misc"]);

function currentWeek(): number {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const diff = now.getTime() - jan4.getTime();
  return Math.ceil((diff / 86400000 + jan4.getDay() + 1) / 7);
}

/** For an "ok" plant (no open tasks), find the next upcoming care schedule. */
function nextScheduleForOkPlant(plant: Plant): { label: string; weeksAway: number } | null {
  const cw = currentWeek();
  const care = plant.schedules
    .filter((s) => CARE_SCHEDULE_TYPES.has(s.schedule_type) && s.start_week > cw)
    .sort((a, b) => a.start_week - b.start_week);
  if (care.length === 0) return null;
  const s = care[0];
  return { label: s.label ?? s.schedule_type, weeksAway: Math.max(1, s.start_week - cw) };
}

// ── View-mode singleton — preserved across navigation within the session ──────

type ViewMode = "list" | "card";
let _plantsViewMode: ViewMode = "list";

// ── Status helpers ─────────────────────────────────────────────────────────────

// Exact colors from mockup
const BADGE_BG: Record<PlantStatus, string> = {
  overdue:  "#fdf0ee",
  due:      "#fef9ee",
  upcoming: "#e8f0fb",
  ok:       "#eef4eb",
};

const BADGE_COLOR: Record<PlantStatus, string> = {
  overdue:  "#c0392b",
  due:      "#d4850a",
  upcoming: "#185fa5",
  ok:       "#2d4a2d",
};

const STATUS_DOT: Record<PlantStatus, string> = {
  overdue:  "#c0392b",
  due:      "#d4850a",
  upcoming: "#4a78c0",
  ok:       "#4a7c4a",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

// TopBar — AC #1
function TopBar({
  viewMode,
  onViewChange,
  onMenuClick,
  onAddClick,
  onChatClick,
  chatOpen,
}: {
  viewMode:     ViewMode;
  onViewChange: (m: ViewMode) => void;
  onMenuClick:  () => void;
  onAddClick:   () => void;
  onChatClick:  () => void;
  chatOpen:     boolean;
}) {
  const { t } = useTranslation("common");

  return (
    <div
      data-testid="mobile-plants-topbar"
      style={{
        background:  "#2d4a2d",
        display:     "flex",
        alignItems:  "center",
        padding:     "0 10px",
        height:      "44px",
        gap:         "4px",
        flexShrink:  0,
      }}
    >
      {/* Hamburger — no background per Material guidelines */}
      <button
        data-testid="mobile-plants-hamburger"
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
        {t("mobile.plants")}
      </div>

      {/* View toggle — grouped control with dark bg */}
      <div
        data-testid="mobile-plants-view-toggle"
        style={{
          display:      "flex",
          gap:          "2px",
          background:   "rgba(0,0,0,.2)",
          borderRadius: "8px",
          padding:      "3px",
        }}
      >
        <button
          data-testid="mobile-plants-view-list"
          aria-label={t("mobile.plants_view_list")}
          onClick={() => onViewChange("list")}
          style={{
            width:          "26px",
            height:         "26px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            borderRadius:   "6px",
            cursor:         "pointer",
            border:         "none",
            background:     viewMode === "list" ? "#fff" : "none",
            color:          viewMode === "list" ? "#2d4a2d" : "#c8dfc0",
            transition:     "all .15s",
          }}
        >
          <List size={15} strokeWidth={1.5} />
        </button>
        <button
          data-testid="mobile-plants-view-card"
          aria-label={t("mobile.plants_view_card")}
          onClick={() => onViewChange("card")}
          style={{
            width:          "26px",
            height:         "26px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            borderRadius:   "6px",
            cursor:         "pointer",
            border:         "none",
            background:     viewMode === "card" ? "#fff" : "none",
            color:          viewMode === "card" ? "#2d4a2d" : "#c8dfc0",
            transition:     "all .15s",
          }}
        >
          <LayoutGrid size={15} strokeWidth={1.5} />
        </button>
      </div>

      {/* Visible gap before + button (matches .tb-add { margin-left: 6px }) */}
      <div style={{ width: "2px" }} />

      {/* + button */}
      <button
        data-testid="mobile-plants-add-btn"
        aria-label="Neue Pflanze"
        onClick={onAddClick}
        style={{ ...topBtnStyle, background: "rgba(255,255,255,.15)" }}
      >
        <Plus size={20} strokeWidth={1.5} />
      </button>

      {/* Chat button */}
      <button
        data-testid="mobile-plants-chat-btn"
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

// SearchBar — AC #2
function SearchBar({
  value,
  onChange,
}: {
  value:    string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div style={{ padding: "7px 12px", flexShrink: 0 }}>
      <div
        data-testid="mobile-plants-search"
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "5px",
          background:   "#dde8d8",
          borderRadius: "20px",
          padding:      "2px 10px",
        }}
      >
        <Search size={13} strokeWidth={1.5} color="#4a5e4a" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("mobile.plants_search_placeholder")}
          style={{
            border:      "none",
            outline:     "none",
            boxShadow:   "none",
            background:  "transparent",
            fontSize: "12px",
            color:       "#1e2e1e",
            fontFamily:  "var(--font-body)",
            flex:        1,
            padding:     "3px 0",
          }}
        />
      </div>
    </div>
  );
}

// Plant thumbnail — 40×40, rounded 8px, image or emoji fallback
function PlantThumb({ plant }: { plant: Plant }) {
  const thumb = plant.attachments.find((a) => a.attachment_type === "image");
  return (
    <div style={{
      width:          "44px",
      height:         "44px",
      borderRadius:   "8px",
      background:     "#eef4eb",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontSize:       "22px",
      flexShrink:     0,
      border:         "1px solid #dde8d8",
      overflow:       "hidden",
    }}>
      {thumb
        ? <img src={thumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (plant.icon ?? "🌿")
      }
    </div>
  );
}

// Status badge (list view) — AC #4
function StatusBadge({ status, label }: { status: PlantStatus; label: string }) {
  return (
    <span
      data-testid={`mobile-plant-badge-${status}`}
      style={{
        fontSize: "9px",
        padding:      "2px 6px",
        borderRadius: "20px",
        fontWeight:   500,
        whiteSpace:   "nowrap",
        background:   BADGE_BG[status],
        color:        BADGE_COLOR[status],
      }}
    >
      {label}
    </span>
  );
}

// List row — AC #3
function PlantListItem({ plant, statusLabel, onClick }: { plant: Plant; statusLabel: string; onClick: () => void }) {
  const { t } = useTranslation("common");
  const status   = derivePlantStatus(plant);
  const careTask = nextCareTask(plant);

  // For "ok" plants: find next upcoming care schedule
  const nextSchedule = status === "ok" ? nextScheduleForOkPlant(plant) : null;

  return (
    <div
      data-testid="mobile-plant-row"
      onClick={onClick}
      style={{
        display:     "flex",
        alignItems:  "flex-start",
        gap:         "10px",
        padding:     "9px 12px",
        background:  "#fff",
        borderBottom:"1px solid #f0f4ee",
        cursor:      "pointer",
      }}
    >
      <PlantThumb plant={plant} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 500, color: "#1e2e1e", lineHeight: 1.3 }}>
          {plant.name_common}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
          {plant.location && (
            <span style={{ fontSize: "10px", color: "#4a5e4a" }}>
              {plant.location}
            </span>
          )}
          {plant.watering_zone && (
            <span style={{ fontSize: "10px", color: "#4a78c0", background: "#e8f0fb", borderRadius: "20px", padding: "1px 5px" }}>
              {plant.watering_zone}
            </span>
          )}
        </div>
      </div>

      {/* Task status — right-aligned, uniform two-row layout */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", paddingTop: "1px" }}>
        {status !== "ok" ? (
          /* overdue / due / upcoming: coloured pill + task name */
          <>
            <StatusBadge status={status} label={statusLabel} />
            {careTask && (
              <span style={{ fontSize: "10px", color: "#8a9e8a", maxWidth: "90px", textAlign: "right", lineHeight: 1.3 }}>
                {careTask.schedule.label ?? careTask.schedule.schedule_type}
              </span>
            )}
          </>
        ) : nextSchedule ? (
          /* ok with a future schedule: light-green pill + schedule name */
          <>
            <span
              data-testid="mobile-plant-badge-ok-next"
              style={{
                fontSize:     "9px",
                padding:      "2px 6px",
                borderRadius: "20px",
                fontWeight:   500,
                whiteSpace:   "nowrap",
                background:   "#edfaf3",
                color:        "#27ae60",
              }}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(t as any)("dashboard.task_in_other", { count: nextSchedule.weeksAway })}
            </span>
            <span style={{ fontSize: "10px", color: "#8a9e8a", whiteSpace: "nowrap", lineHeight: 1.3 }}>
              {nextSchedule.label}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

// Card — AC #5
function PlantCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  const status = derivePlantStatus(plant);
  const thumb  = plant.attachments.find((a) => a.attachment_type === "image");

  return (
    <div
      data-testid="mobile-plant-card"
      onClick={onClick}
      style={{
        background:   "#fff",
        borderRadius: "12px",
        border:       "1px solid #dde8d8",
        overflow:     "hidden",
        cursor:       "pointer",
      }}
    >
      {/* Image area — 4:3 aspect ratio */}
      <div style={{
        width:          "100%",
        aspectRatio:    "4/3",
        background:     "#eef4eb",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       "36px",
        borderBottom:   "1px solid #dde8d8",
        overflow:       "hidden",
      }}>
        {thumb
          ? <img src={thumb.url} alt={plant.name_common} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (plant.icon ?? "🌿")
        }
      </div>

      {/* Body */}
      <div style={{ padding: "7px 8px 8px" }}>
        <div style={{ fontSize: "12px", fontWeight: 500, color: "#1e2e1e", lineHeight: 1.3 }}>
          {plant.name_common}
        </div>
        {plant.name_botanical && (
          <div style={{ fontSize: "9px", color: "#8a9e8a", fontStyle: "italic", marginBottom: "4px" }}>
            {plant.name_botanical}
          </div>
        )}
        {plant.location && (
          <div style={{ fontSize: "10px", color: "#4a5e4a", marginBottom: "5px" }}>
            {plant.location}
          </div>
        )}
        {/* Footer: watering zone pill + status dot */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {plant.watering_zone
            ? <span style={{ fontSize: "9px", color: "#4a78c0", background: "#e8f0fb", borderRadius: "20px", padding: "1px 5px" }}>
                {plant.watering_zone}
              </span>
            : <span />
          }
          <div
            data-testid={`mobile-plant-dot-${plant.id}`}
            title={status}
            style={{
              width:        "10px",
              height:       "10px",
              borderRadius: "50%",
              flexShrink:   0,
              background:   STATUS_DOT[status],
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobilePlantsViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobilePlantsView({ garden, loading }: MobilePlantsViewProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const assistantSettings = useAssistantSettings();

  // View mode — initialised from module-level singleton (survives navigation)
  const [viewMode,    setViewMode]    = useState<ViewMode>(_plantsViewMode);
  const [search,      setSearch]      = useState("");
  const { open: chatOpen, setOpen: setChatOpen } = useAiPanelState();
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  useEffect(() => {
    setAssistantContext(
      garden ? { view: "plants", garden, settings: assistantSettings } : undefined
    );
  }, [garden, assistantSettings]);

  // Persist view mode to module-level singleton so it survives navigation (AC #6)
  function handleViewChange(m: ViewMode) {
    _plantsViewMode = m;
    setViewMode(m);
  }

  // Status label helper
  const statusLabel = (status: PlantStatus): string =>
    t(`mobile.status_${status}` as any);  // eslint-disable-line @typescript-eslint/no-explicit-any

  // Filter by search
  const plants = garden?.plants ?? [];
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return plants;
    return plants.filter((p) =>
      [p.name_common, p.name_botanical ?? "", p.location ?? "", p.watering_zone ?? ""]
        .some((f) => f.toLowerCase().includes(q))
    );
  }, [plants, search]);

  return (
    <div
      data-testid="mobile-plants-view"
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
        viewMode={viewMode}
        onViewChange={handleViewChange}
        onMenuClick={() => setDrawerOpen(true)}
        onAddClick={() => navigate("/plants/new")}
        onChatClick={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
      />

      <SearchBar value={search} onChange={setSearch} />

      {/* Divider */}
      <div style={{ height: "1px", background: "#dde8d8", flexShrink: 0 }} />

      {/* Scrollable plant list / grid — paddingBottom avoids content hiding behind fixed ChatPanel */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: "max(0px, calc(var(--mobile-chat-height, 0px) - 56px))" }}>
        {loading && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("status.loading")}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "#8a9e8a" }}>
            {t("mobile.plants_empty")}
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === "list" && (
          <div data-testid="mobile-plants-list">
            {filtered.map((plant) => (
              <PlantListItem
                key={plant.id}
                plant={plant}
                statusLabel={statusLabel(derivePlantStatus(plant))}
                onClick={() => navigate(`/plants/${plant.id}`)}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === "card" && (
          <div
            data-testid="mobile-plants-grid"
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap:                 "8px",
              padding:             "10px",
            }}
          >
            {filtered.map((plant) => (
              <PlantCard key={plant.id} plant={plant} onClick={() => navigate(`/plants/${plant.id}`)} />
            ))}
          </div>
        )}

        <div style={{ height: "8px" }} />
      </div>

      {/* In-flow chat panel */}


      <BottomNav activePath="/plants" />

      {/* Left drawer */}
      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
