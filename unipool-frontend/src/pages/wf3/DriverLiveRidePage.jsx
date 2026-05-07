import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { ridesApi } from '../../api/rides.api';
import Button from '../../components/common/Button/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import {
  ChevronLeft,
  Navigation,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  User
} from 'lucide-react';

import './DriverLiveRidePage.css';

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
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

/* Auto-fit bounds — shifts route up so bottom sheet doesn't hide it */
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

export default function DriverLiveRidePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [ride, setRide] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [navData, setNavData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const pollingRef = useRef(null);
  const locationRef = useRef(null);

  /* ── Fetch ─────────────────────────────────────────────────────── */

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [rideRes, trackRes, navRes] = await Promise.all([
        ridesApi.getById(id),
        rideExecutionApi.trackRide(id).catch(() => ({ data: null })),
        rideExecutionApi.getNavigation(id).catch(() => ({ data: null })),
      ]);
      setRide(rideRes.data);
      setTracking(trackRes.data);
      setNavData(navRes.data);
    } catch (err) {
      console.error('Failed to load live ride:', err);
      if (isInitial) showError('Failed to load live ride data');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  /* ── Geolocation ───────────────────────────────────────────────── */

  const updateDriverLocation = () => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try { await rideExecutionApi.updateLocation(id, { lat: coords.latitude, lng: coords.longitude }); setLocationError(null); } catch { /* silent */ }
      },
      () => setLocationError('Enable location for live tracking'),
      { enableHighAccuracy: true },
    );
  };

  useEffect(() => {
    fetchData(true);
    pollingRef.current = setInterval(() => fetchData(), 10000);
    updateDriverLocation();
    locationRef.current = setInterval(updateDriverLocation, 12000);
    return () => { clearInterval(pollingRef.current); clearInterval(locationRef.current); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Actions ───────────────────────────────────────────────────── */

  const handleRideAction = async (action, rideId) => {
    setActionLoading(true);
    try {
      if (action === 'start') {
        await rideExecutionApi.startRide(rideId);
        showSuccess('Ride started! Drive safely.');
        await fetchData();
      }
    } catch (err) {
      showError(err.response?.data?.message || `Failed to ${action} ride`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePassengerAction = async (action, bookingId) => {
    setActionLoading(true); setLoadingAction(bookingId);
    try {
      switch (action) {
        case 'arrived': await rideExecutionApi.arrivedAtStop(bookingId); showSuccess('Marked arrived'); break;
        case 'pickup': await rideExecutionApi.markPickedUp(bookingId); showSuccess('Passenger picked up'); break;
        case 'noshow': await rideExecutionApi.markNoShow(bookingId); showSuccess('Marked no-show'); break;
        case 'dropoff': await rideExecutionApi.dropOffPassenger(bookingId); showSuccess('Dropped off'); break;
        default: break;
      }
      await fetchData();
    } catch (err) { showError(err.message || 'Action failed'); }
    finally { setActionLoading(false); setLoadingAction(null); setShowConfirm(null); }
  };

  const handleEndJourney = async () => {
    setActionLoading(true);
    try { await rideExecutionApi.completeRide(id); showSuccess('Ride completed!'); navigate(`/rides/${id}/rate-members`); }
    catch (err) { showError(err.message || 'Failed to end journey'); }
    finally { setActionLoading(false); setShowConfirm(null); }
  };

  /* ── Guards ────────────────────────────────────────────────────── */

  if (loading) return <FullPageSpinner />;

  if (!ride) return (
    <div className="driver-live-page"><div className="dlr-validation-view fade-in"><div className="dlr-validation-card">
      <AlertCircle size={48} color="#f59e0b" /><h2>Ride Not Found</h2><p>We couldn't retrieve the details for this ride.</p>
      <Button fullWidth onClick={() => navigate('/rides')}>Back to My Rides</Button>
    </div></div></div>
  );

  if (ride.status !== 'IN_PROGRESS') return (
    <div className="driver-live-page"><div className="dlr-validation-view fade-in"><div className="dlr-validation-card">
      {ride.status === 'PUBLISHED' ? (<>
        <Navigation size={48} color="#f59e0b" className="pulse-icon" />
        <h2>Ready to Leave?</h2>
        <p>Your ride is published. Once you start the journey, passengers can track your live location.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <Button fullWidth variant="accent" onClick={() => handleRideAction('start', id)} isLoading={actionLoading}>
            Start Journey Now ⚡
          </Button>
          <Button fullWidth variant="outline" onClick={() => navigate(`/rides/${id}/manage`)}>
            Manage Passengers
          </Button>
        </div>
      </>) : ride.status === 'COMPLETED' ? (<>
        <CheckCircle2 size={48} color="#10b981" /><h2>Ride Completed</h2><p>This ride has already finished.</p>
        <Button fullWidth onClick={() => navigate(`/rides/${id}/rate-members`)}>Rate Members</Button>
      </>) : (<>
        <AlertCircle size={48} color="#6b7280" /><h2>Ride {ride.status}</h2><p>This ride is currently {ride.status.toLowerCase()}.</p>
        <Button fullWidth onClick={() => navigate('/rides')}>Back to My Rides</Button>
      </>)}
    </div></div></div>
  );

  /* ── Derived ───────────────────────────────────────────────────── */

  const passengers = tracking?.bookingRequests || [];
  const nw = tracking?.nextWaypoint || null;
  const googleMapsUrl = navData?.navigationLink || null;
  const driverLocationFresh = tracking?.driverLocationFresh;
  const hasDriverLoc = tracking?.currentLat && tracking?.currentLng;
  const driverPos = hasDriverLoc ? [tracking.currentLat, tracking.currentLng] : null;

  const polylinePositions = ride.routeGeometry?.coordinates?.map(c => [c[1], c[0]]) || [];
  const startPoint = polylinePositions[0];
  const endPoint = polylinePositions[polylinePositions.length - 1];

  // Status-aware markers: BOOKED→orange pickup, PICKED_UP→red dropoff, DROPPED_OFF→hidden
  const pickupMarkers = passengers
    .filter(b => b.pickupLat && b.pickupLng && (b.participantStatus === 'BOOKED' || !b.participantStatus))
    .map(b => ({ lat: b.pickupLat, lng: b.pickupLng, name: b.pickupStopName || 'Pickup stop', id: b.id, kind: 'pickup' }));

  const dropoffMarkers = passengers
    .filter(b => b.dropoffLat && b.dropoffLng && b.participantStatus === 'PICKED_UP')
    .map(b => ({ lat: b.dropoffLat, lng: b.dropoffLng, name: b.dropoffStopName || 'Drop-off stop', id: b.id, kind: 'dropoff' }));

  const allPoints = [
    ...(startPoint ? [startPoint] : []),
    ...(endPoint ? [endPoint] : []),
    ...(driverPos ? [driverPos] : []),
    ...pickupMarkers.map(m => [m.lat, m.lng]),
    ...dropoffMarkers.map(m => [m.lat, m.lng]),
  ];

  const shortStart = ride.startLocation?.split(',')[0]?.trim();
  const shortDest = ride.destinationLocation?.split(',')[0]?.trim();

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="driver-live-page fade-in">
      {/* 1. Control Layer (Fixed relative to the page container) */}
      <div className="dlr-floating-header">
        <button className="dlr-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={22} />
        </button>
      </div>

      {googleMapsUrl && (
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="dlr-gmaps-fab">
          <Navigation size={16} fill="#fff" /> Navigate
        </a>
      )}

      {/* 2. Scrollable Content Layer */}
      <div className="dlr-scroll-container">
        <div className="dlr-map-section">
          {polylinePositions.length > 1 ? (
            <MapContainer center={startPoint} zoom={13} scrollWheelZoom={false} zoomControl={false} className="dlr-leaflet-map">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <Polyline positions={polylinePositions} pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.9 }} />
              {startPoint && (
                <Marker position={startPoint} icon={greenIcon}>
                  <Popup><strong>Start:</strong> {ride.startLocation}</Popup>
                </Marker>
              )}
              {endPoint && (
                <Marker position={endPoint} icon={redIcon}>
                  <Popup><strong>Destination:</strong> {ride.destinationLocation}</Popup>
                </Marker>
              )}
              {pickupMarkers.map(m => (
                <Marker key={`pickup-${m.id}`} position={[m.lat, m.lng]} icon={orangeIcon}>
                  <Popup><strong>Pickup stop:</strong> {m.name}</Popup>
                </Marker>
              ))}
              {dropoffMarkers.map(m => (
                <Marker key={`dropoff-${m.id}`} position={[m.lat, m.lng]} icon={redIcon}>
                  <Popup><strong>Drop-off stop:</strong> {m.name}</Popup>
                </Marker>
              ))}
              {driverPos && (
                <CircleMarker center={driverPos} radius={10}
                  pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}>
                  <Popup><strong>Driver location</strong></Popup>
                </CircleMarker>
              )}
              <FitBounds positions={allPoints} />
            </MapContainer>
          ) : (
            <div className="dlr-map-placeholder">
              <Navigation size={48} color="#f59e0b" strokeWidth={1.5} />
              <p>Route map not available</p>
            </div>
          )}
        </div>

        <div className="dlr-bottom-sheet">
          <div className="dlr-sheet-handle" />

          {/* Route pill */}
          <div className="dlr-route-pill">
            <MapPin size={16} color="#10b981" />
            <span className="route-label">{shortStart} → {shortDest}</span>
          </div>

          {/* ETA row */}
          <div className="dlr-eta-row">
            <Navigation size={16} color="#f59e0b" fill="#f59e0b" />
            {nw?.etaMinutes != null ? (
              <span>{nw.label}: <strong>{nw.etaMinutes} min{nw.etaMinutes !== 1 ? 's' : ''}</strong></span>
            ) : ride?.durationMin ? (
              <span>Est. journey time: <strong>~{ride.durationMin} mins</strong></span>
            ) : !hasDriverLoc ? (
              <span style={{ color: '#9ca3af' }}>Waiting for live location…</span>
            ) : (
              <span style={{ color: '#9ca3af' }}>Calculating ETA…</span>
            )}
          </div>

          {/* Stale location / GPS warning */}
          {(locationError || driverLocationFresh === false) && (
            <div className="dlr-location-warning">
              <AlertCircle size={14} />
              <span>{locationError || 'Waiting for fresh driver location — enable GPS for live ETA'}</span>
            </div>
          )}

          {/* Passenger waypoints */}
          <h3 className="dlr-section-heading">Pickup Waypoints</h3>

          {passengers.length === 0 && (
            <div className="dlr-empty-passengers">
              <User size={36} strokeWidth={1.2} /><p>No passengers on this ride</p>
            </div>
          )}

          {passengers.map((b) => {
            const status = b.participantStatus;
            const isBooked = !status || status === 'BOOKED';
            const isPickedUp = status === 'PICKED_UP';
            const isNoShow = status === 'NO_SHOW';
            const isDroppedOff = status === 'DROPPED_OFF';
            const busy = loadingAction === b.id;

            return (
              <div key={b.id} className={`dlr-pax-card ${isNoShow ? 'dlr-pax-noshow' : ''} ${isDroppedOff ? 'dlr-pax-done' : ''}`}>
                <div className="dlr-pax-row">
                  <img
                    src={b.passenger?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.passenger?.fullName || 'U')}&background=random&size=96`}
                    alt="" className="dlr-pax-avatar"
                  />
                  <div className="dlr-pax-meta">
                    <h4>{b.passenger?.fullName || 'Passenger'}</h4>
                    <p><MapPin size={13} /> {isPickedUp ? (b.dropoffStopName || 'Drop-off stop') : (b.pickupStopName || 'Pickup stop')}</p>
                    {isBooked && b.etaToPickupMinutes != null && (
                      <p className="dlr-pax-eta"><Clock size={12} /> ETA to pickup: <strong>{b.etaToPickupMinutes} min</strong></p>
                    )}
                    {isPickedUp && b.etaToDropoffMinutes != null && (
                      <p className="dlr-pax-eta"><Clock size={12} /> ETA to drop-off: <strong>{b.etaToDropoffMinutes} min</strong></p>
                    )}
                    {isPickedUp && b.etaToDropoffMinutes == null && !b.dropoffLat && (
                      <p className="dlr-pax-eta"><Clock size={12} /> Drop-off: Destination</p>
                    )}
                    {isDroppedOff && <p className="dlr-pax-eta dlr-eta-done">Dropped off ✓</p>}
                    {isNoShow && <p className="dlr-pax-eta dlr-eta-noshow">No-show</p>}
                  </div>
                  {isNoShow && <span className="dlr-badge dlr-badge-noshow">No Show</span>}
                  {isDroppedOff && <span className="dlr-badge dlr-badge-dropped">Dropped Off</span>}
                  {isPickedUp && <span className="dlr-badge dlr-badge-pickedup">In Vehicle</span>}
                </div>

                {isBooked && (
                  <div className="dlr-pax-actions">
                    <button className="dlr-action-btn dlr-btn-arrived" disabled={busy}
                      onClick={() => handlePassengerAction('arrived', b.id)}>
                      Arrived at Stop
                    </button>
                    <button className="dlr-action-btn dlr-btn-pickup" disabled={busy}
                      onClick={() => handlePassengerAction('pickup', b.id)}>
                      Passenger Picked Up
                    </button>
                    <button className="dlr-action-btn dlr-btn-noshow" disabled={busy}
                      onClick={() => setShowConfirm({ type: 'noshow', id: b.id })}>
                      Mark No-Show
                    </button>
                  </div>
                )}

                {isPickedUp && (
                  <div className="dlr-pax-actions">
                    <button className="dlr-action-btn dlr-btn-dropoff" disabled={busy} onClick={() => handlePassengerAction('dropoff', b.id)}>
                      Drop Off Passenger
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* End Journey — inside the sheet, always visible */}
          <button
            className="dlr-end-journey-btn"
            onClick={() => setShowConfirm({ type: 'complete', id })}
            disabled={actionLoading}
          >
            End Journey
          </button>
        </div>

        {/* Confirm dialogs */}
        <ConfirmDialog
          isOpen={!!showConfirm}
          title={showConfirm?.type === 'noshow' ? 'Confirm No-Show' : 'End Journey?'}
          message={
            showConfirm?.type === 'noshow'
              ? 'Are you sure this passenger is a no-show? This cannot be undone.'
              : 'Are you sure you want to end this journey? Make sure all passengers have been dropped off.'
          }
          confirmText={showConfirm?.type === 'noshow' ? 'Confirm No-Show' : 'End Journey'}
          onConfirm={() => {
            if (showConfirm.type === 'noshow') handlePassengerAction('noshow', showConfirm.id);
            else handleEndJourney();
          }}
          onCancel={() => setShowConfirm(null)}
          variant={showConfirm?.type === 'noshow' ? 'danger' : 'primary'}
          isLoading={actionLoading}
        />
      </div>
    </div>
  );
}