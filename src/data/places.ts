// Your trips. This is the only file you need to touch to add a place:
// copy a block, change the values, save. Coordinates are [longitude, latitude]
// — you can grab them from Google Maps (right-click a spot → the numbers are
// "lat, lng", so flip them here).
//
// The `note` lines are short placeholders pulled from your trips — edit them,
// they're yours.

export type Place = {
  id: string;
  name: string;
  country: string;
  lng: number; // longitude (east–west)
  lat: number; // latitude  (north–south)
  date: string; // freeform label, e.g. "April 2026" or "Home"
  note: string; // a line or two of memory

  // Optional neighborhood outline. A rough closed loop of [lng, lat] points
  // (eyeballed, not survey-grade) drawn as a dashed highlight instead of a dot.
  // The loop auto-closes, so you don't need to repeat the first point.
  boundary?: [number, number][];
};

export const places: Place[] = [
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    lng: 139.6503,
    lat: 35.6762,
    date: "Feb & Mar 2026",
    note: "Design Forum in February, then the start and the end of the spring trip.",
  },
  {
    id: "osaka",
    name: "Osaka",
    country: "Japan",
    lng: 135.5023,
    lat: 34.6937,
    date: "March 2026",
    note: "Base for the Himeji day trip.",
  },
  {
    id: "himeji",
    name: "Himeji",
    country: "Japan",
    lng: 134.6939,
    lat: 34.8394,
    date: "March 2026",
    note: "The white castle.",
  },
  {
    id: "kanazawa",
    name: "Kanazawa",
    country: "Japan",
    lng: 136.6562,
    lat: 36.5613,
    date: "April 2026",
    note: "Cherry blossoms the whole way.",
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    lng: 135.7681,
    lat: 35.0116,
    date: "April 2026",
    note: "Base for the Nara day trip.",
  },
  {
    id: "nara",
    name: "Nara",
    country: "Japan",
    lng: 135.8048,
    lat: 34.6851,
    date: "April 2026",
    note: "Day trip from Kyoto.",
  },
  {
    id: "lima",
    name: "Lima",
    country: "Peru",
    lng: -77.0428,
    lat: -12.0464,
    date: "Home",
    note: "Grew up in La Molina. Family's still here.",
  },
  {
    id: "dc",
    name: "Adams Morgan",
    country: "Washington, DC",
    lng: -77.0421, // 18th & Columbia Rd NW — the heart of the neighborhood
    lat: 38.9215,
    date: "Now",
    note: "Home. Where Danny & Cami live — zoom in to see the neighborhood.",
    // Rough outline of Adams Morgan (Rock Creek to the west, 16th St to the
    // east, Florida Ave to the south, Calvert St to the north). Eyeballed.
    boundary: [
      [-77.049, 38.9248],
      [-77.0405, 38.9262],
      [-77.0358, 38.925],
      [-77.0352, 38.9205],
      [-77.0366, 38.9168],
      [-77.0428, 38.9158],
      [-77.0476, 38.9172],
      [-77.0498, 38.9208],
    ],
  },
  {
    id: "home",
    name: "Home",
    country: "Washington, DC",
    lng: -77.036006, // 2651 16th Street NW (geocoded)
    lat: 38.92458,
    date: "Now",
    note: "2651 16th Street NW.",
  },
];
