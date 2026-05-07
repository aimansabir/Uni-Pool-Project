import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Button from '../../components/common/Button/Button';
import './WF3.css';

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRideAndRedirect = async () => {
      try {
        const res = await ridesApi.getById(id);
        const ride = res.data;
        
        if (!ride || !user) {
           setError("Unable to determine ride details.");
           return;
        }

        if (ride.driverId === user.id) {
           navigate(`/rides/${id}/rate-members`, { replace: true });
        } else {
           navigate(`/rides/${id}/payment-rating`, { replace: true });
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load ride data.");
      }
    };
    
    fetchRideAndRedirect();
  }, [id, navigate, user]);

  if (error) {
    return (
      <div className="wf3-container" style={{ padding: '2rem' }}>
        <EmptyState 
           icon="⚠️"
           title="Oops"
           description={error}
        />
        <Button fullWidth onClick={() => navigate('/rides')} style={{ marginTop: '20px' }}>
           Back to My Rides
        </Button>
      </div>
    );
  }

  return <FullPageSpinner />;
}
