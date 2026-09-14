# AGENTS.md

This document orients AI agents and developers working on this codebase.

## Project Overview

Roamer is a route-planning and travel gamification app. A user enters a start and end location, gets the best driving
route drawn on a map, and sees notable places discovered along that route. Each place has embedded video "reels",
an option to generate an AI photo of the user composited into that place, and a check-in flow (geolocation + photo)
that awards points for visiting.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (file-based routing, server routes) |
| Frontend | React 19, TanStack Router v1, Tailwind CSS 4 |
| Map | Leaflet / react-leaflet with OpenStreetMap tiles |
| Routing data | OSRM (driving directions), Nominatim (geocoding), Overpass API (points of interest) — all free, no API keys |
| AI image generation | Google Gemini (`gemini-3-pro-image`) via Netlify AI Gateway |
| Database | Netlify Database (Postgres) via Drizzle ORM |
| File storage | Netlify Blobs (check-in photos, generated AI images) |
| Deployment | Netlify |

## Directory Structure

```
├── db/
│   ├── schema.ts        # Drizzle tables: places, reels, checkins, ai_images
│   └── index.ts         # Drizzle client (Netlify Database adapter)
├── drizzle.config.ts    # drizzle-kit config, migrations output to netlify/database/migrations
├── netlify/database/migrations/  # Generated SQL migrations — never hand-edit, regenerate via drizzle-kit
├── src/
│   ├── components/
│   │   ├── MapView.tsx    # Leaflet map: route polyline, start/end/place markers
│   │   └── PlaceCard.tsx  # Per-place card: reels list/add, AI photo generation, check-in
│   ├── lib/
│   │   ├── blobs.ts   # Netlify Blobs store helpers (photos + AI images) + base64 decoding
│   │   ├── geo.ts      # Haversine distance helper (server-side check-in radius check)
│   │   └── user.ts     # Anonymous per-browser user id, persisted in localStorage
│   ├── routes/
│   │   ├── __root.tsx    # Root HTML shell + head metadata
│   │   ├── index.tsx     # Main Roamer UI: location search, route + place list, points header
│   │   └── api/
│   │       ├── geocode.ts    # GET — proxies Nominatim search
│   │       ├── route.ts      # GET — proxies OSRM driving directions
│   │       ├── places.ts     # GET — queries Overpass for tourism POIs near route waypoints, upserts into DB
│   │       ├── reels.ts      # GET/POST — list/add video links for a place
│   │       ├── ai-image.ts   # GET/POST — generates and lists Gemini composite photos for a place
│   │       ├── checkin.ts    # POST — verifies geolocation proximity, stores photo, awards points
│   │       ├── points.ts     # GET — total points + check-in history for a user
│   │       └── blob.ts       # GET — streams a stored photo/AI image back by store+key
│   └── styles.css
└── netlify.toml
```

## Key Concepts

### Data flow for a route search

1. `index.tsx` geocodes "from"/"to" via `/api/geocode`, then requests `/api/route` for the OSRM path.
2. It samples a handful of waypoints along the returned route geometry and calls `/api/places`, which queries
   Overpass for tourism POIs near those waypoints and upserts them into the `places` table (so every place has a
   stable database id used by reels/check-ins/AI images).
3. Each place renders as a `PlaceCard` with its own reels, AI photo generation, and check-in actions.

### Points and check-ins

Check-in (`/api/checkin`) requires the browser's current geolocation to be within 500m of the place's coordinates
before it accepts the uploaded photo and awards points (see `MAX_CHECKIN_DISTANCE_METERS` in that file). Points are
derived on read (`/api/points`) by summing the user's `checkins` rows — there is no separate points/user table.

### Anonymous users

There is no auth. Each browser gets a random id (`src/lib/user.ts`) persisted in `localStorage` and sent as `userId`
in API calls. This is intentionally simple; swapping in real auth would mean replacing this id with a session/user id.

### AI photo generation

`/api/ai-image` sends the user's uploaded selfie plus a text prompt naming the place to Gemini's
`gemini-3-pro-image` model (via Netlify AI Gateway — no API key management needed) and stores the returned image in
Netlify Blobs.

## Development Commands

```bash
npm run dev      # Start dev server (vite dev)
npm run build    # Production build
```

## Conventions

- Server endpoints live under `src/routes/api/*.ts` using TanStack Start's `server.handlers` convention, not
  `netlify/functions`.
- Any schema change to `db/schema.ts` requires a new migration: `npx drizzle-kit generate --name <description>`.
- Photos and generated images are stored in Netlify Blobs, never in the database directly — only their blob keys are
  stored in Postgres.
