import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRideExecution } from '../../context/RideExecutionContext';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import Spinner from '../../components/common/Spinner/Spinner';
import PassengerStopCard from '../../components/ride/PassengerStopCard';

export default function ActiveRideOverview() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { ride, startRide, loadingAction } = useRideExecution();

  useEffect(() => {
    if (ride && ride.status !== 'PUBLISHED') {
      if (ride.status === 'IN_PROGRESS') {
        navigate(`/driver/active-ride/${rideId}/navigation`, { replace: true });
      } else if (ride.status === 'COMPLETED') {
        navigate('/profile', { replace: true }); // Or history
      }
    }
  }, [ride, navigate, rideId]);

  if (!ride) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;
  }

  const handleStartRide = async () => {
    await startRide(rideId);
    navigate(`/driver/active-ride/${rideId}/navigation`);
  };

  const expectedEarnings = ride.stops?.reduce((acc, wp) => acc + (wp.fare || 0), 0) || 0;

  return (
    <div className="driver-page-container">
      <div className="header-nav">
        <h2>Your Ride</h2>
        <Badge variant="primary">{ride.status}</Badge>
      </div>
      
      <div className="ride-summary-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p className="label">Start Location</p>
            <p className="value"><strong>{ride.originName || 'Origin'}</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="label">Target Location</p>
            <p className="value"><strong>{ride.destinationName || 'Destination'}</strong></p>
          </div>
        </div>
        <div style={{ padding: '12px', background: '#eee', borderRadius: '8px', textAlign: 'center' }}>
          Expected Earnings: <strong>Rs. {expectedEarnings}</strong>
        </div>
      </div>

      <h3 style={{ marginTop: '24px' }}>Passengers: {ride.stops?.length || 0}</h3>
      <div className="passenger-list">
        {ride.stops?.map((stop, i) => (
          <div className="ride-card" key={stop.id || i}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className="driver-avatar" style={{ width: 40, height: 40 }}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(stop.passengerName || 'Passenger')}`} alt="" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px' }}>{stop.passengerName || 'Passenger'}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{stop.stopName}</p>
              </div>
            </div>
          </div>
        ))}
        {!ride.stops?.length && <p>No passengers accepted yet.</p>}
      </div>

      <div className="bottom-actions sticky-bottom">
        <Button 
          fullWidth 
          variant="success" 
          size="lg" 
          onClick={handleStartRide}
          loading={loadingAction === 'startRide'}
          disabled={!ride.stops?.length}
        >
          Start Ride
        </Button>
      </div>
    </div>
  );
}
