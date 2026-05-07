/**
 * geocoding.js
 *
 * NOTE: This module uses the public Nominatim API (OpenStreetMap).
 * Public Nominatim must NOT be spammed — always debounce calls from UI and
 * cache results where possible. A production build should use a self-hosted
 * Nominatim instance or a paid geocoding service.
 */

const CAMPUSES = [
  { name: 'IBA City Campus', lat: 24.8683, lng: 67.0305 },
  { name: 'IBA Main Campus', lat: 24.9392, lng: 67.1124 },
  { name: 'NED University', lat: 24.9317, lng: 67.1126 },
  { name: 'Karachi University', lat: 24.9422, lng: 67.1248 },
  { name: 'FAST NUCES', lat: 24.8569, lng: 67.2642 },
  { name: 'SZABIST', lat: 24.8151, lng: 67.0315 },
  { name: 'Habib University', lat: 24.9048, lng: 67.1352 },
  { name: 'Bahria University', lat: 24.8894, lng: 67.0886 },
  { name: 'Dawood University', lat: 24.8785, lng: 67.0426 },
];

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dphi = (lat2 - lat1) * Math.PI / 180;
  const dlambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const PLUS_CODE_REGEX = /[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}/i;

/** Round lat/lng to 3 decimal places for cache key (~111m grid) */
const cacheKey = (lat, lng) =>
  `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000}`;

/** In-memory cache to avoid re-fetching the same coordinates */
const reverseGeocodeCache = new Map();

/**
 * isReadableAddress — returns true only if value is a human-readable string.
 * Rejects: null, empty, coordinate-only strings.
 */
export const isReadableAddress = (value) => {
  if (!value) return false;
  const str = String(value).trim();
  return str.length > 0 && !COORDS_ONLY_REGEX.test(str);
};

/**
 * reverseGeocode — converts lat/lng to a human-readable address string.
 *
 * Guarantees:
 *  - NEVER returns a raw coordinate string on success.
 *  - Returns null (not a fallback label) if it cannot determine a readable name.
 *  - Results are cached by rounded lat/lng to prevent Nominatim spam.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>} readable address or null
 */
export async function reverseGeocode(lat, lng) {
  // 1. Campus snap (within 300 m) — no network call needed
  const nearbyCampus = CAMPUSES.find(c => getDistance(lat, lng, c.lat, c.lng) < 300);
  if (nearbyCampus) return nearbyCampus.name;

  // 2. Cache check
  const key = cacheKey(lat, lng);
  if (reverseGeocodeCache.has(key)) {
    return reverseGeocodeCache.get(key); // may be null if previous attempt failed
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'uni-pool-frontend/1.0 (LocationPicker)' }
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const data = await res.json();

    if (data && data.address) {
      const addr = data.address;
      const parts = [];

      // Primary identifier
      const primary = addr.amenity || addr.building || addr.office ||
        addr.university || addr.school || addr.shop ||
        addr.tourism || addr.leisure || addr.historic;
      if (primary && !PLUS_CODE_REGEX.test(primary)) parts.push(primary);

      // Road/Street
      if (addr.road && !PLUS_CODE_REGEX.test(addr.road)) parts.push(addr.road);

      // Suburb / neighbourhood / area
      const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.village || addr.subdistrict;
      if (area && !PLUS_CODE_REGEX.test(area)) parts.push(area);

      // City as last resort
      if (parts.length < 2 && addr.city && !PLUS_CODE_REGEX.test(addr.city)) parts.push(addr.city);

      if (parts.length > 0) {
        const result = parts.slice(0, 3).join(', ');
        reverseGeocodeCache.set(key, result);
        return result;
      }
    }

    // display_name fallback — strip Plus Codes and use first 3 segments
    if (data && data.display_name) {
      const cleanParts = data.display_name
        .split(',')
        .map(p => p.trim())
        .filter(p => p && !PLUS_CODE_REGEX.test(p) && !COORDS_ONLY_REGEX.test(p));

      if (cleanParts.length > 0) {
        const result = cleanParts.slice(0, 3).join(', ');
        reverseGeocodeCache.set(key, result);
        return result;
      }
    }

    // If we get here, Nominatim gave us nothing useful — return null, NOT coordinates
    console.warn('[reverseGeocode] No readable address found for', lat, lng);
    reverseGeocodeCache.set(key, null);
    return null;

  } catch (err) {
    console.error('[reverseGeocode] Error:', err.message);
    // Do NOT cache errors — allow retry later
    // Return null, NEVER a raw coordinate string
    return null;
  }
}
