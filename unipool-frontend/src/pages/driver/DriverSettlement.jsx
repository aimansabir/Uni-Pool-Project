import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRideExecution } from '../../context/RideExecutionContext';
import PaymentStatusCard from '../../components/ride/PaymentStatusCard';
import Button from '../../components/common/Button/Button';
import Spinner from '../../components/common/Spinner/Spinner';
import '../DriverPassengerLayout.css';

export default function DriverSettlement() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { ride, getPaymentsDue, confirmPayment, loadingAction } = useRideExecution();
  
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Source of Truth strict rediction
  useEffect(() => {
    if (ride) {
      if (ride.status === 'PUBLISHED') navigate(`/driver/active-ride/${rideId}`, { replace: true });
      if (ride.status === 'COMPLETED') navigate(`/driver/active-ride/${rideId}/reviews`, { replace: true });
      
      const hasDroppedOff = ride.stops?.some(s => s.participantStatus === 'DROPPED_OFF');
      if (ride.status === 'IN_PROGRESS' && !hasDroppedOff) {
        navigate(`/driver/active-ride/${rideId}/navigation`, { replace: true });
      }
    }
  }, [ride, navigate, rideId]);

  const fetchPayments = useCallback(async () => {
    try {
      const resp = await getPaymentsDue(rideId);
      setPayments(resp.data?.payments || []);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getPaymentsDue, rideId]);

  useEffect(() => {
    fetchPayments();
    // Poll payments periodically as passengers submit payment methods
    const interval = setInterval(fetchPayments, 3000);
    return () => clearInterval(interval);
  }, [fetchPayments]);

  const handleConfirm = async (paymentId) => {
    await confirmPayment(paymentId);
    fetchPayments(); // Refresh list immediately
  };

  if (!ride || loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>;

  const allPaid = payments.length > 0 && payments.every(p => p.status === 'PAID');

  return (
    <div className="driver-page-container">
      <div className="header-nav">
        <h2>Payment Settlements</h2>
      </div>

      <p style={{ color: '#666', marginBottom: '24px' }}>
        Confirm payments from your dropped-off passengers. No-Show passengers have been excluded.
      </p>

      <div className="payments-list">
        {payments.map(payment => (
          <PaymentStatusCard 
            key={payment.id}
            passengerName={payment.passenger?.fullName || 'Passenger'}
            amount={payment.amount}
            status={payment.status}
            paymentMethod={payment.paymentMethod}
            onConfirm={() => handleConfirm(payment.id)}
            loadingAction={loadingAction !== null}
          />
        ))}
        {payments.length === 0 && (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '16px' }}>
            <p>No payments due currently.</p>
          </div>
        )}
      </div>

      <div className="bottom-actions sticky-bottom">
        <Button 
          fullWidth 
          variant="primary" 
          size="lg" 
          disabled={payments.length > 0 && !allPaid}
          onClick={() => navigate(`/driver/active-ride/${rideId}/reviews`)}
        >
          {allPaid || payments.length === 0 ? 'Continue to Ratings' : 'Waiting for All Payments'}
        </Button>
      </div>
    </div>
  );
}
