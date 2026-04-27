import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPanel.css';

// Fix for default leafet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204933.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: 'car-marker-icon'
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapPanel({ driverLocation, waypoints = [], zoom = 14, className = '' }) {
  const defaultCenter = [24.8607, 67.0011]; // Default to Karachi if nothing else
  
  const mapCenter = driverLocation 
    ? [driverLocation.lat, driverLocation.lng] 
    : (waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : defaultCenter);

  // Simple polyline from waypoints
  const routePositions = waypoints.map(wp => [wp.lat, wp.lng]);
  if (driverLocation) {
    routePositions.unshift([driverLocation.lat, driverLocation.lng]);
  }

  return (
    <div className={`map-panel-wrapper ${className}`}>
      <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
        />
        <MapUpdater center={mapCenter} zoom={zoom} />
        
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={carIcon}>
            <Popup>Driver Location</Popup>
          </Marker>
        )}

        {waypoints.map((wp, i) => (
          <Marker key={wp.id || i} position={[wp.lat, wp.lng]}>
            <Popup>{wp.stopName}</Popup>
          </Marker>
        ))}

        {routePositions.length > 1 && (
          <Polyline positions={routePositions} color="#E8941F" weight={4} opacity={0.7} />
        )}
      </MapContainer>
    </div>
  );
}
