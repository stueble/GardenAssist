/**
 * MobileTaskView — story-083.
 *
 * Mobile task screen (≤ 768 px). Layout mirrors the HTML mockup exactly:
 *   TopBar → scroll area (search + TaskSidebar content) →
 *   ChatPanel (in-flow, not overlay) → BottomNav
 *
 * Weather + soil data re-use the singleton caches from DashboardView so
 * no duplicate polling occurs.
 *
 * The core content (weather widget, warnings, task list) is provided by
 * TaskSidebar so the same component is reused in the desktop DashboardView.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MessageCircle, Search, Plus } from "lucide-react";
import type { Garden } from "@api/garden";
import { TaskSidebar } from "@/components/TaskSidebar";
import { topBtnStyle, BottomNav, LeftDrawer, ChatPanel } from "@/components/mobile/MobileParts";

// ── Sub-components ─────────────────────────────────────────────────────────────

// TopBar
function TopBar({
  onMenuClick,
  onChatClick,
  chatOpen,
}: {
  onMenuClick: () => void;
  onChatClick: () => void;
  chatOpen:    boolean;
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
      <button
        data-testid="mobile-hamburger"
        aria-label="Menü öffnen"
        onClick={onMenuClick}
        style={topBtnStyle}
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      <div style={{
        fontFamily: "var(--font-display)",
        fontSize:   "18px",
        color:      "#fff",
        fontWeight: 600,
        flex:       1,
      }}>
        {t("mobile.tasks")}
      </div>

      <button
        data-testid="mobile-add-btn"
        aria-label="Neue Aufgabe"
        style={{ ...topBtnStyle, background: "rgba(255,255,255,.15)" }}
      >
        <Plus size={20} strokeWidth={1.5} />
      </button>

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

// ── Main component ─────────────────────────────────────────────────────────────

export interface MobileTaskViewProps {
  garden:           Garden | null;
  loading:          boolean;
  invalidateGarden: () => void;
}

export function MobileTaskView({ garden, loading, invalidateGarden }: MobileTaskViewProps) {
  const [chatOpen,   setChatOpen]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

      {/* Search bar sits above the shared task sidebar content */}
      <div style={{ flexShrink: 0 }}>
        <SearchBar />
      </div>

      {/* TaskSidebar fills the remaining scroll area */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <TaskSidebar
          garden={garden}
          loading={loading}
          invalidateGarden={invalidateGarden}
        />
      </div>

      {/* In-flow chat panel — pushes scroll area up, not an overlay */}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />

      <BottomNav activePath="/" />

      {/* Left drawer — positioned absolute within this container */}
      <LeftDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
