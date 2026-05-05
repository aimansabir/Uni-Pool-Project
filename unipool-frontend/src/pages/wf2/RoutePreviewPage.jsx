import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, MapPin, Clock, Wallet, Users, Star, Navigation, Check } from 'lucide-react';
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

// Custom Icons for Start, End, and Stops
const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const stopIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: markerShadow,
    iconSize: [22, 36],
    iconAnchor: [11, 36],
    popupAnchor: [1, -30],
    shadowSize: [36, 36]
});

const stopHighlightedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: markerShadow,
    iconSize: [28, 46],
    iconAnchor: [14, 46],
    popupAnchor: [1, -38],
    shadowSize: [46, 46]
});

// Component to fit map to polyline + stop markers
function MapBounds({ positions, extraPositions }) {
    const map = useMap();
    useEffect(() => {
        const all = [...(positions || []), ...(extraPositions || [])];
        if (all.length > 0) {
            const bounds = L.latLngBounds(all);
            map.fitBounds(bounds, {
                padding: [60, 60],
                paddingBottomRight: [50, 100]
            });
        }
    }, [positions, extraPositions, map]);
    return null;
}

export default function RoutePreviewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPickup, setSelectedPickup] = useState(0);    // index into routePoints, default to start
    const [selectedDrop, setSelectedDrop] = useState(null);     // index into routePoints, set after ride loads

    useEffect(() => {
        if (!id || id === 'undefined') return;

        const fetchPreview = async () => {
            try {
                const res = await ridesApi.getPreview(id);
                setRide(res.data);
            } catch (err) {
                console.error('Preview error:', err);
                showError(err.message || 'Failed to load ride preview');
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

    // Build ordered route points: start + confirmed stops + destination
    const confirmedStops = (ride.stops || []).filter(s => s.isConfirmed !== false);
    const routePoints = [
        { label: getShortAddress(ride.startLocation), fullLabel: ride.startLocation, type: 'start', stopId: null, sequence: -1 },
        ...confirmedStops.map(s => ({
            label: s.stopName,
            fullLabel: s.stopName,
            type: 'stop',
            stopId: s.id,
            sequence: s.sequence,
            lat: s.lat,
            lng: s.lng,
        })),
        { label: getShortAddress(ride.destinationLocation), fullLabel: ride.destinationLocation, type: 'destination', stopId: null, sequence: Number.MAX_SAFE_INTEGER },
    ];
    const hasStops = confirmedStops.length > 0;
    const lastPointIdx = routePoints.length - 1;

    // Default drop to destination on first render
    const effectiveDrop = selectedDrop !== null ? selectedDrop : lastPointIdx;

    const handlePickupSelect = (idx) => {
        setSelectedPickup(idx);
        // If current drop is at or before new pickup, reset to destination
        if (effectiveDrop <= idx) {
            setSelectedDrop(lastPointIdx);
        }
    };

    const handleDropSelect = (idx) => {
        setSelectedDrop(idx);
    };

    const handleRequestSeat = async () => {
        try {
            setLoading(true);
            const finalPickup = selectedPickup;
            const finalDrop = effectiveDrop;

            const payload = {
                rideId: id,
                requestedSeats: 1,
            };

            // Only send stop IDs for actual intermediate stops (not start/destination)
            if (finalPickup !== null && routePoints[finalPickup]?.stopId) {
                payload.pickupStopId = routePoints[finalPickup].stopId;
            }
            if (finalDrop !== null && routePoints[finalDrop]?.stopId) {
                payload.dropStopId = routePoints[finalDrop].stopId;
            }

            const res = await bookingRequestsApi.create(payload);
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
                        {confirmedStops.map((stop) => {
                            if (!stop.lat || !stop.lng) return null;
                            const pos = [stop.lat, stop.lng];
                            const isSelected =
                                (routePoints[selectedPickup]?.stopId === stop.id) ||
                                (routePoints[effectiveDrop]?.stopId === stop.id);
                            return (
                                <Marker
                                    key={stop.id}
                                    position={pos}
                                    icon={isSelected ? stopHighlightedIcon : stopIcon}
                                >
                                    <Popup className="marker-popup">
                                        <strong>Stop:</strong> {stop.stopName}
                                    </Popup>
                                </Marker>
                            );
                        })}
                        <MapBounds
                            positions={polylinePositions}
                            extraPositions={confirmedStops
                                .filter(s => s.lat && s.lng)
                                .map(s => [s.lat, s.lng])}
                        />
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

                    {/* ── Pickup / Drop-off Selection ── */}
                    <div className="stop-selection-section">
                        <div className="stop-selection-header">
                            <MapPin size={16} strokeWidth={2.5} color="#FDBA2E" />
                            <span className="stop-selection-title">Select Pickup & Drop-off</span>
                        </div>

                        {!hasStops && (
                            <p className="stop-selection-hint">
                                No intermediate stops were added by the driver. Pickup defaults to ride start and drop-off defaults to destination.
                            </p>
                        )}

                        <div className="stop-selection-timeline">
                            {routePoints.map((pt, idx) => {
                                const isPickup = selectedPickup === idx;
                                const isDrop = effectiveDrop === idx;
                                const isDisabledDrop = idx <= selectedPickup;
                                const isFirst = idx === 0;
                                const isLast = idx === routePoints.length - 1;

                                return (
                                    <div key={idx} className="timeline-point">
                                        <div className="timeline-dot-col">
                                            <div className={`timeline-dot ${
                                                isFirst ? 'start' : isLast ? 'end' : 'mid'
                                            } ${isPickup ? 'selected-pickup' : ''} ${isDrop ? 'selected-drop' : ''}`} />
                                            {!isLast && <div className="timeline-line" />}
                                        </div>
                                        <div className="timeline-content">
                                            <span className={`timeline-label ${
                                                isPickup || isDrop ? 'highlighted' : ''
                                            }`}>
                                                <span className="timeline-label-text" title={pt.fullLabel}>{pt.label}</span>
                                                {isFirst && <span className="point-tag">Start</span>}
                                                {isLast && <span className="point-tag">End</span>}
                                            </span>
                                            <div className="timeline-actions">
                                                <button
                                                    type="button"
                                                    className={`stop-action-btn pickup ${isPickup ? 'active' : ''}`}
                                                    onClick={() => handlePickupSelect(idx)}
                                                >
                                                    {isPickup ? <Check size={12} strokeWidth={3} /> : null}
                                                    Pickup
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`stop-action-btn dropoff ${isDrop ? 'active' : ''}`}
                                                    disabled={isDisabledDrop}
                                                    onClick={() => handleDropSelect(idx)}
                                                >
                                                    {isDrop ? <Check size={12} strokeWidth={3} /> : null}
                                                    Drop
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
