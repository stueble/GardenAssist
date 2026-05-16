/**
 * MobileParts — shared UI primitives for all mobile views.
 *
 * Exports:
 *   topBtnStyle   — CSSProperties for top-bar icon buttons (no background)
 *   BottomNav     — 5-tab bottom navigation bar
 *   LeftDrawer    — slide-in drawer (Settings / About)
 *   ChatPanel     — in-flow AI chat panel (height: 0 → 210px)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Check, Sprout, Calendar, Notebook, Map,
  MessageCircle, Send,
} from "lucide-react";
import { chatWithAi } from "@/api/client";
import type { ChatMessage } from "@/api/client";

// ── topBtnStyle ───────────────────────────────────────────────────────────────

/** Base style for top-bar icon buttons.
 *  Navigation buttons (hamburger) use this as-is — no background per
 *  Android/Material guidelines. Action buttons (+ and chat) add
 *  `background: "rgba(255,255,255,.15)"` inline. */
export const topBtnStyle: React.CSSProperties = {
  width:          "34px",
  height:         "34px",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  cursor:         "pointer",
  borderRadius:   "8px",
  background:     "none",
  border:         "none",
  color:          "#c8dfc0",
  flexShrink:     0,
};

// ── BottomNav ─────────────────────────────────────────────────────────────────

const NAV_TABS: { key: string; icon: ReactNode; path: string }[] = [
  { key: "tasks",    icon: <Check    size={20} strokeWidth={1.5} />, path: "/" },
  { key: "plants",   icon: <Sprout   size={20} strokeWidth={1.5} />, path: "/plants" },
  { key: "calendar", icon: <Calendar size={20} strokeWidth={1.5} />, path: "/calendar" },
  { key: "journal",  icon: <Notebook size={20} strokeWidth={1.5} />, path: "/journal" },
  { key: "plan",     icon: <Map      size={20} strokeWidth={1.5} />, path: "/plan" },
];

export function BottomNav({ activePath }: { activePath: string }) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <div
      data-testid="mobile-bottom-nav"
      style={{
        background: "#2d4a2d",
        display:    "flex",
        alignItems: "center",
        padding:    "6px 0 10px",
        flexShrink: 0,
      }}
    >
      {NAV_TABS.map(({ key, icon, path }) => {
        const isActive = activePath === path;
        return (
          <button
            key={key}
            data-testid={`mobile-tab-${key}`}
            onClick={() => navigate(path)}
            style={{
              flex:          1,
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              padding:       "3px 0",
              cursor:        "pointer",
              background:    "none",
              border:        "none",
            }}
          >
            {/* Inner highlight — constrained width so dark-green edges stay visible */}
            <span style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            "2px",
              padding:        "4px 10px",
              borderRadius:   "8px",
              background:     isActive ? "rgba(255,255,255,.15)" : "none",
              minWidth:       "44px",
            }}>
              <span style={{ color: isActive ? "#fff" : "#c8dfc0", display: "flex" }}>
                {icon}
              </span>
              <span style={{ fontSize: "10px", color: isActive ? "#fff" : "#c8dfc0", letterSpacing: ".2px", whiteSpace: "nowrap" }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {t(`mobile.tab_${key}` as any)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── LeftDrawer ────────────────────────────────────────────────────────────────

export function LeftDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <>
      {open && (
        <div
          data-testid="mobile-drawer-backdrop"
          onClick={onClose}
          style={{
            position:   "absolute",
            inset:      0,
            background: "rgba(0,0,0,.4)",
            zIndex:     10,
          }}
        />
      )}

      <div
        data-testid="mobile-drawer"
        style={{
          position:      "absolute",
          top:           0,
          bottom:        0,
          left:          0,
          width:         "240px",
          background:    "#fff",
          zIndex:        11,
          transform:     open ? "translateX(0)" : "translateX(-100%)",
          transition:    "transform .25s ease",
          display:       "flex",
          flexDirection: "column",
          boxShadow:     open ? "4px 0 24px rgba(0,0,0,.15)" : "none",
        }}
      >
        <div style={{ background: "#2d4a2d", padding: "16px 16px 12px", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "#c8dfc0", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <img src="/favicon.svg" alt="" aria-hidden="true" style={{ width: "25px", height: "25px" }} />
            GardenAssist
          </div>
        </div>

        <nav style={{ flex: 1, padding: "8px 0" }}>
          <DrawerItem
            icon="⚙️"
            label={t("mobile.drawer_settings")}
            onClick={() => { navigate("/settings"); onClose(); }}
          />
          <DrawerItem
            icon="ℹ️"
            label={t("mobile.drawer_about")}
            onClick={onClose}
          />
        </nav>
      </div>
    </>
  );
}

function DrawerItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:      "100%",
        display:    "flex",
        alignItems: "center",
        gap:        "12px",
        padding:    "12px 16px",
        background: "none",
        border:     "none",
        cursor:     "pointer",
        fontSize: "15px",
        color:      "#1e2e1e",
        textAlign:  "left",
      }}
    >
      <span style={{ fontSize: "20px" }}>{icon}</span>
      {label}
    </button>
  );
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────

export function ChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: t("ai.welcome") },
  ]);
  const [input,   setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const { content: reply } = await chatWithAi([...messages, userMsg]);
      setMessages((prev) => [...prev, { role: "assistant" as const, content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("ai.error") }]);
    }
    setSending(false);
  }, [input, sending, messages, t]);

  return (
    <div
      data-testid="mobile-chat-panel"
      style={{
        flexShrink:    0,
        height:        open ? "210px" : "0",
        overflow:      "hidden",
        transition:    "height .25s ease",
        background:    "#eef4eb",
        borderTop:     open ? "2px solid #2d4a2d" : "none",
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{
        padding:      "8px 12px 7px",
        borderBottom: "1px solid #dde8d8",
        display:      "flex",
        alignItems:   "center",
        gap:          "6px",
        flexShrink:   0,
      }}>
        <MessageCircle size={15} strokeWidth={1.5} color="#4a7c4a" />
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#1e2e1e", flex: 1 }}>
          {t("mobile.assistant_title")}
        </div>
        <button
          data-testid="mobile-chat-close"
          onClick={onClose}
          style={{
            fontSize: "10px",
            color:        "#8a9e8a",
            padding:      "2px 7px",
            border:       "1px solid #dde8d8",
            borderRadius: "20px",
            background:   "#fff",
            cursor:       "pointer",
          }}
        >
          {t("mobile.assistant_close")}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={msgsRef}
        style={{
          flex:          1,
          overflowY:     "auto",
          padding:       "8px 12px",
          display:       "flex",
          flexDirection: "column",
          gap:           "5px",
          minHeight:     0,
        }}
      >
        {messages.map((msg, i) => (
          msg.role === "assistant" ? (
            <div key={i} style={{
              maxWidth:    "86%",
              fontSize: "11px",
              lineHeight:  1.45,
              padding:     "6px 9px",
              borderRadius:"4px 10px 10px 10px",
              background:  "#fff",
              color:       "#1e2e1e",
              alignSelf:   "flex-start",
            }}>
              {msg.content}
            </div>
          ) : (
            <div key={i} style={{
              maxWidth:    "86%",
              fontSize: "11px",
              lineHeight:  1.45,
              padding:     "6px 9px",
              borderRadius:"10px 4px 10px 10px",
              background:  "#2d4a2d",
              color:       "#fff",
              alignSelf:   "flex-end",
            }}>
              {msg.content}
            </div>
          )
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding:    "7px 10px",
        borderTop:  "1px solid #dde8d8",
        display:    "flex",
        gap:        "6px",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <input
          data-testid="mobile-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
          placeholder={t("mobile.assistant_placeholder")}
          style={{
            flex:         1,
            fontSize: "12px",
            padding:      "5px 10px",
            border:       "1.5px solid #dde8d8",
            borderRadius: "20px",
            outline:      "none",
            fontFamily:   "var(--font-body)",
          }}
        />
        <button
          onClick={() => void send()}
          disabled={sending}
          aria-label={t("ai.send_label")}
          style={{
            width:          "28px",
            height:         "28px",
            borderRadius:   "50%",
            background:     "#4a7c4a",
            border:         "none",
            cursor:         sending ? "default" : "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            opacity:        sending ? 0.6 : 1,
          }}
        >
          <Send size={14} strokeWidth={1.5} color="#fff" />
        </button>
      </div>
    </div>
  );
}
