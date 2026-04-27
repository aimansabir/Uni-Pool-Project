import Button from '../common/Button/Button';
import Badge from '../common/Badge/Badge';
import './RideCards.css';

export default function PaymentStatusCard({ 
  passengerName, 
  amount, 
  status, 
  paymentMethod, 
  onConfirm, 
  loadingAction 
}) {
  const isPaid = status === 'PAID';
  const isPendingConfirmation = paymentMethod && !isPaid;

  return (
    <div className="ride-card payment-card">
      <div className="payment-card__header">
        <div>
          <h4 style={{ margin: '0 0 4px' }}>{passengerName}</h4>
          <Badge variant={isPaid ? 'success' : isPendingConfirmation ? 'warning' : 'default'}>
            {status}
          </Badge>
        </div>
        <div className="payment-card__amount">Rs. {amount}</div>
      </div>
      
      {paymentMethod && (
        <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px' }}>
          Method: <strong>{paymentMethod}</strong>
        </p>
      )}

      {!isPaid && (
        <Button 
          fullWidth 
          disabled={!isPendingConfirmation || loadingAction} 
          onClick={onConfirm}
          variant="primary"
        >
          {isPendingConfirmation ? 'Confirm Payment Received' : 'Waiting for passenger...'}
        </Button>
      )}
    </div>
  );
}
