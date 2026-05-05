import { useState, useRef, useEffect } from "react";
import { apiClient } from "@/api/client";

interface AiPanelProps {
  /** Context bar text, e.g. "✏️ Bearbeite: 🌹 Rose" or "⚙️ Einstellungen" */
  context?: string;
}

/**
 * AI Assistant panel — spec: doc-011 § 5, reference: plant-edit-mockup.html
 *
 * Structure (doc-011 § 5.1):
 *   chat-wrap (position: relative, width animates 36 → 314px)
 *   ├── strip / toggle  (position: static, width: 36px, always visible)
 *   └── panel           (position: absolute, right: 0, z-index: 2, width: 0 → 310px)
 *
 * Key spec points:
 * - Strip is NEVER hidden — panel slides over it, leaving 4px of strip visible (§ 5.3)
 * - Close control is › chevron, not ✕ (§ 5.5)
 * - Panel background: green-mist (§ 5.7)
 * - Bot bubbles: white background + border + subtle shadow (§ 5.7)
 * - Input: white background (§ 5.7)
 * - Context bar: rgba(255,255,255,.85) (§ 5.8)
 * - Strip hover: green-mid → green-light, 0.2s (§ 5.6)
 */
export function AiPanel({ context }: AiPanelProps) {
  const [open,       setOpen]       = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [input,      setInput]      = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check AI configuration when panel opens
  useEffect(() => {
    if (!open) return;
    apiClient.getSettings().then((s) => {
      setConfigured(!!(s.ai_provider && s.ai_api_key));
    }).catch(() => setConfigured(false));
  }, [open]);

  // Focus input when panel opens and AI is configured
  useEffect(() => {
    if (open && configured) {
      setTimeout(() => inputRef.current?.focus(), 320); // after transition
    }
  }, [open, configured]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      // Stub: AI sending wired in future story
      setInput("");
    }
  }

  return (
    // chat-wrap: position:relative so panel (absolute) is anchored here
    <div
      data-testid="ai-panel"
      style={{
        position:   "relative",
        display:    "flex",
        flexShrink: 0,
        width:      open ? "314px" : "36px",   // 310px panel + 4px strip
        transition: "width .3s ease",
      }}
    >

      {/* ── Strip / Toggle — always 36px, never hidden (doc-011 § 5.2 / § 5.6) ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Assistent einklappen" : "Assistent öffnen"}
        aria-expanded={open}
        data-testid="ai-toggle"
        style={{
          width:         "36px",
          flexShrink:    0,
          border:        "none",
          borderLeft:    "1px solid rgba(255,255,255,.15)",
          padding:       "24px 0",
          fontFamily:    "var(--font-body)",
          fontSize:      "14px",
          fontWeight:    500,
          cursor:        "pointer",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           "10px",
          overflow:      "hidden",
          transition:    "background .2s",
          zIndex:        1,
          color:         "var(--green-pale)",
        }}
        className="bg-green-mid hover:bg-green-light"
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

      {/* ── Panel — absolute, right-anchored, slides over strip (doc-011 § 5.3/5.4) ── */}
      <div
        data-testid="ai-chat-panel"
        style={{
          position:      "absolute",
          top:           0,
          right:         0,
          bottom:        0,
          width:         open ? "310px" : "0",
          background:    "var(--green-mist)",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          transition:    "width .3s ease",
          zIndex:        2,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding:        "13px 16px 10px",
            borderBottom:   "1px solid rgba(74,124,74,.2)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            flexShrink:     0,
            background:     "rgba(74,124,74,.06)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "15px",
              color:      "var(--green-deep)",
              fontWeight: 600,
              display:    "flex",
              alignItems: "center",
              gap:        "8px",
            }}
          >
            🤖 Garten-Assistent
          </span>
          {/* Close: › chevron (doc-011 § 5.5) */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Assistent einklappen"
            aria-label="Assistent einklappen"
            data-testid="ai-panel-close"
            style={{
              background:   "none",
              border:       "none",
              cursor:       "pointer",
              color:        "var(--text-light)",
              fontSize:     "20px",
              lineHeight:   1,
              padding:      "2px 4px",
              borderRadius: "4px",
              transition:   "color .15s",
            }}
            className="hover:text-text-dark"
          >
            ›
          </button>
        </div>

        {/* Context bar (doc-011 § 5.8) */}
        {context && (
          <div
            style={{
              background:   "rgba(255,255,255,.85)",
              borderBottom: "1px solid rgba(74,124,74,.15)",
              padding:      "7px 14px",
              fontSize:     "11px",
              fontWeight:   600,
              color:        "var(--green-deep)",
              display:      "flex",
              alignItems:   "center",
              gap:          "6px",
              flexShrink:   0,
            }}
          >
            {context}
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            flex:          1,
            overflowY:     "auto",
            padding:       "14px",
            display:       "flex",
            flexDirection: "column",
            gap:           "10px",
            minHeight:     0,
          }}
          data-testid="ai-messages"
        >
          {configured === null && (
            <span style={{ fontSize: "12px", color: "var(--text-light)" }}>…</span>
          )}

          {/* AC #7: not configured */}
          {configured === false && (
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
        </div>

        {/* Input area (doc-011 § 5.7: white input background) */}
        <div
          style={{
            padding:     "10px 12px",
            borderTop:   "1px solid rgba(74,124,74,.15)",
            display:     "flex",
            gap:         "8px",
            flexShrink:  0,
            alignItems:  "center",
            background:  "rgba(255,255,255,.5)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage oder Anweisung …"
            aria-label="Nachricht an Assistenten"
            disabled={!configured}
            data-testid="ai-input"
            style={{
              flex:         1,
              background:   "white",
              border:       "1px solid var(--border)",
              borderRadius: "20px",
              padding:      "7px 12px",
              fontSize:     "12px",
              fontFamily:   "var(--font-body)",
              color:        "var(--text-dark)",
              outline:      "none",
              opacity:      configured ? 1 : 0.5,
            }}
          />
          <button
            type="button"
            aria-label="Senden"
            disabled={!configured || !input.trim()}
            onClick={() => { if (input.trim()) setInput(""); }}
            data-testid="ai-send"
            style={{
              background:     "var(--green-deep)",
              color:          "white",
              border:         "none",
              borderRadius:   "50%",
              width:          "32px",
              height:         "32px",
              cursor:         configured && input.trim() ? "pointer" : "not-allowed",
              fontSize:       "14px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              opacity:        configured && input.trim() ? 1 : 0.4,
              transition:     "background .2s",
            }}
            className={configured && input.trim() ? "hover:bg-green-mid" : ""}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BotMessage ────────────────────────────────────────────────────────────────
// doc-011 § 5.7: white background, border, subtle shadow

function BotMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
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
          background:   "white",
          color:        "var(--text-dark)",
          border:       "1px solid var(--border)",
          borderRadius: "4px 12px 12px 12px",
          padding:      "8px 12px",
          fontSize:     "12px",
          lineHeight:   1.5,
          maxWidth:     "92%",
          boxShadow:    "0 1px 3px rgba(45,74,45,.08)",
        }}
      >
        {children}
      </span>
    </div>
  );
}
