import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import './WF3.css';

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="wf3-container">
      <header className="wf3-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={24} /></button>
        <h1 className="wf3-title">Payment</h1>
      </header>
      <div className="wf3-placeholder">
        <h2 className="wf3-placeholder__title">Payment for Ride #{id}</h2>
        <p className="wf3-placeholder__subtitle">Processing payment...</p>
        <Button onClick={() => navigate(`/ratings/${id}`)} style={{ marginTop: '2rem' }}>Proceed to Ratings</Button>
      </div>
    </div>
  );
}
