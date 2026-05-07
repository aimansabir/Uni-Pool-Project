import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRideExecution } from '../../context/RideExecutionContext';
import MapPanel from '../../components/ride/MapPanel';
import PassengerStopCard from '../../components/ride/PassengerStopCard';
import Button from '../../components/common/Button/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import Spinner from '../../components/common/Spinner/Spinner';
import '../DriverPassengerLayout.css';

export default function LiveNavigation() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { 
    ride, 
    arriveAtStop, 
    pickupPassenger, 
    markNoShow,
    dropOffPassenger, 
    loadingAction 
  } = useRideExecution();

  const [confirmEndJourney, setConfirmEndJourney] = useState(false);
  const [confirmNoShow, setConfirmNoShow] = useState(null);

  useEffect(() => {
    if (ride && ride.status !== 'IN_PROGRESS') {
      if (ride.status === 'PUBLISHED') navigate(`/driver/active-ride/${rideId}`, { replace: true });
      if (ride.status === 'COMPLETED') navigate('/profile', { replace: true });
    }
  }, [ride, navigate, rideId]);

  if (!ride) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;

  const handleArrive = async (stop) => {
    await arriveAtStop(stop.bookingRequestId);
  };

  const handlePickup = async (stop) => {
    // Attempt pickup. The backend will throw if plate is not verified.
    // The useRideExecutionActions will toast the error
    await pickupPassenger(stop.bookingRequestId);
  };

  const handleNoShow = async () => {
    if (confirmNoShow) {
      await markNoShow(confirmNoShow.bookingRequestId);
      setConfirmNoShow(null);
    }
  };

  const handleEndJourney = () => {
    // Navigate to settlement dashboard
    navigate(`/driver/active-ride/${rideId}/settlement`);
  };

  return (
    <div className="driver-page-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ height: '40vh', flexShrink: 0 }}>
        <MapPanel 
          driverLocation={{ lat: ride.currentLat, lng: ride.currentLng }} 
          waypoints={ride.stops || []} 
        />
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', paddingBottom: '90px', background: '#F8F9FA' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Pickup Waypoints</h3>
        <div className="waypoints-list">
          {ride.stops?.map((stop, i) => (
            <PassengerStopCard 
              key={stop.id || i}
              passengerName={stop.passenger?.fullName || `Passenger ${i+1}`}
              stopName={stop.stopName}
              status={stop.participantStatus}
              onArrive={() => handleArrive(stop)}
              onPickup={() => handlePickup(stop)}
              onNoShow={() => setConfirmNoShow(stop)}
              loadingAction={loadingAction !== null}
            />
          ))}
          {/* Note: In a full app, Drop-off stops would also be listed here or after pickups */}
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Button variant="outline" size="sm" onClick={() => {
              // Dummy logic to drop off everyone picked up for MVP demonstration
              const pickedUp = ride.stops?.filter(s => s.participantStatus === 'PICKED_UP');
              Promise.all(pickedUp.map(p => dropOffPassenger(p.bookingRequestId)));
            }}>Mark All Picked-up as Dropped Off</Button>
          </div>
        </div>
      </div>

      <div className="sticky-bottom" style={{ background: '#fff' }}>
        <Button fullWidth variant="primary" size="lg" onClick={() => setConfirmEndJourney(true)}>
          End Journey
        </Button>
      </div>

      <ConfirmDialog 
        isOpen={confirmEndJourney} 
        onClose={() => setConfirmEndJourney(false)}
        onConfirm={handleEndJourney}
        title="End Journey?"
        message="Are you sure you want to end navigation? You'll begin payment settlement."
        confirmText="Proceed to Settlement"
      />

      <ConfirmDialog 
        isOpen={!!confirmNoShow} 
        onClose={() => setConfirmNoShow(null)}
        onConfirm={handleNoShow}
        title="Mark No-Show?"
        message={`Are you sure you want to mark ${confirmNoShow?.passenger?.fullName || 'the passenger'} as a no-show?`}
        confirmText="Mark No Show"
      />
    </div>
  );
}
