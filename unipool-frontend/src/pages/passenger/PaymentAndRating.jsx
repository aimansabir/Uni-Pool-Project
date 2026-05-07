import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../../api/client';
import useRideExecutionActions from '../../hooks/useRideExecutionActions';
import RatingStars from '../../components/ride/RatingStars';
import Button from '../../components/common/Button/Button';
import Spinner from '../../components/common/Spinner/Spinner';
import '../DriverPassengerLayout.css';

export default function PaymentAndRating() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [safetyScore, setSafetyScore] = useState(0);
  const [punctualityScore, setPunctualityScore] = useState(0);

  const { markPaid, submitRating, loadingAction } = useRideExecutionActions();

  useEffect(() => {
    client.get(`/api/ride-execution/bookings/${bookingId}/status`)
      .then(res => setBooking(res.data))
      .catch(() => setBooking({ rideId: 'mock-ride-id', participantStatus: 'DROPPED_OFF' }))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    // If dropped off, fetch what payment is due
    if (booking?.rideId) {
      client.get(`/api/payments/rides/${booking.rideId}/due`)
        .then(res => {
           // As a passenger, the backend returns ONLY their payment
           const myPayment = res.data?.payments?.[0];
           setPayment(myPayment || { id: 'mock-payment-id', amount: 300 });
        })
        .catch(console.error);
    }
  }, [booking]);

  useEffect(() => {
    if (booking?.participantStatus === 'COMPLETED_REVIEW') {
      navigate(`/passenger/review-complete/${bookingId}`, { replace: true });
    }
  }, [booking, navigate, bookingId]);

  if (loading || !booking || !payment) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;
  }

  const handleSubmit = async () => {
    if (!safetyScore || !punctualityScore) {
      return alert("Please provide both safety and punctuality ratings before submitting.");
    }

    try {
      // 1. Mark as Paid
      await markPaid(payment.id, paymentMethod);
      
      // 2. Submit Rating
      await submitRating(false, {
        rideId: booking.rideId,
        targetUserId: payment.driverId || 'mock-driver-id',
        safetyScore,
        punctualityScore,
        reviewText: 'Great ride!'
      });

      // 3. Navigate to success
      navigate(`/passenger/review-complete/${bookingId}`, { replace: true });
    } catch(err) {
      console.error(err);
    }
  };

  const isSubmitting = loadingAction === 'markPaid' || loadingAction === 'submitRating';

  return (
    <div className="passenger-page-container">
      <div className="ride-summary-card" style={{ background: '#f7a93b', color: 'white', textAlign: 'center', border: 'none' }}>
        <h2 style={{ color: 'white', margin: '0 0 8px' }}>You have arrived!</h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>We hope you enjoyed your ride this morning.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>Payment Due</h3>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>RS {payment.amount}</span>
      </div>

      <div className="payment-method-selector" style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Select Method</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['CASH', 'JAZZCASH', 'OTHER'].map(method => (
            <button 
              key={method}
              onClick={() => setPaymentMethod(method)}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid',
                borderColor: paymentMethod === method ? '#E8941F' : '#eee',
                background: paymentMethod === method ? '#fffaf0' : '#fff',
                color: paymentMethod === method ? '#E8941F' : '#333',
                cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      <div className="ride-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <h4 style={{ margin: '0 0 8px' }}>Rate Safety</h4>
        <RatingStars value={safetyScore} onChange={setSafetyScore} />
      </div>

      <div className="ride-card" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <h4 style={{ margin: '0 0 8px' }}>Rate Punctuality</h4>
        <RatingStars value={punctualityScore} onChange={setPunctualityScore} />
      </div>

      <div className="bottom-actions sticky-bottom">
        <Button 
          fullWidth 
          variant="primary" 
          size="lg" 
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!safetyScore || !punctualityScore}
        >
          Submit Payment & Rating
        </Button>
      </div>
    </div>
  );
}
