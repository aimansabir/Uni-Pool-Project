import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { ridesApi } from '../../api/rides.api';
import Button from '../../components/common/Button/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import { ChevronLeft, Navigation, User, XCircle, MapPin, ShieldCheck } from 'lucide-react';

import './WF3.css';

export default function ActiveRidePage() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const pollingRef = useRef(null);

  const rideId = paramId || location.state?.rideId;

  const fetchRideData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      let targetId = rideId;
      if (!targetId) {
        const res = await ridesApi.list();
        const activeRide = res.data.find(r => r.status === 'IN_PROGRESS');
        if (activeRide) targetId = activeRide.id;
        else {
          setError('No active ride in progress');
          setLoading(false);
          return;
        }
      }
      const res = await ridesApi.getById(targetId);
      const rideData = res.data;

      
      if (rideData && rideData.status === 'IN_PROGRESS') {
        if (rideData.driverId === user?.id) {
          navigate(`/rides/${rideData.id}/live`, { replace: true });
          return;
        } else {
          // Passenger — redirect to tracking view
          navigate(`/rides/${rideData.id}/track`, { replace: true });
          return;
        }
      } else if (rideData && rideData.status !== 'IN_PROGRESS') {
        setError('This ride has not started yet or is already completed.');
        setLoading(false);
        return;
      }


      setRide(rideData);


      setError(null);

    } catch (err) {
      setError('Failed to load ride details');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRideData(true);
    pollingRef.current = setInterval(() => fetchRideData(), 10000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [rideId]);

  const handleRideAction = async (action, rideId) => {
    setActionLoading(true);
    try {
      if (action === 'start') {
        await rideExecutionApi.startRide(rideId);
        showSuccess('Ride started! Drive safely.');
      } else if (action === 'complete') {
        await rideExecutionApi.completeRide(rideId);
        showSuccess('Ride completed!');
        navigate(`/payments/${rideId}`);
      }
      await fetchRideData();
    } catch (err) {
      showError(err.response?.data?.message || `Failed to ${action} ride`);
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  const handlePassengerAction = async (action, bookingId) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'arrived': await rideExecutionApi.arrivedAtStop(bookingId); break;
        case 'pickup': await rideExecutionApi.markPickedUp(bookingId); break;
        case 'noshow': await rideExecutionApi.markNoShow(bookingId); break;
        case 'dropoff': await rideExecutionApi.dropOffPassenger(bookingId); break;
        default: break;
      }
      await fetchRideData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update passenger status');
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (error) return (
    <div className="wf3-container fade-in">
      <header className="wf3-header">
        <button className="back-btn" onClick={() => navigate('/rides')}>
          <ChevronLeft size={24} />
        </button>
        <h1 className="wf3-title">Live Ride</h1>
      </header>
      
      <div className="wf3-content">
        <EmptyState 
          icon="🚗"
          title="No Active Ride"
          description={error}
          action={
            <Button variant="primary" onClick={() => navigate('/rides')}>
              View My Rides
            </Button>
          }
        />
      </div>
    </div>
  );

  if (!ride) return null;

  const isDriver = ride.driverId === user?.id;
  const activeBooking = ride.bookings?.find(b => b.passengerId === user?.id);

  return (
    <div className="wf3-container fade-in">
      <header className="wf3-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={24} /></button>
        <h1 className="wf3-title">Active Ride</h1>
      </header>
      <div className="wf3-card">
        <div className="ride-summary">
          <div className="route-display">
            <div className="route-node"><MapPin size={16} color="#10b981" /><span>{ride.startLocation}</span></div>
            <div className="route-line-vertical" />
            <div className="route-node"><MapPin size={16} color="#ef4444" /><span>{ride.destinationLocation}</span></div>
          </div>
          <div className="ride-status-badge">Status: <strong>{ride.status}</strong></div>
        </div>
      </div>
      {/* Content omitted for brevity in placeholder */}
      <div className="wf3-placeholder">
        <h2 className="wf3-placeholder__title">Live Tracking View</h2>
        <p className="wf3-placeholder__subtitle">You are viewing the {isDriver ? 'driver' : 'passenger'} live tracking screen.</p>
      </div>
    </div>
  );
}
