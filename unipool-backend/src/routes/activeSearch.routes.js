const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { success, error } = require('../utils/response');
const activeSearchService = require('../services/activeSearch.service');

router.post('/', authenticate, async (req, res) => {
    try {
        const record = await activeSearchService.upsertActiveSearch(req.user.id, req.body);
        return success(res, record, 201, 'Active route search saved.');
    } catch (err) {
        return error(res, err.message, 400);
    }
});

router.patch('/:id/ping', authenticate, async (req, res) => {
    try {
        const record = await activeSearchService.heartbeatActiveSearch(req.user.id, req.params.id);
        return success(res, record, 200, 'Active route search refreshed.');
    } catch (err) {
        return error(res, err.message, 404);
    }
});

router.patch('/:id/deactivate', authenticate, async (req, res) => {
    try {
        const record = await activeSearchService.deactivateActiveSearch(req.user.id, req.params.id);
        return success(res, record, 200, 'Active route search deactivated.');
    } catch (err) {
        return error(res, err.message, 404);
    }
});

module.exports = router;