import { useNavigate } from 'react-router-dom';
import './AuthPages.css';

export default function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page role-select fade-in">
      <div className="role-select__header">
        <button 
          className="auth-page__back-btn" 
          style={{ top: 'var(--space-3xl)', background: 'rgba(255,255,255,0.2)', color: 'white' }}
          onClick={() => navigate('/dashboard')}
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="role-select__title">WHO ARE YOU<br />TODAY?</h1>
      </div>

      <div className="role-select__options">
        <button
          className="role-card role-card--driver"
          onClick={() => navigate('/rides/publish')}
        >
          <div className="role-card__illustration">
            <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
              <rect x="10" y="20" width="60" height="25" rx="8" fill="#F3A32D" opacity="0.85"/>
              <rect x="18" y="10" width="44" height="20" rx="6" fill="#F3A32D"/>
              <circle cx="24" cy="48" r="6" fill="#333" stroke="#666" strokeWidth="2"/>
              <circle cx="56" cy="48" r="6" fill="#333" stroke="#666" strokeWidth="2"/>
              <rect x="24" y="16" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
              <rect x="44" y="16" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
              <circle cx="60" cy="28" r="3" fill="#fff" opacity="0.8"/>
            </svg>
          </div>
          <span className="role-card__label">DRIVER</span>
          <span className="role-card__desc">Offer a ride & split costs</span>
        </button>

        <button
          className="role-card role-card--passenger"
          onClick={() => navigate('/search')}
        >
          <div className="role-card__illustration">
            <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
              <rect x="10" y="20" width="60" height="25" rx="8" fill="#3498DB" opacity="0.75"/>
              <rect x="18" y="10" width="44" height="20" rx="6" fill="#2980B9"/>
              <circle cx="24" cy="48" r="6" fill="#333" stroke="#666" strokeWidth="2"/>
              <circle cx="56" cy="48" r="6" fill="#333" stroke="#666" strokeWidth="2"/>
              <rect x="24" y="16" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
              <rect x="44" y="16" width="12" height="10" rx="2" fill="#87CEEB" opacity="0.7"/>
              <circle cx="40" cy="6" r="5" fill="#3498DB"/>
              <path d="M37 0 L40 4 L43 0" fill="none" stroke="#2980B9" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="role-card__label">PASSENGER</span>
          <span className="role-card__desc">Find a ride & save money</span>
        </button>
      </div>
    </div>
  );
}
