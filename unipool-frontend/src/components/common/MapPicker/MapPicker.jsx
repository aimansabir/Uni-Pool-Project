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

const getHelperQuery = (query) => {
  const q = query.toLowerCase().trim();
  
  if (q.includes('iba city')) {
      return 'Institute of Business Administration City Campus Karachi';
  }
  if (q.includes('iba main')) {
      return 'Institute of Business Administration Main Campus Karachi';
  }
  if (/\biba\b/.test(q)) return query.replace(/\biba\b/gi, 'Institute of Business Administration');
  if (/\bned\b/.test(q)) return query.replace(/\bned\b/gi, 'NED University');
  if (/\bku\b/.test(q)) return query.replace(/\bku\b/gi, 'University of Karachi');
  return null;
};

const fetchNominatim = async (query, viewbox, signal) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&countrycodes=pk&viewbox=${viewbox}&bounded=0&addressdetails=1`;
  const res = await fetch(url, {
    signal,
    headers: {
      'User-Agent': 'UniPoolApp/1.0 (LocationSearch; contact@unipool.com)'
    }
  });
  return res.json();
};

const scoreResult = (result, originalQuery, centerLat, centerLng) => {
  let score = 0;
  const q = originalQuery.toLowerCase().trim();
  const name = result.display_name.toLowerCase();
  
  // 1. Text Similarity
  const idx = name.indexOf(q);
  if (idx === 0) score += 50;
  else if (idx > 0) score += 20;

  // 2. Category Boost
  const typeStr = `${result.type} ${result.class}`.toLowerCase();
  if (q.includes('university') || q.includes('campus') || q.includes('college')) {
    if (typeStr.includes('university') || typeStr.includes('college') || typeStr.includes('amenity')) score += 30;
    if (name.includes('university') || name.includes('campus')) score += 20;
  }
  if (q.includes('complex')) {
    if (name.includes('complex')) score += 30;
  }
  if (q.includes('town') || q.includes('phase')) {
    if (typeStr.includes('residential') || typeStr.includes('suburb')) score += 30;
  }

  // 3. Local Distance Penalty (1 point per km)
  const distMeters = haversineMeters(parseFloat(result.lat), parseFloat(result.lon), centerLat, centerLng);
  score -= (distMeters / 1000);

  // 4. City Relevance
  if (name.includes('karachi')) score += 15;

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

  const handleMoveEnd = useCallback((center) => {
    setCenterLat(center.lat);
    setCenterLng(center.lng);

    if (selectedPlace) {
      const dist = Math.sqrt(Math.pow(center.lat - selectedPlace.lat, 2) + Math.pow(center.lng - selectedPlace.lng, 2));
      if (dist > 0.001) { 
        setSelectedPlace(null);
      }
    }
  }, [selectedPlace]);

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
    if (trimmedQuery.length < 3) {
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
      const viewbox = `${centerLng - 0.5},${centerLat + 0.5},${centerLng + 0.5},${centerLat - 0.5}`;
      
      const originalPromise = fetchNominatim(trimmedQuery, viewbox, abortController.signal);
      
      const helperQuery = getHelperQuery(trimmedQuery);
      const helperPromise = helperQuery 
        ? fetchNominatim(helperQuery, viewbox, abortController.signal) 
        : Promise.resolve([]);

      const [originalResults, helperResults] = await Promise.all([originalPromise, helperPromise]);

      const combined = [...originalResults, ...helperResults];
      const uniqueMap = new Map();
      for (const item of combined) {
        const key = `${item.osm_type}_${item.osm_id}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      }
      const uniqueResults = Array.from(uniqueMap.values());

      uniqueResults.sort((a, b) => scoreResult(b, trimmedQuery, centerLat, centerLng) - scoreResult(a, trimmedQuery, centerLat, centerLng));

      setSearchResults(uniqueResults.slice(0, 5));
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

  // Debounce search on typing
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400); // Slightly faster debounce

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const selectSearchResult = (result) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    const displayName = result.display_name.split(',')[0];
    
    setFlyToCoords(coords);
    setSearchResults([]);
    setShowDropdown(false);
    setSearchQuery(displayName); // Clean up display
    
    // Lock in the structured place
    setSelectedPlace({
      address: result.display_name,
      lat: coords.lat,
      lng: coords.lng
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
                <path d="M11 17l-5-5 5-5M6 12h12"/>
              </svg>
          </button>
          <span className="map-picker-title">Pin Location</span>
        </div>
        
        <div className="map-picker-map-container">
          {/* Search Bar */}
          <div className="map-picker-search">
            <div className="map-picker-search-bar">
              <input 
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
                    onClick={() => setSearchQuery('')}
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
                      key={result.place_id} 
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
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#EFB24E" stroke="#FFFFFF" strokeWidth="1.5"/>
                <circle cx="12" cy="9" r="2" fill="#FFFFFF"/>
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
