"use client";

import type { Place } from "@/data/places";

// The panel that slides in when you tap a dot. Pure presentation — it receives
// a `place`, an `onClose` callback, and an `onZoom` callback for the button.
export default function TripCard({
  place,
  zoomedIn,
  onClose,
  onZoom,
  onEdit,
  onDelete,
}: {
  place: Place;
  zoomedIn: boolean;
  onClose: () => void;
  onZoom: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="pointer-events-auto w-[300px] max-w-[calc(100vw-2.5rem)] rounded-xl p-5"
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 text-[16px] leading-none transition-opacity hover:opacity-60"
        style={{ color: "var(--card-label)" }}
      >
        ✕
      </button>

      <p
        className="text-[11px] uppercase tracking-[0.14em]"
        style={{ color: "var(--card-label)" }}
      >
        {place.country}
      </p>
      <h2
        className="mt-1 text-[26px] leading-tight"
        style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
      >
        {place.name}
      </h2>
      <p className="mt-1 text-[13px]" style={{ color: "var(--text-muted)" }}>
        {place.date}
      </p>
      <p
        className="mt-3 text-[14px] leading-relaxed"
        style={{ color: "var(--card-text)" }}
      >
        {place.note}
      </p>

      {/* Zoom-in button — collapses away (height + fade + slide) once you're
          zoomed in, and springs back when you zoom out. The 1fr→0fr grid row
          animates the height so the card resizes smoothly. */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: zoomedIn ? "0fr" : "1fr",
          marginTop: zoomedIn ? 0 : 16,
          opacity: zoomedIn ? 0 : 1,
          transform: zoomedIn ? "translateY(4px)" : "translateY(0)",
          transition:
            "grid-template-rows 300ms ease, margin-top 300ms ease, opacity 200ms ease, transform 300ms ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <button
            onClick={onZoom}
            tabIndex={zoomedIn ? -1 : 0}
            aria-hidden={zoomedIn}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85"
            style={{
              background: "var(--text)",
              color: "var(--card)",
              pointerEvents: zoomedIn ? "none" : "auto",
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
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            Zoom in
          </button>
        </div>
      </div>

      {/* Edit / Remove actions. */}
      {(onEdit || onDelete) && (
        <div className="mt-3 flex items-center gap-4">
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 text-[12px] opacity-70 transition-opacity hover:opacity-100"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 text-[12px] opacity-70 transition-opacity hover:opacity-100"
              style={{ color: "var(--red)" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
