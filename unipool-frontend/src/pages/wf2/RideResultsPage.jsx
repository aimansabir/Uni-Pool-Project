import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Navigation, Zap, Clock, Calendar } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ridesApi } from '../../api/rides.api';
import BottomNav from '../../layouts/BottomNav';
import RideCard from '../../components/wf2/RideCard';
import { MOCK_RIDES } from '../../utils/mockRides';
import findHeaderBg from '../../assets/images/available_ride_header_bg.png';
import './RideResultsPage.css';

export default function RideResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [rides, setRides] = useState([]);

  // Original filters from previous page
  const originalFilters = location.state?.filters || {};

  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        // Map frontend filter names to backend expected query params if needed
        const params = {
            pickup: originalFilters.pickupLocation,
            dropoff: originalFilters.dropoffLocation,
            targetSlot: originalFilters.targetSlot,
            rideType: originalFilters.mode === 'slot' ? 'SCHEDULED' : originalFilters.mode === 'exact' ? 'SCHEDULED' : undefined
        };
        const res = await ridesApi.searchRides(params);
        setRides(res.data || []);
      } catch (err) {
        showError('Failed to fetch rides. Showing demo results.');
        // Fallback to empty if real fetch fails
        setRides([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [originalFilters, showError]);

  const handleRideClick = (ride) => {
    navigate(`/rides/${ride.id}/preview`);
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
              <div className="empty-section-msg">No instant rides available right now.</div>
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
              <div className="empty-section-msg">No scheduled rides found for this route.</div>
            )}
          </div>
        </section>
      </main>

      {/* 3. Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
