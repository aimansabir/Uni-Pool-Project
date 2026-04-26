import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { reverseGeocode } from '../../../utils/geocoding';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

// Component to handle map actions like flying to a location
function MapActions({ flyToCoords }) {
  const map = useMap();
  useEffect(() => {
    if (flyToCoords) {
      map.flyTo([flyToCoords.lat, flyToCoords.lng], 16);
    }
  }, [flyToCoords, map]);
  return null;
}

// Invisible component that attaches map events to track center
function MapEventTracker({ onMoveEnd }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd(center);
    },
  });
  return null;
}

const toRadians = (deg) => (deg * Math.PI) / 180;
const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const COORDS_ONLY_REGEX =
  /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

const isReadableAddress = (value) => {
  if (!value) return false;
  const str = String(value).trim();
  return Boolean(str) && !COORDS_ONLY_REGEX.test(str);
};

const cleanAddress = (value) => {
  if (!value) return '';
  return String(value)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
};

const getResultKey = (result) =>
  result.place_id ?? `${result.osm_type}_${result.osm_id}`;

/* ── Abbreviation / helper expansion map ── */
const ABBREVIATIONS = [
  { pattern: /\biba\s+city/i, expand: 'Institute of Business Administration City Campus Karachi' },
  { pattern: /\biba\s+main/i, expand: 'Institute of Business Administration Main Campus Karachi' },
  { pattern: /\biba\b/i, expand: 'Institute of Business Administration Karachi' },
  { pattern: /\bned\b/i, expand: 'NED University of Engineering and Technology Karachi' },
  { pattern: /\bku\b/i, expand: 'University of Karachi' },
  { pattern: /\bnust\b/i, expand: 'NUST Karachi Campus' },
  { pattern: /\bfast\b/i, expand: 'FAST NUCES Karachi' },
  { pattern: /\bszabist\b/i, expand: 'SZABIST Karachi' },
  { pattern: /\blums\b/i, expand: 'LUMS Lahore' },
  { pattern: /\bdha\b/i, expand: 'Defence Housing Authority' },
  { pattern: /\bcity\s*sch/i, expand: 'City School' },
  { pattern: /\bbahria\s+uni/i, expand: 'Bahria University Karachi Campus' },
  { pattern: /\bpaf\b/i, expand: 'PAF' },
];

const getHelperQueries = (query) => {
  const q = query.toLowerCase().trim();
  const helpers = [];

  for (const { pattern, expand } of ABBREVIATIONS) {
    if (pattern.test(q)) {
      helpers.push(expand);
      // Also build expanded version keeping original context words
      const expanded = q.replace(pattern, expand);
      if (expanded !== expand.toLowerCase()) helpers.push(expanded);
      break; // only first match
    }
  }
  return helpers;
};

/* ── Curated fallback locations for places OSM handles badly ── */
const FALLBACK_LOCATIONS = [
  { display_name: 'IBA Main Campus, University Road, Karachi, Pakistan', lat: '24.9461', lon: '67.1116', osm_type: 'fallback', osm_id: 'iba_main', type: 'university', class: 'amenity' },
  { display_name: 'IBA City Campus, Kayani Shaheed Road, Karachi, Pakistan', lat: '24.8513', lon: '67.0195', osm_type: 'fallback', osm_id: 'iba_city', type: 'university', class: 'amenity' },
  { display_name: 'NED University of Engineering and Technology, University Road, Karachi', lat: '24.9342', lon: '67.1118', osm_type: 'fallback', osm_id: 'ned_uni', type: 'university', class: 'amenity' },
  { display_name: 'University of Karachi, Main University Road, Karachi', lat: '24.9413', lon: '67.1207', osm_type: 'fallback', osm_id: 'ku', type: 'university', class: 'amenity' },
  { display_name: 'Bahria University Karachi Campus, Stadium Road, Karachi', lat: '24.8932', lon: '67.0718', osm_type: 'fallback', osm_id: 'bahria_uni', type: 'university', class: 'amenity' },
  { display_name: 'FAST NUCES Karachi Campus, Shah Latif Town, Karachi', lat: '24.8607', lon: '67.2676', osm_type: 'fallback', osm_id: 'fast_khi', type: 'university', class: 'amenity' },
  { display_name: 'SZABIST Karachi, Clifton, Karachi', lat: '24.8130', lon: '67.0301', osm_type: 'fallback', osm_id: 'szabist_khi', type: 'university', class: 'amenity' },
  { display_name: 'DHA Phase 1, Defence Housing Authority, Karachi', lat: '24.8038', lon: '67.0544', osm_type: 'fallback', osm_id: 'dha_p1', type: 'suburb', class: 'place' },
  { display_name: 'DHA Phase 2, Defence Housing Authority, Karachi', lat: '24.8134', lon: '67.0618', osm_type: 'fallback', osm_id: 'dha_p2', type: 'suburb', class: 'place' },
  { display_name: 'DHA Phase 4, Defence Housing Authority, Karachi', lat: '24.8010', lon: '67.0710', osm_type: 'fallback', osm_id: 'dha_p4', type: 'suburb', class: 'place' },
  { display_name: 'DHA Phase 5, Defence Housing Authority, Karachi', lat: '24.7946', lon: '67.0565', osm_type: 'fallback', osm_id: 'dha_p5', type: 'suburb', class: 'place' },
  { display_name: 'DHA Phase 6, Defence Housing Authority, Karachi', lat: '24.8003', lon: '67.0381', osm_type: 'fallback', osm_id: 'dha_p6', type: 'suburb', class: 'place' },
  { display_name: 'DHA Phase 7, Defence Housing Authority, Karachi', lat: '24.7783', lon: '67.0554', osm_type: 'fallback', osm_id: 'dha_p7', type: 'suburb', class: 'place' },
  { display_name: 'DHA Phase 8, Defence Housing Authority, Karachi', lat: '24.7727', lon: '67.0698', osm_type: 'fallback', osm_id: 'dha_p8', type: 'suburb', class: 'place' },
  { display_name: 'Bahria Town Karachi, Super Highway, Karachi', lat: '25.0177', lon: '67.3225', osm_type: 'fallback', osm_id: 'bahria_twn', type: 'suburb', class: 'place' },
  { display_name: 'Falcon Complex, Faisal Cantonment, Karachi', lat: '24.8544', lon: '67.0788', osm_type: 'fallback', osm_id: 'falcon_fsl', type: 'residential', class: 'place' },
  { display_name: 'Falcon Complex, Malir Cantt, Karachi', lat: '24.8949', lon: '67.1949', osm_type: 'fallback', osm_id: 'falcon_mlr', type: 'residential', class: 'place' },
  { display_name: 'Gulshan-e-Iqbal, Karachi', lat: '24.9221', lon: '67.0928', osm_type: 'fallback', osm_id: 'gulshan', type: 'suburb', class: 'place' },
  { display_name: 'North Nazimabad, Karachi', lat: '24.9451', lon: '67.0341', osm_type: 'fallback', osm_id: 'n_nazimabad', type: 'suburb', class: 'place' },
  { display_name: 'Clifton, Karachi', lat: '24.8138', lon: '67.0300', osm_type: 'fallback', osm_id: 'clifton', type: 'suburb', class: 'place' },
  { display_name: 'Saddar, Karachi', lat: '24.8562', lon: '67.0282', osm_type: 'fallback', osm_id: 'saddar', type: 'suburb', class: 'place' },
  { display_name: 'Korangi, Karachi', lat: '24.8318', lon: '67.1352', osm_type: 'fallback', osm_id: 'korangi', type: 'suburb', class: 'place' },
  { display_name: 'Malir, Karachi', lat: '24.8900', lon: '67.1850', osm_type: 'fallback', osm_id: 'malir', type: 'suburb', class: 'place' },
  { display_name: 'Defence View Phase 3, Karachi', lat: '24.8500', lon: '67.1210', osm_type: 'fallback', osm_id: 'defview_p3', type: 'suburb', class: 'place' },
];

const getFallbackMatches = (query) => {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter(w => w.length >= 2);

  return FALLBACK_LOCATIONS.filter(loc => {
    const name = loc.display_name.toLowerCase();
    // Every query word must appear in the fallback name
    return words.every(w => name.includes(w));
  });
};

/* ── Nominatim fetch with wider coverage ── */
const fetchNominatim = async (query, viewbox, signal) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=12&countrycodes=pk&viewbox=${viewbox}&bounded=0&addressdetails=1`;
  const res = await fetch(url, {
    signal,
    headers: {
      'User-Agent': 'UniPoolApp/1.0 (LocationSearch; contact@unipool.com)'
    }
  });
  return res.json();
};

/* ── Improved scoring: word-by-word + category + distance ── */
const scoreResult = (result, originalQuery, centerLat, centerLng) => {
  let score = 0;
  const q = originalQuery.toLowerCase().trim();
  const qWords = q.split(/\s+/).filter(w => w.length >= 2);
  const name = result.display_name.toLowerCase();
  const namePrimary = name.split(',')[0]; // first segment = main place name

  // 1. Full-string match
  if (namePrimary.includes(q)) score += 50;
  else if (name.includes(q)) score += 25;

  // 2. Word-by-word matching (every query word found = big boost)
  let wordHits = 0;
  for (const w of qWords) {
    if (namePrimary.includes(w)) { wordHits++; score += 12; }
    else if (name.includes(w)) { wordHits++; score += 5; }
  }
  // Bonus if ALL words matched
  if (qWords.length > 0 && wordHits === qWords.length) score += 25;

  // 3. Category boost
  const typeStr = `${result.type} ${result.class}`.toLowerCase();
  const categoryKeywords = ['university', 'campus', 'college', 'school', 'hospital', 'town', 'phase', 'complex', 'road', 'block'];
  for (const kw of categoryKeywords) {
    if (q.includes(kw)) {
      if (typeStr.includes(kw) || name.includes(kw)) score += 20;
    }
  }

  // 4. Distance penalty (softer: 0.5 points per km, capped at 50)
  const distMeters = haversineMeters(parseFloat(result.lat), parseFloat(result.lon), centerLat, centerLng);
  const distPenalty = Math.min((distMeters / 1000) * 0.5, 50);
  score -= distPenalty;

  // 5. City relevance
  if (name.includes('karachi')) score += 10;

  // 6. Fallback items get a small penalty so OSM real results rank first if quality is equal
  if (result.osm_type === 'fallback') score -= 3;

  return score;
};

export default function MapPicker({ onClose, onConfirm, initialLocation }) {
  const defaultCenter = initialLocation && initialLocation.lat && initialLocation.lng
    ? [initialLocation.lat, initialLocation.lng]
    : [24.9317, 67.0988];

  const [centerLat, setCenterLat] = useState(defaultCenter[0]);
  const [centerLng, setCenterLng] = useState(defaultCenter[1]);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState(null);
  const abortControllerRef = useRef(null);
  const searchInputRef = useRef(null);

  const skipSearchEffectRef = useRef(false);
  const resolvingDraggedPinRef = useRef(false);

  const handleMoveEnd = useCallback(async (center) => {
    setCenterLat(center.lat);
    setCenterLng(center.lng);

    if (resolvingDraggedPinRef.current) return;

    // If the map is still basically on the selected place, do nothing
    if (selectedPlace) {
      const distMeters = haversineMeters(
        center.lat,
        center.lng,
        selectedPlace.lat,
        selectedPlace.lng
      );

      if (distMeters < 35) return;
    }

    resolvingDraggedPinRef.current = true;
    setSelectedPlace(null);

    skipSearchEffectRef.current = true;
    setSearchQuery('Resolving location...');
    setShowDropdown(false);
    setSearchResults([]);

    try {
      const raw = await reverseGeocode(center.lat, center.lng);
      const label = cleanAddress(raw) || 'Pinned Location';

      setSelectedPlace({
        address: label,
        lat: center.lat,
        lng: center.lng,
      });

      skipSearchEffectRef.current = true;
      setSearchQuery(label.split(',')[0]);
    } catch {
      setSelectedPlace({
        address: 'Pinned Location',
        lat: center.lat,
        lng: center.lng,
      });

      skipSearchEffectRef.current = true;
      setSearchQuery('Pinned Location');
    } finally {
      resolvingDraggedPinRef.current = false;
    }
  }, [selectedPlace]);


  useEffect(() => {
    if (!initialLocation?.lat || !initialLocation?.lng) return;

    if (isReadableAddress(initialLocation.address)) {
      const label = cleanAddress(initialLocation.address);

      setSelectedPlace({
        address: label,
        lat: initialLocation.lat,
        lng: initialLocation.lng,
      });

      skipSearchEffectRef.current = true;
      setSearchQuery(label.split(',')[0]);
      return;
    }

    let cancelled = false;

    const hydrateInitial = async () => {
      try {
        const raw = await reverseGeocode(initialLocation.lat, initialLocation.lng);
        if (cancelled) return;

        const label = cleanAddress(raw) || 'Current Location';

        setSelectedPlace({
          address: label,
          lat: initialLocation.lat,
          lng: initialLocation.lng,
        });

        skipSearchEffectRef.current = true;
        setSearchQuery(label.split(',')[0]);
      } catch {
        if (cancelled) return;

        setSelectedPlace({
          address: 'Current Location',
          lat: initialLocation.lat,
          lng: initialLocation.lng,
        });

        skipSearchEffectRef.current = true;
        setSearchQuery('Current Location');
      }
    };

    hydrateInitial();

    return () => {
      cancelled = true;
    };
  }, [initialLocation]);

  const handleConfirmClick = async () => {
    if (selectedPlace) {
      onConfirm(selectedPlace.address, { lat: selectedPlace.lat, lng: selectedPlace.lng });
      return;
    }

    setLoading(true);
    const address = await reverseGeocode(centerLat, centerLng);
    setLoading(false);
    onConfirm(address, { lat: centerLat, lng: centerLng });
  };

  const handleSearch = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setSearching(true);
    try {
      // Wide viewbox for broader coverage around Karachi
      const viewbox = `${centerLng - 1.0},${centerLat + 1.0},${centerLng + 1.0},${centerLat - 1.0}`;

      // 1. Original query
      const promises = [fetchNominatim(trimmedQuery, viewbox, abortController.signal)];

      // 2. Also try with "Karachi" appended if not already present
      if (!trimmedQuery.toLowerCase().includes('karachi')) {
        promises.push(fetchNominatim(`${trimmedQuery} Karachi`, viewbox, abortController.signal));
      }

      // 3. Helper expansion queries (abbreviation expansion)
      const helperQueries = getHelperQueries(trimmedQuery);
      for (const hq of helperQueries) {
        promises.push(fetchNominatim(hq, viewbox, abortController.signal));
      }

      const allResults = await Promise.all(promises);

      // Flatten all API results
      const combined = allResults.flat();

      // 4. Inject curated fallback matches
      const fallbackMatches = getFallbackMatches(trimmedQuery);
      combined.push(...fallbackMatches);

      // Dedupe by osm_type + osm_id
      const uniqueMap = new Map();
      for (const item of combined) {
        const key = `${item.osm_type}_${item.osm_id}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      }
      const uniqueResults = Array.from(uniqueMap.values());

      // Score and sort
      uniqueResults.sort((a, b) => scoreResult(b, trimmedQuery, centerLat, centerLng) - scoreResult(a, trimmedQuery, centerLat, centerLng));

      setSearchResults(uniqueResults.slice(0, 8));
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        setSearching(false);
      }
    }
  }, [centerLat, centerLng]);

  useEffect(() => {
    const t = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(t);
  }, []);

  // Debounce search on typing
  useEffect(() => {
    if (skipSearchEffectRef.current) {
      skipSearchEffectRef.current = false;
      return;
    }

    if (!searchQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const selectSearchResult = (result) => {
    const coords = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };

    const label = cleanAddress(result.display_name) || result.display_name;
    const primary = label.split(',')[0];

    setFlyToCoords(coords);
    setSearchResults([]);
    setShowDropdown(false);

    skipSearchEffectRef.current = true;
    setSearchQuery(primary);

    setSelectedPlace({
      address: label,
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      selectSearchResult(searchResults[0]);
    }
  };

  return (
    <>
      <div className="map-picker-backdrop" onClick={onClose} />
      <div className="map-picker-overlay fade-in">
        <div className="map-picker-header">
          <button className="map-picker-back" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l-5-5 5-5M6 12h12" />
            </svg>
          </button>
          <span className="map-picker-title">Pin Location</span>
        </div>

        <div className="map-picker-map-container">
          {/* Search Bar */}
          <div className="map-picker-search">
            <div className="map-picker-search-bar">
              <input
                ref={searchInputRef}
                className="map-picker-search-input"
                type="text"
                placeholder="Search for a location..."
                value={searchQuery}
                autoFocus={true}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
              />
              <div className="map-picker-search-actions">
                {searchQuery && (
                  <button
                    className="map-picker-clear-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowDropdown(false);
                      setSelectedPlace(null);
                    }}
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
                <div className="map-picker-search-btn">
                  {searching ? (
                    <div className="spinner-small" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {showDropdown && (searchResults.length > 0 || (searchQuery.length >= 2 && !searching && searchResults.length === 0)) && (
              <div className="map-picker-search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={getResultKey(result)}
                      className="map-picker-search-item"
                      onClick={() => selectSearchResult(result)}
                    >
                      <div className="search-item-main">{result.display_name.split(',')[0]}</div>
                      <div className="search-item-sub">{result.display_name.split(',').slice(1).join(',')}</div>
                    </div>
                  ))
                ) : searchQuery.length >= 2 && !searching && (
                  <div className="map-picker-no-results">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <MapContainer
            center={defaultCenter}
            zoom={15}
            scrollWheelZoom={true}
            className="map-picker-leaflet"
            zoomControl={false}
          >
            <TileLayer
              attribution='&amp;copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEventTracker onMoveEnd={handleMoveEnd} />
            <MapActions flyToCoords={flyToCoords} />
          </MapContainer>

          {/* Fixed Center Pin Overlay */}
          <div className="map-picker-center-pin">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EFB24E" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="12" cy="9" r="2" fill="#FFFFFF" />
            </svg>
          </div>
        </div>

        <div className="map-picker-footer">
          <button
            className="map-picker-confirm-btn"
            onClick={handleConfirmClick}
            disabled={loading}
          >
            {loading ? 'Fetching Address...' : 'Confirm Location'}
          </button>
        </div>
      </div>
    </>
  );
}
