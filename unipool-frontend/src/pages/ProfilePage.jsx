import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge/Badge';
import Button from '../components/common/Button/Button';
import { useNavigate } from 'react-router-dom';
import './SharedPages.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="profile-page fade-in">
      <div className="profile-page__header">
        <div className="profile-page__avatar">
          {user?.fullName?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 className="profile-page__name">{user?.fullName || 'User'}</h2>
        <p className="profile-page__email">{user?.ibaEmail}</p>
        <div className="profile-page__badges">
          {user?.isVerified && <Badge variant="accent">Verified</Badge>}
          {user?.genderVerified && <Badge variant="primary">Gender Verified</Badge>}
        </div>
      </div>

      <div className="profile-page__card">
        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Gender</span>
          <span className="profile-page__info-value">{user?.gender || '—'}</span>
        </div>
        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Student ERP</span>
          <span className="profile-page__info-value">{user?.studentErp || '—'}</span>
        </div>
        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Phone</span>
          <span className="profile-page__info-value">{user?.phone || '—'}</span>
        </div>
        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Trust Score</span>
          <span className="profile-page__info-value font-bold text-primary">
            ⭐ {user?.trustScore?.toFixed(1) || '5.0'}
          </span>
        </div>
        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Role</span>
          <span className="profile-page__info-value">{user?.role || 'student'}</span>
        </div>
      </div>

      <div className="profile-page__actions">
        <Button variant="outline" fullWidth onClick={() => navigate('/vehicles')}>
          🚗 My Vehicles
        </Button>
        <Button variant="outline" fullWidth onClick={() => navigate('/rides')}>
          📋 My Rides
        </Button>
        <Button variant="danger" fullWidth onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
