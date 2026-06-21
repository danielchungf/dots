# dots

A personal field guide — a full-screen map where every pin is a place I've been. Tap a pin and it flies in, showing the place, the date, and a note.

Flat, elegant, "Ink & bone" (warm off-white + charcoal). Light by default; dark mode follows your system.

## Tech

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [MapLibre GL JS](https://maplibre.org) — open-source map renderer
- [CARTO basemaps](https://carto.com/basemaps/) (Positron / Dark Matter) — free, no API key
- Tailwind CSS v4

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Adding a place

Edit [`src/data/places.ts`](src/data/places.ts) — copy a block and change the values:

```ts
{
  id: "barcelona",
  name: "Barcelona",
  country: "Spain",
  lng: 2.1734,   // longitude (in Google Maps, the 2nd number)
  lat: 41.3851,  // latitude  (the 1st number)
  date: "Summer 2025",
  note: "...",
},
```

The map auto-frames every pin, so a new place just shows up.

## Project structure

```
src/
  app/            Next.js app router + global styles (Ink & bone palette)
  components/
    TripMap.tsx   the map, markers, dark-mode swap, fly-to
    TripCard.tsx  the card shown when you tap a pin
  data/
    places.ts     <- your trips (the file you'll edit most)
  lib/
    mapStyle.ts   basemap style URLs (swap for a custom style later)
```

## Custom basemap

The map currently uses CARTO's free basemaps. To make it truly your own, build a style in [MapTiler](https://www.maptiler.com) and swap the two URLs in [`src/lib/mapStyle.ts`](src/lib/mapStyle.ts) — nothing else changes.

## Attribution

Map data is © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, served via CARTO. That credit is required by their license and stays on the map.
