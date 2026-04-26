import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import MyRidesPage from './wf1/MyRidesPage';
import MyBookingsPage from './wf2/MyBookingsPage';
import './PoolingPage.css';

export default function PoolingPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'bookings');

  return (
    <div className="pooling-page">
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
