import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, MapPin, Clock, Wallet, Users, Star, Navigation } from 'lucide-react';
import { ridesApi } from '../../api/rides.api';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { useToast } from '../../context/ToastContext';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import 'leaflet/dist/leaflet.css';
import './RoutePreviewPage.css';

// Fix Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for Start and End
const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to fit map to polyline
function MapBounds({ positions }) {
    const map = useMap();
    useEffect(() => {
        if (positions && positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            // Shift the route to the top half of the screen to avoid the bottom sheet
            map.fitBounds(bounds, { 
                paddingTopLeft: [50, 80],
                paddingBottomRight: [50, 350] 
            });
        }
    }, [positions, map]);
    return null;
}

export default function RoutePreviewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const res = await ridesApi.getPreview(id);
                setRide(res.data);
            } catch (err) {
                showError('Failed to load ride preview');
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        fetchPreview();
    }, [id, navigate, showError]);

    if (loading) return <FullPageSpinner />;
    if (!ride) return null;

    // Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
    const polylinePositions = ride.routeGeometry?.coordinates?.map(coord => [coord[1], coord[0]]) || [];
    const startPoint = polylinePositions[0];
    const endPoint = polylinePositions[polylinePositions.length - 1];

    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleOpenGoogleMaps = () => {
        if (!ride) return;
        const origin = ride.startLocation;
        const destination = ride.destinationLocation;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
        window.open(url, '_blank');
    };

    const getShortAddress = (address) => {
        if (!address) return '';
        const parts = address.split(',');
        return parts[0].trim();
    };

    const handleRequestSeat = async () => {
        try {
            setLoading(true);
            await bookingRequestsApi.create({
                rideId: id,
                requestedSeats: 1, // Default to 1 for now
            });
            showSuccess('Seat requested successfully!');
            navigate('/dashboard'); // Or wherever appropriate
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to request seat');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="route-preview-page">
            <div className="preview-header">
                <button className="preview-back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <div className="preview-header-title">Route Preview</div>
            </div>

            <div className="preview-map-container">
                <MapContainer 
                    center={startPoint || [24.8607, 67.0011]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {polylinePositions.length > 0 && (
                        <>
                            <Polyline 
                                positions={polylinePositions} 
                                color="#F59E0B" 
                                weight={5} 
                                opacity={0.8}
                                lineJoin="round"
                            />
                            <Marker position={startPoint} icon={startIcon}>
                                <Popup>Pickup: {ride.startLocation}</Popup>
                            </Marker>
                            <Marker position={endPoint} icon={endIcon}>
                                <Popup>Drop-off: {ride.destinationLocation}</Popup>
                            </Marker>
                            <MapBounds positions={polylinePositions} />
                        </>
                    )}
                </MapContainer>
            </div>

            <div className="preview-bottom-sheet slide-up">
                <button className="gmaps-shortcut-btn" onClick={handleOpenGoogleMaps} title="Open in Google Maps">
                    <Navigation size={18} fill="#fff" color="#fff" />
                    <span>Navigate</span>
                </button>
                
                <div className="preview-route-indicator">
                    <MapPin size={18} color="#F59E0B" />
                    <span className="route-text">
                        {getShortAddress(ride.startLocation)} → {getShortAddress(ride.destinationLocation)}
                    </span>
                </div>

                <div className="preview-driver-card">
                    <div className="driver-profile-row">
                        <div className="driver-avatar-box">
                            {ride.driver?.imageUrl ? (
                                <img src={ride.driver.imageUrl} alt={ride.driver.fullName} />
                            ) : (
                                <div className="avatar-placeholder">
                                    <Users size={30} color="#9CA3AF" />
                                </div>
                            )}
                        </div>
                        <div className="driver-meta">
                            <h3 className="driver-name">{ride.driver?.fullName} (Driver)</h3>
                            <div className="driver-rating">
                                <Star size={16} fill="#FDBA2E" color="#FDBA2E" />
                                <span className="rating-val">
                                    {(ride.driver?.avgRating || 5.0).toFixed(1)} • {ride.driver?.totalRatings || 0} ratings
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="preview-details-list">
                        <div className="preview-detail-item">
                            <div className="detail-icon-box">
                                <Clock size={18} />
                            </div>
                            <span className="detail-label">Time</span>
                            <span className="detail-value">{formatTime(ride.departureTime)}</span>
                        </div>
                        <div className="preview-detail-item">
                            <div className="detail-icon-box">
                                <Wallet size={18} />
                            </div>
                            <span className="detail-label">Fare</span>
                            <span className="detail-value">Rs {ride.farePerSeat} / seat</span>
                        </div>
                        <div className="preview-detail-item car-mix">
                            <div className="detail-icon-box">
                                <Users size={18} />
                            </div>
                            <span className="detail-label">Car Mix</span>
                            <div className="detail-value-group">
                                <div className="detail-value-line">
                                    <span className="val-label">Driver:</span>
                                    <span className="val-text">
                                        {(ride.driver?.gender || 'Male').charAt(0).toUpperCase() + (ride.driver?.gender || 'Male').slice(1).toLowerCase()}
                                    </span>
                                </div>
                                <div className="detail-value-line">
                                    <span className="val-label">Passengers:</span>
                                    <span className="val-text">
                                        {ride.occupancyMix?.malePassengerCount || 0} M, {ride.occupancyMix?.femalePassengerCount || 0} F
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        className="preview-request-btn"
                        onClick={handleRequestSeat}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Request Seat'}
                    </button>
                </div>
            </div>
        </div>
    );
}
