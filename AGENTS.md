<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# dots

A personal field guide: a full-screen map where every pin is a place Danny has visited. Tap a pin → it flies in and a card shows the place, the date, and a note.

The aesthetic is **flat, elegant, "Ink & bone"** (warm off-white + charcoal). This is not a dashboard — restraint is the point. Light is the default; dark mode follows the OS.

## Stack

- **Next.js 16** (App Router, TypeScript, `src/` dir) — note the rules block above: APIs may differ from training data.
- **React 19**
- **Tailwind CSS v4** (utilities + a few CSS variables in `globals.css`)
- **MapLibre GL JS** (`maplibre-gl`) — the map renderer, used directly (no React wrapper)
- **CARTO basemaps** (Positron light / Dark Matter dark) — free, no API key. Temporary; see Roadmap.

## The one mental model

A web map is two separate layers, plus your pins. Keep them separate:

1. **Renderer** — MapLibre. Draws the map, handles zoom/pan, holds the markers.
2. **Basemap style** — a `style.json` (currently CARTO Positron / Dark Matter). Controls how land, water, roads, and labels look. Swap this to restyle the entire map; nothing else changes.
3. **Pins** — plain `<div class="dot">` HTML markers added on top. They are **not** part of the basemap style, so they're fully ours to control.

If you're changing how the map *looks*, you're touching the style (`mapStyle.ts` or a future custom style), not the renderer.

## File map

| File | What it is | Edit it when… |
|------|-----------|---------------|
| `src/data/places.ts` | The trips — a typed `Place[]` | Adding / editing a place. **This is the main content file.** |
| `src/components/TripMap.tsx` | The map: init, markers, fit-bounds, dark-mode swap, fly-to | Changing map behavior |
| `src/components/TripCard.tsx` | The card shown on pin tap (presentational) | Changing what a pin shows |
| `src/lib/mapStyle.ts` | Basemap style URLs (light/dark) + picker | Swapping basemaps (e.g. to a custom MapTiler style) |
| `src/app/globals.css` | Ink & bone palette (CSS vars), `.dot`, dark-mode overrides, attribution styling | Theming / colors |
| `src/app/page.tsx`, `layout.tsx` | Wiring + metadata + fonts | Rarely |

## Data model

A place is just:

```ts
{ id, name, country, lng, lat, date, note }
```

`lng`/`lat` are `[longitude, latitude]`. From Google Maps the displayed value is "lat, lng" — flip the order here. The opening view auto-frames all pins via `fitBounds`, so a new place just appears.

## Run it

```bash
npm install
npm run dev   # http://localhost:3000 (or `-- -p 3210` to set a port)
```

## Conventions / design system

- **Ink & bone palette** lives as CSS variables in `globals.css` (`--ink`, `--bone`, `--muted`, `--card-*`, `--pin*`). Use these — don't hardcode hex in components.
- Light is the default; dark follows the OS (`prefers-color-scheme`) and swaps the basemap live via a `matchMedia` listener. HTML markers survive `setStyle`, so the dots persist across the swap.
- Place names use the serif (`--font-serif`, Fraunces). UI uses Geist sans.
- The map stays **flat** — no rotation or tilt (`dragRotate: false`). Don't add 3D/globe unless asked.

## Constraints (don't break these)

- **Keep the attribution.** OpenStreetMap's license and CARTO's terms require crediting the map data. It's styled small and muted in `globals.css` — that's the most it can be reduced. Do not remove it. The same rule applies to MapTiler later unless on a plan that waives it.

## Roadmap / next steps

- [ ] **Own the basemap.** Get a free MapTiler key, build a custom "Ink & bone" style in their editor, and swap the two URLs in `src/lib/mapStyle.ts` (a one-line change each). CARTO is a stand-in.
- [ ] **Photos on cards.** Add an optional image per place → turns the card from info into memory.
- [ ] **Cluster overlapping pins.** The Japan cities overlap at world zoom; add clustering for clean far-out views.
- [ ] (Optional) A manual light/dark toggle layered on top of the system default.
- [ ] Deploy (Vercel).
