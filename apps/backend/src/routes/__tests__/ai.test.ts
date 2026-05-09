/**
 * AI chat route tests — STORY-042
 *
 * Uses Hono's app.request helper (no real server).
 * fetch is mocked via vi.stubGlobal to intercept provider calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import app from "../../index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function postChat(
  messages: Array<{ role: string; content: string }>,
  language = "de",
) {
  return app.request("/api/ai/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ messages, language }),
  });
}

function mockFetch(responseBody: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json:       () => Promise.resolve(responseBody),
    text:       () => Promise.resolve(JSON.stringify(responseBody)),
  });
}

// ── Mock settings so every test controls the AI config ────────────────────────

vi.mock("../../services/settings.service.js", () => ({
  getSettings: vi.fn(),
}));

import { getSettings } from "../../services/settings.service.js";

const BASE_SETTINGS = {
  language: "de", location_city: null, location_zip: null,
  irrigation_zones: [], plant_categories: [], color_presets: [],
  task_lookback_weeks: 8, task_lookahead_weeks: 4,
  attachment_size_limit_mb: 10,
  ai_provider: null, ai_model: null, ai_api_key: null,
};

function configureSettings(overrides: Record<string, unknown>) {
  (getSettings as ReturnType<typeof vi.fn>).mockReturnValue({
    ...BASE_SETTINGS,
    ...overrides,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/ai/chat — validation", () => {
  it("returns 400 when AI is not configured", async () => {
    configureSettings({ ai_provider: null, ai_model: null, ai_api_key: null });
    const res = await postChat([{ role: "user", content: "Hallo" }]);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not configured/i);
  });

  it("returns 400 for empty messages array", async () => {
    configureSettings({ ai_provider: "openai", ai_model: "gpt-4o", ai_api_key: "sk-test" });
    const res = await postChat([]);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid message role", async () => {
    configureSettings({ ai_provider: "openai", ai_model: "gpt-4o", ai_api_key: "sk-test" });
    const res = await app.request("/api/ai/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ messages: [{ role: "system", content: "hi" }] }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/ai/chat — OpenAI provider", () => {
  it("calls OpenAI completions URL with correct headers and returns content", async () => {
    configureSettings({ ai_provider: "openai", ai_model: "gpt-4o", ai_api_key: "sk-openai" });

    const fetchMock = mockFetch({
      choices: [{ message: { content: "Antwort vom Modell" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await postChat([{ role: "user", content: "Hallo" }]);
    expect(res.status).toBe(200);

    const body = await res.json() as { content: string };
    expect(body.content).toBe("Antwort vom Modell");

    // Verify correct URL and Authorization header
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-openai");
  });

  it("includes system message with persona in the request body", async () => {
    configureSettings({ ai_provider: "openai", ai_model: "gpt-4o", ai_api_key: "sk-openai" });

    const fetchMock = mockFetch({
      choices: [{ message: { content: "OK" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await postChat([{ role: "user", content: "Test" }], "de");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[0].content).toMatch(/Gartenassistent/);
  });

  it("includes full conversation history in the request", async () => {
    configureSettings({ ai_provider: "openai", ai_model: "gpt-4o", ai_api_key: "sk-openai" });

    const fetchMock = mockFetch({
      choices: [{ message: { content: "Antwort 2" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const history = [
      { role: "user",      content: "Erste Frage" },
      { role: "assistant", content: "Erste Antwort" },
      { role: "user",      content: "Zweite Frage"  },
    ];
    await postChat(history);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    // system + 3 history messages
    expect(sent.messages).toHaveLength(4);
    expect(sent.messages[1].content).toBe("Erste Frage");
    expect(sent.messages[3].content).toBe("Zweite Frage");
  });

  it("returns 502 when the provider responds with an error", async () => {
    configureSettings({ ai_provider: "openai", ai_model: "gpt-4o", ai_api_key: "sk-openai" });

    vi.stubGlobal("fetch", mockFetch({ error: "invalid_api_key" }, false, 401));

    const res = await postChat([{ role: "user", content: "Hallo" }]);
    expect(res.status).toBe(502);
  });
});

describe("POST /api/ai/chat — OpenRouter provider", () => {
  it("calls OpenRouter URL instead of OpenAI URL", async () => {
    configureSettings({
      ai_provider: "openrouter",
      ai_model:    "google/gemini-2.0-flash-001",
      ai_api_key:  "sk-or-test",
    });

    const fetchMock = mockFetch({
      choices: [{ message: { content: "Router reply" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await postChat([{ role: "user", content: "Hi" }]);
    expect(res.status).toBe(200);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
  });
});

describe("POST /api/ai/chat — Anthropic provider", () => {
  it("calls Anthropic URL with x-api-key header", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    const fetchMock = mockFetch({
      content: [{ type: "text", text: "Hallo vom Modell" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await postChat([{ role: "user", content: "Hallo" }]);
    expect(res.status).toBe(200);

    const body = await res.json() as { content: string };
    expect(body.content).toBe("Hallo vom Modell");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant-test");
    expect((init.headers as Record<string, string>)["anthropic-version"]).toBeDefined();
  });

  it("sends system as array of blocks (not in messages) — TASK-056", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    const fetchMock = mockFetch({
      content: [{ type: "text", text: "OK" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await postChat([{ role: "user", content: "Test" }]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      system:   Array<{ type: string; text: string }>;
      messages: Array<{ role: string }>;
    };
    // With fallback persona, system is a 1-element array
    expect(Array.isArray(sent.system)).toBe(true);
    expect(sent.system[0].type).toBe("text");
    expect(sent.system[0].text).toMatch(/Gartenassistent/);
    // messages should NOT contain a system role entry
    expect(sent.messages.every((m) => m.role !== "system")).toBe(true);
  });

  it("uses English persona when language is en", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    const fetchMock = mockFetch({
      content: [{ type: "text", text: "Hello" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await postChat([{ role: "user", content: "Hi" }], "en");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      system: Array<{ type: string; text: string }>;
    };
    expect(Array.isArray(sent.system)).toBe(true);
    expect(sent.system[0].text).toMatch(/garden assistant/i);
  });

  it("merges small blocks and sets cache_control only on large-enough merged groups — TASK-056 AC #6", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    const fetchMock = mockFetch({
      content: [{ type: "text", text: "OK" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    // Each block is ≥ 4096 chars so they stay separate and each gets cache_control
    const bigText1 = "A".repeat(4096);
    const bigText2 = "B".repeat(4096);
    const situation = "Current view: plants"; // small — last block, no cache_control

    const res = await app.request("/api/ai/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        messages:      [{ role: "user", content: "Test" }],
        language:      "de",
        system_blocks: [
          { text: bigText1 },
          { text: bigText2 },
          { text: situation },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      system: Array<{ type: string; text: string; cache_control?: { type: string } }>;
    };

    // 3 blocks stay separate (each bigText ≥ 4096 chars)
    expect(sent.system).toHaveLength(3);
    expect(sent.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(sent.system[1].cache_control).toEqual({ type: "ephemeral" });
    // Last block (situation) has no cache_control
    expect(sent.system[2].cache_control).toBeUndefined();
  });

  it("merges blocks smaller than 4096 chars before setting cache_control", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    const fetchMock = mockFetch({
      content: [{ type: "text", text: "OK" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    // 3 small blocks — all merged into 1, last block has no cache_control → 1 block total, no cache
    const res = await app.request("/api/ai/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        messages:      [{ role: "user", content: "Test" }],
        language:      "de",
        system_blocks: [
          { text: "Block 1 — small" },
          { text: "Block 2 — small" },
          { text: "Block 3 — situation" },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as {
      system: Array<{ type: string; text: string; cache_control?: { type: string } }>;
    };

    // All 3 merged into 1 (all below threshold) → single block, no cache_control
    expect(sent.system).toHaveLength(1);
    expect(sent.system[0].cache_control).toBeUndefined();
    expect(sent.system[0].text).toContain("Block 1");
    expect(sent.system[0].text).toContain("Block 3");
  });

  // ── Caching verification tests ───────────────────────────────────────────────
  // These tests verify the caching infrastructure is correctly wired without
  // making real API calls. They confirm:
  //   1. The anthropic-beta header is sent (required to activate prompt caching)
  //   2. cache_read_input_tokens from the response is logged (visible in prod logs)
  //   3. cache_creation_input_tokens is also logged (shows cache was built)
  //
  // To verify caching actually works in production:
  //   - Watch the backend log for: [AI cache] { ..., cache_read_input_tokens: N }
  //   - First request: cache_creation_input_tokens > 0, cache_read_input_tokens = 0
  //   - Second request (same context, within 5 min TTL): cache_read_input_tokens > 0

  it("sends anthropic-beta prompt-caching header (required for caching to activate)", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    const fetchMock = mockFetch({
      content: [{ type: "text", text: "OK" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await postChat([{ role: "user", content: "Test" }]);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["anthropic-beta"]).toBe("prompt-caching-2024-07-31");
  });

  it("logs cache_read_input_tokens when Anthropic returns usage data (cache hit)", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    // Simulate a cache-hit response from Anthropic
    const fetchMock = mockFetch({
      content: [{ type: "text", text: "Cached reply" }],
      usage: {
        input_tokens:                 120,
        output_tokens:                 45,
        cache_creation_input_tokens:    0,
        cache_read_input_tokens:     1180,  // > 0 = cache hit
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const consoleSpy = vi.spyOn(console, "log") as MockInstance;

    await postChat([{ role: "user", content: "Test" }]);

    // Backend should log the usage object so cache hits are visible in production logs
    const cacheLogCall = consoleSpy.mock.calls.find(
      (args) => typeof args[0] === "string" && args[0].includes("[AI cache]")
    );
    expect(cacheLogCall).toBeDefined();
    const loggedUsage = cacheLogCall![1] as Record<string, number>;
    expect(loggedUsage.cache_read_input_tokens).toBe(1180);

    consoleSpy.mockRestore();
  });

  it("logs cache_creation_input_tokens when Anthropic returns usage data (cache miss / first request)", async () => {
    configureSettings({
      ai_provider: "anthropic",
      ai_model:    "claude-sonnet-4-6",
      ai_api_key:  "sk-ant-test",
    });

    // Simulate a cache-miss (first request) response: cache is being written
    const fetchMock = mockFetch({
      content: [{ type: "text", text: "First reply" }],
      usage: {
        input_tokens:                1300,
        output_tokens:                 45,
        cache_creation_input_tokens: 1180,  // > 0 = cache was written
        cache_read_input_tokens:        0,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const consoleSpy = vi.spyOn(console, "log") as MockInstance;

    await postChat([{ role: "user", content: "Test" }]);

    const cacheLogCall = consoleSpy.mock.calls.find(
      (args) => typeof args[0] === "string" && args[0].includes("[AI cache]")
    );
    expect(cacheLogCall).toBeDefined();
    const loggedUsage = cacheLogCall![1] as Record<string, number>;
    expect(loggedUsage.cache_creation_input_tokens).toBe(1180);
    expect(loggedUsage.cache_read_input_tokens).toBe(0);

    consoleSpy.mockRestore();
  });
});
