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

export default function MapPicker({ onClose, onConfirm }) {
  // Default to Karachi (Maskan Chowrangi)
  const defaultCenter = [24.9317, 67.0988];
  
  const [centerLat, setCenterLat] = useState(defaultCenter[0]);
  const [centerLng, setCenterLng] = useState(defaultCenter[1]);
  const [flyToCoords, setFlyToCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=pk`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'uni-pool-frontend/1.0 (LocationPickerSearch)'
        }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setFlyToCoords(coords);
    setSearchResults([]);
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
            <form className="map-picker-search-bar" onSubmit={handleSearch}>
              <input 
                className="map-picker-search-input"
                type="text"
                placeholder="Search for a location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="map-picker-search-btn" disabled={searching}>
                {searching ? (
                  <div className="spinner-small" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                )}
              </button>
            </form>
            
            {searchResults.length > 0 && (
              <div className="map-picker-search-results">
                {searchResults.map((result) => (
                  <div 
                    key={result.place_id} 
                    className="map-picker-search-item"
                    onClick={() => selectSearchResult(result)}
                  >
                    {result.display_name}
                  </div>
                ))}
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
