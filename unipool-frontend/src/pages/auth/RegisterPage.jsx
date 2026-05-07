import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validateRegisterForm, hasErrors } from '../../utils/validators';
import unipoolTop from '../../assets/images/Unipool Top.png';
import './AuthPages.css';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    ibaEmail: '',
    phone: '',
    password: '',
    confirmPassword: '',
    studentErp: '',
    gender: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'fullName') {
      // Remove numbers and capitalize first letter of each word
      formattedValue = value.replace(/[0-9]/g, '');
      formattedValue = formattedValue.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }

    if (name === 'studentErp') {
      // Numbers only, max 5 digits
      formattedValue = value.replace(/\D/g, '').slice(0, 5);
    }

    if (name === 'phone') {
      // Digits only, max 10 (user types local number after +92 prefix)
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setForm({ ...form, [name]: formattedValue });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRegisterForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await register(form);
      showSuccess('Account created successfully!');
      navigate('/verify', { state: { email: form.ibaEmail } });
    } catch (err) {
      showError(err.message);
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('email')) {
        setErrors({ ibaEmail: err.message });
      } else if (msg.includes('erp')) {
        setErrors({ studentErp: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      {/* Logo */}
      <div className="auth-page__top-logo auth-page__top-logo--compact">
        <button 
          className="auth-page__back-btn" 
          style={{ top: 'var(--space-lg)' }}
          onClick={() => navigate('/onboarding')}
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <img src={unipoolTop} alt="Unipool" className="auth-page__top-logo-img" />
      </div>

      <div className="auth-page__body">
        <div className="auth-page__content">
          <h1 className="auth-page__title">Create Account</h1>
          <p className="auth-page__subtitle">Join the community</p>

          <form className="auth-page__form" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="auth-input">
              <div className="auth-input__wrapper">
                <span className="auth-input__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={handleChange}
                  className={`auth-input__field ${errors.fullName ? 'auth-input__field--error' : ''}`}
                />
              </div>
              {errors.fullName && <span className="auth-input__error">{errors.fullName}</span>}
            </div>

            {/* Email */}
            <div className="auth-input">
              <div className="auth-input__wrapper">
                <span className="auth-input__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></svg>
                </span>
                <input
                  type="email"
                  name="ibaEmail"
                  placeholder="IBA Email"
                  value={form.ibaEmail}
                  onChange={handleChange}
                  className={`auth-input__field ${errors.ibaEmail ? 'auth-input__field--error' : ''}`}
                />
              </div>
              {errors.ibaEmail && <span className="auth-input__error">{errors.ibaEmail}</span>}
            </div>

            {/* Phone */}
            <div className="auth-input">
              <div className="auth-input__wrapper">
                <span className="auth-input__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </span>
                <span className="auth-input__prefix">+92</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="3XXXXXXXXX"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={10}
                  className={`auth-input__field auth-input__field--with-prefix ${errors.phone ? 'auth-input__field--error' : ''}`}
                />
              </div>
              {errors.phone && <span className="auth-input__error">{errors.phone}</span>}
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8">
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

            {/* Retype Password */}
            <div className="auth-input">
              <div className="auth-input__wrapper">
                <span className="auth-input__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Retype Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`auth-input__field ${errors.confirmPassword ? 'auth-input__field--error' : ''}`}
                />
              </div>
              {errors.confirmPassword && <span className="auth-input__error">{errors.confirmPassword}</span>}
            </div>

            {/* Student ERP */}
            <div className="auth-input">
              <div className="auth-input__wrapper">
                <span className="auth-input__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                </span>
                <input
                  type="text"
                  name="studentErp"
                  placeholder="Student ERP"
                  value={form.studentErp}
                  onChange={handleChange}
                  className={`auth-input__field ${errors.studentErp ? 'auth-input__field--error' : ''}`}
                />
              </div>
              {errors.studentErp && <span className="auth-input__error">{errors.studentErp}</span>}
            </div>

            {/* Gender */}
            <div className="auth-gender">
              <span className="auth-gender__label">Gender</span>
              <div className="auth-gender__options">
                <label className={`auth-gender__option ${form.gender === 'male' ? 'auth-gender__option--selected' : ''}`}>
                  <input type="radio" name="gender" value="male" checked={form.gender === 'male'} onChange={handleChange} />
                  <span>♂ Male</span>
                </label>
                <label className={`auth-gender__option ${form.gender === 'female' ? 'auth-gender__option--selected' : ''}`}>
                  <input type="radio" name="gender" value="female" checked={form.gender === 'female'} onChange={handleChange} />
                  <span>♀ Female</span>
                </label>
              </div>
              {errors.gender && <span className="auth-input__error">{errors.gender}</span>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="auth-page__submit-btn"
              disabled={loading}
            >
              {loading ? <span className="auth-page__spinner" /> : 'Sign up'}
            </button>
          </form>
        </div>

        <p className="auth-page__footer-text">
          Already have an account? <Link to="/login" className="auth-page__link">Sign In</Link>
        </p>
      </div>

    </div>
  );
}
