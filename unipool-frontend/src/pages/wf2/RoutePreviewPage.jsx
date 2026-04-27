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
                padding: [60, 60],
                paddingBottomRight: [50, 100]
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

    const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

    const getShortAddress = (address) => {
        if (!address) return 'Unknown';
        const trimmed = address.trim();
        if (COORDS_ONLY_REGEX.test(trimmed)) return 'Pinned Location';
        return trimmed.split(',')[0].trim();
    };

    const handleRequestSeat = async () => {
        try {
            setLoading(true);
            const res = await bookingRequestsApi.create({
                rideId: id,
                requestedSeats: 1,
            });
            showSuccess(ride?.rideType === 'INSTANT' ? 'Instant ride joined! ⚡' : 'Seat requested!');
            // Navigate to the booking confirmation screen
            navigate(`/bookings/${res.data.id}/confirmed`, {
                state: { booking: res.data, ride }
            });
        } catch (err) {
            showError(err.message || 'Failed to request seat');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="route-preview-page">
            {/* 1. Control Layer */}
            <div className="preview-header">
                <button className="preview-back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={22} />
                </button>
            </div>

            {/* 2. Scrollable Content Layer */}
            <div className="preview-scroll-container">
                <div className="preview-map-container">
                    <MapContainer
                        center={startPoint || [24.8607, 67.0011]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                        {polylinePositions.length > 1 && (
                            <Polyline positions={polylinePositions} pathOptions={{ color: '#F59E0B', weight: 4 }} />
                        )}
                        {startPoint && (
                            <Marker position={startPoint} icon={startIcon}>
                                <Popup className="marker-popup">
                                    <strong>Pickup:</strong> {ride.startLocation}
                                </Popup>
                            </Marker>
                        )}
                        {endPoint && (
                            <Marker position={endPoint} icon={endIcon}>
                                <Popup className="marker-popup">
                                    <strong>Drop off:</strong> {ride.destinationLocation}
                                </Popup>
                            </Marker>
                        )}
                        <MapBounds positions={polylinePositions} />
                    </MapContainer>

                    {/* Google Maps Shortcut */}
                    <button className="gmaps-shortcut-btn" onClick={handleOpenGoogleMaps}>
                        <Navigation size={14} fill="#fff" /> Navigate
                    </button>
                </div>

                <div className="preview-bottom-sheet slide-up">
                    <div className="preview-sheet-handle" />
                    <div className="preview-route-indicator">
                        <MapPin size={18} color="#10b981" />
                        <span className="route-text">
                            {getShortAddress(ride.startLocation)} → {getShortAddress(ride.destinationLocation)}
                        </span>
                    </div>

                    <div className="preview-driver-card">
                    <div className="driver-profile-row">
                        <div className="driver-avatar-box">
                            {(ride.driver?.imageUrl || ride.driver?.profileImage) ? (
                                <img src={ride.driver.imageUrl || ride.driver.profileImage} alt={ride.driver.fullName} />
                            ) : (
                                <div className="avatar-placeholder">
                                    <Users size={30} color="#9CA3AF" />
                                </div>
                            )}
                        </div>
                        <div className="driver-meta">
                            <h3 className="driver-name">{ride.driver?.fullName}</h3>
                            <span className="driver-role-badge">Driver</span>
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
                        {loading ? 'Processing...' : ride?.rideType === 'INSTANT' ? 'Join Ride Instantly ⚡' : 'Request Seat'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);
}
