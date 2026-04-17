import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validateLoginForm, hasErrors } from '../../utils/validators';
import unipoolTop from '../../assets/images/Unipool Top.png';
import './AuthPages.css';

export default function LoginPage() {
  const [form, setForm] = useState({ ibaEmail: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateLoginForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await login(form);
      showSuccess('Welcome back!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showError(err.message);
      if (err.message?.toLowerCase().includes('password')) {
        setErrors({ password: err.message });
      } else {
        setErrors({ ibaEmail: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      {/* Logo */}
      <div className="auth-page__top-logo">
        <img src={unipoolTop} alt="Unipool" className="auth-page__top-logo-img" />
      </div>

      <div className="auth-page__body">
        <h1 className="auth-page__title">Login</h1>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          {/* Email */}
          <div className="auth-input">
            <div className="auth-input__wrapper">
              <span className="auth-input__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></svg>
              </span>
              <input
                type="email"
                name="ibaEmail"
                placeholder="Email"
                value={form.ibaEmail}
                onChange={handleChange}
                className={`auth-input__field ${errors.ibaEmail ? 'auth-input__field--error' : ''}`}
              />
            </div>
            {errors.ibaEmail && <span className="auth-input__error">{errors.ibaEmail}</span>}
          </div>

          {/* Password */}
          <div className="auth-input">
            <div className="auth-input__wrapper">
              <span className="auth-input__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className={`auth-input__field ${errors.password ? 'auth-input__field--error' : ''}`}
              />
              <button
                type="button"
                className="auth-input__toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <span className="auth-input__error">{errors.password}</span>}
          </div>

          {/* Forgot Password */}
          <div className="auth-page__forgot">
            <button type="button" className="auth-page__link-btn">Forgot Password?</button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="auth-page__submit-btn"
            disabled={loading}
          >
            {loading ? <span className="auth-page__spinner" /> : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <p className="auth-page__footer-text">
          Don't you have an account? <Link to="/register" className="auth-page__link">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
