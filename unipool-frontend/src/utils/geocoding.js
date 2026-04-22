/**
 * Reverse geocodes a latitude and longitude into a human-readable address.
 * Uses Nominatim (OpenStreetMap) public API.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('format', 'jsonv2');

    const res = await fetch(url.toString(), {
      headers: {
        // A descriptive User-Agent is required per Nominatim's loosely-enforced usage policy
        'User-Agent': 'uni-pool-frontend/1.0 (LocationPicker)'
      }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch address from Geolocation service');
    }

    const data = await res.json();
    
    // We want a clean string like "Street name, City"
    if (data && data.display_name) {
      // Nominatim usually returns a very long comma-separated string.
      // We can take the first 2-3 parts for brevity.
      const parts = data.display_name.split(',').map(p => p.trim());
      // Return e.g. "Maskan Chowrangi, Karachi"
      return parts.slice(0, 3).join(', ');
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fallback scenario
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fallback
  }
}
