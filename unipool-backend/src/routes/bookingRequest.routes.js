const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const bookingRequestService = require('../services/bookingRequest.service');

const router = express.Router();

router.post('/', authenticate, async (req, res, next) => {
  try {
    const bookingRequest = await bookingRequestService.createBookingRequest({
      passengerId: req.user.id,
      rideId: req.body.rideId,
      pickupStopId: req.body.pickupStopId,
      dropStopId: req.body.dropStopId,
      requestedSeats: req.body.requestedSeats,
      note: req.body.note,
    });

    return res.status(201).json({
      success: true,
      message: 'Booking request created successfully.',
      data: bookingRequest,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const bookingRequests = await bookingRequestService.listMyBookingRequests(
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Booking requests fetched successfully.',
      data: bookingRequests,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const bookingRequest = await bookingRequestService.getBookingRequestById(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: 'Booking request fetched successfully.',
      data: bookingRequest,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/respond', authenticate, async (req, res, next) => {
  try {
    const updatedRequest = await bookingRequestService.respondToBookingRequest({
      bookingRequestId: req.params.id,
      driverId: req.user.id,
      status: req.body.status,
    });

    return res.status(200).json({
      success: true,
      message: `Booking request ${req.body.status?.toLowerCase()} successfully.`,
      data: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const cancelledRequest = await bookingRequestService.cancelBookingRequest({
      bookingRequestId: req.params.id,
      passengerId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking request cancelled successfully.',
      data: cancelledRequest,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const deleted = await bookingRequestService.deleteBookingRequest({
      bookingRequestId: req.params.id,
      passengerId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking request deleted successfully.',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;