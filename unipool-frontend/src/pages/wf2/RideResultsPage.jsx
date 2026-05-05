import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Navigation, Zap, Clock, Calendar, Bell } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ridesApi } from '../../api/rides.api';
import { activeSearchesApi, subscriptionsApi } from '../../api/notifications.api';
import BottomNav from '../../layouts/BottomNav';
import RideCard from '../../components/wf2/RideCard';
import { MOCK_RIDES } from '../../utils/mockRides';
import findHeaderBg from '../../assets/images/available_ride_header_bg.png';
import './RideResultsPage.css';

export default function RideResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState([]);
  const [activeSearchId, setActiveSearchId] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const { showSuccess, showError } = useToast();

  // Original filters from previous page
  const originalFilters = location.state?.filters || {};

  // Stabilize originalFilters for useEffect
  const filterKey = JSON.stringify(originalFilters);

  useEffect(() => {
    if (!originalFilters.pickupLocation || !originalFilters.dropoffLocation) return;

    let currentSearchId = null;
    let pingInterval = null;

    const setupActiveSearch = async () => {
      try {
        const payload = {
          pickupLocation: originalFilters.pickupLocation,
          dropoffLocation: originalFilters.dropoffLocation,
          pickupCoords: originalFilters.pickupCoords,
          dropoffCoords: originalFilters.dropoffCoords,
          targetSlot: originalFilters.targetSlot
        };
        const res = await activeSearchesApi.create(payload);
        currentSearchId = res.data?.id || res.data?.data?.id || res.id;

        if (currentSearchId) {
          setActiveSearchId(currentSearchId);

          pingInterval = setInterval(async () => {
            try {
              await activeSearchesApi.ping(currentSearchId);
            } catch (err) {
              console.warn('Failed to ping active search:', err);
            }
          }, 30000);
        }
      } catch (err) {
        console.warn('Failed to create active search:', err);
      }
    };

    setupActiveSearch();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (currentSearchId) {
        activeSearchesApi.deactivate(currentSearchId).catch(err => {
          console.warn('Failed to deactivate active search:', err);
        });
      }
    };
  }, [filterKey]);

  useEffect(() => {
    const fetchRides = async () => {
      // Don't fetch if we don't have basic locations
      if (!originalFilters.pickupLocation && !originalFilters.dropoffLocation) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = {
          pickup: originalFilters.pickupLocation,
          dropoff: originalFilters.dropoffLocation,
          pickupLat: originalFilters.pickupCoords?.lat,
          pickupLng: originalFilters.pickupCoords?.lng,
          dropoffLat: originalFilters.dropoffCoords?.lat,
          dropoffLng: originalFilters.dropoffCoords?.lng,
          targetSlot: originalFilters.targetSlot,
          /* Do NOT filter by rideType — show both INSTANT and SCHEDULED rides */
        };
        const res = await ridesApi.searchRides(params);
        
        // Defensive client-side filter: only show bookable rides
        const now = new Date();
        const graceWindow = new Date(now.getTime() - 15 * 60000);
        
        const bookableRides = (res.data || []).filter(ride => {
          if (ride.status !== 'PUBLISHED') return false;
          if (ride.seatsAvailable <= 0) return false;
          
          const departure = new Date(ride.departureTime);
          if (departure < graceWindow) return false;
          
          return true;
        });

        setRides(bookableRides);
      } catch (err) {
        console.error('Fetch error:', err);
        showError(err.message || 'Failed to fetch rides.');
        setRides([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [filterKey, showError]);

  const handleRideClick = (ride) => {
    navigate(`/rides/${ride.id}/preview`);
  };

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      await subscriptionsApi.create({
        pickupLocation: originalFilters.pickupLocation,
        dropoffLocation: originalFilters.dropoffLocation,
        channel: 'EMAIL',
      });
      showSuccess('Route alert saved! You will be notified when rides are published.');
    } catch (err) {
      showError(err.message || 'Failed to save route alert.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="results-loading-screen">
        <div className="loader-pulse" />
        <span className="loader-text">Finding Available Rides...</span>
      </div>
    );
  }

  return (
    <div className="ride-results-page fade-in">
      {/* 1. Branded Header (Exactly like FindRidePage) */}
      <div className="find-header">
        <div className="find-header__nav-group">
          <button className="header-back-btn" onClick={() => navigate('/rides/find', { state: { filters: originalFilters } })}>
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
        </div>
        <div className="find-header__content">
          <h1 className="find-header__title">Available Rides</h1>
        </div>
        <div className="find-header__illustration">
          <img src={findHeaderBg} alt="Illustration" />
        </div>
      </div>

      {/* 2. Main Scrollable Content */}
      <main className="results-main-content">

        {/* Live Feed Section */}
        <section className="results-list-section">
          <div className="section-type-pill live-pill">
            <Zap size={14} fill="#F59E0B" color="#F59E0B" />
            <span>Live Feed: Leaving Now</span>
          </div>
          <div className="rides-stack">
            {rides.filter(r => r.rideType === 'INSTANT').length > 0 ? (
              rides.filter(r => r.rideType === 'INSTANT').map(ride => (
                <RideCard key={ride.id} ride={ride} onAction={handleRideClick} />
              ))
            ) : (
              <div className="empty-section-msg">
                <div className="empty-msg-icon">
                  <Clock size={28} color="#FDBA2E" />
                </div>
                <span>No instant rides available right now.</span>
              </div>
            )}
          </div>
        </section>

        <div className="results-section-divider" />

        {/* Scheduled Section */}
        <section className="results-list-section">
          <div className="section-type-pill scheduled-pill">
            <Clock size={14} color="#10B981" />
            <span>Scheduled Rides</span>
          </div>
          <div className="rides-stack">
            {rides.filter(r => r.rideType === 'SCHEDULED').length > 0 ? (
              rides.filter(r => r.rideType === 'SCHEDULED').map(ride => (
                <RideCard key={ride.id} ride={ride} onAction={handleRideClick} />
              ))
            ) : (
              <div className="empty-section-msg" style={{ flexDirection: 'column', gap: '12px' }}>
                <span>No scheduled rides found for this route.</span>
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: subscribing ? 'not-allowed' : 'pointer',
                    opacity: subscribing ? 0.7 : 1
                  }}
                >
                  <Bell size={16} />
                  {subscribing ? 'Saving alert...' : 'Notify me when available'}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 3. Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
