# Roamer

Roamer plans the best driving route between two locations, surfaces notable places along the way, and turns the
trip into a game: watch reels tied to each place, generate an AI photo of yourself there with Google Gemini, and
earn points by checking in with your location and a photo once you actually arrive.

## Features

- **Route planning** — search any two locations and get a driving route drawn on an interactive map, powered by
  free OpenStreetMap-based services (Nominatim for search, OSRM for directions).
- **Places along the route** — points of interest near the route are pulled from OpenStreetMap (Overpass API) and
  shown as cards next to the map.
- **Reels** — each place can have embedded video links shared by visitors.
- **AI photos with you in them** — upload a selfie and Google Gemini composites you into an intricate scene at that
  place.
- **Points for visiting** — check in at a place using your device's location plus a photo; check-ins only succeed
  within 500m of the place, and each one earns points shown in the header.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server routes)
- Tailwind CSS 4
- Leaflet / react-leaflet for the map
- OpenStreetMap, Nominatim, OSRM, Overpass for geocoding/routing/places (no API keys required)
- Google Gemini (`gemini-3-pro-image`) for AI photo generation, via Netlify AI Gateway
- Netlify Database (Postgres + Drizzle ORM) for places, reels, and check-ins
- Netlify Blobs for storing uploaded and generated photos

## Running locally

```bash
npm install
npm run dev
```

This starts the Vite dev server. For full local emulation of Netlify Database, Blobs, and AI Gateway, run it through
the Netlify CLI instead:

```bash
netlify dev
```

## Project structure

See [AGENTS.md](./AGENTS.md) for a full breakdown of the codebase.
