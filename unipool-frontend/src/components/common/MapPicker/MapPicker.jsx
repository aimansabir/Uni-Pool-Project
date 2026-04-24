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

export default function MapPicker({ onClose, onConfirm, initialLocation }) {
  // Default to provided initialLocation, or Karachi (Maskan Chowrangi)
  const defaultCenter = initialLocation && initialLocation.lat && initialLocation.lng 
    ? [initialLocation.lat, initialLocation.lng]
    : [24.9317, 67.0988];
  
  const [centerLat, setCenterLat] = useState(defaultCenter[0]);
  const [centerLng, setCenterLng] = useState(defaultCenter[1]);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleMoveEnd = useCallback((center) => {
    setCenterLat(center.lat);
    setCenterLng(center.lng);
  }, []);

  const handleConfirmClick = async () => {
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

    setSearching(true);
    try {
      // Prioritize Pakistan results
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmedQuery)}&format=json&limit=5&countrycodes=pk&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'UniPoolApp/1.0 (LocationSearch; contact@unipool.com)'
        }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

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
    setFlyToCoords(coords);
    setSearchResults([]);
    setShowDropdown(false);
    setSearchQuery(result.display_name.split(',')[0]); // Clean up display
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
