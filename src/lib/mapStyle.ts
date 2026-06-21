// The basemap style — the "paint" laid over the raw map data.
// (See your Eng Lexicon entries: "Vector Tiles" and "Map Style".)
//
// This points at CARTO's free, no-API-key Dark Matter vector style — the
// closest ready-made cousin of our dark look, so the map works immediately
// with zero signup.
//
// When you build a custom MapTiler style, swap this URL. Nothing else in the
// app changes — that's the whole point of keeping the renderer (MapLibre)
// separate from the style.
export const MAP_STYLE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ── Ocean color ──────────────────────────────────────────────────
// The sea (and lakes/rivers) is the basemap's `water` fill layer. CARTO
// ships it as a muted gray; we repaint it to this color instead.
// **Change this hex value to recolor the ocean.**
export const MAP_OCEAN = "#242424"; // dark grey

// Repaint the basemap's water layer. Must be called *after* the style loads.
export function paintOcean(map: import("maplibre-gl").Map) {
  if (!map.getLayer("water")) return; // style not ready yet — no-op safely
  map.setPaintProperty("water", "fill-color", MAP_OCEAN);
}

// ── Place-label color ────────────────────────────────────────────
// Country / continent / state / city names are separate `place_*` symbol
// layers, each with its own (often zoom-varying) text color. We flatten
// them all to one gray. **Change this hex to recolor the labels.**
export const MAP_LABEL = "#9d9d9d";

export function paintPlaceLabels(map: import("maplibre-gl").Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type === "symbol" && layer.id.startsWith("place_")) {
      map.setPaintProperty(layer.id, "text-color", MAP_LABEL);
      // City/capital labels draw a little dot icon next to the name. Hide just
      // the icon (keep the text) so only our own pins mark places.
      if (layer.id.includes("_dot_")) {
        map.setPaintProperty(layer.id, "icon-opacity", 0);
      }
    }
  }
}

// ── Neutralize the basemap to true grey ─────────────────────────
// CARTO Dark Matter carries a cool blue-ish tint on land, roads, and
// buildings. We strip the hue from every fill/line/background color (keeping
// its lightness, so the map's tonal hierarchy survives) for a true grey look.

// Convert a single color string to its grey equivalent. Returns null for
// anything we don't recognise (so callers can leave it untouched).
function colorToGrey(value: string): string | null {
  const v = value.trim();

  // hsl / hsla — zero the saturation, keep lightness (and alpha).
  let m = v.match(
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (m) {
    return m[4] !== undefined
      ? `hsla(0, 0%, ${m[3]}%, ${m[4]})`
      : `hsl(0, 0%, ${m[3]}%)`;
  }

  // #rrggbb / #rgb — collapse to perceptual luminance.
  const luma = (r: number, g: number, b: number) =>
    Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  m = v.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    const y = luma((n >> 16) & 255, (n >> 8) & 255, n & 255);
    return `rgb(${y}, ${y}, ${y})`;
  }
  m = v.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const s = m[1];
    const y = luma(
      parseInt(s[0] + s[0], 16),
      parseInt(s[1] + s[1], 16),
      parseInt(s[2] + s[2], 16),
    );
    return `rgb(${y}, ${y}, ${y})`;
  }

  // rgb / rgba.
  m = v.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  );
  if (m) {
    const y = luma(+m[1], +m[2], +m[3]);
    return m[4] !== undefined
      ? `rgba(${y}, ${y}, ${y}, ${m[4]})`
      : `rgb(${y}, ${y}, ${y})`;
  }

  return null;
}

// Recurse through a paint value — a plain color, or an expression array with
// color literals inside (e.g. zoom interpolations) — greying every color found.
function greyValue(value: unknown): unknown {
  if (typeof value === "string") return colorToGrey(value) ?? value;
  if (Array.isArray(value)) return value.map(greyValue);
  return value;
}

const GREYABLE: Record<string, string[]> = {
  background: ["background-color"],
  fill: ["fill-color", "fill-outline-color"],
  line: ["line-color"],
  "fill-extrusion": ["fill-extrusion-color"],
};

export function neutralizeBasemap(map: import("maplibre-gl").Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const props = GREYABLE[layer.type];
    if (!props) continue;
    for (const prop of props) {
      try {
        const current = map.getPaintProperty(layer.id, prop);
        if (current == null) continue;
        map.setPaintProperty(layer.id, prop, greyValue(current));
      } catch {
        // Leave any layer we can't safely repaint alone.
      }
    }
  }
}

// Apply all of our basemap color overrides at once. Call after a style loads.
export function applyMapColors(map: import("maplibre-gl").Map) {
  neutralizeBasemap(map); // strip the blue cast first…
  paintOcean(map); // …then our specific overrides win.
  paintPlaceLabels(map);
}
