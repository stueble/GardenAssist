/**
 * AI chat proxy route — STORY-042
 *
 * POST /api/ai/chat
 *
 * Forwards conversation history to the configured AI provider
 * (OpenAI, Anthropic, or OpenRouter) and returns the assistant reply.
 * The system message (persona stub) is prepended server-side so the
 * frontend never needs to construct it.
 *
 * Provider specifics:
 *   - openai / openrouter  → OpenAI chat-completions format
 *   - anthropic            → Anthropic Messages API (different shape + headers)
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AiChatRequestSchema } from "../schemas/index.js";
import { db } from "../db/index.js";
import { getSettings } from "../services/settings.service.js";

export const aiRoutes = new Hono();

// ── Constants ─────────────────────────────────────────────────────────────────

const PERSONA_DE = "Du bist ein hilfreicher Gartenassistent. Antworte auf Deutsch.";
const PERSONA_EN = "You are a helpful garden assistant. Reply in English.";

const OPENAI_URL      = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL  = "https://openrouter.ai/api/v1/chat/completions";
const ANTHROPIC_URL   = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 1024;

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

// ── Route ─────────────────────────────────────────────────────────────────────

aiRoutes.post("/chat", zValidator("json", AiChatRequestSchema), async (c) => {
  const { messages, language, system_prompt } = c.req.valid("json");

  // Read AI config from settings
  const settings = getSettings(db);
  const { ai_provider, ai_model, ai_api_key } = settings;

  if (!ai_provider || !ai_model || !ai_api_key) {
    return c.json({ error: "AI provider not configured" }, 400);
  }

  // Use the frontend-built system prompt when provided; fall back to stub persona
  const persona = system_prompt ?? (language === "en" ? PERSONA_EN : PERSONA_DE);

  try {
    let content: string;

    if (ai_provider === "anthropic") {
      content = await callAnthropic(ai_api_key, ai_model, persona, messages);
    } else {
      const url = ai_provider === "openrouter" ? OPENROUTER_URL : OPENAI_URL;
      content = await callOpenAiCompat(url, ai_api_key, ai_model, persona, messages);
    }

    return c.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Provider error: ${message}` }, 502);
  }
});

// ── Provider helpers ──────────────────────────────────────────────────────────

async function callOpenAiCompat(
  url: string,
  apiKey: string,
  model: string,
  persona: string,
  messages: ChatMessage[],
): Promise<string> {
  const body = {
    model,
    messages: [
      { role: "system", content: persona },
      ...messages,
    ],
  };

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from provider");
  return content;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  persona: string,
  messages: ChatMessage[],
): Promise<string> {
  const body = {
    model,
    system:     persona,
    messages,
    max_tokens: MAX_TOKENS,
  };

  const res = await fetch(ANTHROPIC_URL, {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const block = data.content?.find((b) => b.type === "text");
  if (!block?.text) throw new Error("Empty response from Anthropic");
  return block.text;
}
