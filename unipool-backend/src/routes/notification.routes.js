const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { success, error } = require('../utils/response');
const { addClient, removeClient } = require('../lib/sseHub');
const notificationService = require('../services/notification.service');

router.get('/stream', authenticate, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

    addClient(req.user.id, res);

    req.on('close', () => {
        removeClient(req.user.id, res);
    });
});

router.get('/', authenticate, async (req, res) => {
    try {
        const notifications = await notificationService.getMyNotifications(req.user.id);
        return success(res, notifications);
    } catch (err) {
        return error(res, err.message, 500);
    }
});

router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const result = await notificationService.markNotificationRead(req.user.id, req.params.id);
        return success(res, result, 200, 'Notification marked as read.');
    } catch (err) {
        return error(res, err.message, 404);
    }
});



module.exports = router;