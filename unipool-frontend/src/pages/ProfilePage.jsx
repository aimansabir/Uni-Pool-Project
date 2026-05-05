import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { useToast } from '../context/ToastContext';
import Badge from '../components/common/Badge/Badge';
import Button from '../components/common/Button/Button';
import { useNavigate } from 'react-router-dom';
import { Camera, Edit2, Check, X, Car, ClipboardList, LogOut, Trash2, BellRing, Star, MapPin, Navigation, Clock, Smartphone, Mail } from 'lucide-react';
import { subscriptionsApi } from '../api/notifications.api';
import { ratingsApi } from '../api/ratings.api';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    studentErp: user?.studentErp || '',
    gender: user?.gender || 'male',
    avatarUrl: user?.avatarUrl || ''
  });

  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);

  const [trustData, setTrustData] = useState(null);
  const [loadingTrust, setLoadingTrust] = useState(true);

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const res = await subscriptionsApi.list();
        setSubscriptions(res.data || []);
      } catch (err) {
        console.error('Failed to load subscriptions', err);
      } finally {
        setLoadingSubscriptions(false);
      }
    };
    fetchSubs();

    if (user?.id) {
      ratingsApi.getTrustScore(user.id)
        .then(res => setTrustData(res.data))
        .catch(err => console.error('Failed to load trust score', err))
        .finally(() => setLoadingTrust(false));
    }
  }, [user?.id]);

  const handleDeleteSubscription = async (id) => {
    try {
      await subscriptionsApi.delete(id);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      showSuccess('Route alert deleted');
    } catch (err) {
      showError('Failed to delete route alert');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'fullName') {
      formattedValue = value.replace(/[0-9]/g, '');
      formattedValue = formattedValue.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }

    if (name === 'studentErp') {
      formattedValue = value.replace(/\D/g, '').slice(0, 5);
    }

    if (name === 'phone') {
      formattedValue = value.replace(/[^\d+]/g, '');
      if (formattedValue.startsWith('+92')) {
        formattedValue = formattedValue.slice(0, 13);
      } else if (formattedValue.startsWith('0')) {
        formattedValue = formattedValue.slice(0, 11);
      } else {
        formattedValue = formattedValue.slice(0, 11);
      }
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await authApi.updateProfile(formData);
      updateUser(res.data);
      showSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData(prev => ({ ...prev, avatarUrl: base64String }));
      if (!isEditing) {
        saveAvatarOnly(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAvatarOnly = async (base64) => {
    try {
      const res = await authApi.updateProfile({ ...formData, avatarUrl: base64 });
      updateUser(res.data);
      showSuccess('Profile picture updated');
    } catch {
      showError('Failed to update profile picture');
    }
  };

  return (
    <div className="profile-page fade-in">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <div className="profile-page__header">
        <button
          className="btn-edit-toggle"
          onClick={() => setIsEditing(!isEditing)}
          aria-label={isEditing ? "Cancel" : "Edit Profile"}
        >
          {isEditing ? <X size={20} /> : <Edit2 size={20} />}
        </button>

        <div className="avatar-container">
          <div className="profile-page__avatar">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt="Avatar" onError={(e) => e.target.style.display = 'none'} />
            ) : (
              <span>{formData.fullName?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          <button className="avatar-edit-badge" onClick={() => fileInputRef.current?.click()}>
            <Camera size={20} />
          </button>
        </div>

        {isEditing ? (
          <input
            className="profile-name-input"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Full Name"
            autoFocus
          />
        ) : (
          <h2 className="profile-page__name">{user?.fullName || 'User'}</h2>
        )}

        <p className="profile-page__email">{user?.ibaEmail}</p>

        <div className="profile-page__badges">
          {user?.isVerified && <Badge variant="accent">Verified</Badge>}
          {user?.genderVerified && <Badge variant="primary">Gender Verified</Badge>}
        </div>
      </div>

      <div className="profile-page__card">
        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Gender</span>
          {isEditing ? (
            <div className="gender-segmented-control">
              <button
                type="button"
                className={`gender-segment ${formData.gender === 'male' ? 'active' : ''}`}
                onClick={() => handleInputChange({ target: { name: 'gender', value: 'male' } })}
              >
                ♂ Male
              </button>
              <button
                type="button"
                className={`gender-segment ${formData.gender === 'female' ? 'active' : ''}`}
                onClick={() => handleInputChange({ target: { name: 'gender', value: 'female' } })}
              >
                ♀ Female
              </button>
            </div>
          ) : (
            <span className="profile-page__info-value" style={{ textTransform: 'capitalize' }}>
              {user?.gender || '—'}
            </span>
          )}
        </div>

        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Student ERP</span>
          {isEditing ? (
            <input
              className="profile-edit-input"
              name="studentErp"
              value={formData.studentErp}
              onChange={handleInputChange}
              placeholder="e.g. 21990"
            />
          ) : (
            <span className="profile-page__info-value">{user?.studentErp || '—'}</span>
          )}
        </div>

        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Phone</span>
          {isEditing ? (
            <input
              className="profile-edit-input"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="03xx-xxxxxxx"
            />
          ) : (
            <span className="profile-page__info-value">{user?.phone || '—'}</span>
          )}
        </div>

        <div className="profile-page__info-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: trustData?.totalRatingsReceived > 0 ? '12px' : '4px' }}>
            <span className="profile-page__info-label">Trust Score</span>
            {loadingTrust ? (
              <span className="profile-page__info-value">Loading...</span>
            ) : trustData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={18} fill="#FDBA2E" color="#FDBA2E" />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '15px' }}>
                    {(trustData.trustScorePercent / 20).toFixed(1)}
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  • {trustData.totalRatingsReceived} ratings
                </span>
              </div>
            ) : (
              <span className="profile-page__info-value">—</span>
            )}
          </div>
          
          {trustData && trustData.totalRatingsReceived > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Punctual</span>
                {trustData.punctualityScorePercent != null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={12} fill="#FDBA2E" color="#FDBA2E" />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{(trustData.punctualityScorePercent / 20).toFixed(1)}</span>
                  </div>
                ) : <span style={{ fontSize: '13px', color: '#999' }}>—</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Safety</span>
                {trustData.safetyScorePercent != null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={12} fill="#FDBA2E" color="#FDBA2E" />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{(trustData.safetyScorePercent / 20).toFixed(1)}</span>
                  </div>
                ) : <span style={{ fontSize: '13px', color: '#999' }}>—</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Behavior</span>
                {trustData.behaviorScorePercent != null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={12} fill="#FDBA2E" color="#FDBA2E" />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{(trustData.behaviorScorePercent / 20).toFixed(1)}</span>
                  </div>
                ) : <span style={{ fontSize: '13px', color: '#999' }}>—</span>}
              </div>
            </div>
          )}

          {trustData && trustData.totalRatingsReceived === 0 && (
             <div style={{ fontSize: '13px', color: '#666' }}>
               New user — no ratings yet
             </div>
          )}
        </div>

        <div className="profile-page__info-row">
          <span className="profile-page__info-label">Role</span>
          <span className="profile-page__info-value" style={{ textTransform: 'capitalize' }}>
            {user?.role || 'student'}
          </span>
        </div>

        {isEditing && (
          <div style={{ marginTop: '20px', paddingBottom: '10px' }}>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSave}
              loading={loading}
              style={{ borderRadius: '14px', height: '50px' }}
            >
              <Check size={18} style={{ marginRight: '8px' }} /> Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="profile-page__card" style={{ marginTop: '16px', marginBottom: '16px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', marginBottom: '16px' }}>
          <BellRing size={18} /> My Route Alerts
        </h3>
        
        {loadingSubscriptions ? (
          <div style={{ fontSize: '14px', color: '#666' }}>Loading alerts...</div>
        ) : subscriptions.length === 0 ? (
          <div style={{ fontSize: '14px', color: '#666' }}>No route alerts set.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {subscriptions.map(sub => (
              <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, paddingRight: '12px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', lineHeight: '1.4' }}>{sub.startLocation.split('|')[0]}</span>
                    </div>
                    <div style={{ width: '2px', height: '10px', background: '#e5e7eb', marginLeft: '7px' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <Navigation size={16} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', lineHeight: '1.4' }}>{sub.destinationLocation}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#6b7280', marginTop: '4px', flexWrap: 'wrap' }}>
                    {sub.startLocation.includes('|') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        <Clock size={12} />
                        <span>{sub.startLocation.split('|')[1]}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                       <Clock size={12} />
                       <span>{new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(sub.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                       {sub.channel === 'EMAIL' ? <Mail size={12} /> : <Smartphone size={12} />}
                       <span>{sub.channel === 'IN_APP_TOAST' || sub.channel === 'IN_APP' ? 'Push Alert' : 'Email'}</span>
                    </div>
                  </div>
                  
                </div>
                
                <button 
                  onClick={() => handleDeleteSubscription(sub.id)}
                  aria-label="Delete route alert"
                  style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="profile-page__actions">
        <div className="profile-btn-group">
          <Button variant="outline" fullWidth onClick={() => navigate('/vehicles')}>
            <Car size={18} style={{ marginRight: '8px' }} /> My Vehicles
          </Button>
          <Button variant="outline" fullWidth onClick={() => navigate('/rides')}>
            <ClipboardList size={18} style={{ marginRight: '8px' }} /> My Rides
          </Button>
        </div>

        <Button variant="danger" fullWidth onClick={handleLogout} style={{ marginTop: '12px' }}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Logout Account
        </Button>
      </div>
    </div>
  );
}
