import './RideCards.css';

export default function DriverInfoCard({ driverName, rating, carMake, carColor, plateNumber }) {
  // Simple fallback avatar generating api
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=random`;

  return (
    <div className="ride-card driver-info-card">
      <div className="driver-avatar">
        <img src={avatarUrl} alt={driverName} />
      </div>
      <div className="driver-details">
        <h3>{driverName} (Driver)</h3>
        <p>⭐ {rating} Rating</p>
        <p>{carColor} {carMake} • {plateNumber}</p>
      </div>
    </div>
  );
}
