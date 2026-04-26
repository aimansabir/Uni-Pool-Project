import client from './client';

export const rideExecutionApi = {
  startRide: (rideId) => 
    client.patch(`/api/ride-execution/rides/${rideId}/start`),

  getNavigation: (rideId) => 
    client.get(`/api/ride-execution/rides/${rideId}/navigation`),

  updateLocation: (rideId, payload) => 
    client.patch(`/api/ride-execution/rides/${rideId}/location`, payload),

  trackRide: (rideId) => 
    client.get(`/api/ride-execution/rides/${rideId}/track`),

  completeRide: (rideId) => 
    client.patch(`/api/ride-execution/rides/${rideId}/complete`),

  verifyPlate: (bookingRequestId, registrationNumber) => 
    client.patch(`/api/ride-execution/bookings/${bookingRequestId}/verify-plate`, { registrationNumber }),

  arrivedAtStop: (bookingRequestId) => 
    client.patch(`/api/ride-execution/bookings/${bookingRequestId}/arrived-at-stop`),

  markPickedUp: (bookingRequestId) => 
    client.patch(`/api/ride-execution/bookings/${bookingRequestId}/pickup`),

  markNoShow: (bookingRequestId) => 
    client.patch(`/api/ride-execution/bookings/${bookingRequestId}/no-show`),

  dropOffPassenger: (bookingRequestId) => 
    client.patch(`/api/ride-execution/bookings/${bookingRequestId}/drop-off`),
};
