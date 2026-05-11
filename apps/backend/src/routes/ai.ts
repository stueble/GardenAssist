/**
 * AI chat proxy route — TASK-042 / TASK-056
 *
 * POST /api/ai/chat
 *
 * Forwards conversation history to the configured AI provider.
 * Supports structured system_blocks for prompt caching (TASK-056):
 *
 *   system_blocks: SystemBlock[]  — structured, enables cache_control on Anthropic/OpenRouter
 *   system_prompt: string         — plain string fallback (backward-compatible)
 *
 * Cache strategy (TASK-056):
 *   - openai:      blocks joined to a single string; implicit prefix caching applies automatically
 *   - anthropic:   blocks sent as structured array; cache_control "ephemeral" on all but the last block
 *   - openrouter:  same as anthropic (forwarded to underlying model)
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

const OPENAI_URL        = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL    = "https://openrouter.ai/api/v1/chat/completions";
const ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS        = 4096;

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage  = { role: "user" | "assistant"; content: string };
type SystemBlock  = { text: string };

/** Anthropic system block with optional cache_control. */
type AnthropicSystemBlock = {
  type:           "text";
  text:           string;
  cache_control?: { type: "ephemeral" };
};

// ── Cache helpers ─────────────────────────────────────────────────────────────

/**
 * Convert blocks to Anthropic system format with smart cache_control placement.
 *
 * Anthropic requires ≥ 1024 tokens per cached block (~4096 chars at ~4 chars/token).
 * Blocks below this threshold are merged with adjacent blocks before setting
 * cache_control, so we never waste a breakpoint on a block too small to cache.
 *
 * Algorithm:
 *   1. Merge consecutive blocks until the accumulated text reaches MIN_CACHE_CHARS.
 *   2. Set cache_control on that merged block (except the final block).
 *   3. Repeat for remaining blocks.
 */
const MIN_CACHE_CHARS = 4096; // ≈ 1024 tokens at ~4 chars/token

function toAnthropicSystem(blocks: SystemBlock[]): AnthropicSystemBlock[] {
  if (blocks.length === 0) return [];

  // Merge small blocks: accumulate text until MIN_CACHE_CHARS, then flush.
  const merged: string[] = [];
  let acc = "";

  for (let i = 0; i < blocks.length; i++) {
    const isLast = i === blocks.length - 1;
    acc += (acc ? "\n\n---\n\n" : "") + blocks[i].text;
    // Flush when big enough OR at the last block
    if (acc.length >= MIN_CACHE_CHARS || isLast) {
      merged.push(acc);
      acc = "";
    }
  }

  // Build Anthropic blocks: cache_control on all but the last merged block
  return merged.map((text, i) => ({
    type: "text" as const,
    text,
    ...(i < merged.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

/** Convert blocks to a single system string for OpenAI (implicit prefix caching). */
function toOpenAiSystem(blocks: SystemBlock[]): string {
  return blocks.map((b) => b.text).join("\n\n---\n\n");
}

// ── Route ─────────────────────────────────────────────────────────────────────

aiRoutes.post("/chat", zValidator("json", AiChatRequestSchema), async (c) => {
  const { messages, language, system_prompt, system_blocks } = c.req.valid("json");

  const settings = getSettings(db);
  const { ai_provider, ai_model, ai_api_key } = settings;

  if (!ai_provider || !ai_model || !ai_api_key) {
    return c.json({ error: "AI provider not configured" }, 400);
  }

  // Build system content: prefer structured blocks, fall back to plain string / stub persona
  const fallbackPersona = system_prompt ?? (language === "en" ? PERSONA_EN : PERSONA_DE);

  try {
    let content: string;

    if (ai_provider === "anthropic") {
      const systemArr: AnthropicSystemBlock[] = system_blocks
        ? toAnthropicSystem(system_blocks)
        : [{ type: "text", text: fallbackPersona }];
      content = await callAnthropic(ai_api_key, ai_model, systemArr, messages);
    } else {
      const systemStr: string = system_blocks
        ? toOpenAiSystem(system_blocks)
        : fallbackPersona;
      const url = ai_provider === "openrouter" ? OPENROUTER_URL : OPENAI_URL;
      content = await callOpenAiCompat(url, ai_api_key, ai_model, systemStr, messages, ai_provider === "openrouter");
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
  system: string,
  messages: ChatMessage[],
  isOpenRouter = false,
): Promise<string> {
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      ...messages,
    ],
  };

  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
  if (isOpenRouter) {
    headers["HTTP-Referer"] = "https://gardenassist.app";
    headers["X-Title"]      = "GardenAssist";
  }

  const res = await fetch(url, {
    method:  "POST",
    headers,
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?:  Record<string, number>;
  };

  // AC #7: log cache usage when available
  if (data.usage) {
    console.log("[AI usage]", data.usage);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from provider");
  return content;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: AnthropicSystemBlock[],
  messages: ChatMessage[],
): Promise<string> {
  const body = {
    model,
    system,
    messages,
    max_tokens: MAX_TOKENS,
  };

  const res = await fetch(ANTHROPIC_URL, {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      // Required for prompt caching (Anthropic beta)
      "anthropic-beta":    "prompt-caching-2024-07-31",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
    usage?:  Record<string, number>;
  };

  // AC #7: log cache hit/miss metrics
  if (data.usage) {
    console.log("[AI cache]", data.usage);
    // Expected fields: input_tokens, output_tokens,
    //   cache_creation_input_tokens, cache_read_input_tokens
  }

  const block = data.content?.find((b) => b.type === "text");
  if (!block?.text) throw new Error("Empty response from Anthropic");
  return block.text;
}
