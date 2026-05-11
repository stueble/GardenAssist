import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiClient }               from "@/api/client";
import { chatWithAi }              from "@/api/client";
import type { ChatMessage }        from "@/api/client";
import { useAiPanelState }         from "@/hooks/useAiPanelState";
import { buildSystemBlocks }       from "@/lib/aiPrompt";
import type { AssistantContext }   from "@api/assistant-context";
import { getPlantEditHandler }      from "@/hooks/usePlantEditContext";
import type { PlantEditFields }     from "@/hooks/usePlantEditContext";
import { getJournalEditHandler }   from "@/hooks/useJournalEditContext";
import type { JournalEditFields }  from "@/hooks/useJournalEditContext";

interface AiPanelProps {
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
  toolCall:   Record<string, unknown> | null;
  displayText: string;
  /** True when a tool block was found but the JSON was invalid/truncated. */
  parseError: boolean;
} {
  // Case 1: complete ```tool ... ``` block present
  const match = /```tool\s*\n([\s\S]*?)\n```/m.exec(raw);
  if (match) {
    try {
      const toolCall = JSON.parse(match[1].trim()) as Record<string, unknown>;
      // Remove the block including surrounding blank lines, collapse extra blank lines.
      const displayText = raw
        .replace(/\n*```tool\s*\n[\s\S]*?\n```\n*/m, "\n")
        .trim()
        .replace(/\n{3,}/g, "\n\n");
      return { toolCall, displayText, parseError: false };
    } catch {
      // Block found but JSON is invalid — strip broken block, signal error
      const displayText = raw
        .replace(/\n*```tool\s*\n[\s\S]*?\n```\n*/m, "\n")
        .trim()
        .replace(/\n{3,}/g, "\n\n");
      return { toolCall: null, displayText, parseError: true };
    }
  }

  // Case 2: opening ```tool present but no closing ``` — response was truncated
  if (/```tool/m.test(raw)) {
    const displayText = raw.replace(/\n*```tool[\s\S]*$/m, "").trim();
    return { toolCall: null, displayText, parseError: true };
  }

  // Case 3: no tool block at all
  return { toolCall: null, displayText: raw, parseError: false };
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

  if (tool === "openJournalEdit") {
    const journalHandler = getJournalEditHandler();
    if (!journalHandler) {
      return lang === "de"
        ? "⚠️ Das Tagebuch ist gerade nicht geöffnet. Bitte wechsle zur Tagebuch-Ansicht."
        : "⚠️ The journal is not currently open. Please switch to the Journal view.";
    }
    const entryId = (toolCall.entry_id as string | undefined) ?? undefined;
    const prefill = (toolCall.prefill as JournalEditFields) ?? {};
    journalHandler.openJournalEdit(entryId, prefill);
    return "";
  }

  if (tool === "updateJournalEdit") {
    const journalHandler = getJournalEditHandler();
    if (!journalHandler) {
      return lang === "de"
        ? "⚠️ Das Tagebuch ist gerade nicht geöffnet. Bitte wechsle zur Tagebuch-Ansicht."
        : "⚠️ The journal is not currently open. Please switch to the Journal view.";
    }
    const fields = (toolCall.fields as JournalEditFields) ?? {};
    const err = journalHandler.updateJournalEdit(fields);
    if (err) {
      return lang === "de"
        ? `⚠️ ${err}`
        : `⚠️ ${err}`;
    }
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
export function AiPanel({ assistantContext }: AiPanelProps) {
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

  // Inject a context marker into the conversation history whenever the selected
  // plant changes (or on first open). This prevents the model from confusing
  // tool calls / mentions from a previous plant with the current one.
  const prevPlantIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    const plant = assistantContext?.selectedPlant;
    const currentId = plant?.id;
    if (currentId === prevPlantIdRef.current) return;
    prevPlantIdRef.current = currentId;

    const displayLabel = plant
      ? `${plant.icon ?? "🌿"} ${plant.name_common}${plant.location ? ` · ${plant.location}` : ""}`
      : assistantContext?.view
        ? `📋 ${assistantContext.view}`
        : "🌿 Garten";

    // The full content (sent to the model as an assistant message) includes the
    // plant_id so the model uses the correct ID in subsequent tool calls.
    const fullContent = plant
      ? `${displayLabel} [plant_id: ${plant.id}]`
      : displayLabel;

    setMessages((prev) => [...prev, { role: "context", content: fullContent, display_content: displayLabel }]);
  }, [open, assistantContext?.selectedPlant, assistantContext?.view]);

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
      const systemBlocks = assistantContext
        ? buildSystemBlocks(assistantContext, lang)
        : undefined;
      // Context markers are sent as "assistant" messages (with plant_id in content)
      // so the model uses the correct plant ID in subsequent tool calls.
      const apiMessages = nextMessages.map((m) =>
        m.role === "context"
          ? { role: "assistant" as const, content: m.content }
          : m as { role: "user" | "assistant"; content: string }
      );
      const res = await chatWithAi(apiMessages, lang, undefined, systemBlocks);

      // Parse tool calls from assistant response
      const { toolCall, displayText, parseError } = parseToolCall(res.content);
      let feedback = "";
      if (toolCall) {
        feedback = dispatchToolCall(toolCall, lang);
      } else if (parseError) {
        feedback = lang === "de"
          ? "⚠️ Die Antwort war zu lang und wurde abgeschnitten. Bitte vereinfache die Anfrage – z.\u00a0B. weniger Zeitpläne oder kürzere Notizen."
          : "⚠️ The response was too long and got cut off. Please simplify the request – e.g. fewer schedules or shorter notes.";
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
            msg.role === "context"
              ? <ContextMarker key={i}>{msg.display_content}</ContextMarker>
              : msg.role === "user"
                ? <UserMessage key={i}>{msg.content}</UserMessage>
                : <BotMessage key={i} content={msg.content} />
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
//
// When `content` (string) is provided, it is rendered as Markdown (GFM).
// When `children` (ReactNode) is provided instead, it is rendered as-is
// (used for static messages like the welcome hint and loading indicator).

interface BotMessageProps {
  content?:  string;
  children?: React.ReactNode;
}

function BotMessage({ content, children }: BotMessageProps) {
  const bubbleStyle: React.CSSProperties = {
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
  };

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
      {content !== undefined ? (
        <div style={{ ...bubbleStyle }} data-testid="bot-message-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <span style={{ ...bubbleStyle, whiteSpace: "pre-wrap" }}>
          {children}
        </span>
      )}
    </div>
  );
}

// ── Markdown component styles ─────────────────────────────────────────────────
// Styled using existing CSS design tokens — no external CSS framework.

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  // Paragraphs: no extra margin except between paragraphs
  p: ({ children }) => (
    <p style={{ margin: "0 0 6px", lineHeight: 1.5 }}>{children}</p>
  ),
  // Bold
  strong: ({ children }) => (
    <strong style={{ fontWeight: 700 }}>{children}</strong>
  ),
  // Italic
  em: ({ children }) => (
    <em style={{ fontStyle: "italic" }}>{children}</em>
  ),
  // Unordered list
  ul: ({ children }) => (
    <ul style={{ margin: "4px 0 6px", paddingLeft: "18px", listStyleType: "disc" }}>{children}</ul>
  ),
  // Ordered list
  ol: ({ children }) => (
    <ol style={{ margin: "4px 0 6px", paddingLeft: "18px", listStyleType: "decimal" }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ marginBottom: "2px" }}>{children}</li>
  ),
  // Inline code — AC #4: var(--green-mist) background
  code: ({ children, className }) => {
    const isBlock = !!className; // fenced code blocks have a className like "language-js"
    if (isBlock) {
      return (
        <code
          style={{
            display:      "block",
            background:   "var(--green-mist)",
            border:       "1px solid var(--border)",
            borderRadius: "6px",
            padding:      "8px 10px",
            fontSize:     "11px",
            fontFamily:   "monospace",
            whiteSpace:   "pre-wrap",
            overflowX:    "auto",
            margin:       "4px 0",
          }}
        >
          {children}
        </code>
      );
    }
    // Inline code — AC #4
    return (
      <code
        style={{
          background:   "var(--green-mist)",
          border:       "1px solid var(--border)",
          borderRadius: "4px",
          padding:      "1px 5px",
          fontSize:     "11px",
          fontFamily:   "monospace",
        }}
      >
        {children}
      </code>
    );
  },
  // Code block wrapper — AC #5
  pre: ({ children }) => (
    <pre style={{ margin: "4px 0", background: "none", padding: 0 }}>{children}</pre>
  ),
  // Headings — keep them compact inside the chat bubble
  h1: ({ children }) => <p style={{ fontWeight: 700, fontSize: "13px", margin: "4px 0" }}>{children}</p>,
  h2: ({ children }) => <p style={{ fontWeight: 700, fontSize: "12px", margin: "4px 0" }}>{children}</p>,
  h3: ({ children }) => <p style={{ fontWeight: 600, fontSize: "12px", margin: "4px 0" }}>{children}</p>,
  // Horizontal rule
  hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "6px 0" }} />,
  // Blockquote
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: "3px solid var(--green-mid)",
        margin:     "4px 0",
        padding:    "2px 10px",
        color:      "var(--text-mid)",
      }}
    >
      {children}
    </blockquote>
  ),
  // Tables (GFM)
  table: ({ children }) => (
    <table style={{ borderCollapse: "collapse", width: "100%", margin: "4px 0", fontSize: "11px" }}>{children}</table>
  ),
  th: ({ children }) => (
    <th style={{ borderBottom: "2px solid var(--border)", padding: "3px 8px", textAlign: "left", fontWeight: 700 }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{ border: "1px solid var(--border)", padding: "3px 8px" }}>{children}</td>
  ),
};

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

// ── ContextMarker ─────────────────────────────────────────────────────────────
// Centered separator line shown when the selected plant changes.
// Not a chat bubble — visually distinct, muted, never sent to the API.

function ContextMarker({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="context-marker"
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        "8px",
        margin:     "2px 0",
      }}
    >
      <span style={{ flex: 1, height: "1px", background: "rgba(74,124,74,.2)" }} />
      <span
        style={{
          fontSize:     "10px",
          fontWeight:   600,
          color:        "var(--text-light)",
          letterSpacing: ".4px",
          whiteSpace:   "nowrap",
        }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: "1px", background: "rgba(74,124,74,.2)" }} />
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
