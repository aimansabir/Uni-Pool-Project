import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { bookingRequestsApi } from '../api/bookingRequests.api';
import MyRidesPage from './wf1/MyRidesPage';
import MyBookingsPage from './wf2/MyBookingsPage';
import './PoolingPage.css';

export default function PoolingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'bookings');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await bookingRequestsApi.getIncoming({ status: 'PENDING' });
        setPendingCount(res.data?.length || 0);
      } catch (err) {
        console.error('Failed to fetch pending requests:', err);
      }
    };
    fetchPendingCount();
  }, []);

  return (
    <div className="pooling-page fade-in">
      {/* Notification Banner */}
      {pendingCount > 0 && (
        <div 
          className="pooling-notification-bar" 
          onClick={() => navigate('/rides/requests')}
        >
          <div className="pooling-notification-bar__icon">
            <Bell size={16} fill="currentColor" />
          </div>
          <div className="pooling-notification-bar__text">
            You have <strong>{pendingCount} new</strong> ride request{pendingCount > 1 ? 's' : ''}
          </div>
          <div className="pooling-notification-bar__action">View</div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="pooling-tab-bar">
        <button
          className={`pooling-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          My Bookings
        </button>
        <button
          className={`pooling-tab ${activeTab === 'rides' ? 'active' : ''}`}
          onClick={() => setActiveTab('rides')}
        >
          My Rides
          {pendingCount > 0 && <span className="pooling-tab-badge">{pendingCount}</span>}
        </button>
      </div>

      {/* Content — mount both and show/hide to preserve scroll */}
      <div className="pooling-content" style={{ display: activeTab === 'bookings' ? 'flex' : 'none' }}>
        <MyBookingsPage embedded />
      </div>
      <div className="pooling-content" style={{ display: activeTab === 'rides' ? 'flex' : 'none' }}>
        <MyRidesPage embedded />
      </div>
    </div>
  );
}
