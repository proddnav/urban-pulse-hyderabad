# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `app/`:

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (outputs to dist/)
npm run preview    # Preview production build locally
npm run lint       # ESLint
```

**Capacitor (mobile builds):**
```bash
npx cap sync       # Sync web build to native projects after npm run build
npx cap open android
npx cap open ios
```

**Rebuild transit data** (only needed when GTFS source data changes):
```bash
node scripts/build-transit-graph.js
```

## Architecture

**Urban Pulse** is a Hyderabad public transit PWA/mobile app (React + Vite + Capacitor) for TGSRTC bus and metro routing.

### Routing Engine (`src/lib/routing-engine.js`)

The core of the app. All routing is **client-side** — no backend server.

- At startup, `transit-graph.json` (~compact graph), `metro-data.json`, and `route-index.json` are bundled and loaded synchronously.
- `precomputed-routes.json` (~9.6MB) is **lazy-loaded** 100ms after page load — it contains pre-computed shortest paths from 236 major hub stops.
- Route search: uses precomputed results when origin/destination is a known hub; falls back to Dijkstra's algorithm for other stops.
- Edges are **directional** (buses don't go backwards). Walk edges between consecutive transit stops are explicitly excluded.
- Bus speed assumed at 18 km/h (~5 m/s) for time estimates.

### Data Files (`src/data/`)

| File | Description |
|------|-------------|
| `transit-graph.json` | Stops, directional edges, routes, spatial index — built from TGSRTC GTFS |
| `route-index.json` | All routes with stops, directions, distance, and time — used for route browsing/search |
| `precomputed-routes.json` | Pre-computed paths from 236 hub stops (9.6MB, lazy-loaded) |
| `metro-data.json` | Hyderabad Metro stations, lines, and fare structure |

Raw GTFS source lives in `Telangana_opendata_gtfs_TGSRTC_28_January_2026/`. The `scripts/build-transit-graph.js` node script processes it into the data files above. Walk edges are generated for stops within 400m (1.2 m/s walk speed, 180s transfer penalty).

### Firebase (`src/lib/firebase.js`)

Firebase config is read from `VITE_FIREBASE_*` env vars (`.env` file). Firestore collections:
- `users/{uid}` — profile, saved places
- `events` — community events (soft-deleted via `status: 'deleted'`)
- `passes` — transit passes

Auth is Google Sign-In only (popup on desktop, redirect fallback on mobile/blocked popups).

### Pages & Routes

| Route | Page | Notes |
|-------|------|-------|
| `/` | `Home` | Map + nearby stops, quick route search |
| `/routes` | `Routes` | Browse/search all TGSRTC routes |
| `/routes/detail` | `RouteDetail` | Route detail passed via router state |
| `/stops/:stopId` | `StopDetail` | Stop info + departures |
| `/profile` | `Profile` | User profile + passes + saved places |
| `/login` | `Login` | Google auth |
| `/privacy` | `Privacy` | Privacy policy |

All routes except `/login` and `/privacy` are protected (`ProtectedRoute` → redirects to `/login`).

### State Management

No Redux/Zustand. State lives in:
- `AuthContext` — auth state (user, loading), wraps entire app
- Local component state for everything else
- `src/lib/storage.js` — Capacitor Preferences wrapper for persisting user id and local data

### Map

Uses **Leaflet** + **react-leaflet**. `RouteMap` component handles map rendering. OpenStreetMap tiles.

### Fare Calculation (`src/lib/fare.js`)

- Bus: distance-based slabs (₹10–₹75, up to 50km+)
- Metro: base fare + per-station increment, capped at max
- `calculateRouteFare(segments)` handles mixed bus+metro+walk routes
