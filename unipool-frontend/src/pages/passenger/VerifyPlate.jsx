import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';
import useRideTracking from '../../hooks/useRideTracking';
import useRideExecutionActions from '../../hooks/useRideExecutionActions';
import VehiclePlateCard from '../../components/ride/VehiclePlateCard';
import Button from '../../components/common/Button/Button';
import Spinner from '../../components/common/Spinner/Spinner';
import '../DriverPassengerLayout.css';

export default function VerifyPlate() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const { verifyPlate, loadingAction } = useRideExecutionActions();

  useEffect(() => {
    client.get(`/api/ride-execution/bookings/${bookingId}/status`)
      .then(res => setBooking(res.data))
      .catch(() => setBooking({ rideId: 'mock-ride-id', participantStatus: 'ACCEPTED', plateVerified: false }))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const { trackingData } = useRideTracking(booking?.rideId);

  useEffect(() => {
    // Strict redirect: If picked up or verified already, leave this screen
    if (booking && trackingData) {
      const myStop = trackingData.stops?.find(s => s.bookingRequestId === bookingId) || booking;
      if (myStop.participantStatus === 'PICKED_UP' || myStop.participantStatus === 'DROPPED_OFF') {
        navigate(`/passenger/track/${bookingId}`, { replace: true });
      }
    }
  }, [booking, trackingData, navigate, bookingId]);

  if (loading || !booking || !trackingData) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;
  }

  const handleVerify = async () => {
    try {
      await verifyPlate(bookingId);
      // Backend status will update, polling will catch it, but we optimistically navigate back to tracking view
      navigate(`/passenger/track/${bookingId}`, { replace: true });
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="passenger-page-container">
      <div className="header-nav" style={{ justifyContent: 'center', marginBottom: '40px' }}>
        <h2>Driver Arrived</h2>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.5' }}>
          For your safety, please verify the vehicle's license plate matches the one registered in the app before boarding.
        </p>
      </div>

      <VehiclePlateCard plateNumber={trackingData?.vehicle?.registrationNumber || 'ABC-123'} />

      <div className="bottom-actions sticky-bottom" style={{ flexDirection: 'column' }}>
        <Button 
          fullWidth 
          variant="success" 
          size="lg" 
          loading={loadingAction === 'verifyPlate'}
          onClick={handleVerify}
        >
          Verify Plate & Board
        </Button>
        <Button 
          fullWidth 
          variant="ghost" 
          onClick={() => navigate(`/passenger/track/${bookingId}`)}
        >
          I'll verify later
        </Button>
      </div>
    </div>
  );
}
