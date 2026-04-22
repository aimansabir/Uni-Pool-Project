import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button/Button';
import './SharedPages.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <div className="not-found-page fade-in">
        <span className="not-found-page__icon">🗺️</span>
        <h1 className="not-found-page__title">404</h1>
        <p className="not-found-page__desc">
          This page doesn't exist. Maybe the ride already left?
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}
