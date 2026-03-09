# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint checking
npm run build:ios    # Build + sync to iOS (next build && npx cap sync ios)
npm run open:ios     # Open iOS project in Xcode
```

Note: There is no test suite configured. ESLint and TypeScript errors are intentionally ignored during builds (`next.config.mjs`).

## Architecture

**MyRideRadar** is a Swiss shared mobility aggregator. It shows available E-Scooters, E-Bikes, and Cars from multiple providers on an interactive map. Built as a Next.js web app with iOS native support via Capacitor.

### Stack
- **Next.js 15 App Router** + **React 19** + **TypeScript 5** (strict mode)
- **Leaflet/React-Leaflet** for the interactive map (dynamically imported — no SSR)
- **Tailwind CSS** + **shadcn/ui** (Radix UI primitives) for UI
- **Capacitor 6** for iOS packaging (app ID: `com.myrideradar.app`, web dir: `out/`)

### Data Flow
1. User selects a location (browser geolocation or map tap)
2. `lib/api.ts` calls `https://api.sharedmobility.ch/v1/sharedmobility/identify` with a 400m radius — three parallel fetches (E-Scooter, E-Bike, Car)
3. `utils/converters.ts` transforms EsriJSON responses → `MobilityVehicle` internal type
4. Vehicles are deduplicated by ID and rendered as map markers
5. Tapping a marker opens a bottom sheet (`components/vehicle-details.tsx`) with pricing/provider info

### Key Files
| File | Purpose |
|------|---------|
| `app/page.tsx` | Main map view, central state (vehicles, location, loading) |
| `lib/api.ts` | SharedMobility API + Swiss geocoding API (`api3.geo.admin.ch`) |
| `lib/providers.ts` | Provider branding config (logo, color, pricing for ~12 providers) |
| `types/mobility.ts` | Domain types: `MobilityVehicle`, `EsriJsonFeature`, `Provider`, `ProviderInfo` |
| `components/map.tsx` | Leaflet map wrapper (SSR-disabled via dynamic import) |
| `components/mobility-filters.tsx` | Location search + vehicle type filters |
| `components/vehicle-details.tsx` | Bottom sheet for vehicle details |
| `app/globals.css` | Global styles, CSS variables for theming and safe area insets |

### Patterns
- Nearly all feature components are `"use client"` — minimal server component usage
- State is managed locally with `useState`/`useCallback`/`useRef`; no global state library
- `AbortController` used to cancel in-flight fetch requests on new searches
- Path alias `@/*` maps to the repository root
- Dark mode via CSS class strategy with HSL CSS variables; system preference detection via `next-themes`
- iOS-specific: safe area insets (`env(safe-area-inset-*)`) used throughout for notch/home bar support
