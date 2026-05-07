import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocation as useGeoLocation } from '../../context/LocationContext';
import 'leaflet/dist/leaflet.css';
import './ExploreMapPage.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center updates
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function ExploreMapPage() {
  const { latitude, longitude, status, requestLocation } = useGeoLocation();
  
  // Use user coords for initial state if they are already available in context
  const [mapCenter, setMapCenter] = useState(() => {
    if (latitude && longitude) return [latitude, longitude];
    return [24.8607, 67.0011]; // Default Karachi
  });
  
  const [hasLoadedUserLocation, setHasLoadedUserLocation] = useState(false);

  useEffect(() => {
    // Try to get location on mount if not already granted
    if (status === 'prompt') {
      requestLocation().catch(() => {});
    }
  }, [status, requestLocation]);

  useEffect(() => {
    // If permission is granted and we have coords, but map is still at default, snap to user
    if (status === 'granted' && latitude && longitude && !hasLoadedUserLocation) {
      setMapCenter([latitude, longitude]);
      setHasLoadedUserLocation(true);
    }
  }, [status, latitude, longitude, hasLoadedUserLocation]);

  const handleRecenter = async () => {
    try {
      const loc = await requestLocation();
      setMapCenter([loc.latitude, loc.longitude]);
    } catch (err) {
      console.error('Failed to recenter:', err);
    }
  };

  return (
    <div className="explore-map-page">
      {status !== 'granted' && (
        <div className="location-warning-bar">
          <div className="warning-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Current location disabled</span>
          </div>
          <button className="enable-btn" onClick={handleRecenter}>Enable</button>
        </div>
      )}

      <div className="explore-map-container">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          scrollWheelZoom={true}
          className="explore-leaflet"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={mapCenter} zoom={16} />
          
          {status === 'granted' && latitude && (
            <Marker 
              position={[latitude, longitude]}
              icon={L.divIcon({
                className: 'user-location-marker',
                html: '<div class="user-dot"></div><div class="user-pulse"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            >
              <Popup>You are here</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Floating Action Buttons */}
        <div className="map-actions">
          <button 
            className={`recenter-btn ${status === 'granted' ? 'active' : ''}`} 
            onClick={handleRecenter}
            aria-label="Find my location"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
