import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient }               from "@/api/client";
import { chatWithAi }              from "@/api/client";
import type { ChatMessage }        from "@/api/client";
import { useAiPanelState }         from "@/hooks/useAiPanelState";
import { buildSystemPrompt }       from "@/lib/aiPrompt";
import type { AssistantContext }   from "@api/assistant-context";
import { getPlantEditHandler }     from "@/hooks/usePlantEditContext";
import type { PlantEditFields }    from "@/hooks/usePlantEditContext";

interface AiPanelProps {
  /** Context bar text, e.g. "✏️ Bearbeite: 🌹 Rose" or "⚙️ Einstellungen" */
  context?: string;
  /** Structured context for the AI system prompt (garden data, active view, selected plant) */
  assistantContext?: AssistantContext;
}

// ── Tool-call parsing ─────────────────────────────────────────────────────────

/**
 * Extracts a ```tool ... ``` JSON block from an AI response, if present.
 * Returns { toolCall, displayText } where displayText has the block stripped.
 *
 * Exported for testing.
 */
export function parseToolCall(raw: string): {
  toolCall: Record<string, unknown> | null;
  displayText: string;
} {
  const match = /```tool\s*\n([\s\S]*?)\n```/m.exec(raw);
  if (!match) return { toolCall: null, displayText: raw };
  try {
    const toolCall = JSON.parse(match[1].trim()) as Record<string, unknown>;
    const displayText = raw.replace(match[0], "").trim();
    return { toolCall, displayText };
  } catch {
    return { toolCall: null, displayText: raw };
  }
}

/**
 * Dispatches a parsed tool call to the appropriate handler.
 * Returns a feedback string to append to the chat (visible to the user).
 *
 * Exported as dispatchToolCallForTest for unit testing.
 */
export function dispatchToolCallForTest(
  toolCall: Record<string, unknown>,
  lang: "de" | "en",
): string {
  return dispatchToolCall(toolCall, lang);
}

function dispatchToolCall(
  toolCall: Record<string, unknown>,
  lang: "de" | "en",
): string {
  const handler = getPlantEditHandler();
  const tool = toolCall.tool as string | undefined;

  if (tool === "editPlant") {
    if (!handler) {
      return lang === "de"
        ? "⚠️ Die Pflanzenverwaltung ist gerade nicht geöffnet. Bitte wechsle zur Pflanzenansicht."
        : "⚠️ Plant management is not currently open. Please switch to the Plants view.";
    }
    const id     = (toolCall.id as string | null) ?? null;
    const fields = (toolCall.fields as PlantEditFields) ?? {};
    handler.editPlant(id, fields);
    return "";
  }

  return lang === "de"
    ? `⚠️ Unbekanntes Werkzeug: ${tool}`
    : `⚠️ Unknown tool: ${tool}`;
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
export function AiPanel({ context, assistantContext }: AiPanelProps) {
  const { open, setOpen }         = useAiPanelState();
  const { i18n }                  = useTranslation();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [input,      setInput]      = useState("");
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Check AI configuration whenever the panel is open.
  // Reset to null when closed so the next open always re-fetches.
  useEffect(() => {
    if (!open) {
      setConfigured(null);
      return;
    }
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

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    // reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setLoading(true);
    setError(null);

    try {
      const lang = (i18n.language?.startsWith("en") ? "en" : "de") as "de" | "en";
      const systemPrompt = assistantContext
        ? buildSystemPrompt(assistantContext, lang)
        : undefined;
      const res = await chatWithAi(nextMessages, lang, systemPrompt);

      // Parse tool calls from assistant response
      const { toolCall, displayText } = parseToolCall(res.content);
      let feedback = "";
      if (toolCall) {
        feedback = dispatchToolCall(toolCall, lang);
      }

      // Show the display text (tool block stripped) + any error feedback
      const finalContent = [displayText, feedback].filter(Boolean).join("\n\n");
      setMessages((prev) => [...prev, { role: "assistant", content: finalContent || res.content }]);
    } catch {
      setError(
        i18n.language?.startsWith("en")
          ? "Could not reach the AI assistant. Please try again."
          : "Der Assistent konnte nicht erreicht werden. Bitte erneut versuchen.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const canSend = !!configured && !!input.trim() && !loading;

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
        onClick={() => setOpen(!open)}
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
          ref={messagesRef}
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

          {/* Not configured hint */}
          {configured === false && (
            <BotMessage>
              KI-Assistent ist noch nicht vollständig eingerichtet.{" "}
              Bitte stelle sicher, dass unter{" "}
              <strong>Einstellungen → KI-Assistent</strong>{" "}
              ein Anbieter (z.&nbsp;B. Anthropic) und ein API-Schlüssel hinterlegt sind.
            </BotMessage>
          )}

          {/* Conversation history */}
          {configured === true && messages.length === 0 && (
            <BotMessage>
              Hallo! Wie kann ich dir mit deinem Garten helfen?
            </BotMessage>
          )}

          {messages.map((msg, i) =>
            msg.role === "user"
              ? <UserMessage key={i}>{msg.content}</UserMessage>
              : <BotMessage key={i}>{msg.content}</BotMessage>
          )}

          {/* Loading indicator */}
          {loading && (
            <BotMessage>
              <LoadingDots />
            </BotMessage>
          )}

          {/* Error banner */}
          {error && (
            <div
              data-testid="ai-error"
              style={{
                background:   "#fdf0ee",
                border:       "1px solid #e74c3c",
                borderRadius: "6px",
                padding:      "8px 12px",
                fontSize:     "12px",
                color:        "#c0392b",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Input area — textarea grows upward, send button aligned to bottom */}
        <div
          style={{
            padding:     "10px 12px",
            borderTop:   "1px solid rgba(74,124,74,.15)",
            display:     "flex",
            gap:         "8px",
            flexShrink:  0,
            alignItems:  "flex-end",
            background:  "rgba(255,255,255,.5)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              // auto-grow: reset to 1 row, then expand to content height
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Frage oder Anweisung …"
            aria-label="Nachricht an Assistenten"
            disabled={!configured || loading}
            data-testid="ai-input"
            style={{
              flex:        1,
              background:  "white",
              border:      "1px solid var(--border)",
              borderRadius: "12px",
              padding:     "7px 12px",
              fontSize:    "12px",
              fontFamily:  "var(--font-body)",
              color:       "var(--text-dark)",
              outline:     "none",
              opacity:     configured && !loading ? 1 : 0.5,
              resize:      "none",
              overflow:    "hidden",
              lineHeight:  "1.4",
              maxHeight:   "120px",
              overflowY:   "auto",
            }}
          />
          <button
            type="button"
            aria-label="Senden"
            disabled={!canSend}
            onClick={() => { void sendMessage(); }}
            data-testid="ai-send"
            style={{
              background:     "var(--green-deep)",
              color:          "white",
              border:         "none",
              borderRadius:   "50%",
              width:          "32px",
              height:         "32px",
              cursor:         canSend ? "pointer" : "not-allowed",
              fontSize:       "14px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              opacity:        canSend ? 1 : 0.4,
              transition:     "background .2s",
            }}
            className={canSend ? "hover:bg-green-mid" : ""}
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
          whiteSpace:   "pre-wrap",
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ── UserMessage ───────────────────────────────────────────────────────────────

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
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
        Du
      </span>
      <span
        style={{
          alignSelf:    "flex-end",
          background:   "var(--green-deep)",
          color:        "white",
          borderRadius: "12px 4px 12px 12px",
          padding:      "8px 12px",
          fontSize:     "12px",
          lineHeight:   1.5,
          maxWidth:     "92%",
          whiteSpace:   "pre-wrap",
        }}
        data-testid="user-message"
      >
        {children}
      </span>
    </div>
  );
}

// ── LoadingDots ───────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <span
      data-testid="ai-loading-dots"
      style={{
        display:       "inline-flex",
        gap:           "3px",
        alignItems:    "center",
        height:        "16px",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width:            "6px",
            height:           "6px",
            borderRadius:     "50%",
            background:       "var(--text-light)",
            animation:        `ai-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes ai-dot-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1.0); opacity: 1.0; }
        }
      `}</style>
    </span>
  );
}
