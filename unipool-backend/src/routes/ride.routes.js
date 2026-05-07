const express = require('express');
const router = express.Router();

const rideService = require('../services/ride.service');
const { authenticate } = require('../middlewares/auth.middleware');
const { success, error } = require('../utils/response');
const { buildRideIntelligence } = require('../services/mapping.service');

router.post('/intelligence/preview', authenticate, async (req, res) => {
    try {
        const preview = await buildRideIntelligence(req.body);
        return success(res, preview, 200, 'Route intelligence ready.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

router.get('/dashboard/stats', authenticate, async (req, res) => {
    try {
        const stats = await rideService.getDashboardStats(req.user.id);
        return success(res, stats);
    } catch (err) {
        return error(res, err.message, 500);
    }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const ride = await rideService.createRide(req.user.id, req.body);
        return success(res, ride, 201, 'Ride published successfully.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const rides = await rideService.getMyRides(req.user.id);
        return success(res, rides);
    } catch (err) {
        return error(res, err.message, 500);
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const ride = await rideService.getRideById(req.params.id, req.user.id);
        return success(res, ride);
    } catch (err) {
        return error(res, err.message, 404);
    }
});

router.put('/:id', authenticate, async (req, res) => {
    try {
        const ride = await rideService.updateRide(req.params.id, req.user.id, req.body);
        return success(res, ride, 200, 'Ride updated successfully.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        await rideService.deleteRide(req.params.id, req.user.id);
        return success(res, null, 200, 'Ride cancelled successfully.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

module.exports = router;