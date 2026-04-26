import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { paymentsApi } from '../../api/payments.api';
import { ratingsApi } from '../../api/ratings.api';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import { CheckCircle2, Star, UserCheck, ShieldAlert } from 'lucide-react';

import './DriverRateMembersPage.css';

export default function DriverRateMembersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [givenRatings, setGivenRatings] = useState([]);

  // Form states per bookingId
  const [ratingsState, setRatingsState] = useState({});
  const [commentsState, setCommentsState] = useState({});
  const [submittingMap, setSubmittingMap] = useState({});
  const [confirmingPaymentMap, setConfirmingPaymentMap] = useState({});

  useEffect(() => {
    fetchData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const [trackRes, payRes, ratingRes] = await Promise.all([
        rideExecutionApi.trackRide(id).catch(() => ({ data: null })),
        paymentsApi.getRidePaymentsDue(id).catch(() => ({ data: { payments: [] } })),
        ratingsApi.listRatings({ rideId: id, ratingType: 'DRIVER_TO_PASSENGER', as: 'given' }).catch(() => ({ data: [] }))
      ]);

      setTracking(trackRes.data);
      setPayments(payRes.data?.payments || []);
      setGivenRatings(ratingRes.data?.ratings || []);
    } catch (err) {
      console.error('Error loading rate members data:', err);
      showError('Failed to load members data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (paymentId) => {
    setConfirmingPaymentMap(prev => ({ ...prev, [paymentId]: true }));
    try {
      await paymentsApi.confirmPayment(paymentId);
      showSuccess('Payment confirmed successfully!');
      await fetchData(); // Refresh data
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to confirm payment');
    } finally {
      setConfirmingPaymentMap(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  const handleSubmitReview = async (bookingId, passengerId) => {
    const stars = ratingsState[bookingId] || 0;
    if (stars === 0) {
      showError('Please select a star rating first');
      return;
    }

    setSubmittingMap(prev => ({ ...prev, [bookingId]: true }));
    try {
      await ratingsApi.ratePassenger({
        rideId: id,
        bookingRequestId: bookingId,
        behaviorStars: stars,
        comment: commentsState[bookingId]?.trim() || undefined,
      });
      showSuccess('Review submitted!');
      await fetchData();
    } catch (err) {
      if (err.response?.status === 409 || err.message?.includes('already')) {
        showSuccess('Review already submitted');
        await fetchData();
      } else {
        showError(err.response?.data?.message || err.message || 'Failed to submit review');
      }
    } finally {
      setSubmittingMap(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleCompleteRide = async () => {
    if (tracking?.status === 'IN_PROGRESS') {
      try {
        await rideExecutionApi.completeRide(id);
        navigate('/');
      } catch (err) {
        showError(err.message || 'Failed to complete ride');
      }
    } else {
      navigate('/');
    }
  };

  if (loading) return <FullPageSpinner />;

  if (!tracking) return (
    <div className="drm-page">
      <div className="drm-container" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>Ride Not Found</h2>
        <button className="drm-finish-btn" onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    </div>
  );

  const bookings = tracking.bookingRequests || [];

  return (
    <div className="drm-page drm-fade-in">
      <div className="drm-container">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="drm-header">
          <div className="drm-header-icon">
            <UserCheck size={28} />
          </div>
          <h1>Rate Members</h1>
          <p>Confirm payments and rate your passengers.</p>
        </div>

        <div className="drm-content">
          {bookings.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No passengers for this ride.</p>
          ) : (
            bookings.map((booking) => {
              const pax = booking.passenger || {};
              const participantStatus = booking.participantStatus;
              const isNoShow = participantStatus === 'NO_SHOW';
              const isDroppedOff = participantStatus === 'DROPPED_OFF';
              
              // Find payment for this booking
              const payment = payments.find(p => p.bookingRequest?.id === booking.id || p.passengerId === pax.id);
              const paymentMethod = payment?.paymentMethod;
              const isPaid = payment?.status === 'PAID';
              const isWaived = payment?.status === 'WAIVED';

              // Find if already rated
              const existingRating = givenRatings.find(r => r.bookingRequestId === booking.id);

              return (
                <div key={booking.id} className="drm-card">
                  <div className="drm-card-header">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(pax.fullName || 'P')}&background=random&size=100`}
                      alt="Avatar"
                      className="drm-avatar"
                    />
                    <div className="drm-passenger-meta">
                      <h3 className="drm-passenger-name">{pax.fullName || 'Passenger'}</h3>
                      {isNoShow ? (
                        <span className="drm-badge noshow">No-show</span>
                      ) : isPaid ? (
                        <span className="drm-badge paid">Paid</span>
                      ) : isWaived ? (
                        <span className="drm-badge paid">Payment Waived</span>
                      ) : isDroppedOff ? (
                        <span className="drm-badge dropped">Dropped Off</span>
                      ) : (
                        <span className="drm-badge pending">Pending</span>
                      )}
                    </div>
                  </div>

                  {isNoShow ? (
                    <div className="drm-noshow-view">
                      <ShieldAlert size={24} color="#991b1b" style={{ margin: '0 auto 8px' }} />
                      <p>Passenger was a no-show. Payment waived / no settlement required.</p>
                    </div>
                  ) : (
                    <>
                      {/* ── Payment Confirm ───────────────────────── */}
                      {payment && !isPaid && !isWaived && (
                        <div className="drm-payment-section">
                          <div className="drm-payment-row">
                            <span className="drm-payment-label">Payment Method:</span>
                            <span className="drm-payment-value">{paymentMethod || 'Waiting for passenger...'}</span>
                          </div>
                          <div className="drm-payment-row">
                            <span className="drm-payment-label">Amount:</span>
                            <span className="drm-payment-value">Rs {payment.amount}</span>
                          </div>
                          
                          {paymentMethod ? (
                            <button 
                              className="drm-confirm-btn"
                              disabled={confirmingPaymentMap[payment.id]}
                              onClick={() => handleConfirmPayment(payment.id)}
                            >
                              {confirmingPaymentMap[payment.id] ? 'Confirming...' : 'Confirm Payment Received'}
                            </button>
                          ) : (
                            <p style={{ fontSize: '0.8rem', color: '#f59e0b', margin: 0, marginTop: '8px' }}>
                              Passenger needs to mark payment method first.
                            </p>
                          )}
                        </div>
                      )}

                      {/* ── Rating ────────────────────────────────── */}
                      {existingRating ? (
                        <div className="drm-submitted-overlay">
                          <CheckCircle2 size={32} color="#10b981" />
                          <p>Review submitted</p>
                        </div>
                      ) : (
                        <div className="drm-rating-section">
                          <div className="drm-rating-header">
                            <Star size={16} color="#f59e0b" fill="#f59e0b" />
                            Rate Behavior
                          </div>
                          <div className="drm-stars">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                className={`drm-star ${(ratingsState[booking.id] || 0) >= n ? 'filled' : ''}`}
                                onClick={() => setRatingsState(prev => ({ ...prev, [booking.id]: n }))}
                              >
                                <Star size={20} fill={(ratingsState[booking.id] || 0) >= n ? '#f59e0b' : 'none'} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="drm-comment"
                            placeholder="Add a comment (optional)..."
                            value={commentsState[booking.id] || ''}
                            onChange={(e) => setCommentsState(prev => ({ ...prev, [booking.id]: e.target.value }))}
                          />
                          <button
                            className={`drm-submit-btn ${(ratingsState[booking.id] || 0) > 0 ? 'ready' : ''}`}
                            onClick={() => handleSubmitReview(booking.id, pax.id)}
                            disabled={submittingMap[booking.id]}
                          >
                            {submittingMap[booking.id] ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="drm-footer">
          <button className="drm-finish-btn" onClick={handleCompleteRide}>
            Back to Dashboard
          </button>
        </div>
        
      </div>
    </div>
  );
}
