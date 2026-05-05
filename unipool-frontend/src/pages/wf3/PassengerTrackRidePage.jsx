import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { ridesApi } from '../../api/rides.api';
import { chatApi } from '../../api/chat.api';
import { paymentsApi } from '../../api/payments.api';
import Button from '../../components/common/Button/Button';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import {
  ChevronLeft,
  Navigation,
  MapPin,
  Star,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
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

  // Frontend countdown — display-only, backend status is source of truth
  const [etaSeconds, setEtaSeconds] = useState(null);
  const countdownRef = useRef(null);

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

      // Reset countdown from backend ETA each poll
      if (trackRes.data?.estimatedArrivalMinutes != null) {
        setEtaSeconds(Math.round(trackRes.data.estimatedArrivalMinutes * 60));
      } else {
        setEtaSeconds(null);
      }

      // Check payment status if dropped off or completed
      const rideStatus = trackRes.data?.status || rideRes.data?.status;
      const bookings = trackRes.data?.bookingRequests || [];
      const userBooking = bookings.find(b => b.passengerId === user?.id);
      const isDropped = userBooking?.participantStatus === 'DROPPED_OFF';
      const isComplete = rideStatus === 'COMPLETED';

      if (isDropped || isComplete) {
        try {
          const paymentRes = await paymentsApi.getRidePaymentsDue(id);
          const payment = paymentRes.data;
          const isPaid = payment?.paidAt || payment?.status === 'PAID' || payment?.status === 'WAIVED';
          
          if (payment && !isPaid) {
            setShowDropoffPopup(true);
            clearInterval(pollingRef.current);
          } else {
            setShowDropoffPopup(false);
          }
        } catch (paymentErr) {
          if (paymentErr.response?.status !== 404) {
            console.error('Failed to check payment status:', paymentErr);
          }
          setShowDropoffPopup(false);
        }
      } else {
        setShowDropoffPopup(false);
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

    // 1-second countdown tick — display only, never drives app state
    countdownRef.current = setInterval(() => {
      setEtaSeconds(prev => (prev == null ? null : Math.max(0, prev - 1)));
    }, 1000);

    return () => {
      clearInterval(pollingRef.current);
      clearInterval(countdownRef.current);
    };
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
          </div>
        </div>
      )}

      {/* 1. Control Layer (Fixed relative to the shell) */}
      <div className="ptr-floating-header">
        <button className="ptr-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
      </div>

      {/* 2. Scrollable Content Layer */}
      <div className="ptr-scroll-container">
        <div className="ptr-map-section">
          {polylinePositions.length > 1 ? (
            <MapContainer center={startPoint} zoom={13} scrollWheelZoom={false} zoomControl={false} className="ptr-leaflet-map">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <Polyline positions={polylinePositions} pathOptions={{ color: '#6366f1', weight: 5, opacity: 0.85 }} />
              {startPoint && (
                <Marker position={startPoint} icon={greenIcon}>
                  <Popup><strong>Pickup:</strong> {ride?.startLocation}</Popup>
                </Marker>
              )}
              {endPoint && (
                <Marker position={endPoint} icon={redIcon}>
                  <Popup><strong>Drop off:</strong> {ride?.destinationLocation}</Popup>
                </Marker>
              )}
              {driverPos && (
                <CircleMarker center={driverPos} radius={10} pathOptions={{ color: '#4f46e5', fillColor: '#6366f1', fillOpacity: 1, weight: 3 }}>
                  <Popup><strong>Driver's Location</strong></Popup>
                </CircleMarker>
              )}
              {pickupPos && (
                <CircleMarker center={pickupPos} radius={8} pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 1, weight: 2 }}>
                  <Popup><strong>Your Stop:</strong> {pickupAddress}</Popup>
                </CircleMarker>
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
            {/* ── Driver & Vehicle Card ────────────────────────── */}
            <div className="ptr-main-card">
              <div className="ptr-driver-info-box">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.fullName || 'D')}&background=random&size=112`}
                  alt="" className="ptr-driver-avatar"
                />
                <div className="ptr-driver-meta">
                  <h3 className="ptr-driver-name">{driver.fullName || 'Driver'}</h3>
                  <span className="driver-role-pill">Driver</span>
                  <div className="ptr-driver-rating">
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <span>{driver.trustScore ? (driver.trustScore / 20).toFixed(1) : '5.0'}</span>
                    <span className="rating-divider">|</span>
                    <span className="rating-count">{driver.totalRatingsReceived ?? 0} ratings</span>
                  </div>
                </div>
              </div>

              <div className="ptr-vehicle-card">
                <div className="ptr-vehicle-img">
                  <img 
                    src={ride.vehicle?.imageUrl || ride.vehicleImageUrl || driver.vehicleImageUrl || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=200"} 
                    alt="Car" 
                    onError={(e) => { 
                      if (!e.target.src.includes('placeholder')) {
                        e.target.src = 'https://via.placeholder.com/100x60?text=Vehicle';
                      }
                    }}
                  />
                </div>
                <div className="ptr-vehicle-details">
                  <p className="ptr-vehicle-title">{vehicleLabel} {vehicleColor}</p>
                  <p className="ptr-vehicle-plate">Plate: <span>{plate}</span></p>
                </div>
              </div>
            </div>

            {/* ── Status / ETA (Single Line) ────────────────────────── */}
            <div className="ptr-eta-inline">
              <Navigation size={20} color="#10b981" fill="#10b981" />
              <div className="ptr-eta-text-group">
                {isDroppedOff ? (
                  <span className="ptr-eta-label" style={{ color: '#10b981' }}>You have arrived 🎉</span>
                ) : isPickedUp ? (
                  <span className="ptr-eta-label" style={{ color: '#6366f1' }}>In vehicle — heading to destination</span>
                ) : etaSeconds == null ? (
                  <span className="ptr-eta-label" style={{ color: '#9ca3af' }}>Calculating ETA…</span>
                ) : (
                  <>
                    <span className="ptr-eta-label">Arriving at your stop in</span>
                    <span className="ptr-eta-time">{Math.max(1, Math.ceil(etaSeconds / 60))} min{Math.ceil(etaSeconds / 60) !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
            {tracking?.driverLocationFresh === false && !isPickedUp && !isDroppedOff && (
              <div className="ptr-stale-note">
                ⏳ Waiting for driver location…
              </div>
            )}

            {/* ── Address & Message Row ────────────────────────────── */}
            <div className="ptr-address-card">
              <div className="ptr-addr-icon">
                <MapPin size={22} color="#f59e0b" />
              </div>
              <div className="ptr-addr-info">
                <span className="ptr-addr-label">Your address</span>
                <p className="ptr-addr-text">{pickupAddress}</p>
              </div>
              <button className="ptr-msg-btn" onClick={async () => {
                if (!myBooking?.id) {
                  showError('No booking found for this ride');
                  return;
                }
                try {
                  const res = await chatApi.openByBooking(myBooking.id);
                  const conversationId = res.data.id;
                  navigate(`/chat/${conversationId}`, {
                    state: {
                      otherUser: driver,
                      ride: tracking || ride
                    }
                  });
                } catch (err) {
                  showError('Failed to open chat');
                }
              }}>
                <MessageSquare size={22} color="#f59e0b" />
              </button>
            </div>

            {/* ── Verification / Safety ──────────────────────────── */}
            {isPlateVerified ? (
              <div className="ptr-safety-card">
                <div className="ptr-safety-icon">
                  <ShieldCheck size={22} color="#10b981" />
                </div>
                <div className="ptr-safety-content">
                  <p className="ptr-safety-title">Plate Verified — Waiting for pickup</p>
                  <p className="ptr-safety-desc">Your driver and vehicle details are verified.</p>
                </div>
              </div>
            ) : (
              <div className="ptr-safety-card" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <div className="ptr-safety-icon" style={{ background: '#fee2e2' }}>
                  <AlertCircle size={22} color="#ef4444" />
                </div>
                <div className="ptr-safety-content" style={{ flex: 1 }}>
                  <p className="ptr-safety-title" style={{ color: '#b91c1c' }}>Verify Vehicle Plate</p>
                  <p className="ptr-safety-desc">Confirm plate ({plate}) matches before pickup.</p>
                </div>
                <button
                  className="ptr-verify-btn"
                  onClick={handleVerifyPlate}
                  disabled={verifying}
                  style={{
                    width: 'auto',
                    height: '40px',
                    padding: '0 16px',
                    fontSize: '0.9rem',
                    background: '#ef4444',
                    flexShrink: 0
                  }}
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            )}

            {/* ── Payment Fallback CTA ── */}
            <div style={{ display: showDropoffPopup ? 'block' : 'none', marginTop: '16px' }}>
              <button 
                className="ptr-continue-btn"
                onClick={() => navigate(`/rides/${id}/payment-rating`)}
              >
                Complete Payment & Rating
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
  );
}
