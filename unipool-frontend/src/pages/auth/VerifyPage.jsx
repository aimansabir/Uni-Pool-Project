import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import unipoolTop from '../../assets/images/Unipool Top.png';
import roadBg from '../../assets/images/road.png';
import { authApi } from '../../api/auth.api';
import { useToast } from '../../context/ToastContext';
import './AuthPages.css';

export default function VerifyPage() {
  const [code, setCode] = useState(['', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const email = location.state?.email || '';

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleInput = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next
    if (value && index < 4) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = code.join('');
    if (otpString.length < 5) return;

    try {
      await authApi.verify({ ibaEmail: email, code: otpString });
      showSuccess('Email verified successfully! Please login.');
      navigate('/login', { replace: true });
    } catch (err) {
      showError(err.message || 'Verification failed');
      // Reset code on error
      setCode(['', '', '', '', '']);
      inputsRef.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await authApi.resendOtp({ ibaEmail: email });
      showSuccess('A new verification code has been sent.');
      setCountdown(60);
    } catch (err) {
      showError(err.message || 'Failed to resend code');
    }
  };

  // Auto-skip: If all 4 digits entered, auto-verify
  useEffect(() => {
    if (code.every((d) => d !== '')) {
      const timer = setTimeout(handleVerify, 800);
      return () => clearTimeout(timer);
    }
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="auth-page fade-in">
      <div className="auth-page__top-logo">
        <button 
          className="auth-page__back-btn" 
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <img src={unipoolTop} alt="Unipool" className="auth-page__top-logo-img" />
      </div>

      <div className="auth-page__body verify-body">
        
        <h1 className="verify-title">
          VERIFY YOUR CODE
        </h1>

        <div className="verify-middle-section">
          {/* Strong Road Graphic natively backing the middle zone */}
          <div className="verify-road-bg">
            <img src={roadBg} alt="Road Background" className="verify-road-img" />
          </div>

          <div className="verify-instruction-card">
            <p className="verify-subtitle">
              Enter the code sent on your email ending<br />
              with <strong>{email.length > 6 ? '••••' + email.slice(-15) : email}</strong>
            </p>
          </div>

          <div className="otp-group verify-otp-group">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`otp-input ${digit ? 'otp-input--filled' : ''}`}
                autoFocus={i === 0}
              />
            ))}
          </div>
        </div>

        <div className="verify-bottom-panel">
          <button
            className="auth-page__submit-btn"
            onClick={handleVerify}
          >
            Verify
          </button>

          <p className="verify-resend">
            {countdown > 0 ? (
              <>Resend code in <strong style={{ color: 'var(--color-primary)' }}>00:{countdown.toString().padStart(2, '0')}</strong></>
            ) : (
              <button className="auth-page__link-btn" onClick={handleResend}>
                Resend Code
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
