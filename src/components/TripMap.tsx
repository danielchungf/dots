"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { places, type Place } from "@/data/places";
import { MAP_STYLE_DARK, applyMapColors } from "@/lib/mapStyle";
import TripCard from "@/components/TripCard";
import AddPlaceDrawer from "@/components/AddPlaceDrawer";

// Above this zoom we count as "zoomed in", so the card's Zoom-in button
// collapses away. Selecting a pin flies to 5; the button flies to 12.
const ZOOM_IN_LEVEL = 8;

// Neighborhood outlines (and their name labels) only appear once you're zoomed
// in this far — so far out it's just a dot; the detail is a reward for zooming.
const BOUNDARY_REVEAL_ZOOM = 12.5;

// "Return" zooms out to roughly this level — a continent-scale view, keeping
// the current center (so from Tokyo you land looking at Asia, not the Americas).
const CONTINENT_ZOOM = 3.2;

// Default view: frame the Americas on load (rather than auto-fitting every
// pin, which would open at world zoom). Tweak the box to reframe.
const AMERICAS_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-135, -56], // SW — Patagonia / eastern Pacific
  [-32, 62], // NE — eastern Brazil / northern Canada
];

// User-added places live in the browser (we can't write back to places.ts).
const STORAGE_KEY = "dots:user-places";

function loadUserPlaces(): Place[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Place[]) : [];
  } catch {
    return [];
  }
}

function saveUserPlaces(list: Place[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable (private mode, etc.) — fail quietly.
  }
}

// Built-in places (from places.ts) are source — we can't delete them there, so
// "removing" one just records its id here and we skip drawing it.
const HIDDEN_KEY = "dots:hidden-ids";

function loadHiddenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHiddenIds(ids: string[]) {
  try {
    window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
  } catch {
    // fail quietly
  }
}

// Edits to built-in places are stored as per-id overrides (we can't write them
// back to places.ts) and merged over the source place on load.
const OVERRIDES_KEY = "dots:overrides";
type Overrides = Record<string, Partial<Place>>;

function loadOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Overrides) {
  try {
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // fail quietly
  }
}

export default function TripMap() {
  // A handle to the <div> the map draws into, and to the map itself.
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Which place's card is open (null = none).
  const [selected, setSelected] = useState<Place | null>(null);

  // Whether the map is zoomed in past ZOOM_IN_LEVEL (drives the Zoom-in button).
  const [zoomedIn, setZoomedIn] = useState(false);

  // Places the user added through the drawer (restored from localStorage).
  const [userPlaces, setUserPlaces] = useState<Place[]>([]);

  // Built-in place ids the user has removed (hidden, since we can't edit source).
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  // The place currently being edited in the drawer (null = not editing).
  const [editTarget, setEditTarget] = useState<Place | null>(null);

  // Bridges to the map's imperative helpers, set up once inside the init effect
  // so the drawer can drop a dot + fly to it without rebuilding the map.
  const selectPlaceRef = useRef<(p: Place) => void>(() => {});
  const addDotRef = useRef<(p: Place) => void>(() => {});

  // Live markers keyed by place id (so we can remove one on delete), plus the
  // tentative preview pin shown while confirming a search.
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const previewMarkerRef = useRef<maplibregl.Marker | null>(null);

  // A neighborhood's map artifacts (source, layers, label), keyed by place id,
  // so deleting that place can tear its outline down too.
  const boundaryRef = useRef<
    Map<
      string,
      { sourceId: string; fillId: string; lineId: string; label: maplibregl.Marker }
    >
  >(new Map());

  useEffect(() => {
    // Guard: only build the map once.
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DARK, // dark is the only theme
      bounds: AMERICAS_BOUNDS, // default view: frame the Americas
      fitBoundsOptions: { padding: 24 },
      dragRotate: false, // keep it flat — no tilt, no rotation
      doubleClickZoom: false, // don't jump-zoom on double-tap (e.g. on a pin)
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Built-in places the user has hidden — skip drawing these.
    const hidden = new Set(loadHiddenIds());
    setHiddenIds([...hidden]);

    // Apply any saved edits over the source built-in places.
    const overrides = loadOverrides();
    const builtins = places.map((p) =>
      overrides[p.id] ? { ...p, ...overrides[p.id] } : p,
    );

    // Select a place: frame its outline if it has one, else dive to the street.
    const selectPlace = (place: Place) => {
      setSelected(place);
      if (place.boundary) {
        const bounds = new maplibregl.LngLatBounds();
        for (const [lng, lat] of place.boundary) bounds.extend([lng, lat]);
        map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 1600 });
      } else {
        // Fly all the way in to street level (street names become visible).
        map.flyTo({ center: [place.lng, place.lat], zoom: 16, duration: 1800 });
      }
    };
    selectPlaceRef.current = selectPlace;

    // Drop one dot for a place — a plain <div> styled by `.dot` in globals.css,
    // living entirely outside the basemap style. Reused for added places too.
    const addDot = (place: Place) => {
      const el = document.createElement("div");
      el.className = "dot";
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // don't also trigger the map's click handler
        selectPlace(place);
      });
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
      markersRef.current.set(place.id, marker);
    };
    addDotRef.current = addDot;

    // Show outlines + labels only once zoomed in past the reveal threshold.
    const updateBoundaryVisibility = () => {
      const shown = map.getZoom() >= BOUNDARY_REVEAL_ZOOM;
      for (const a of boundaryRef.current.values()) {
        for (const id of [a.fillId, a.lineId]) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", shown ? "visible" : "none");
          }
        }
        a.label.getElement().style.display = shown ? "" : "none";
      }
    };

    map.on("load", () => {
      applyMapColors(map);

      // Resolve the accent from the design token (MapLibre paint can't read
      // CSS vars), so the highlight stays on the Ink & bone palette.
      const accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--dot")
          .trim() || "#e0b51c";

      for (const place of builtins) {
        if (!place.boundary || hidden.has(place.id)) continue;

        // Close the ring for GeoJSON (repeat the first point as the last).
        const ring: [number, number][] = [...place.boundary];
        const [fx, fy] = ring[0];
        const [lx, ly] = ring[ring.length - 1];
        if (fx !== lx || fy !== ly) ring.push([fx, fy]);

        const srcId = `area-${place.id}`;
        map.addSource(srcId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [ring] },
          },
        });

        const fillId = `${srcId}-fill`;
        const lineId = `${srcId}-line`;
        map.addLayer({
          id: fillId,
          type: "fill",
          source: srcId,
          layout: { visibility: "none" },
          paint: { "fill-color": accent, "fill-opacity": 0.07 },
        });
        map.addLayer({
          id: lineId,
          type: "line",
          source: srcId,
          layout: {
            visibility: "none",
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": accent,
            "line-width": 1.6,
            "line-opacity": 0.85,
            "line-dasharray": [2, 1.6], // the dashed outline
          },
        });
        // Clicking the area itself selects it, same as clicking its dot.
        for (const id of [fillId, lineId]) {
          map.on("click", id, () => selectPlace(place));
          map.on("mouseenter", id, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", id, () => {
            map.getCanvas().style.cursor = "";
          });
        }

        // A small centered name label, revealed alongside the outline.
        const [cx, cy] = place.boundary.reduce(
          (a, [lng, lat]) => [a[0] + lng, a[1] + lat],
          [0, 0],
        );
        const label = document.createElement("div");
        label.className = "area-label";
        label.textContent = place.name;
        label.style.display = "none";
        label.addEventListener("click", (e) => {
          e.stopPropagation();
          selectPlace(place);
        });
        const labelMarker = new maplibregl.Marker({ element: label })
          .setLngLat([cx / place.boundary.length, cy / place.boundary.length])
          .addTo(map);

        boundaryRef.current.set(place.id, {
          sourceId: srcId,
          fillId,
          lineId,
          label: labelMarker,
        });
      }

      updateBoundaryVisibility();
    });

    // Keep the Zoom-in button + the boundary reveal in sync with live zoom.
    map.on("zoom", () => {
      setZoomedIn(map.getZoom() >= ZOOM_IN_LEVEL);
      updateBoundaryVisibility();
    });

    // Small zoom +/- control, no compass (we're staying flat).
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    // Clicking empty map closes any open card — unless the click landed on a
    // neighborhood outline (whose own handler manages selection).
    map.on("click", (e) => {
      const layers: string[] = [];
      for (const a of boundaryRef.current.values()) {
        if (map.getLayer(a.fillId)) layers.push(a.fillId);
        if (map.getLayer(a.lineId)) layers.push(a.lineId);
      }
      if (layers.length && map.queryRenderedFeatures(e.point, { layers }).length) {
        return;
      }
      setSelected(null);
    });

    // Drop a dot for every built-in place that hasn't been hidden…
    for (const place of builtins) {
      if (!hidden.has(place.id)) addDot(place);
    }

    // …and restore any the user added in this browser.
    const saved = loadUserPlaces();
    if (saved.length) {
      setUserPlaces(saved);
      for (const place of saved) addDot(place);
    }

    // Clean up if the component ever unmounts.
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      boundaryRef.current.clear();
      previewMarkerRef.current = null;
    };
  }, []);

  // Zoom the map in close on the selected place (the card's "Zoom in" button).
  const zoomToSelected = () => {
    if (!selected) return;
    mapRef.current?.flyTo({
      center: [selected.lng, selected.lat],
      zoom: 12,
      duration: 1200,
    });
  };

  // "Return" — close any card and zoom out to a continent view, keeping the
  // current center (from Tokyo you pull back over Asia, not the Americas).
  const returnToContinent = () => {
    setSelected(null);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: map.getCenter(), zoom: CONTINENT_ZOOM, duration: 1600 });
  };

  // Show a tentative, draggable pin at a searched location and fly to it (not
  // yet saved). Dragging reports the new coords back so the save uses them.
  const showPreview = (
    coords: { lng: number; lat: number },
    onMove: (coords: { lng: number; lat: number }) => void,
  ) => {
    const map = mapRef.current;
    if (!map) return;
    previewMarkerRef.current?.remove();
    const el = document.createElement("div");
    el.className = "preview-pin preview-pin--draggable";
    const marker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const { lng, lat } = marker.getLngLat();
      onMove({ lng, lat });
    });
    previewMarkerRef.current = marker;
    map.flyTo({ center: [coords.lng, coords.lat], zoom: 16, duration: 1600 });
  };

  const clearPreview = () => {
    previewMarkerRef.current?.remove();
    previewMarkerRef.current = null;
  };

  // Commit a previewed place: persist it, swap the preview for a real dot, open it.
  const handleAddPlace = (place: Place) => {
    clearPreview();
    setUserPlaces((prev) => {
      const next = [...prev, place];
      saveUserPlaces(next);
      return next;
    });
    addDotRef.current(place);
    selectPlaceRef.current(place);
  };

  // Save edits to an existing place: replace its dot in place, persist the
  // change (update a user place, or store an override for a built-in).
  const handleSaveEdit = (place: Place) => {
    clearPreview();

    markersRef.current.get(place.id)?.remove();
    markersRef.current.delete(place.id);
    addDotRef.current(place);

    // Keep a neighborhood's label text in sync with a renamed place.
    const area = boundaryRef.current.get(place.id);
    if (area) area.label.getElement().textContent = place.name;

    if (place.id.startsWith("user-")) {
      setUserPlaces((prev) => {
        const next = prev.map((p) => (p.id === place.id ? place : p));
        saveUserPlaces(next);
        return next;
      });
    } else {
      const overrides = loadOverrides();
      overrides[place.id] = {
        name: place.name,
        country: place.country,
        date: place.date,
        note: place.note,
        lng: place.lng,
        lat: place.lat,
      };
      saveOverrides(overrides);
    }

    setSelected(place);
    setEditTarget(null);
  };

  // Remove any place: drop its dot (and outline, if any), then either forget a
  // user place or record a built-in as hidden. Closes the card.
  const handleDeletePlace = (place: Place) => {
    const map = mapRef.current;

    markersRef.current.get(place.id)?.remove();
    markersRef.current.delete(place.id);

    // Tear down its neighborhood outline + label, if it had one.
    const area = boundaryRef.current.get(place.id);
    if (area && map) {
      if (map.getLayer(area.fillId)) map.removeLayer(area.fillId);
      if (map.getLayer(area.lineId)) map.removeLayer(area.lineId);
      if (map.getSource(area.sourceId)) map.removeSource(area.sourceId);
      area.label.remove();
      boundaryRef.current.delete(place.id);
    }

    if (place.id.startsWith("user-")) {
      setUserPlaces((prev) => {
        const next = prev.filter((p) => p.id !== place.id);
        saveUserPlaces(next);
        return next;
      });
    } else {
      setHiddenIds((prev) => {
        const next = prev.includes(place.id) ? prev : [...prev, place.id];
        saveHiddenIds(next);
        return next;
      });
    }

    setSelected(null);
  };

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      <header className="pointer-events-none absolute left-5 top-4 select-none">
        <h1
          className="text-[22px] leading-none tracking-tight"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          dots
        </h1>
        <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
          {places.length - hiddenIds.length + userPlaces.length} places · tap a pin
        </p>
      </header>

      <AddPlaceDrawer
        onPreview={showPreview}
        onClearPreview={clearPreview}
        onCommit={handleAddPlace}
        editing={editTarget}
        onSaveEdit={handleSaveEdit}
        onEditHandled={() => setEditTarget(null)}
      />

      {/* Bottom-left stack: the Return button sits above the place card. */}
      <div className="pointer-events-none absolute bottom-6 left-5 flex flex-col items-start gap-3">
        {(zoomedIn || selected) && (
          <button
            onClick={returnToContinent}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85"
            style={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              color: "var(--text)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Zoom out
          </button>
        )}

        {selected && (
          <TripCard
            place={selected}
            zoomedIn={zoomedIn}
            onClose={() => setSelected(null)}
            onZoom={zoomToSelected}
            onEdit={() => setEditTarget(selected)}
            onDelete={() => handleDeletePlace(selected)}
          />
        )}
      </div>
    </div>
  );
}
