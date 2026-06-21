"use client";

import { useEffect, useState } from "react";
import type { Place } from "@/data/places";

// Pull coordinates out of a pasted Google Maps URL (or a bare "lat, lng").
// Several URL shapes carry the numbers — we try the most place-accurate first.
function parseCoords(input: string): { lat: number; lng: number } | null {
  const s = input.trim();
  const N = "(-?\\d+(?:\\.\\d+)?)";

  // /place/.../data=...!3d<lat>!4d<lng> — the actual dropped marker.
  let m = s.match(new RegExp(`!3d${N}!4d${N}`));
  if (m) return { lat: +m[1], lng: +m[2] };

  // ?q=lat,lng  ·  ll=  ·  query=  ·  destination=
  m = s.match(new RegExp(`[?&](?:q|query|ll|sll|destination)=${N},${N}`));
  if (m) return { lat: +m[1], lng: +m[2] };

  // @lat,lng — the map center in a share URL.
  m = s.match(new RegExp(`@${N},${N}`));
  if (m) return { lat: +m[1], lng: +m[2] };

  // A bare "lat, lng" pasted straight in.
  m = s.match(new RegExp(`^${N}\\s*,\\s*${N}$`));
  if (m) return { lat: +m[1], lng: +m[2] };

  return null;
}

// goo.gl / maps.app.goo.gl shortlinks redirect to the real URL — we can't
// follow that from the browser (CORS), so we ask for the full link instead.
const SHORTLINK = /(goo\.gl|maps\.app\.goo\.gl)/i;

type GeoHit = {
  lat: number;
  lng: number;
  country: string;
  label: string;
  // True when the query asked for a house number but no result matched one,
  // so this pin is only street-level — worth flagging before saving.
  approximate: boolean;
};

// Geocode an address / place name via OpenStreetMap's free Nominatim service.
// We pull several results so that, for a street address, we can prefer the one
// that actually resolved the house number rather than the street centroid.
async function geocode(query: string): Promise<GeoHit | null> {
  const wantsNumber = /^\s*\d/.test(query);
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return null;

  const withNumber = data.find((d) => d.address?.house_number);
  const best = wantsNumber && withNumber ? withNumber : data[0];

  return {
    lat: +best.lat,
    lng: +best.lon,
    country: best.address?.country ?? "",
    label: best.display_name ?? "",
    approximate: wantsNumber && !best.address?.house_number,
  };
}

const LABEL_CLASS = "text-[11px] uppercase tracking-[0.14em]";

// A resolved-but-not-yet-saved place, plus the match details to confirm.
type Candidate = {
  place: Place;
  label: string;
  approximate: boolean; // house number couldn't be matched exactly
  moved: boolean; // user dragged the pin to fine-tune it
};

export default function AddPlaceDrawer({
  onPreview,
  onClearPreview,
  onCommit,
  editing,
  onSaveEdit,
  onEditHandled,
}: {
  // onMove is called with the new coords whenever the user drags the preview pin.
  onPreview: (
    coords: { lng: number; lat: number },
    onMove: (coords: { lng: number; lat: number }) => void,
  ) => void;
  onClearPreview: () => void;
  onCommit: (place: Place) => void;
  // When set, the drawer opens prefilled to edit this place instead of adding.
  editing: Place | null;
  onSaveEdit: (place: Place) => void;
  onEditHandled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "confirm" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // When editing, keep the original id + country so we update (not duplicate).
  const [editId, setEditId] = useState<string | null>(null);
  const [editCountry, setEditCountry] = useState<string>("");

  const clearAll = () => {
    setName("");
    setLocation("");
    setDate("");
    setNote("");
    setCandidate(null);
    setStatus("idle");
    setError("");
    setEditId(null);
    setEditCountry("");
  };

  // Open prefilled when a place is sent in for editing.
  useEffect(() => {
    if (!editing) return;
    setEditId(editing.id);
    setEditCountry(editing.country);
    setName(editing.name);
    setLocation(`${editing.lat.toFixed(5)}, ${editing.lng.toFixed(5)}`);
    setDate(editing.date);
    setNote(editing.note);
    setCandidate(null);
    setStatus("idle");
    setError("");
    setOpen(true);
  }, [editing]);

  const fail = (msg: string) => {
    setStatus("error");
    setError(msg);
  };

  // Back out of the confirm step to keep editing (drops the preview pin).
  const searchAgain = () => {
    setStatus("idle");
    setCandidate(null);
    onClearPreview();
  };

  // Collapse the drawer; abandon any pending preview / edit.
  const toggle = () => {
    if (open) {
      onClearPreview();
      setCandidate(null);
      if (editId) {
        clearAll();
        onEditHandled();
      } else if (status !== "error") {
        setStatus("idle");
      }
    }
    setOpen((o) => !o);
  };

  // Step 1 — resolve the location and preview it (no commit yet).
  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    const placeName = name.trim();
    const loc = location.trim();
    if (!placeName || !loc) return fail("Add a name and a location.");

    setStatus("loading");
    setError("");

    let lat: number;
    let lng: number;
    let country: string;
    let label: string;
    let approximate = false;

    const coords = parseCoords(loc);
    if (coords) {
      ({ lat, lng } = coords);
      // Keep the original region when editing without re-geocoding an address.
      country = editId ? editCountry : "Dropped pin";
      label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } else if (SHORTLINK.test(loc)) {
      return fail(
        "Short Maps links can't be read here — paste the full link, or the address.",
      );
    } else {
      const g = await geocode(loc);
      if (!g) {
        return fail("Couldn't find that. Try an address, place name, or Maps link.");
      }
      ({ lat, lng } = g);
      country = g.country || editCountry || "Saved pin";
      label = g.label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      approximate = g.approximate;
    }

    setCandidate({
      place: {
        id: editId ?? `user-${crypto.randomUUID()}`,
        name: placeName,
        country,
        lng,
        lat,
        date: date.trim(),
        note: note.trim(),
      },
      label,
      approximate,
      moved: false,
    });
    setStatus("confirm");

    // Preview it, and keep the candidate in sync if the user drags the pin.
    onPreview({ lng, lat }, (next) => {
      setCandidate((c) =>
        c
          ? {
              ...c,
              place: { ...c.place, lng: next.lng, lat: next.lat },
              moved: true,
            }
          : c,
      );
    });
  };

  // Step 2 — the previewed pin is right; save it (new place, or an edit).
  const commit = () => {
    if (!candidate) return;
    if (editId) onSaveEdit(candidate.place);
    else onCommit(candidate.place);
    clearAll();
    setOpen(false);
  };

  return (
    <div
      className="pointer-events-none absolute right-0 top-5 z-50 flex items-start transition-transform duration-300 ease-out"
      style={{ transform: open ? "translateX(0)" : "translateX(320px)" }}
    >
      {/* Edge tab — toggles the drawer. Sits flush against the panel's left. */}
      <button
        onClick={toggle}
        aria-label={open ? "Close add-place panel" : "Add a place"}
        className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-l-lg px-2.5 text-[13px] transition-opacity hover:opacity-85"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRight: "none",
          color: "var(--text)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        }}
      >
        {open ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
        ) : (
          <>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </>
        )}
      </button>

      {/* The panel — reuses the card surface. */}
      <form
        onSubmit={find}
        className="pointer-events-auto w-[320px] max-w-[calc(100vw-3rem)] rounded-l-xl p-5"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
          borderRight: "none",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
        }}
      >
        <h2
          className="text-[20px] leading-tight"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          {editId ? "Edit place" : "Add a place"}
        </h2>

        {status === "confirm" && candidate ? (
          // ── Confirm step: check the previewed pin before saving ──
          <>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
              Drag the pin on the map to fine-tune, then save.
            </p>

            <div
              className="mt-4 rounded-lg p-3"
              style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}
            >
              <p className={LABEL_CLASS} style={{ color: "var(--card-label)" }}>
                {candidate.moved ? "Pin moved" : "Found"}
              </p>
              <p
                className="mt-1 text-[18px] leading-tight"
                style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
              >
                {candidate.place.name}
              </p>
              <p
                className="mt-1 text-[12px] leading-snug"
                style={{ color: "var(--card-text)" }}
              >
                {candidate.label}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--card-label)" }}>
                {candidate.place.lat.toFixed(5)}, {candidate.place.lng.toFixed(5)}
              </p>
            </div>

            {candidate.approximate && !candidate.moved && (
              <p className="mt-3 text-[12px]" style={{ color: "var(--orange)" }}>
                Couldn&apos;t match the exact house number — this is the nearest
                point. Drag the pin to place it precisely.
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={commit}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85"
                style={{ background: "var(--text)", color: "var(--card)" }}
              >
                {editId ? "Save changes" : "Add to map"}
              </button>
              <button
                type="button"
                onClick={searchAgain}
                className="rounded-lg px-3 py-1.5 text-[13px] transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
              >
                Search again
              </button>
            </div>
          </>
        ) : (
          // ── Entry step: name + location ──
          <>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
              An address, place name, or a Google Maps link.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className={LABEL_CLASS} style={{ color: "var(--card-label)" }}>
                  Name
                </span>
                <input
                  className="drawer-field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Home"
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS} style={{ color: "var(--card-label)" }}>
                  Location
                </span>
                <input
                  className="drawer-field mt-1"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="2651 16th St NW, or a Maps link"
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS} style={{ color: "var(--card-label)" }}>
                  Date (optional)
                </span>
                <input
                  className="drawer-field mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="June 2026"
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS} style={{ color: "var(--card-label)" }}>
                  Note (optional)
                </span>
                <textarea
                  className="drawer-field mt-1 resize-none"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="A line of memory."
                />
              </label>
            </div>

            {status === "error" && (
              <p className="mt-3 text-[12px]" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-opacity hover:opacity-85 disabled:opacity-60"
              style={{ background: "var(--text)", color: "var(--card)" }}
            >
              {status === "loading"
                ? "Finding…"
                : editId
                  ? "Review changes"
                  : "Find on map"}
            </button>

            <p className="mt-4 text-[11px]" style={{ color: "var(--card-label)" }}>
              Saved in this browser only — not written to the project.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
