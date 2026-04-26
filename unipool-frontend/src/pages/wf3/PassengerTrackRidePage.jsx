import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { ridesApi } from '../../api/rides.api';
import Button from '../../components/common/Button/Button';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import {
  ChevronLeft,
  Navigation,
  MapPin,
  Star,
  Shield,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  XCircle,
  PartyPopper,
} from 'lucide-react';

import './PassengerTrackRidePage.css';

/* ── Leaflet icon fix ─────────────────────────────────────────────── */
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIconRetina, shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* Auto-fit helper — route shifted up for bottom sheet */
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), {
        paddingTopLeft: [50, 80],
        paddingBottomRight: [50, 350],
      });
    } else if (positions?.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [positions, map]);
  return null;
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function PassengerTrackRidePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [ride, setRide] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Popup state — shown when driver drops off passenger
  const [showDropoffPopup, setShowDropoffPopup] = useState(false);
  const prevStatusRef = useRef(null);

  const pollingRef = useRef(null);

  /* ── Fetch data ────────────────────────────────────────────────── */

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [rideRes, trackRes] = await Promise.all([
        ridesApi.getById(id),
        rideExecutionApi.trackRide(id).catch((e) => {
          console.warn('Tracking unavailable:', e);
          return { data: null };
        }),
      ]);
      setRide(rideRes.data);
      setTracking(trackRes.data);

      // Detect ride COMPLETED → show popup
      if (trackRes.data) {
        const rideStatus = trackRes.data.status;

        if (rideStatus === 'COMPLETED' && prevStatusRef.current !== 'COMPLETED_SHOWN') {
          setShowDropoffPopup(true);
          clearInterval(pollingRef.current);
          prevStatusRef.current = 'COMPLETED_SHOWN';
        }
      }
    } catch (err) {
      console.error('Failed to load tracking:', err);
      if (isInitial) showError('Failed to load ride tracking');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    pollingRef.current = setInterval(() => fetchData(), 10000);
    return () => clearInterval(pollingRef.current);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Verify plate ──────────────────────────────────────────────── */

  const handleVerifyPlate = async () => {
    if (!myBooking || !tracking?.vehicle?.registrationNumber) return;
    setVerifying(true);
    try {
      await rideExecutionApi.verifyPlate(myBooking.id, tracking.vehicle.registrationNumber);
      showSuccess('Plate verified successfully!');
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to verify plate');
    } finally {
      setVerifying(false);
    }
  };

  /* ── Guards ────────────────────────────────────────────────────── */

  if (loading) return <FullPageSpinner />;

  if (!ride && !tracking) return (
    <div className="pax-track-page">
      <div className="ptr-validation-view fade-in"><div className="ptr-validation-card">
        <AlertCircle size={48} color="#f59e0b" />
        <h2>Ride Not Found</h2>
        <p>We couldn't retrieve the tracking details.</p>
        <Button fullWidth onClick={() => navigate('/rides')}>Back to My Rides</Button>
      </div></div>
    </div>
  );

  /* ── Derived data ──────────────────────────────────────────────── */

  const driver = tracking?.driver || {};
  const vehicle = tracking?.vehicle || {};
  const etaMins = tracking?.estimatedArrivalMinutes ?? ride?.durationMin ?? '—';
  const bookings = tracking?.bookingRequests || [];
  const myBooking = bookings.find(b => b.passengerId === user?.id);
  const pickupAddress = myBooking?.pickupStopName || tracking?.startLocation || ride?.startLocation || 'Your stop';
  const isPlateVerified = myBooking?.plateVerified === true;
  const participantStatus = myBooking?.participantStatus;
  const isDroppedOff = participantStatus === 'DROPPED_OFF';
  const isPickedUp = participantStatus === 'PICKED_UP';
  const isNoShow = participantStatus === 'NO_SHOW';
  const rideStatus = tracking?.status || ride?.status;
  const isCancelled = rideStatus === 'CANCELLED';
  const isCompleted = rideStatus === 'COMPLETED';

  // Map data
  const polylinePositions = ride?.routeGeometry?.coordinates?.map(c => [c[1], c[0]]) || [];
  const startPoint = polylinePositions[0];
  const endPoint = polylinePositions[polylinePositions.length - 1];
  const driverPos = (tracking?.currentLat && tracking?.currentLng) ? [tracking.currentLat, tracking.currentLng] : null;
  const pickupPos = (myBooking?.pickupLat && myBooking?.pickupLng) ? [myBooking.pickupLat, myBooking.pickupLng] : null;

  const allPoints = [
    ...(startPoint ? [startPoint] : []),
    ...(endPoint ? [endPoint] : []),
    ...(driverPos ? [driverPos] : []),
    ...(pickupPos ? [pickupPos] : []),
  ];

  const vehicleLabel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const vehicleColor = vehicle.color ? `(${vehicle.color})` : '';
  const plate = vehicle.registrationNumber || '—';

  /* ── Status text for bottom sheet ──────────────────────────────── */
  const getStatusDisplay = () => {
    if (isPickedUp) return { label: 'You are in the vehicle', icon: '🚗', color: '#10b981' };
    if (isDroppedOff) return { label: 'You have been dropped off', icon: '✅', color: '#10b981' };
    return { label: 'Arriving at your stop in:', icon: null, color: '#10b981' };
  };
  const statusDisplay = getStatusDisplay();

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="pax-track-page fade-in">

      {/* ── Drop-off popup overlay ─────────────────────────────────── */}
      {showDropoffPopup && (
        <div className="ptr-popup-overlay">
          <div className="ptr-popup-card">
            <div className="ptr-popup-icon">
              <CheckCircle2 size={36} color="#10b981" />
            </div>
            <h2>You've Arrived! 🎉</h2>
            <p>The driver has marked you as dropped off. Please complete your payment and rate the driver.</p>
            <button
              className="ptr-popup-btn"
              onClick={() => navigate(`/rides/${id}/payment-rating`)}
            >
              Continue to Payment & Rating
            </button>
            <button
              className="ptr-popup-dismiss"
              onClick={() => setShowDropoffPopup(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Floating back */}
      <div className="ptr-floating-header">
        <button className="ptr-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
      </div>

      {/* Full-screen map */}
      <div className="ptr-map-section">
        {polylinePositions.length > 1 ? (
          <MapContainer center={startPoint} zoom={13} scrollWheelZoom={false} zoomControl={false} className="ptr-leaflet-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <Polyline positions={polylinePositions} pathOptions={{ color: '#6366f1', weight: 5, opacity: 0.85 }} />
            {startPoint && <Marker position={startPoint} icon={greenIcon} />}
            {endPoint && <Marker position={endPoint} icon={redIcon} />}
            {driverPos && (
              <CircleMarker center={driverPos} radius={10} pathOptions={{ color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 1, weight: 3 }} />
            )}
            {pickupPos && (
              <CircleMarker center={pickupPos} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 1, weight: 2 }} />
            )}
            <FitBounds positions={allPoints} />
          </MapContainer>
        ) : (
          <div className="ptr-map-placeholder">
            <Navigation size={48} color="#6366f1" strokeWidth={1.5} />
            <p>Tracking map loading…</p>
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      <div className="ptr-bottom-sheet">
        <div className="ptr-sheet-handle" />

        {/* ── Cancelled ───────────────────────────────────────────── */}
        {isCancelled ? (
          <div className="ptr-cancelled-view">
            <XCircle size={48} color="#ef4444" />
            <h3>Ride Cancelled</h3>
            <p>This ride has been cancelled by the driver.</p>
            <Button fullWidth onClick={() => navigate('/rides/find')}>Find Another Ride</Button>
          </div>
        ) : (
          <>
            {/* ── Driver card ─────────────────────────────────────── */}
            <div className="ptr-driver-row">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.fullName || 'D')}&background=random&size=112`}
                alt="" className="ptr-driver-avatar"
              />
              <div className="ptr-driver-meta">
                <h3 className="ptr-driver-name">{driver.fullName || 'Driver'}</h3>
                <span className="ptr-driver-label">(Driver)</span>
                <div className="ptr-driver-rating">
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <span>{driver.trustScore ? (driver.trustScore / 20).toFixed(1) : '5.0'}</span>
                  <span style={{ color: '#d1d5db' }}>•</span>
                  <span>{driver.totalRatingsReceived ?? 0} ratings</span>
                </div>
              </div>
              <div className="ptr-vehicle-badge">
                <p className="ptr-vehicle-name">{vehicleLabel} {vehicleColor}</p>
                <p className="ptr-vehicle-plate">Plate: {plate}</p>
              </div>
            </div>

            <div className="ptr-divider" />

            {/* ── Status / ETA ─────────────────────────────────────── */}
            <div className="ptr-arrival-row">
              <span className="ptr-arrival-label">
                <Navigation size={14} color={statusDisplay.color} fill={statusDisplay.color} />
                {statusDisplay.label}
              </span>
              {!isPickedUp && !isDroppedOff && (
                <p className="ptr-arrival-time">{etaMins} minutes</p>
              )}
            </div>

            {/* ── Pickup address ───────────────────────────────────── */}
            <div className="ptr-address-row">
              <div style={{ flex: 1 }}>
                <span className="ptr-address-label">
                  <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Your address
                </span>
                <p className="ptr-address-value">{pickupAddress}</p>
              </div>
              <button className="ptr-message-fab" onClick={() => navigate('/messages')}>
                <MessageSquare size={20} />
              </button>
            </div>

            <div className="ptr-divider" />

            {/* ── Actions ──────────────────────────────────────────── */}
            {(isDroppedOff || isCompleted) ? (
              <button className="ptr-continue-btn" onClick={() => navigate(`/rides/${id}/payment-rating`)}>
                Continue to Payment & Rating
              </button>
            ) : isNoShow ? (
              <div className="ptr-cancelled-view">
                <AlertCircle size={36} color="#b91c1c" />
                <h3>Marked as No-Show</h3>
                <p>You were marked as a no-show by the driver.</p>
                <Button fullWidth onClick={() => navigate('/rides/find')}>Find Another Ride</Button>
              </div>
            ) : isPickedUp ? (
              <div className="ptr-verified-badge">
                <CheckCircle2 size={20} />
                In vehicle — Enjoy your ride!
              </div>
            ) : isPlateVerified ? (
              <div className="ptr-verified-badge">
                <CheckCircle2 size={20} />
                Plate Verified — Waiting for pickup
              </div>
            ) : (
              <button
                className="ptr-verify-btn"
                onClick={handleVerifyPlate}
                disabled={verifying || !myBooking}
              >
                <Shield size={18} />
                {verifying ? 'Verifying…' : 'Verify Vehicle Plate'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
