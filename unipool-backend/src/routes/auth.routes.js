const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const { authenticate } = require('../middlewares/auth.middleware');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    return success(res, data, 201, 'Registration successful.');
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    return success(res, data, 200, 'Login successful.');
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const data = await authService.getMe(req.user.id);
    return success(res, data, 200, 'User fetched successfully.');
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res, next) => {
  try {
    const data = await authService.verify(req.body);
    return success(res, data, 200, data.message);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res, next) => {
  try {
    const data = await authService.resendOtp(req.body);
    return success(res, data, 200, data.message);
  } catch (err) {
    next(err);
  }
});


// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const data = await authService.updateProfile(req.user.id, req.body);
    return success(res, data, 200, 'Profile updated successfully.');
  } catch (err) {
    next(err);
  }
});

module.exports = router;