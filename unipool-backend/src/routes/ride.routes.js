const express = require('express');
const router = express.Router();

const rideService = require('../services/ride.service');
const { authenticate } = require('../middlewares/auth.middleware');
const { success, error } = require('../utils/response');

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
        return success(res, null, 200, 'Ride deleted successfully.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

module.exports = router;