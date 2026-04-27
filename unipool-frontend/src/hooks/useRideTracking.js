import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export default function useRideTracking(rideId, isDriver = false, pollInterval = 5000) {
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTracking = useCallback(async () => {
    if (!rideId) return;
    try {
      const response = await client.get(`/api/ride-execution/rides/${rideId}/track`);
      setTrackingData(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err);
      // Soft retry logic implicitly handled by the next poll interval
      console.error('Tracking poll failed:', err);
    }
  }, [rideId]);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, pollInterval);
    return () => clearInterval(interval);
  }, [fetchTracking, pollInterval]);

  // Driver background location update dummy mechanism 
  // In a real mobile app, this uses Geolocation API. For MVP web:
  const updateDriverLocation = useCallback((lat, lng) => {
    if (isDriver && rideId) {
      // Optimistically update local view
      setTrackingData(prev => prev ? { ...prev, currentLat: lat, currentLng: lng } : null);
      client.patch(`/api/ride-execution/rides/${rideId}/location`, { lat, lng })
        .catch(console.error); // Fire-and-forget logic for fast updates
    }
  }, [isDriver, rideId]);

  return {
    trackingData,
    error,
    lastUpdated,
    refresh: fetchTracking,
    updateDriverLocation,
  };
}
