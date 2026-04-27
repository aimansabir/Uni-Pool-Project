import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRideExecution } from '../../context/RideExecutionContext';
import RatingStars from '../../components/ride/RatingStars';
import Button from '../../components/common/Button/Button';
import Spinner from '../../components/common/Spinner/Spinner';
import '../DriverPassengerLayout.css';

export default function RateMembers() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { ride, completeRide, submitRating, loadingAction } = useRideExecution();

  const [ratings, setRatings] = useState({});

  useEffect(() => {
    if (ride && ride.status !== 'IN_PROGRESS' && ride.status !== 'COMPLETED') {
        navigate(`/driver/active-ride/${rideId}`, { replace: true });
    }
  }, [ride, navigate, rideId]);

  if (!ride) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;

  // Filter passengers who were properly serviced (not NO_SHOW, not just BOOKED)
  const rateablePassengers = ride.stops?.filter(s => 
    s.participantStatus === 'DROPPED_OFF' || s.participantStatus === 'PICKED_UP'
  ) || [];

  const handleRatingChange = (stopId, score) => {
    setRatings(prev => ({ ...prev, [stopId]: { ...prev[stopId], score } }));
  };

  const handleSubmitReview = async (stopId, targetUserId) => {
    const score = ratings[stopId]?.score || 5;
    await submitRating(true, {
      rideId,
      targetUserId,
      behaviorScore: score,
      reviewText: 'Good passenger'
    });
    setRatings(prev => ({ ...prev, [stopId]: { ...prev[stopId], submitted: true } }));
  };

  const handleCompleteRide = async () => {
    try {
      if (ride.status === 'IN_PROGRESS') {
        await completeRide(rideId);
      }
      navigate('/profile', { replace: true });
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="driver-page-container">
      <div className="header-nav" style={{ justifyContent: 'center' }}>
        <h2>Rate Members</h2>
      </div>

      <div className="ratings-list">
        {rateablePassengers.map(stop => {
          const isSubmitted = ratings[stop.id]?.submitted;
          return (
            <div className="ride-card" key={stop.id} style={{ position: 'relative' }}>
              {isSubmitted && <span style={{ position: 'absolute', top: 16, right: 16, color: '#27ae60' }}>✔️ Submitted</span>}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                <div className="driver-avatar" style={{ width: 48, height: 48 }}>
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(stop.passenger?.fullName || 'P')}`} alt="" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{stop.passenger?.fullName || 'Passenger'}</h3>
                  <div style={{ fontSize: '12px', color: '#27ae60' }}>Payment Received ✔️</div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Rate Behavior</p>
                <RatingStars 
                  value={ratings[stop.id]?.score || 0} 
                  onChange={(val) => handleRatingChange(stop.id, val)}
                  readonly={isSubmitted}
                />
              </div>
              {!isSubmitted && (
                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                  <Button 
                    size="sm" 
                    variant="primary"
                    disabled={!ratings[stop.id]?.score || loadingAction !== null}
                    onClick={() => handleSubmitReview(stop.id, stop.passengerId)}
                  >
                    Submit Review
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {rateablePassengers.length === 0 && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
            <p>No passengers to rate.</p>
          </div>
        )}
      </div>

      <div className="bottom-actions sticky-bottom">
        <Button 
          fullWidth 
          variant="primary" 
          size="lg" 
          onClick={handleCompleteRide}
          loading={loadingAction === 'completeRide'}
        >
          Complete Ride
        </Button>
      </div>
    </div>
  );
}
