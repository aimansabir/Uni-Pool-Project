import client from './client';

export const paymentsApi = {
  getRidePaymentsDue: (rideId) => 
    client.get(`/api/payments/rides/${rideId}/due`),

  markPaymentPaid: (paymentId, paymentMethod) => 
    client.patch(`/api/payments/${paymentId}/mark-paid`, { paymentMethod }),

  confirmPayment: (paymentId) => 
    client.patch(`/api/payments/${paymentId}/confirm`),
};
