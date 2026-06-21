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
    name: "Washington",
    country: "United States",
    lng: -77.0369,
    lat: 38.9072,
    date: "Now",
    note: "Where Danny & Cami live.",
  },
];
