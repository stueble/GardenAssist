---
id: decision-010
title: ADR-010 - Prompt Caching for AI Assistant
date: '2026-05-09'
status: Accepted
---

## Context

The AI assistant sends a three-layer system prompt with every request: a static
persona and app description, serialized garden data, and the current situation
(active view and selected plant). Without caching, the full prompt is billed at
standard input token rates on every message — even when nothing has changed between
turns.

The system prompt is currently built as a single string. Any change to the active
view or selected plant invalidates the entire string — breaking OpenAI's implicit
prefix caching and preventing Anthropic caching entirely.

Anthropic supports explicit prompt caching via `cache_control` markers on individual
content blocks. Cached tokens are billed at 10% of the standard input price on
subsequent reads. Cache writes cost 125% of the standard price but are amortized
across all following hits. The break-even is reached after two messages per session.

OpenAI caches implicitly and automatically for prompts above 1024 tokens, with no
additional configuration required. Cache hits occur only when the prompt prefix is
identical between requests — making prompt structure the primary optimization lever.

OpenRouter forwards `cache_control` markers to the underlying provider when
supported and silently ignores them otherwise.

## Decision

The system prompt is split into five content blocks ordered by change frequency
(static first, dynamic last). This ordering immediately benefits OpenAI via
automatic prefix caching. For Anthropic and OpenRouter, explicit `cache_control`
breakpoints are added on the four most stable blocks:

| Block | Content | Changes when | cache_control |
|---|---|---|---|
| #1 | Persona + App description + Tools | Never | ✅ Anthropic / OpenRouter |
| #2 | Settings (zones, categories, color presets) | Settings saved | ✅ Anthropic / OpenRouter |
| #3 | Plant base data (name, type, location, lifecycle) | Plant edited | ✅ Anthropic / OpenRouter |
| #4 | Dynamic plant data (tasks, journal, schedules) | Task resolved / journal entry added | ✅ Anthropic / OpenRouter |
| #5 | Current situation (active view + selected plant) | View or plant changes | ❌ none |

For `openai`, the system prompt is passed as a plain concatenated string — the
correct block ordering ensures the stable prefix is as long as possible, maximizing
implicit cache hits without any additional configuration.

For `anthropic` and `openrouter`, `cache_control: { type: "ephemeral" }` is added
to blocks #1–#4 as explicit content blocks in the request body.

## Consequences

- The correct block ordering alone already benefits OpenAI — no provider-specific
  code is needed beyond concatenating blocks in the right sequence.
- Block #1 produces a cache hit on virtually every request after the first for all
  providers.
- Block #5 is never cached — it changes too frequently to benefit.
- Cache writes cost slightly more than uncached requests; sessions with only one
  message are marginally more expensive than without caching.
- Adding a new provider that supports `cache_control` requires only adding it to
  the provider check in the backend route.
- The implementation is backwards-compatible: if `cache_control` is unsupported
  by a provider, the request succeeds and the field is silently ignored.
