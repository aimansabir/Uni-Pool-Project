import Button from '../common/Button/Button';
import Badge from '../common/Badge/Badge';
import './RideCards.css';

export default function PassengerStopCard({ 
  passengerName, 
  stopName, 
  status, 
  onArrive, 
  onPickup, 
  onNoShow,
  loadingAction 
}) {
  const isArrived = status === 'ARRIVED_AT_STOP';
  const isPickedUp = status === 'PICKED_UP';
  const isNoShow = status === 'NO_SHOW';
  
  return (
    <div className={`ride-card stop-card ${isPickedUp || isNoShow ? 'completed' : ''}`}>
      <div className="stop-card__info">
        <div className="stop-card__header">
          <h4>{passengerName}</h4>
          <Badge variant={isPickedUp ? 'success' : isNoShow ? 'danger' : 'default'}>
            {status}
          </Badge>
        </div>
        <p className="stop-card__address">{stopName}</p>
      </div>
      
      {!isPickedUp && !isNoShow && (
        <div className="stop-card__actions">
          {!isArrived && (
            <Button size="sm" onClick={onArrive} disabled={loadingAction} variant="primary">
              Arrive
            </Button>
          )}
          {isArrived && (
            <>
              <Button size="sm" onClick={onPickup} disabled={loadingAction} variant="success">
                Picked Up
              </Button>
              <Button size="sm" onClick={onNoShow} disabled={loadingAction} variant="danger">
                No Show
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
