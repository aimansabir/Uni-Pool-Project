import client from './client';

export const ratingsApi = {
  rateDriver: ({ rideId, bookingRequestId, punctualityStars, safetyStars, comment }) => 
    client.post('/api/ratings/passenger-to-driver', { 
      rideId, 
      bookingRequestId, 
      punctualityStars, 
      safetyStars, 
      comment 
    }),

  ratePassenger: ({ rideId, bookingRequestId, behaviorStars, comment }) => 
    client.post('/api/ratings/driver-to-passenger', { 
      rideId, 
      bookingRequestId, 
      behaviorStars, 
      comment 
    }),

  listRatings: (params) => 
    client.get('/api/ratings', { params }),

  getRatingById: (id) => 
    client.get(`/api/ratings/${id}`),

  getTrustScore: (userId) => 
    client.get(`/api/ratings/users/${userId}/trust-score`),

  updateRating: (id, data) => 
    client.put(`/api/ratings/${id}`, data),

  deleteRating: (id) => 
    client.delete(`/api/ratings/${id}`),
};
