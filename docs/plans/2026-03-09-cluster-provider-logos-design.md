# Cluster Provider Logo Pills — Design Document

**Date:** 2026-03-09
**Feature:** Informative cluster markers showing provider logos

## Problem

Current cluster markers display only a blue circle with a vehicle count (e.g. "14"). Users cannot tell which mobility providers are inside the cluster without zooming in.

## Solution

Replace the generic cluster icon with a **white pill-shaped marker** containing an overlapping stack of provider logos and a vehicle count — inspired by iOS group avatar UX.

## Visual Design

```
╭──────────────────────╮
│  [🟢][🔵][🟡]  · 14  │   ← white pill, subtle shadow
╰──────────────────────╯
```

- **Shape:** White rounded pill (border-radius: 15px), `box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)`
- **Logos:** Up to 3 provider logo circles (20×20px), –5px overlap (avatar-stack style), each with a 1.5px white border
- **Fallback (no logo):** Colored circle with 2-letter provider abbreviation
- **Overflow:** If 4+ unique providers, show 3 logos + `+N` grey circle
- **Count:** Bold dark number (11px, –apple-system) with 4px left margin
- **Anchor:** Center of the pill

## Implementation Approach

### 1. Store provider name on markers
When creating vehicle markers in the `vehicles` useEffect, attach `_provider` as a custom property:
```ts
(marker as L.Marker & { _provider: string })._provider = provider.name
```

### 2. Update `iconCreateFunction`
Read `_provider` from all child markers via `cluster.getAllChildMarkers()`, deduplicate, and build the pill HTML dynamically.

### 3. Dynamic icon sizing
Calculate pill width based on number of logos shown:
- `pillW = 6 + logoAreaW + 4 + countW + 6`
- `iconAnchor = [pillW/2, pillH/2]`  (centered, not bottom-anchored)

## Files Changed

| File | Change |
|------|--------|
| `components/map.tsx` | Update `iconCreateFunction` + tag markers with `_provider` |

## Out of Scope

- Cluster tooltip / hover state showing full provider list
- Animated cluster transitions
- Per-vehicle-type breakdown inside cluster
