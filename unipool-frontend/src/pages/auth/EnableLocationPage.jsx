import { useNavigate, useLocation } from 'react-router-dom';
import { useLocation as useGeoLocation } from '../../context/LocationContext';
import { useToast } from '../../context/ToastContext';
import illustration from '../../assets/images/location_illustration.png';
import './EnableLocationPage.css';

export default function EnableLocationPage() {
  const navigate = useNavigate();
  const reactLocation = useLocation();
  const { requestLocation } = useGeoLocation();
  const { showError } = useToast();

  // Where to go after location is handled
  const from = reactLocation.state?.from || '/dashboard';

  const handleEnable = async () => {
    try {
      await requestLocation();
      navigate(from, { replace: true });
    } catch (err) {
      showError(err || 'Please enable location to proceed');
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('unipool_location_skipped', 'true');
    navigate(from, { replace: true });
  };

  return (
    <div className="enable-location-page fade-in">
      <div className="enable-location-page__top">
        <div className="enable-location-page__illustration-container">
          <div className="enable-location-page__circle-bg">
            <div className="enable-location-page__circle-dashed" />
          </div>
          <img
            src={illustration}
            alt="Enable Location"
            className="enable-location-page__illustration"
          />
        </div>
      </div>

      <div className="enable-location-page__body">
        <h1 className="enable-location-page__title">Enable Location</h1>
        <p className="enable-location-page__subtitle">
          To continue, please allow access to your location.
        </p>

        <div className="enable-location-page__actions">
          <button 
            className="enable-location-page__btn" 
            onClick={handleEnable}
          >
            Use current location
          </button>
          <p className="enable-location-page__reassurance">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Used only to help find nearby rides.
          </p>
        </div>

        <button 
          className="enable-location-page__skip" 
          onClick={handleSkip}
        >
          Skip for now
        </button>
      </div>


    </div>
  );
}
