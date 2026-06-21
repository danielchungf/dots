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

// Apply all of our basemap color overrides at once. Call after a style loads.
export function applyMapColors(map: import("maplibre-gl").Map) {
  paintOcean(map);
  paintPlaceLabels(map);
}
