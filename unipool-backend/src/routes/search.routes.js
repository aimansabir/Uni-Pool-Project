const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const searchService = require('../services/search.service');

const router = express.Router();

router.get('/rides', authenticate, async (req, res, next) => {
  try {
    const rides = await searchService.searchRides({
      pickup: req.query.pickup,
      dropoff: req.query.dropoff,
      pickupLat: req.query.pickupLat,
      pickupLng: req.query.pickupLng,
      dropoffLat: req.query.dropoffLat,
      dropoffLng: req.query.dropoffLng,
      targetSlot: req.query.targetSlot,
      rideType: req.query.rideType,
      onlyUrgent: req.query.onlyUrgent,
    });

    return res.status(200).json({
      success: true,
      message: 'Ride search results fetched successfully.',
      data: rides,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/rides/:rideId/preview', authenticate, async (req, res, next) => {
  try {
    const preview = await searchService.getRidePreview(req.params.rideId, req.user);

    return res.status(200).json({
      success: true,
      message: 'Ride preview fetched successfully.',
      data: preview,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;