const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { success, error } = require('../utils/response');
const routeSubscriptionService = require('../services/routeSubscription.service');

router.post('/', authenticate, async (req, res) => {
    try {
        const record = await routeSubscriptionService.upsertRouteSubscription(req.user.id, req.body);
        return success(res, record, 201, 'Route subscription saved.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const records = await routeSubscriptionService.getMyRouteSubscriptions(req.user.id);
        return success(res, records);
    } catch (err) {
        return error(res, err.message, 500);
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        await routeSubscriptionService.deleteRouteSubscription(req.user.id, req.params.id);
        return success(res, null, 200, 'Route subscription deleted.');
    } catch (err) {
        return error(res, err.message, 404);
    }
});

module.exports = router;