import './RideCards.css';

export default function VehiclePlateCard({ plateNumber }) {
  return (
    <div className="ride-card plate-card">
      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Verify this License Plate:</p>
      <div className="plate-number">{plateNumber || 'TBA'}</div>
    </div>
  );
}
