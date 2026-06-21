// The basemap style — the "paint" laid over the raw map data.
// (See your Eng Lexicon entries: "Vector Tiles" and "Map Style".)
//
// These point at CARTO's free, no-API-key vector styles: Positron (light) and
// Dark Matter (dark). They're the closest ready-made cousins of your "Ink & bone"
// look, so the map works immediately with zero signup.
//
// When you build your own custom MapTiler styles, swap these two URLs. Nothing
// else in the app changes — that's the whole point of keeping the renderer
// (MapLibre) separate from the style.
export const MAP_STYLE_LIGHT =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const MAP_STYLE_DARK =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Pick the basemap that matches the current light/dark setting.
export function mapStyleFor(isDark: boolean) {
  return isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}
