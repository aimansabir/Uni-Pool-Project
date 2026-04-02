const prisma = require('../lib/prisma');

// ─── Helpers ────────────────────────────────────────────────────────

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const getTrackUrl = (rideId) => {
  const baseUrl = process.env.APP_BASE_URL
    ? process.env.APP_BASE_URL.replace(/\/$/, '')
    : '';

  const trackPath = `/api/ride-execution/rides/${rideId}/track`;
  return baseUrl ? `${baseUrl}${trackPath}` : trackPath;
};

/**
 * Build a Google Maps navigation deep link from ordered stops.
 * Format:
 * https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&waypoints=LAT,LNG|LAT,LNG
 */
const buildNavigationLink = (stops) => {
  if (!stops || stops.length === 0) return null;

  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);

  if (sorted.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${sorted[0].lat},${sorted[0].lng}`;
  }

  const origin = sorted[0];
  const destination = sorted[sorted.length - 1];
  const waypoints = sorted.slice(1, -1);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;

  if (waypoints.length > 0) {
    const waypointStr = waypoints.map((w) => `${w.lat},${w.lng}`).join('|');
    url += `&waypoints=${waypointStr}`;
  }

  return url;
};

// ─── Start Ride ─────────────────────────────────────────────────────

const startRide = async (rideId, driverId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      bookingRequests: {
        where: { status: 'ACCEPTED' },
        include: {
          passenger: {
            select: { id: true, fullName: true, ibaEmail: true }
          }
        }
      },
      stops: { orderBy: { sequence: 'asc' } }
    }
  });

  if (!ride) throw createError('Ride not found.', 404);
  if (ride.driverId !== driverId) throw createError('Only the ride owner can start this ride.', 403);
  if (ride.status !== 'PUBLISHED') {
    throw createError(`Ride cannot be started. Current status: ${ride.status}.`, 400);
  }
  if (ride.bookingRequests.length === 0) {
    throw createError('No accepted bookings. Cannot start ride.', 400);
  }

  const trackUrl = getTrackUrl(rideId);

  const result = await prisma.$transaction(async (tx) => {
    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    await tx.bookingRequest.updateMany({
      where: { rideId, status: 'ACCEPTED' },
      data: { participantStatus: 'BOOKED' }
    });

    const paymentData = ride.bookingRequests.map((br) => ({
      rideId,
      bookingRequestId: br.id,
      passengerId: br.passengerId,
      driverId,
      amount: ride.farePerSeat
    }));

    if (paymentData.length > 0) {
      await tx.ridePayment.createMany({ data: paymentData });
    }

    const notifications = ride.bookingRequests.map((br) => ({
      userId: br.passengerId,
      rideId,
      channel: 'IN_APP',
      title: 'Ride Started!',
      message: `Your ride has started. Track Ride: ${trackUrl}`
    }));

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return updatedRide;
  });

  const navigationLink = buildNavigationLink(ride.stops);

  return {
    ride: result,
    navigationLink,
    trackUrl,
    acceptedPassengers: ride.bookingRequests.length,
    waypoints: ride.stops
  };
};

// ─── Get Navigation Link ────────────────────────────────────────────

const getNavigationLink = async (rideId, driverId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      stops: { orderBy: { sequence: 'asc' } }
    }
  });

  if (!ride) throw createError('Ride not found.', 404);
  if (ride.driverId !== driverId) {
    throw createError('Only the ride owner can access navigation.', 403);
  }

  const navigationLink = buildNavigationLink(ride.stops);

  return {
    navigationLink,
    waypoints: ride.stops
  };
};

// ─── Update Live Location ───────────────────────────────────────────

const updateLocation = async (rideId, driverId, lat, lng) => {
  if (lat == null || lng == null || typeof lat !== 'number' || typeof lng !== 'number') {
    throw createError('lat and lng are required and must be numbers.', 400);
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });

  if (!ride) throw createError('Ride not found.', 404);
  if (ride.driverId !== driverId) throw createError('Only the ride owner can update location.', 403);
  if (ride.status !== 'IN_PROGRESS') {
    throw createError('Location can only be updated for in-progress rides.', 400);
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: {
      currentLat: lat,
      currentLng: lng,
      lastLocationAt: new Date()
    }
  });

  return {
    currentLat: updated.currentLat,
    currentLng: updated.currentLng,
    lastLocationAt: updated.lastLocationAt
  };
};

// ─── Get Tracking Data ──────────────────────────────────────────────

const getTrackingData = async (rideId, userId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: {
        select: { id: true, fullName: true, phone: true }
      },
      vehicle: {
        select: { make: true, model: true, color: true, registrationNumber: true }
      },
      stops: { orderBy: { sequence: 'asc' } },
      bookingRequests: {
        where: { status: 'ACCEPTED' },
        select: { passengerId: true }
      }
    }
  });

  if (!ride) throw createError('Ride not found.', 404);

  const isDriver = ride.driverId === userId;
  const isAcceptedPassenger = ride.bookingRequests.some((br) => br.passengerId === userId);

  if (!isDriver && !isAcceptedPassenger) {
    throw createError('You do not have permission to track this ride.', 403);
  }

  if (ride.status === 'CANCELLED') {
    throw createError('This ride has been cancelled.', 400);
  }

  const estimatedArrivalMinutes =
    ride.durationMin != null ? Math.max(0, Math.round(ride.durationMin)) : null;

  return {
    rideId: ride.id,
    status: ride.status,
    driver: ride.driver,
    vehicle: ride.vehicle,
    currentLat: ride.currentLat,
    currentLng: ride.currentLng,
    lastLocationAt: ride.lastLocationAt,
    estimatedArrivalMinutes,
    stops: ride.stops,
    startedAt: ride.startedAt,
    departureTime: ride.departureTime
  };
};

// ─── Verify Plate ───────────────────────────────────────────────────

const verifyPlate = async (bookingRequestId, passengerId) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: { ride: true }
  });

  if (!booking) throw createError('Booking request not found.', 404);
  if (booking.passengerId !== passengerId) {
    throw createError('Only the booking passenger can verify the plate.', 403);
  }
  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted to verify plate.', 400);
  }
  if (booking.participantStatus === 'NO_SHOW' || booking.participantStatus === 'DROPPED_OFF') {
    throw createError('Cannot verify plate for this booking status.', 400);
  }

  const updated = await prisma.bookingRequest.update({
    where: { id: bookingRequestId },
    data: {
      plateVerified: true,
      plateVerifiedAt: new Date()
    }
  });

  return {
    id: updated.id,
    plateVerified: updated.plateVerified,
    plateVerifiedAt: updated.plateVerifiedAt
  };
};

// ─── Mark Arrived At Stop ───────────────────────────────────────────

const markArrivedAtStop = async (bookingRequestId, driverId) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: { ride: true }
  });

  if (!booking) throw createError('Booking request not found.', 404);
  if (booking.ride.driverId !== driverId) {
    throw createError('Only the ride driver can mark arrival at stop.', 403);
  }
  if (booking.ride.status !== 'IN_PROGRESS') {
    throw createError('Ride must be in progress.', 400);
  }
  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted.', 400);
  }
  if (booking.participantStatus && booking.participantStatus !== 'BOOKED') {
    throw createError('Passenger is not in BOOKED status.', 400);
  }

  const updated = await prisma.bookingRequest.update({
    where: { id: bookingRequestId },
    data: { arrivedAtStopAt: new Date() }
  });

  return {
    id: updated.id,
    arrivedAtStopAt: updated.arrivedAtStopAt
  };
};

// ─── Mark Picked Up ─────────────────────────────────────────────────

const markPickedUp = async (bookingRequestId, driverId) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: { ride: true }
  });

  if (!booking) throw createError('Booking request not found.', 404);
  if (booking.ride.driverId !== driverId) {
    throw createError('Only the ride driver can mark pickup.', 403);
  }
  if (booking.ride.status !== 'IN_PROGRESS') {
    throw createError('Ride must be in progress.', 400);
  }
  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted.', 400);
  }
  if (booking.participantStatus && booking.participantStatus !== 'BOOKED') {
    throw createError(`Cannot pick up. Passenger status is already: ${booking.participantStatus}.`, 400);
  }
  if (!booking.plateVerified) {
    throw createError('Passenger must verify the vehicle plate before pickup.', 400);
  }

  const updated = await prisma.bookingRequest.update({
    where: { id: bookingRequestId },
    data: {
      participantStatus: 'PICKED_UP',
      pickedUpAt: new Date()
    }
  });

  return {
    id: updated.id,
    participantStatus: updated.participantStatus,
    pickedUpAt: updated.pickedUpAt
  };
};

// ─── Mark No-Show ───────────────────────────────────────────────────

const markNoShow = async (bookingRequestId, driverId) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: {
      ride: true,
      passenger: { select: { id: true, fullName: true } }
    }
  });

  if (!booking) throw createError('Booking request not found.', 404);
  if (booking.ride.driverId !== driverId) {
    throw createError('Only the ride driver can mark no-show.', 403);
  }
  if (booking.ride.status !== 'IN_PROGRESS') {
    throw createError('Ride must be in progress.', 400);
  }
  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted.', 400);
  }
  if (booking.participantStatus && booking.participantStatus !== 'BOOKED') {
    throw createError(`Cannot mark no-show. Passenger status is: ${booking.participantStatus}.`, 400);
  }
  if (!booking.arrivedAtStopAt) {
    throw createError('Driver must mark arrival at stop before marking no-show.', 400);
  }

  const fiveMinutesMs = 5 * 60 * 1000;
  const waitedMs = Date.now() - new Date(booking.arrivedAtStopAt).getTime();

  if (waitedMs < fiveMinutesMs) {
    throw createError('Passenger can only be marked no-show after 5 minutes.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        participantStatus: 'NO_SHOW',
        noShowMarkedAt: new Date()
      }
    });

    await tx.notification.create({
      data: {
        userId: booking.passengerId,
        rideId: booking.rideId,
        channel: 'IN_APP',
        title: 'Marked as No-Show',
        message: 'You were marked as a no-show by the driver.'
      }
    });

    return updated;
  });

  return {
    id: result.id,
    participantStatus: result.participantStatus,
    noShowMarkedAt: result.noShowMarkedAt
  };
};

// ─── Mark Dropped Off ───────────────────────────────────────────────

const markDroppedOff = async (bookingRequestId, driverId) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: { ride: true }
  });

  if (!booking) throw createError('Booking request not found.', 404);
  if (booking.ride.driverId !== driverId) {
    throw createError('Only the ride driver can mark drop-off.', 403);
  }
  if (booking.ride.status !== 'IN_PROGRESS') {
    throw createError('Ride must be in progress.', 400);
  }
  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted.', 400);
  }
  if (booking.participantStatus !== 'PICKED_UP') {
    throw createError('Passenger must be picked up before being dropped off.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        participantStatus: 'DROPPED_OFF',
        droppedOffAt: new Date()
      }
    });

    await tx.notification.create({
      data: {
        userId: booking.passengerId,
        rideId: booking.rideId,
        channel: 'IN_APP',
        title: 'Payment Due',
        message: 'Your payment is now due for this ride.'
      }
    });

    return updated;
  });

  return {
    id: result.id,
    participantStatus: result.participantStatus,
    droppedOffAt: result.droppedOffAt
  };
};

// ─── Complete Ride ──────────────────────────────────────────────────

const completeRide = async (rideId, driverId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      bookingRequests: {
        where: { status: 'ACCEPTED' }
      }
    }
  });

  if (!ride) throw createError('Ride not found.', 404);
  if (ride.driverId !== driverId) {
    throw createError('Only the ride owner can complete this ride.', 403);
  }
  if (ride.status !== 'IN_PROGRESS') {
    throw createError('Only in-progress rides can be completed.', 400);
  }

  const unresolvedBooked = ride.bookingRequests.some(
    (br) => br.participantStatus === 'BOOKED' || br.participantStatus == null
  );

  if (unresolvedBooked) {
    throw createError(
      'All accepted passengers must be picked up, dropped off, or marked no-show before completing the ride.',
      400
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.bookingRequest.updateMany({
      where: {
        rideId,
        status: 'ACCEPTED',
        participantStatus: 'PICKED_UP'
      },
      data: {
        participantStatus: 'DROPPED_OFF',
        droppedOffAt: new Date()
      }
    });

    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    const passengerIds = ride.bookingRequests.map((br) => br.passengerId);
    const notifications = passengerIds.map((pid) => ({
      userId: pid,
      rideId,
      channel: 'IN_APP',
      title: 'Ride Completed',
      message: 'Your ride has been completed. Please rate your experience!'
    }));

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return updatedRide;
  });

  return result;
};

module.exports = {
  startRide,
  getNavigationLink,
  updateLocation,
  getTrackingData,
  verifyPlate,
  markArrivedAtStop,
  markPickedUp,
  markNoShow,
  markDroppedOff,
  completeRide
};