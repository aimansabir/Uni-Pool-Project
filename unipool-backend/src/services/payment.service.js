const prisma = require('../lib/prisma');

// ─── Helpers ────────────────────────────────────────────────────────

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const VALID_PAYMENT_METHODS = ['CASH', 'JAZZCASH', 'OTHER'];

const normalizePaymentMethod = (paymentMethod) => {
  if (typeof paymentMethod !== 'string') {
    return null;
  }

  const normalized = paymentMethod.trim().toUpperCase();
  return VALID_PAYMENT_METHODS.includes(normalized) ? normalized : null;
};

const isPaymentDueNow = (payment) => {
  if (!payment || !payment.bookingRequest || !payment.ride) {
    return false;
  }

  if (payment.bookingRequest.participantStatus === 'NO_SHOW') {
    return false;
  }

  return (
    payment.bookingRequest.participantStatus === 'DROPPED_OFF' ||
    payment.ride.status === 'COMPLETED'
  );
};

// ─── Get Payments Due ───────────────────────────────────────────────

/**
 * Returns payment records that are actually due for a ride.
 * - Driver sees all due payment records for their ride.
 * - Passenger sees only their own due payment record.
 * - No-show payments are excluded from this settlement flow.
 */
const getPaymentsDue = async (rideId, userId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      driverId: true,
      status: true
    }
  });

  if (!ride) {
    throw createError('Ride not found.', 404);
  }

  const isDriver = ride.driverId === userId;

  const filter = { rideId };
  if (!isDriver) {
    filter.passengerId = userId;
  }

  const payments = await prisma.ridePayment.findMany({
    where: filter,
    include: {
      ride: {
        select: {
          id: true,
          status: true
        }
      },
      passenger: {
        select: {
          id: true,
          fullName: true,
          ibaEmail: true
        }
      },
      bookingRequest: {
        select: {
          id: true,
          pickupStopName: true,
          dropoffStopName: true,
          participantStatus: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  const visiblePayments = payments.filter((payment) => isPaymentDueNow(payment));

  if (!isDriver && visiblePayments.length === 0) {
    throw createError('Payment is not due yet for you on this ride.', 404);
  }

  return {
    rideId,
    role: isDriver ? 'driver' : 'passenger',
    payments: visiblePayments
  };
};

// ─── Mark Payment Paid ──────────────────────────────────────────────

/**
 * Passenger reports that they have paid.
 * This records the payment method and paidAt timestamp.
 * It does NOT change status to PAID — only driver confirmation does that.
 */
const markPaymentPaid = async (paymentId, passengerId, paymentMethod) => {
  const payment = await prisma.ridePayment.findUnique({
    where: { id: paymentId },
    include: {
      ride: {
        select: {
          id: true,
          status: true
        }
      },
      bookingRequest: {
        select: {
          id: true,
          participantStatus: true
        }
      }
    }
  });

  if (!payment) {
    throw createError('Payment record not found.', 404);
  }

  if (payment.passengerId !== passengerId) {
    throw createError('Only the passenger can mark their payment.', 403);
  }

  if (payment.status === 'PAID') {
    throw createError('Payment has already been confirmed as paid.', 400);
  }

  if (payment.status === 'WAIVED') {
    throw createError('This payment has been waived and cannot be marked as paid.', 400);
  }

  if (payment.bookingRequest?.participantStatus === 'NO_SHOW') {
    throw createError('No-show passengers do not have payable completed-trip settlement here.', 400);
  }

  if (!isPaymentDueNow(payment)) {
    throw createError('Payment can only be marked after passenger drop-off or ride completion.', 400);
  }

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  if (!normalizedPaymentMethod) {
    throw createError('Valid payment method is required (CASH, JAZZCASH, or OTHER).', 400);
  }

  const updated = await prisma.ridePayment.update({
    where: { id: paymentId },
    data: {
      paymentMethod: normalizedPaymentMethod,
      paidAt: new Date()
    }
  });

  return {
    id: updated.id,
    paymentMethod: updated.paymentMethod,
    paidAt: updated.paidAt,
    status: updated.status
  };
};

// ─── Confirm Payment Received ───────────────────────────────────────

/**
 * Driver confirms that payment has been received from passenger.
 * This is the ONLY action that changes status to PAID.
 */
const confirmPaymentReceived = async (paymentId, driverId) => {
  const payment = await prisma.ridePayment.findUnique({
    where: { id: paymentId },
    include: {
      ride: {
        select: {
          id: true,
          status: true
        }
      },
      bookingRequest: {
        select: {
          id: true,
          participantStatus: true
        }
      }
    }
  });

  if (!payment) {
    throw createError('Payment record not found.', 404);
  }

  if (payment.driverId !== driverId) {
    throw createError('Only the ride driver can confirm payment.', 403);
  }

  if (payment.status === 'PAID') {
    throw createError('Payment has already been confirmed.', 400);
  }

  if (payment.status === 'WAIVED') {
    throw createError('This payment has been waived and cannot be confirmed.', 400);
  }

  if (payment.bookingRequest?.participantStatus === 'NO_SHOW') {
    throw createError('Cannot confirm payment for a no-show passenger.', 400);
  }

  if (!isPaymentDueNow(payment)) {
    throw createError('Payment can only be confirmed after passenger drop-off or ride completion.', 400);
  }

  if (!payment.paymentMethod) {
    throw createError(
      'Payment method must be recorded before the driver can confirm payment.',
      400
    );
  }

  const updated = await prisma.ridePayment.update({
    where: { id: paymentId },
    data: {
      status: 'PAID',
      confirmedByDriverAt: new Date(),
      paidAt: payment.paidAt || new Date()
    }
  });

  await prisma.notification.create({
    data: {
      userId: payment.passengerId,
      rideId: payment.rideId,
      channel: 'IN_APP',
      title: 'Payment Confirmed',
      message: `Your payment of ${payment.amount} PKR has been confirmed by the driver.`
    }
  });

  return {
    id: updated.id,
    status: updated.status,
    amount: updated.amount,
    paymentMethod: updated.paymentMethod,
    paidAt: updated.paidAt,
    confirmedByDriverAt: updated.confirmedByDriverAt
  };
};

module.exports = {
  getPaymentsDue,
  markPaymentPaid,
  confirmPaymentReceived
};