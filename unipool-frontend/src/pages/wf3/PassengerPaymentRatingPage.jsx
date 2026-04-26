import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { paymentsApi } from '../../api/payments.api';
import { ratingsApi } from '../../api/ratings.api';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import Button from '../../components/common/Button/Button';
import {
  CheckCircle2,
  MapPin,
  User,
  Car,
  Clock,
  Star,
  Shield,
  AlertCircle,
  Banknote,
  Smartphone,
  CreditCard,
} from 'lucide-react';

import './PassengerPaymentRatingPage.css';

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: '💵' },
  { id: 'JAZZCASH', label: 'JazzCash', icon: '📱' },
  { id: 'OTHER', label: 'Other', icon: '💳' },
];

export default function PassengerPaymentRatingPage() {
  const { id: rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState(null);  // from getPaymentsDue
  const [tracking, setTracking] = useState(null);          // from trackRide
  const [paymentNotDue, setPaymentNotDue] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [safetyStars, setSafetyStars] = useState(0);
  const [punctualityStars, setPunctualityStars] = useState(0);
  const [comment, setComment] = useState('');

  /* ── Fetch ─────────────────────────────────────────────────────── */

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Fetch payment + tracking in parallel
        const [payRes, trackRes] = await Promise.all([
          paymentsApi.getRidePaymentsDue(rideId).catch(err => {
            if (err.response?.status === 404) return { data: null };
            throw err;
          }),
          rideExecutionApi.trackRide(rideId).catch(() => ({ data: null })),
        ]);

        setTracking(trackRes.data);

        if (!payRes.data || !payRes.data.payments || payRes.data.payments.length === 0) {
          setPaymentNotDue(true);
        } else {
          const myPayment = payRes.data.payments.find(p => p.passengerId === user?.id);
          if (!myPayment) {
            setPaymentNotDue(true);
          } else if (myPayment.paidAt) {
            // Already submitted payment
            setAlreadyDone(true);
            setPaymentData(myPayment);
          } else {
            setPaymentData(myPayment);
          }
        }
      } catch (err) {
        console.error('Error loading payment page:', err);
        showError(err.message || 'Failed to load payment data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [rideId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Submit ────────────────────────────────────────────────────── */

  const handleSubmit = async () => {
    if (!paymentMethod) { showError('Please select a payment method'); return; }
    if (safetyStars === 0) { showError('Please rate safety'); return; }
    if (punctualityStars === 0) { showError('Please rate punctuality'); return; }

    setSubmitting(true);
    try {
      // 1. Mark payment
      await paymentsApi.markPaymentPaid(paymentData.id, paymentMethod);

      // 2. Rate driver
      const bookingId = paymentData.bookingRequestId || paymentData.bookingRequest?.id;
      try {
        await ratingsApi.rateDriver({
          rideId,
          bookingRequestId: bookingId,
          punctualityStars,
          safetyStars,
          comment: comment.trim() || undefined,
        });
      } catch (ratingErr) {
        // If rating already exists, don't block the flow
        if (ratingErr.response?.status === 409 || ratingErr.message?.includes('already')) {
          console.warn('Rating already submitted');
        } else {
          throw ratingErr;
        }
      }

      showSuccess('Payment recorded & rating submitted!');
      setAlreadyDone(true);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ───────────────────────────────────────────────────── */

  if (loading) return <FullPageSpinner />;

  /* ── Derive display data ───────────────────────────────────────── */

  const driver = tracking?.driver || {};
  const vehicle = tracking?.vehicle || {};
  const amount = paymentData?.amount || 0;
  const pickup = paymentData?.bookingRequest?.pickupStopName || tracking?.startLocation || '—';
  const dropoff = paymentData?.bookingRequest?.dropoffStopName || tracking?.destinationLocation || '—';
  const vehicleLabel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const vehicleColor = vehicle.color || '';
  const plate = vehicle.registrationNumber || '';

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="ppr-page ppr-fade-in">
      <div className="ppr-container">

        {/* ── Success banner ───────────────────────────────────────── */}
        <div className="ppr-banner">
          <div className="ppr-banner-icon">
            <CheckCircle2 size={28} />
          </div>
          <h1>You have arrived!</h1>
          <p>We hope you enjoyed your ride.</p>
        </div>

        <div className="ppr-content">

          {/* ── Payment not due yet ────────────────────────────────── */}
          {paymentNotDue && (
            <div className="ppr-card">
              <div className="ppr-waiting">
                <div className="ppr-waiting-icon">
                  <Clock size={28} color="#f59e0b" />
                </div>
                <h3>Payment Not Due Yet</h3>
                <p>Payment will unlock after you are dropped off or the ride is completed.</p>
              </div>
              <button className="ppr-home-btn" onClick={() => navigate('/rides')}>
                Back to My Rides
              </button>
            </div>
          )}

          {/* ── Already done ───────────────────────────────────────── */}
          {alreadyDone && (
            <div className="ppr-card ppr-done-card">
              <div className="ppr-done-icon">
                <CheckCircle2 size={32} color="#10b981" />
              </div>
              <h3>All Done!</h3>
              <p>Your payment has been recorded and rating submitted. Thank you for riding with UniPool!</p>
              <button className="ppr-home-btn" onClick={() => navigate('/rides')}>
                Back to My Rides
              </button>
            </div>
          )}

          {/* ── Active form ────────────────────────────────────────── */}
          {!paymentNotDue && !alreadyDone && paymentData && (
            <>
              {/* Payment due card */}
              <div className="ppr-card">
                <h4 className="ppr-card-title">Payment Due</h4>
                <p className="ppr-amount">
                  Rs {amount} <span>/ seat</span>
                </p>

                <div className="ppr-detail-row">
                  <div className="ppr-detail-icon"><MapPin size={16} color="#10b981" /></div>
                  <div>
                    <div className="ppr-detail-label">Pickup</div>
                    <div className="ppr-detail-value">{pickup}</div>
                  </div>
                </div>

                <div className="ppr-detail-row">
                  <div className="ppr-detail-icon"><MapPin size={16} color="#ef4444" /></div>
                  <div>
                    <div className="ppr-detail-label">Drop-off</div>
                    <div className="ppr-detail-value">{dropoff}</div>
                  </div>
                </div>

                <div className="ppr-detail-row">
                  <div className="ppr-detail-icon"><User size={16} /></div>
                  <div>
                    <div className="ppr-detail-label">Driver</div>
                    <div className="ppr-detail-value">{driver.fullName || 'Driver'}</div>
                  </div>
                </div>

                {vehicleLabel && (
                  <div className="ppr-detail-row">
                    <div className="ppr-detail-icon"><Car size={16} /></div>
                    <div>
                      <div className="ppr-detail-label">Vehicle</div>
                      <div className="ppr-detail-value">{vehicleLabel} {vehicleColor} {plate && `• ${plate}`}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="ppr-card">
                <h4 className="ppr-card-title">Payment Method</h4>
                <div className="ppr-methods">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.id}
                      className={`ppr-method-btn ${paymentMethod === m.id ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(m.id)}
                    >
                      <span className="ppr-method-icon">{m.icon}</span>
                      <span className="ppr-method-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ratings */}
              <div className="ppr-card">
                <h4 className="ppr-card-title">Rate Your Driver</h4>

                {/* Safety */}
                <div className="ppr-rating-header">
                  <Shield size={18} color="#6366f1" />
                  <span className="ppr-rating-label">Safety</span>
                </div>
                <div className="ppr-stars">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`ppr-star ${safetyStars >= n ? 'filled' : ''}`}
                      onClick={() => setSafetyStars(n)}
                    >
                      <Star size={20} fill={safetyStars >= n ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>

                <div style={{ height: '16px' }} />

                {/* Punctuality */}
                <div className="ppr-rating-header">
                  <Clock size={18} color="#10b981" />
                  <span className="ppr-rating-label">Punctuality</span>
                </div>
                <div className="ppr-stars">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`ppr-star ${punctualityStars >= n ? 'filled' : ''}`}
                      onClick={() => setPunctualityStars(n)}
                    >
                      <Star size={20} fill={punctualityStars >= n ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="ppr-card">
                <h4 className="ppr-card-title">Comment (Optional)</h4>
                <textarea
                  className="ppr-comment"
                  placeholder="Share your experience…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Submit */}
              <button
                className="ppr-submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Payment & Rating'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
