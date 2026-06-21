"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { places, type Place } from "@/data/places";
import { MAP_STYLE_DARK, applyMapColors } from "@/lib/mapStyle";
import TripCard from "@/components/TripCard";

// Above this zoom we count as "zoomed in", so the card's Zoom-in button
// collapses away. Selecting a pin flies to 5; the button flies to 12.
const ZOOM_IN_LEVEL = 8;

// Default view: frame the Americas on load (rather than auto-fitting every
// pin, which would open at world zoom). Tweak the box to reframe.
const AMERICAS_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-135, -56], // SW — Patagonia / eastern Pacific
  [-32, 62], // NE — eastern Brazil / northern Canada
];

export default function TripMap() {
  // A handle to the <div> the map draws into, and to the map itself.
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Which place's card is open (null = none).
  const [selected, setSelected] = useState<Place | null>(null);

  // Whether the map is zoomed in past ZOOM_IN_LEVEL (drives the Zoom-in button).
  const [zoomedIn, setZoomedIn] = useState(false);

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

    // Apply our basemap color overrides once it has loaded.
    map.on("load", () => applyMapColors(map));

    // Keep the Zoom-in button in sync with the live zoom level (fires while
    // flying, so the button animates out as you cross the threshold).
    map.on("zoom", () => setZoomedIn(map.getZoom() >= ZOOM_IN_LEVEL));

    // Small zoom +/- control, no compass (we're staying flat).
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    // Clicking empty map closes any open card.
    map.on("click", () => setSelected(null));

    // Drop one dot per place. The dot is a plain <div> styled by `.dot`
    // in globals.css — your pins live entirely outside the basemap style.
    for (const place of places) {
      const el = document.createElement("div");
      el.className = "dot";
      el.addEventListener("click", (e) => {
        e.stopPropagation(); // don't also trigger the map's click handler
        setSelected(place);
        map.flyTo({
          center: [place.lng, place.lat],
          // Only ever zoom in: never drop below the current zoom (so tapping a
          // pin while already zoomed in just pans, it won't zoom back out).
          zoom: Math.max(map.getZoom(), 5),
          duration: 1400,
        });
      });

      new maplibregl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
    }

    // Clean up if the component ever unmounts.
    return () => {
      map.remove();
      mapRef.current = null;
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
          {places.length} places · tap a pin
        </p>
      </header>

      {selected && (
        <TripCard
          place={selected}
          zoomedIn={zoomedIn}
          onClose={() => setSelected(null)}
          onZoom={zoomToSelected}
        />
      )}
    </div>
  );
}
