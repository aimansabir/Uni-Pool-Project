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
        <h1 className="enable-location-page__title">Enable your Location</h1>
        <p className="enable-location-page__subtitle">
          To proceed further <br />
          We want to know your location
        </p>

        <button 
          className="enable-location-page__btn" 
          onClick={handleEnable}
        >
          Use current location
        </button>

        <button 
          className="enable-location-page__skip" 
          onClick={handleSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
