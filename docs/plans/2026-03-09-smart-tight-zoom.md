# Smart Tight Zoom Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After a search, snap to a tight street-level zoom (zoom 17) when vehicles are within 200m, and show all results with a capped zoom when they are farther away — instead of always fitting all vehicles within the 400m search radius.

**Architecture:** Single change to the center/zoom `useEffect` in `components/map.tsx` (lines 316–342). A small distance helper is added to the same file. No other files are touched.

**Tech Stack:** Leaflet `setView` / `fitBounds`, TypeScript, React `useEffect`

---

### Task 1: Add constant and distance helper to `map.tsx`

**Files:**
- Modify: `components/map.tsx` — add after line 68 (end of `zoomForRadius`)

**Step 1: Insert the constant and helper**

Add these lines immediately after the closing `}` of `zoomForRadius` (after line 68):

```typescript
const TIGHT_ZONE_RADIUS_M = 200

/** Euclidean distance in metres between Leaflet center [lat,lng] and a vehicle's GeoJSON coordinates [lng,lat]. */
function distanceToVehicle(center: [number, number], vehicle: MobilityVehicle): number {
  const cLat = center[0]
  const cLng = center[1]
  const vLat = vehicle.geometry.coordinates[1]  // GeoJSON is [lng, lat]
  const vLng = vehicle.geometry.coordinates[0]
  const dLat = (vLat - cLat) * 111320
  const dLng = (vLng - cLng) * 111320 * Math.cos((cLat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}
```

Key details:
- `center` prop is Leaflet order `[lat, lng]`
- `vehicle.geometry.coordinates` is GeoJSON order `[lng, lat]` — swap `[1]` and `[0]`
- Cosine correction on longitude is required; without it east/west distances are ~1.46× too large at Swiss latitudes

**Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```
Expected: no type errors on new lines. Build errors on unrelated things are fine (build errors are suppressed per project config anyway).

**Step 3: Commit**

```bash
git add components/map.tsx
git commit -m "feat: add distanceToVehicle helper for smart zoom"
```

---

### Task 2: Replace the center/zoom `useEffect` logic

**Files:**
- Modify: `components/map.tsx` lines 329–341 (the `if (vehicles.length > 0)` block)

**Step 1: Read the current block to confirm line numbers**

Lines 316–342 currently look like:

```typescript
  if (vehicles.length > 0) {
    const bounds = L.latLngBounds([leafletCenter])
    vehicles.forEach((v) => {
      bounds.extend([v.geometry.coordinates[1], v.geometry.coordinates[0]])
    })
    if (bounds.isValid() && bounds.getSouthWest().distanceTo(bounds.getNorthEast()) > 10) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 })
    } else {
      map.setView(leafletCenter, zoomForRadius(searchRadius))
    }
  } else {
    map.setView(leafletCenter, zoomForRadius(searchRadius))
  }
```

**Step 2: Replace with the smart zoom logic**

Replace the entire block above with:

```typescript
    if (vehicles.length > 0 && userLocation !== null) {
      // Smart tight zoom: snap to street level if any vehicle is within 200 m,
      // otherwise show all results capped at zoom 16 so the user has spatial context.
      const anyClose = vehicles.some((v) => distanceToVehicle(center, v) <= TIGHT_ZONE_RADIUS_M)
      if (anyClose) {
        map.setView(leafletCenter, 17)
      } else {
        const bounds = L.latLngBounds([leafletCenter])
        vehicles.forEach((v) => {
          bounds.extend([v.geometry.coordinates[1], v.geometry.coordinates[0]])
        })
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
      }
    } else {
      map.setView(leafletCenter, zoomForRadius(searchRadius))
    }
```

Key differences from original:
- Guard `userLocation !== null` — skips smart logic in overview mode (no search active)
- `anyClose` uses `some()` — short-circuits on first nearby vehicle, no need to find nearest
- `maxZoom: 18` → `maxZoom: 16` — prevents over-zooming when all results are spread across radius
- No more degenerate-bounds check needed — `fitBounds` handles small bounds gracefully at maxZoom 16

**Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```
Expected: no new type errors.

**Step 4: Start dev server and manually test**

```bash
npm run dev
```

Open http://localhost:3000 and test these scenarios:

| Scenario | Expected zoom |
|---|---|
| App opens, no location (Switzerland overview) | Zoom 10, no change |
| Search location with scooters nearby (<200m) | Snaps to zoom 17, tight street view |
| Search location with nothing close (all >200m) | fitBounds showing all vehicles, max zoom 16 |
| Search returns no results | setView at zoomForRadius(400) = zoom 16 |
| Change search radius to 2000m, no close vehicles | fitBounds of all vehicles, capped at zoom 16 |

**Step 5: Commit**

```bash
git add components/map.tsx
git commit -m "feat: smart tight zoom — street-level view when vehicles are nearby"
```

---

### Task 3: Smoke test on mobile viewport

**Step 1: Test in browser DevTools mobile emulation**

In Chrome DevTools, switch to iPhone 15 Pro viewport (393×852). Repeat the manual test scenarios from Task 2, Step 4. Confirm the zoom 17 view shows recognisable streets and the fitBounds view is not cramped.

**Step 2: Done — no further code changes needed**

This feature has no UI, no new props, no i18n strings, and no impact on other components.
