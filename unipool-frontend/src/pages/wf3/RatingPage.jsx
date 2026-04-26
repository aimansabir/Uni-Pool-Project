import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Button from '../../components/common/Button/Button';
import './WF3.css';

export default function RatingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="wf3-container">
      <header className="wf3-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={24} /></button>
        <h1 className="wf3-title">Ratings</h1>
      </header>
      <div className="wf3-placeholder">
        <h2 className="wf3-placeholder__title">Rate your experience</h2>
        <p className="wf3-placeholder__subtitle">Thank you for riding with UniPool!</p>
        <Button onClick={() => navigate('/dashboard')} style={{ marginTop: '2rem' }}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
