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
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const dphi = (lat2-lat1) * Math.PI/180;
  const dlambda = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dphi/2) * Math.sin(dphi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(dlambda/2) * Math.sin(dlambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

/**
 * Reverse geocodes a latitude and longitude into a human-readable address.
 * Uses Nominatim (OpenStreetMap) public API with custom campus snapping.
 */
export async function reverseGeocode(lat, lng) {
  try {
    // 1. Check for known campus snapping first (within 300m)
    const nearbyCampus = CAMPUSES.find(c => getDistance(lat, lng, c.lat, c.lng) < 300);
    
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'uni-pool-frontend/1.0 (LocationPicker)'
      }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch address from Geolocation service');
    }

    const data = await res.json();
    
    // regex for Plus Codes (e.g., V28G+R3)
    const plusCodeRegex = /[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}/i;

    if (data && data.address) {
      const addr = data.address;
      const parts = [];

      // If we snapped to a campus, use its name as the primary part
      if (nearbyCampus) {
        parts.push(nearbyCampus.name);
      } else {
        // 1. Primary identifier (Amenity, Building, etc.)
        const primary = addr.amenity || addr.building || addr.office || 
                        addr.university || addr.school || addr.shop || 
                        addr.tourism || addr.leisure || addr.historic;
        
        if (primary && !plusCodeRegex.test(primary)) {
          parts.push(primary);
        }
      }

      // 2. Road/Street
      if (addr.road && !plusCodeRegex.test(addr.road)) {
        parts.push(addr.road);
      }

      // 3. Suburb/Neighborhood/Area
      const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.village || addr.subdistrict;
      if (area && !plusCodeRegex.test(area)) {
        parts.push(area);
      }

      // 4. City (fallback if we don't have enough parts)
      if (parts.length < 2 && addr.city && !plusCodeRegex.test(addr.city)) {
        parts.push(addr.city);
      }

      if (parts.length > 0) {
        return parts.slice(0, 3).join(', ');
      }
    }

    // Fallback to display_name but filtered
    if (data && data.display_name) {
      const parts = data.display_name.split(',')
        .map(p => p.trim())
        .filter(p => !plusCodeRegex.test(p));
      
      // If we snapped to a campus, insert it at the start
      if (nearbyCampus && !parts[0].includes(nearbyCampus.name)) {
        parts.unshift(nearbyCampus.name);
      }

      return parts.slice(0, 3).join(', ');
    }

    return nearbyCampus ? nearbyCampus.name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`; 
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; 
  }
}
