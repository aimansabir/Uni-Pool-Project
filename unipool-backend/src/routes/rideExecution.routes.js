const express = require('express');
const router = express.Router();
const rideExecutionService = require('../services/rideExecution.service');
const { success } = require('../utils/response');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

// ─── Ride Lifecycle ─────────────────────────────────────────────────

// PATCH /api/ride-execution/rides/:rideId/start
router.patch('/rides/:rideId/start', async (req, res, next) => {
  try {
    const data = await rideExecutionService.startRide(req.params.rideId, req.user.id);
    return success(res, data, 200, 'Ride started successfully.');
  } catch (err) {
    next(err);
  }
});

// GET /api/ride-execution/rides/:rideId/navigation
router.get('/rides/:rideId/navigation', async (req, res, next) => {
  try {
    const data = await rideExecutionService.getNavigationLink(req.params.rideId, req.user.id);
    return success(res, data, 200, 'Navigation link generated.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ride-execution/rides/:rideId/location
router.patch('/rides/:rideId/location', async (req, res, next) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const data = await rideExecutionService.updateLocation(req.params.rideId, req.user.id, lat, lng);
    return success(res, data, 200, 'Location updated.');
  } catch (err) {
    next(err);
  }
});

// GET /api/ride-execution/rides/:rideId/track
router.get('/rides/:rideId/track', async (req, res, next) => {
  try {
    const data = await rideExecutionService.getTrackingData(req.params.rideId, req.user.id);
    return success(res, data, 200, 'Tracking data retrieved.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ride-execution/rides/:rideId/complete
router.patch('/rides/:rideId/complete', async (req, res, next) => {
  try {
    const data = await rideExecutionService.completeRide(req.params.rideId, req.user.id);
    return success(res, data, 200, 'Ride completed successfully.');
  } catch (err) {
    next(err);
  }
});

// ─── Passenger Pickup / No-Show / Drop-off ──────────────────────────

// PATCH /api/ride-execution/bookings/:bookingRequestId/verify-plate
router.patch('/bookings/:bookingRequestId/verify-plate', async (req, res, next) => {
  try {
    const data = await rideExecutionService.verifyPlate(req.params.bookingRequestId, req.user.id);
    return success(res, data, 200, 'Plate verified successfully.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ride-execution/bookings/:bookingRequestId/arrived-at-stop
router.patch('/bookings/:bookingRequestId/arrived-at-stop', async (req, res, next) => {
  try {
    const data = await rideExecutionService.markArrivedAtStop(req.params.bookingRequestId, req.user.id);
    return success(res, data, 200, 'Arrival at stop recorded.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ride-execution/bookings/:bookingRequestId/pickup
router.patch('/bookings/:bookingRequestId/pickup', async (req, res, next) => {
  try {
    const data = await rideExecutionService.markPickedUp(req.params.bookingRequestId, req.user.id);
    return success(res, data, 200, 'Passenger picked up.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ride-execution/bookings/:bookingRequestId/no-show
router.patch('/bookings/:bookingRequestId/no-show', async (req, res, next) => {
  try {
    const data = await rideExecutionService.markNoShow(req.params.bookingRequestId, req.user.id);
    return success(res, data, 200, 'Passenger marked as no-show.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/ride-execution/bookings/:bookingRequestId/drop-off
router.patch('/bookings/:bookingRequestId/drop-off', async (req, res, next) => {
  try {
    const data = await rideExecutionService.markDroppedOff(req.params.bookingRequestId, req.user.id);
    return success(res, data, 200, 'Passenger dropped off.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
