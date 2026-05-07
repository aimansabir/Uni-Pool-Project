import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoImg from '../../assets/images/Logo.png';
import './SplashPage.css';

export default function SplashPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        navigate(isAuthenticated ? '/dashboard' : '/onboarding', { replace: true });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, navigate]);

  return (
    <div className="splash-page">
      <div className="splash-page__content">
        <img
          src={logoImg}
          alt="UniPool"
          className="splash-page__logo"
        />
        <p className="splash-page__tagline">Where campus meets convenience</p>
      </div>
    </div>
  );
}
