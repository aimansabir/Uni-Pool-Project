import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import unipoolTop from '../../assets/images/Unipool Top.png';
import './AuthPages.css';

export default function VerifyPage() {
  const [code, setCode] = useState(['', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your email';

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
    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    // Backend doesn't support OTP — treat as auto-verified
    navigate('/login', { replace: true });
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
        <img src={unipoolTop} alt="Unipool" className="auth-page__top-logo-img" />
      </div>

      <div className="auth-page__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <h1 className="auth-page__title" style={{ fontSize: '1.4rem', letterSpacing: '1px' }}>
          VERIFY YOUR CODE
        </h1>
        <p className="auth-page__subtitle" style={{ marginTop: '8px' }}>
          Enter the code sent on your email ending with<br />
          <strong style={{ color: 'var(--color-text)' }}>{email.length > 6 ? '••••' + email.slice(-15) : email}</strong>
        </p>

        <div className="otp-group">
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

        <button
          className="auth-page__submit-btn"
          onClick={handleVerify}
          style={{ marginTop: '32px' }}
        >
          Verify
        </button>

        <p className="auth-page__footer-text" style={{ marginTop: '24px' }}>
          {countdown > 0 ? (
            <>Resend code in <strong>{countdown}s</strong></>
          ) : (
            <button className="auth-page__link-btn" onClick={() => setCountdown(30)}>
              Resend Code
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
