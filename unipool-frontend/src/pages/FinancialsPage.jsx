import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { ridesApi } from '../api/rides.api';
import './FinancialsPage.css';

const FinancialCard = ({ title, amount, icon: Icon, type }) => (
  <div className={`financial-card financial-card--${type}`}>
    <div className="financial-card__header">
      <div className={`financial-card__icon-box financial-card__icon-box--${type}`}>
        <Icon size={20} />
      </div>
      <span className="financial-card__title">{title}</span>
    </div>
    <div className="financial-card__body">
      <span className="financial-card__amount">Rs {amount.toLocaleString()}</span>
    </div>
  </div>
);

const TransactionItem = ({ role, from, to, amount, date, status }) => {
  const isDriver = role === 'Driver';
  return (
    <div className="transaction-item">
      <div className={`transaction-item__icon-box ${isDriver ? 'transaction-item__icon-box--earned' : 'transaction-item__icon-box--split'}`}>
        {isDriver ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
      </div>
      <div className="transaction-item__main">
        <div className="transaction-item__title">{isDriver ? 'Ride Earning' : 'Fare Split'}</div>
        <div className="transaction-item__route">{from} → {to}</div>
        <div className="transaction-item__date">{date}</div>
      </div>
      <div className="transaction-item__right">
        <span className={`transaction-item__amount ${isDriver ? 'transaction-item__amount--earned' : 'transaction-item__amount--split'}`}>
          {isDriver ? '+' : '-'} Rs {amount.toLocaleString()}
        </span>
        <span className="transaction-item__status">{status}</span>
      </div>
    </div>
  );
};

export default function FinancialsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ earned: 0, split: 0, total: 0, recentActivities: [] });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await ridesApi.getDashboardStats();
        setStats(res.data || { earned: 0, split: 0, total: 0, recentActivities: [] });
      } catch (err) {
        console.error("Failed to load financials:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const netBalance = stats.earned - stats.split;

  return (
    <div className="financials-page fade-in">
      <header className="financials-header">
        <button className="financials-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <div className="financials-header__content">
          <h1 className="financials-title">Financials</h1>
          <p className="financials-subtitle">Track your ride earnings and fare splits</p>
        </div>
      </header>

      <div className="financials-content">
        {/* Balance Overview */}
        <div className="balance-section">
          <div className="balance-label">Current Net Balance</div>
          <div className="balance-value">Rs {netBalance.toLocaleString()}</div>
          <div className="balance-badge">
            <TrendingUp size={14} style={{ marginRight: 4 }} />
            Updated just now
          </div>
        </div>

        {/* Summary Grid */}
        <div className="financial-grid">
          <FinancialCard 
            title="Total Earned" 
            amount={stats.earned} 
            icon={TrendingUp} 
            type="earned" 
          />
          <FinancialCard 
            title="Total Spent" 
            amount={stats.split} 
            icon={TrendingDown} 
            type="spent" 
          />
        </div>

        {/* Transactions Section */}
        <div className="transactions-section">
          <div className="transactions-header">
            <h2 className="transactions-title">Recent Activity</h2>
            <div className="transactions-filter">
              <Calendar size={14} />
              <span>This Month</span>
            </div>
          </div>

          {loading ? (
            <div className="financials-loading">Loading transactions...</div>
          ) : stats.recentActivities.length > 0 ? (
            <div className="transactions-list">
              {stats.recentActivities.map((activity, index) => (
                <TransactionItem 
                  key={activity.id || index}
                  role={activity.role}
                  from={activity.from.split(',')[0]}
                  to={activity.to.split(',')[0]}
                  amount={activity.amount}
                  date={activity.date}
                  status={activity.status}
                />
              ))}
            </div>
          ) : (
            <div className="financials-empty">
              <div className="financials-empty__icon">
                <Wallet size={48} />
              </div>
              <h3 className="financials-empty__title">No activity yet</h3>
              <p className="financials-empty__subtitle">Your ride earnings and fare splits will appear here once you complete a ride.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
