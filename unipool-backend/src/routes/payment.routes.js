const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment.service');
const { success } = require('../utils/response');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

// GET /api/payments/rides/:rideId/due
router.get('/rides/:rideId/due', async (req, res, next) => {
  try {
    const data = await paymentService.getPaymentsDue(req.params.rideId, req.user.id);
    return success(res, data, 200, 'Payment details retrieved.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/:paymentId/mark-paid
router.patch('/:paymentId/mark-paid', async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const data = await paymentService.markPaymentPaid(req.params.paymentId, req.user.id, paymentMethod);
    return success(res, data, 200, 'Payment method recorded.');
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/:paymentId/confirm
router.patch('/:paymentId/confirm', async (req, res, next) => {
  try {
    const data = await paymentService.confirmPaymentReceived(req.params.paymentId, req.user.id);
    return success(res, data, 200, 'Payment confirmed by driver.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
