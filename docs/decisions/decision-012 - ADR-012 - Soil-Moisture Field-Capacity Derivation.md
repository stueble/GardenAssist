---
id: decision-012
title: ADR-012 - Soil Moisture Field-Capacity Derivation
date: '2026-05-13'
status: Accepted
---

## Context

The FAO-56 water balance model (TASK-073) requires a **field capacity** value per
irrigation zone — the maximum volumetric water content (m³/m³) the soil can hold
before excess water drains away. Field capacity is a physical property of the soil
type, not of individual plants.

Three options were considered for sourcing this value:

| Option | Description | Pros | Cons |
|---|---|---|---|
| **A — Fixed constant** | Use 0.30 m³/m³ (loamy soil) for every zone | Simple, no data dependency | Inaccurate for sandy or humus-rich soils |
| **B — Derived from plant soil_type** | For each zone, take the modal `soil_type` across all plants assigned to that zone; map to a lookup table | Uses existing user data, zone-specific | Indirect (plant-level data used for zone-level property); requires a fallback |
| **C — Explicit Settings field** | Add a `field_capacity_m3` value to `Settings` or per-zone config | Most accurate | Scope creep; adds UX complexity for a low-visibility parameter |

## Decision

**Option B** is used: field capacity is derived per zone from the **modal `soil_type`
of all plants whose `watering_zone` matches that irrigation zone**.

Mapping table (based on standard agronomic values for Central European garden soils):

| `soil_type` value | Field capacity (m³/m³) |
|---|---|
| `loamy` | 0.30 |
| `sandy` | 0.20 |
| `humus_rich` | 0.35 |
| `calcareous` | 0.25 |
| `acidic` | 0.28 |
| Fallback (no plants in zone, or no `soil_type` set) | 0.30 |

**Tie-breaking:** When two soil types are equally frequent among a zone's plants,
the value with the higher field capacity is used (conservative estimate — avoids
underestimating available water).

**Status thresholds** for the dry / ok / wet classification are expressed as a
fraction of field capacity:

| Status | Condition |
|---|---|
| `dry` | current moisture < 35 % of field capacity |
| `ok` | 35 % ≤ current moisture ≤ 75 % of field capacity |
| `wet` | current moisture > 75 % of field capacity |

## Consequences

- Field capacity is automatically zone-aware without any additional user input.
- The derivation is a best-effort approximation: plants in the same zone may have
  different soil types, and users may not have filled in `soil_type` for all plants.
  The 0.30 fallback ensures the model always produces a plausible result.
- If Option C (explicit settings field) is implemented in a future story, the
  `fieldCapacityForZone()` helper in `soil-moisture.service.ts` can be updated
  without touching the water balance loop.
- The mapping table is a compile-time constant; changing it requires a code change
  and is intentionally not user-configurable in v1.
