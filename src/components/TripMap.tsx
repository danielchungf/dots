"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { places, type Place } from "@/data/places";
import { mapStyleFor } from "@/lib/mapStyle";
import TripCard from "@/components/TripCard";

export default function TripMap() {
  // A handle to the <div> the map draws into, and to the map itself.
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Which place's card is open (null = none).
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    // Guard: only build the map once.
    if (mapRef.current || !containerRef.current) return;

    // Follow the OS light/dark setting, and keep following if it changes.
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Frame all your pins on load: grow a box that contains every place,
    // then let the map fit to it. Add a place anywhere and the view adapts.
    const bounds = new maplibregl.LngLatBounds();
    for (const place of places) bounds.extend([place.lng, place.lat]);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleFor(darkQuery.matches),
      bounds,
      fitBoundsOptions: { padding: 64, maxZoom: 4 },
      dragRotate: false, // keep it flat — no tilt, no rotation
      attributionControl: { compact: true },
    });
    mapRef.current = map;

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
        map.flyTo({ center: [place.lng, place.lat], zoom: 5, duration: 1400 });
      });

      new maplibregl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
    }

    // When the OS flips light <-> dark, swap just the basemap.
    // HTML markers aren't part of the style, so the dots survive the swap.
    const onSchemeChange = (e: MediaQueryListEvent) => {
      map.setStyle(mapStyleFor(e.matches));
    };
    darkQuery.addEventListener("change", onSchemeChange);

    // Clean up if the component ever unmounts.
    return () => {
      darkQuery.removeEventListener("change", onSchemeChange);
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
          style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
        >
          dots
        </h1>
        <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
          {places.length} places · tap a pin
        </p>
      </header>

      {selected && (
        <TripCard
          place={selected}
          onClose={() => setSelected(null)}
          onZoom={zoomToSelected}
        />
      )}
    </div>
  );
}
