/**
 * useAiChat — shared AI chat logic for AiPanel (desktop) and ChatPanel (mobile).
 *
 * Encapsulates:
 *  - message state + context-marker injection on selectedPlant/view change
 *  - AI configuration check
 *  - sendMessage: builds system blocks, calls chatWithAi, parses + dispatches tool calls
 *
 * Both panels keep their own layout/animation; only the logic is shared here.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation }   from "react-i18next";
import { apiClient, chatWithAi } from "@/api/client";
import type { ChatMessage } from "@/api/client";
import { buildSystemBlocks } from "@/lib/aiPrompt";
import type { AssistantContext } from "@api/assistant-context";
import { parseToolCall, dispatchToolCallForTest as dispatchToolCall } from "@/components/AiPanel";

export interface UseAiChatOptions {
  /** Whether the chat UI is currently open/visible. Context markers and focus are gated on this. */
  open: boolean;
  /** Structured context passed to buildSystemBlocks for the AI system prompt. */
  assistantContext?: AssistantContext;
}

export interface UseAiChatReturn {
  messages:    ChatMessage[];
  input:       string;
  setInput:    (v: string) => void;
  loading:     boolean;
  error:       string | null;
  configured:  boolean | null;
  sendMessage: () => Promise<void>;
  messagesRef: React.RefObject<HTMLDivElement | null>;
  inputRef:    React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
}

export function useAiChat({ open, assistantContext }: UseAiChatOptions): UseAiChatReturn {
  const { t, i18n } = useTranslation("common");

  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // ── Check AI configuration whenever the panel opens ──────────────────────
  useEffect(() => {
    if (!open) {
      setConfigured(null);
      return;
    }
    apiClient.getSettings().then((s) => {
      setConfigured(!!(s.ai_provider && s.ai_api_key));
    }).catch(() => setConfigured(false));
  }, [open]);

  // ── Inject context marker when selected plant / view changes ─────────────
  // Track a composite key so the marker fires on first open (when prevViewKeyRef
  // is undefined) even if no plant is selected, and on plant/view changes.
  const prevViewKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    const plant   = assistantContext?.selectedPlant;
    const viewKey = `${assistantContext?.view ?? ""}::${plant?.id ?? ""}`;
    if (viewKey === prevViewKeyRef.current) return;
    prevViewKeyRef.current = viewKey;

    const displayLabel = plant
      ? `${plant.icon ?? "🌿"} ${plant.name_common}${plant.location ? ` · ${plant.location}` : ""}`
      : assistantContext?.view
        ? `📋 ${assistantContext.view}`
        : t("ai.garden_context");

    const fullContent = plant
      ? `${displayLabel} [plant_id: ${plant.id}]`
      : displayLabel;

    setMessages((prev) => [...prev, { role: "context", content: fullContent, display_content: displayLabel }]);
  }, [open, assistantContext?.selectedPlant, assistantContext?.view, t]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  // ── sendMessage ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    // Reset textarea height if applicable
    if (inputRef.current) {
      (inputRef.current as HTMLTextAreaElement).style.height = "auto";
    }
    setLoading(true);
    setError(null);

    try {
      const lang = (i18n.language?.startsWith("en") ? "en" : "de") as "de" | "en";
      const systemBlocks = assistantContext
        ? buildSystemBlocks(assistantContext, lang)
        : undefined;

      // Context markers are sent as "assistant" messages so the model uses the correct plant ID
      const apiMessages = nextMessages.map((m) =>
        m.role === "context"
          ? { role: "assistant" as const, content: m.content }
          : m as { role: "user" | "assistant"; content: string }
      );

      const res = await chatWithAi(apiMessages, lang, undefined, systemBlocks);

      const { toolCall, displayText, parseError } = parseToolCall(res.content);
      let feedback = "";
      if (toolCall) {
        feedback = dispatchToolCall(toolCall, lang);
      } else if (parseError) {
        feedback = lang === "de"
          ? "⚠️ Die Antwort war zu lang und wurde abgeschnitten. Bitte vereinfache die Anfrage."
          : "⚠️ The response was too long and got cut off. Please simplify the request.";
      }

      const finalContent = [displayText, feedback].filter(Boolean).join("\n\n");
      setMessages((prev) => [...prev, { role: "assistant", content: finalContent || res.content }]);
    } catch {
      setError(t("ai.error"));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, assistantContext, i18n, t]);

  return { messages, input, setInput, loading, error, configured, sendMessage, messagesRef, inputRef };
}
