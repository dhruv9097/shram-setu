/**
 * District geography. Centroids come from the 2011 district boundary set
 * shipped in src/data, simplified for offline rendering.
 */
import raw from "@/data/district-centroids.json";

export type Centroid = { district: string; st_nm: string; lat: number; lng: number };

export const DISTRICTS: Centroid[] = (raw as Partial<Centroid>[]).filter(
  (c): c is Centroid => Boolean(c.district),
);

const byKey = new Map(DISTRICTS.map((c) => [`${c.st_nm}|${c.district}`, c]));

export function centroid(state: string, district: string): Centroid | undefined {
  return byKey.get(`${state}|${district}`);
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distance between two districts, or null if either is unknown. */
export function districtDistanceKm(
  fromState: string,
  fromDistrict: string,
  toState: string,
  toDistrict: string,
): number | null {
  const a = centroid(fromState, fromDistrict);
  const b = centroid(toState, toDistrict);
  if (!a || !b) return null;
  return Math.round(haversineKm(a, b));
}

/** Nearest district to a coordinate — a local reverse geocode over centroids. */
export function nearestDistrict(lat: number, lng: number): Centroid | null {
  let best: Centroid | null = null;
  let bestD = Infinity;
  for (const c of DISTRICTS) {
    const d = haversineKm({ lat, lng }, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
