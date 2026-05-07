import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import client from '../api/client';

export default function useRideExecutionActions() {
  const [loadingAction, setLoadingAction] = useState(null);

  const wrapAction = useCallback(async (actionName, promise) => {
    setLoadingAction(actionName);
    try {
      const result = await promise();
      return result;
    } catch (err) {
      toast.error(err.message || `Failed to ${actionName.replace('-', ' ')}`);
      throw err;
    } finally {
      setLoadingAction(null);
    }
  }, []);

  const startRide = (rideId) =>
    wrapAction('startRide', () =>
      client.patch(`/api/ride-execution/rides/${rideId}/start`)
    );

  const arriveAtStop = (bookingRequestId) =>
    wrapAction('arriveAtStop', () =>
      client.patch(`/api/ride-execution/bookings/${bookingRequestId}/arrived-at-stop`)
    );

  const verifyPlate = (bookingRequestId) =>
    wrapAction('verifyPlate', () =>
      client.patch(`/api/ride-execution/bookings/${bookingRequestId}/verify-plate`)
    );

  const pickupPassenger = (bookingRequestId) =>
    wrapAction('pickupPassenger', () =>
      client.patch(`/api/ride-execution/bookings/${bookingRequestId}/pickup`)
    );

  const markNoShow = (bookingRequestId) =>
    wrapAction('markNoShow', () =>
      client.patch(`/api/ride-execution/bookings/${bookingRequestId}/no-show`)
    );

  const dropOffPassenger = (bookingRequestId) =>
    wrapAction('dropOffPassenger', () =>
      client.patch(`/api/ride-execution/bookings/${bookingRequestId}/drop-off`)
    );

  const getPaymentsDue = (rideId) =>
    client.get(`/api/payments/rides/${rideId}/due`);

  const markPaid = (paymentId, method) =>
    wrapAction('markPaid', () =>
      client.patch(`/api/payments/${paymentId}/mark-paid`, { paymentMethod: method })
    );

  const confirmPayment = (paymentId) =>
    wrapAction('confirmPayment', () =>
      client.patch(`/api/payments/${paymentId}/confirm`)
    );

  const completeRide = (rideId) =>
    wrapAction('completeRide', () =>
      client.patch(`/api/ride-execution/rides/${rideId}/complete`)
    );

  const updateLocation = (rideId, lat, lng) => 
    client.patch(`/api/ride-execution/rides/${rideId}/location`, { lat, lng });

  const submitRating = (isDriverToPassenger, data) =>
    wrapAction('submitRating', () => {
      const endpoint = isDriverToPassenger
        ? '/api/ratings/driver-to-passenger'
        : '/api/ratings/passenger-to-driver';
      return client.post(endpoint, data);
    });

  return {
    loadingAction,
    startRide,
    arriveAtStop,
    verifyPlate,
    pickupPassenger,
    markNoShow,
    dropOffPassenger,
    getPaymentsDue,
    markPaid,
    confirmPayment,
    completeRide,
    updateLocation,
    submitRating,
  };
}
