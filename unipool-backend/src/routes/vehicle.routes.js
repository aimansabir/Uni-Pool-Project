const express = require('express');
const router = express.Router();

const vehicleService = require('../services/vehicle.service');
const { authenticate } = require('../middlewares/auth.middleware');
const { success, error } = require('../utils/response');

// POST /api/vehicles
router.post('/', authenticate, async (req, res) => {
    try {
        const vehicle = await vehicleService.createVehicle(req.user.id, req.body);
        return success(res, vehicle, 201, 'Vehicle added.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

// GET /api/vehicles
router.get('/', authenticate, async (req, res) => {
    try {
        const vehicles = await vehicleService.getMyVehicles(req.user.id);
        return success(res, vehicles);
    } catch (err) {
        return error(res, err.message);
    }
});

// GET /api/vehicles/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const vehicle = await vehicleService.getVehicleById(req.params.id, req.user.id);
        return success(res, vehicle);
    } catch (err) {
        return error(res, err.message, 404);
    }
});

// PUT /api/vehicles/:id
router.put('/:id', authenticate, async (req, res) => {
    try {
        const vehicle = await vehicleService.updateVehicle(req.params.id, req.user.id, req.body);
        return success(res, vehicle, 200, 'Vehicle updated.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

// DELETE /api/vehicles/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await vehicleService.deleteVehicle(req.params.id, req.user.id);
        return success(res, null, 200, 'Vehicle deleted.');
    } catch (err) {
        return error(res, err.message, err.statusCode || 500);
    }
});

module.exports = router;