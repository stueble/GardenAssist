---
id: decision-007
title: ADR-007 - API Specification in TypeScript with OpenAPI Generation
date: '2026-05-04'
status: Accepted
---

## Context

The application requires a well-defined API contract between the backend and the
frontend. Additionally, a mobile app (iOS/Android) is a potential future extension,
which would require a language-agnostic API specification that Swift and Kotlin
clients can consume.

Options considered:
- Hand-written OpenAPI/YAML: language-agnostic from the start, but verbose,
  unintuitive, and disconnected from the implementation
- tRPC: elegant TypeScript-native RPC, but only works between TypeScript clients —
  incompatible with a future mobile app
- TypeScript types as source of truth with generated OpenAPI: combines TypeScript
  ergonomics with language-agnostic output

## Decision

The API is specified as TypeScript types and interfaces using `const` objects for
enums (not native TypeScript enums) and JSDoc comments as the authoritative
documentation. Zod schemas are used for runtime validation and OpenAPI generation.

The TypeScript spec is the single source of truth — OpenAPI output is generated
from it, not maintained manually. This ensures the spec, implementation, and
documentation stay in sync.

API spec files live in `docs/api/*.ts`.

UI labels and locale strings are intentionally excluded from the spec. Where
enum values need translation, the spec documents the semantics in JSDoc and
delegates label generation to the implementation (or AI assistant).

## Consequences

- Server and frontend share the same TypeScript types — no contract drift possible.
- A future mobile client can consume the generated OpenAPI spec without any
  changes to the API itself.
- Runtime validation (Zod) is a natural byproduct of the spec — no separate
  validation layer needed.
- TypeScript is required for both the backend and the web frontend.
