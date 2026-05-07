import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button/Button';
import '../DriverPassengerLayout.css';

export default function ReviewComplete() {
  const navigate = useNavigate();

  return (
    <div className="passenger-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eafaf1', color: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '24px' }}>
        ✓
      </div>
      
      <h2 style={{ fontSize: '28px', margin: '0 0 16px 0' }}>Thank You!</h2>
      <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '40px' }}>
        Your payment has been recorded and your feedback was submitted successfully.<br/>
        Trust scores help keep the UniPool community safe.
      </p>

      <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/profile', { replace: true })}>
        Return to Dashboard
      </Button>
    </div>
  );
}
