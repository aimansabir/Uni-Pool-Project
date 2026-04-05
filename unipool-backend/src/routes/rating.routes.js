const express = require('express');
const router = express.Router();
const ratingService = require('../services/rating.service');
const { success } = require('../utils/response');
const { authenticate } = require('../middlewares/auth.middleware');

// PUBLIC — Trust score
router.get('/users/:userId/trust-score', async (req, res, next) => {
  try {
    const data = await ratingService.getUserTrustScore(req.params.userId);
    return success(res, data, 200, 'Trust score retrieved.');
  } catch (err) {
    next(err);
  }
});

// All routes require authentication
router.use(authenticate);

// CREATE — Passenger rates driver
router.post('/passenger-to-driver', async (req, res, next) => {
  try {
    const { rideId, bookingRequestId, punctualityStars, safetyStars, comment } = req.body;

    const data = await ratingService.submitPassengerToDriverRating(
      rideId,
      bookingRequestId,
      req.user.id,
      { punctualityStars, safetyStars, comment }
    );

    return success(res, data, 201, 'Driver rating submitted successfully.');
  } catch (err) {
    next(err);
  }
});

// CREATE — Driver rates passenger
router.post('/driver-to-passenger', async (req, res, next) => {
  try {
    const { rideId, bookingRequestId, behaviorStars, comment } = req.body;

    const data = await ratingService.submitDriverToPassengerRating(
      rideId,
      bookingRequestId,
      req.user.id,
      { behaviorStars, comment }
    );

    return success(res, data, 201, 'Passenger rating submitted successfully.');
  } catch (err) {
    next(err);
  }
});

// READ — List ratings involving current user
router.get('/', async (req, res, next) => {
  try {
    const data = await ratingService.listRatings(req.user.id, req.query);
    return success(res, data, 200, 'Ratings retrieved successfully.');
  } catch (err) {
    next(err);
  }
});

// READ — Public trust score
router.get('/users/:userId/trust-score', async (req, res, next) => {
  try {
    const data = await ratingService.getUserTrustScore(req.params.userId);
    return success(res, data, 200, 'Trust score retrieved.');
  } catch (err) {
    next(err);
  }
});

// READ — Single rating
router.get('/:id', async (req, res, next) => {
  try {
    const data = await ratingService.getRatingById(req.params.id, req.user.id);
    return success(res, data, 200, 'Rating retrieved successfully.');
  } catch (err) {
    next(err);
  }
});

// UPDATE — Only original rater can update
router.put('/:id', async (req, res, next) => {
  try {
    const data = await ratingService.updateRating(req.params.id, req.user.id, req.body);
    return success(res, data, 200, 'Rating updated successfully.');
  } catch (err) {
    next(err);
  }
});

// DELETE — Only original rater can delete
router.delete('/:id', async (req, res, next) => {
  try {
    const data = await ratingService.deleteRating(req.params.id, req.user.id);
    return success(res, data, 200, 'Rating deleted successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;