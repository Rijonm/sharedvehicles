# Smart Tight Zoom — Design Doc

**Date:** 2026-03-09
**Status:** Approved

## Problem

The current map always calls `fitBounds` to show all vehicles found within the search radius (default 400m). This means vehicles 300–400m away are shown even when there's a scooter 30m away. The user wants street-level context (2–3 streets around them), not a radius overview.

## Goal

After a search, start at the tightest zoom that makes sense given vehicle proximity. Only expand the view when nothing is close.

## Behavior

1. **No active location** (overview mode, center = Switzerland default) → no change, skip logic
2. **Any vehicle within 200m** → `setView(userCenter, 17)` — tight street-level view (~150–200m radius, 2–3 streets)
3. **All vehicles beyond 200m** → `fitBounds([userCenter, ...allVehicles], { padding: [60, 60], maxZoom: 16 })` — show all results so user has spatial context
4. **No vehicles** → `setView(userCenter, zoomForRadius(searchRadius))` — existing fallback

The 200m threshold (vs. original 150m) accounts for iOS GPS accuracy variance of 50–100m on first fix.

## Implementation Scope

Single file: `components/map.tsx`

- Add constant `TIGHT_ZONE_RADIUS_M = 200` at top of file
- Add helper `distanceMeters(center, vehicle)` using Euclidean distance with cosine correction for longitude (sufficient for <500m distances at Swiss latitudes ~47°)
- Replace the existing `fitBounds`/`setView` block in the center/zoom `useEffect` (lines ~316–341) with the new 4-branch logic

## Distance Formula

```
Δlat = (vLat - cLat) * 111320
Δlng = (vLng - cLng) * 111320 * cos(cLat_radians)
dist = sqrt(Δlat² + Δlng²)
```

Note: `vehicle.geometry.coordinates` is GeoJSON `[lng, lat]`; `center` prop is Leaflet `[lat, lng]`. Swap carefully — TypeScript will not catch this.

## What Does Not Change

- Search radius (400m default) — vehicles are still fetched at 400m
- `zoomForRadius` function — still used for the no-results fallback
- Overview zoom (`DEFAULT_MAP_ZOOM_OVERVIEW = 10`) — unchanged
- Marker clustering — unaffected, runs in separate effect

## Trade-offs Considered

- **Nearest-vehicle-only targeting** (original proposal): Rejected — disorienting when multiple vehicles exist beyond 200m; users lose spatial context
- **fitBounds with maxZoom cap only** (technical simplification): Possible, but loses the tight zoom 17 behavior when vehicles are right next to the user — the primary UX win
