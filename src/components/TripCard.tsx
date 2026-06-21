"use client";

import type { Place } from "@/data/places";

// The panel that slides in when you tap a dot. Pure presentation — it receives
// a `place`, an `onClose` callback, and an `onZoom` callback for the button.
export default function TripCard({
  place,
  onClose,
  onZoom,
}: {
  place: Place;
  onClose: () => void;
  onZoom: () => void;
}) {
  return (
    <div
      className="pointer-events-auto absolute bottom-6 left-5 w-[300px] max-w-[calc(100vw-2.5rem)] rounded-xl p-5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 text-[16px] leading-none transition-opacity hover:opacity-60"
        style={{ color: "var(--card-eyebrow)" }}
      >
        ✕
      </button>

      <p
        className="text-[11px] uppercase tracking-[0.14em]"
        style={{ color: "var(--card-eyebrow)" }}
      >
        {place.country}
      </p>
      <h2
        className="mt-1 text-[26px] leading-tight"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        {place.name}
      </h2>
      <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
        {place.date}
      </p>
      <p
        className="mt-3 text-[14px] leading-relaxed"
        style={{ color: "var(--card-body)" }}
      >
        {place.note}
      </p>

      <button
        onClick={onZoom}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85"
        style={{ background: "var(--ink)", color: "var(--card-bg)" }}
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
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        Zoom in
      </button>
    </div>
  );
}
