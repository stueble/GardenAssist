import { useState, useRef, useEffect } from "react";
import { apiClient } from "@/api/client";

interface AiPanelProps {
  /** Optional context pill text, e.g. "⚙️ Einstellungen" */
  context?: string;
}

/**
 * AI Assistant panel (ADR-006: always rightmost).
 *
 * Collapsed: narrow vertical toggle strip (~34px), always visible.
 * Expanded:  300px panel slides in from the right; toggle is hidden.
 *
 * When the panel opens, checks whether an AI provider is configured.
 * If not, shows a hint to configure in Settings (AC #7).
 *
 * AI message sending (AC #4, #5) is a stub — wired in a later story.
 */
export function AiPanel({ context }: AiPanelProps) {
  const [open,          setOpen]          = useState(false);
  const [configured,    setConfigured]    = useState<boolean | null>(null);
  const [inputValue,    setInputValue]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check AI configuration when panel opens
  useEffect(() => {
    if (!open) return;
    apiClient.getSettings().then((s) => {
      setConfigured(!!(s.ai_provider && s.ai_api_key));
    }).catch(() => {
      setConfigured(false);
    });
  }, [open]);

  // Focus input when panel opens and AI is configured
  useEffect(() => {
    if (open && configured) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, configured]);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputValue.trim()) {
      // Stub: message sending wired in future story
      setInputValue("");
    }
  }

  return (
    <div className="flex shrink-0" data-testid="ai-panel">

      {/* ── Chat panel — slides in, hides the toggle ── */}
      <div
        data-testid="ai-chat-panel"
        style={{
          width:      open ? "300px" : "0",
          overflow:   "hidden",
          background: "var(--warm-white)",
          borderLeft: open ? "1px solid var(--border)" : "none",
          display:    "flex",
          flexDirection: "column",
          transition: "width .3s ease",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding:        "16px 16px 12px",
            borderBottom:   "1px solid var(--border)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexShrink:     0,
          }}
        >
          <span
            style={{
              fontFamily:  "var(--font-display)",
              fontSize:    "15px",
              color:       "var(--green-deep)",
              fontWeight:  600,
              display:     "flex",
              alignItems:  "center",
              gap:         "8px",
              whiteSpace:  "nowrap",
            }}
          >
            🤖 Garten-Assistent
          </span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Assistent schließen"
            style={{
              background:  "none",
              border:      "none",
              cursor:      "pointer",
              color:       "var(--text-light)",
              fontSize:    "16px",
              padding:     "2px",
              lineHeight:  1,
              transition:  "color .15s",
            }}
            className="hover:text-text-dark"
            data-testid="ai-panel-close"
          >
            ✕
          </button>
        </div>

        {/* Messages area */}
        <div
          style={{
            flex:         1,
            overflowY:    "auto",
            padding:      "14px",
            display:      "flex",
            flexDirection:"column",
            gap:          "12px",
            minHeight:    0,
          }}
          data-testid="ai-messages"
        >
          {/* Context pill */}
          {context && (
            <span
              style={{
                background:   "var(--green-pale)",
                color:        "var(--green-deep)",
                borderRadius: "20px",
                padding:      "3px 10px",
                fontSize:     "10px",
                fontWeight:   600,
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "4px",
                alignSelf:    "flex-start",
              }}
            >
              {context}
            </span>
          )}

          {configured === false && (
            /* AC #7 — not configured hint */
            <BotMessage>
              KI-Assistent ist noch nicht eingerichtet.{" "}
              Bitte hinterlege einen API-Schlüssel unter{" "}
              <strong>Einstellungen → KI-Assistent</strong>.
            </BotMessage>
          )}

          {configured === true && (
            <BotMessage>
              Hallo! Wie kann ich dir mit deinem Garten helfen?
            </BotMessage>
          )}

          {configured === null && open && (
            <span style={{ fontSize: "12px", color: "var(--text-light)" }}>
              …
            </span>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            padding:     "12px",
            borderTop:   "1px solid var(--border)",
            display:     "flex",
            gap:         "8px",
            flexShrink:  0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage stellen …"
            aria-label="Nachricht an Assistenten"
            disabled={!configured}
            style={{
              flex:         1,
              background:   "var(--green-mist)",
              border:       "1px solid var(--border)",
              borderRadius: "20px",
              padding:      "8px 14px",
              fontSize:     "12px",
              fontFamily:   "var(--font-body)",
              color:        "var(--text-dark)",
              outline:      "none",
              transition:   "border-color .2s",
              opacity:      configured ? 1 : 0.5,
            }}
            data-testid="ai-input"
          />
          <button
            type="button"
            aria-label="Senden"
            disabled={!configured || !inputValue.trim()}
            style={{
              background:   "var(--green-deep)",
              color:        "white",
              border:       "none",
              borderRadius: "50%",
              width:        "34px",
              height:       "34px",
              cursor:       configured && inputValue.trim() ? "pointer" : "not-allowed",
              fontSize:     "15px",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              transition:   "background .2s",
              flexShrink:   0,
              opacity:      configured && inputValue.trim() ? 1 : 0.4,
            }}
            data-testid="ai-send"
          >
            ↑
          </button>
        </div>
      </div>

      {/* ── Toggle strip — always in DOM, hidden via display:none when panel open.
           This mirrors the mockup exactly: when the panel closes (width 300→0),
           the toggle becomes visible again and appears to slide in from the left. ── */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Assistent öffnen"
        data-testid="ai-toggle"
        style={{
          background:    "var(--green-mid)",
          color:         "var(--green-pale)",
          border:        "none",
          borderLeft:    "1px solid rgba(255,255,255,.15)",
          padding:       "24px 11px",
          fontFamily:    "var(--font-body)",
          fontSize:      "14px",
          fontWeight:    500,
          cursor:        "pointer",
          display:       open ? "none" : "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           "10px",
          flexShrink:    0,
          transition:    "background .2s",
        }}
        className="hover:bg-green-light"
      >
        <span style={{ fontSize: "20px", lineHeight: 1 }} aria-hidden="true">💬</span>
        <span
          style={{
            writingMode:     "vertical-rl",
            textOrientation: "mixed",
            transform:       "rotate(180deg)",
            letterSpacing:   ".8px",
          }}
        >
          Assistent
        </span>
      </button>
    </div>
  );
}

// ── BotMessage ────────────────────────────────────────────────────────────────

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span
        style={{
          fontSize:      "10px",
          fontWeight:    600,
          letterSpacing: ".5px",
          textTransform: "uppercase",
          color:         "var(--text-light)",
          padding:       "0 4px",
        }}
      >
        Assistent
      </span>
      <span
        style={{
          alignSelf:    "flex-start",
          background:   "var(--green-mist)",
          color:        "var(--text-dark)",
          border:       "1px solid var(--border)",
          borderRadius: "4px 12px 12px 12px",
          padding:      "9px 12px",
          fontSize:     "12px",
          lineHeight:   1.5,
          maxWidth:     "90%",
        }}
      >
        {children}
      </span>
    </div>
  );
}
