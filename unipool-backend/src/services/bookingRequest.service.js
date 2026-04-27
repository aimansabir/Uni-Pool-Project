const prisma = require('../lib/prisma');
const { emitToUser } = require('../lib/sseHub');

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'ACCEPTED'];

const getRideForBookingChecks = async (rideId) => {
  return prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: {
        select: {
          id: true,
          fullName: true,
          gender: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          color: true,
          registrationNumber: true,
        },
      },
      stops: {
        orderBy: { sequence: 'asc' },
      },
    },
  });
};

const validateStopBelongsToRide = async (rideId, stopId, label) => {
  if (!stopId) return null;

  const stop = await prisma.rideStop.findFirst({
    where: {
      id: stopId,
      rideId,
      isConfirmed: true,
    },
  });

  if (!stop) {
    const err = new Error(`${label} stop must be a confirmed stop on this ride.`);
    err.statusCode = 400;
    throw err;
  }

  return stop;
};

const ensureStopOrder = (pickupStop, dropStop) => {
  if (pickupStop && dropStop && dropStop.sequence <= pickupStop.sequence) {
    const err = new Error('Drop stop must come after pickup stop on the route.');
    err.statusCode = 400;
    throw err;
  }
};

const createBookingRequest = async ({
  passengerId,
  rideId,
  pickupStopId,
  dropStopId,
  requestedSeats = 1,
  note,
}) => {
  const ride = await getRideForBookingChecks(rideId);

  if (!ride) {
    const err = new Error('Ride not found.');
    err.statusCode = 404;
    throw err;
  }

  if (ride.status !== 'PUBLISHED') {
    const err = new Error('Only published rides can be booked.');
    err.statusCode = 400;
    throw err;
  }

  if (ride.driverId === passengerId) {
    const err = new Error('You cannot book your own ride.');
    err.statusCode = 400;
    throw err;
  }

  const seats = Number(requestedSeats ?? 1);
  if (Number.isNaN(seats) || seats <= 0) {
    const err = new Error('Please select a valid number of seats.');
    err.statusCode = 400;
    throw err;
  }

  if (seats > 1) {
    const err = new Error('Only one seat per booking request is currently supported.');
    err.statusCode = 400;
    throw err;
  }

  if (
    ride.genderPreference === 'FEMALES_ONLY' &&
    ride.driver.gender !== 'female'
  ) {
    const err = new Error('This ride has an invalid females-only configuration.');
    err.statusCode = 400;
    throw err;
  }

  if (ride.seatsAvailable < seats) {
    const err = new Error('Ride does not have enough available seats.');
    err.statusCode = 400;
    throw err;
  }

  const passenger = await prisma.user.findUnique({
    where: { id: passengerId },
    select: {
      id: true,
      fullName: true,
      gender: true,
    },
  });

  if (!passenger) {
    const err = new Error('Passenger not found.');
    err.statusCode = 404;
    throw err;
  }

  if (
    ride.genderPreference === 'FEMALES_ONLY' &&
    passenger.gender === 'male'
  ) {
    const err = new Error('Male passengers cannot join a females-only ride.');
    err.statusCode = 403;
    throw err;
  }

  const existingActiveRequest = await prisma.bookingRequest.findFirst({
    where: {
      rideId,
      passengerId,
      status: {
        in: ACTIVE_BOOKING_STATUSES,
      },
    },
  });

  if (existingActiveRequest) {
    const err = new Error('You already have an active request for this ride.');
    err.statusCode = 409;
    throw err;
  }

  const pickupStop = await validateStopBelongsToRide(rideId, pickupStopId, 'Pickup');
  const dropStop = await validateStopBelongsToRide(rideId, dropStopId, 'Drop');

  ensureStopOrder(pickupStop, dropStop);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.bookingRequest.create({
        data: {
          passengerId,
          rideId,
          pickupStopId: pickupStopId || null,
          dropStopId: dropStopId || null,
          requestedSeats: seats,
          note: note || null,
          status: ride.rideType === 'INSTANT' ? 'ACCEPTED' : 'PENDING',
        },
        include: {
          passenger: {
            select: {
              id: true,
              fullName: true,
              gender: true,
            },
          },
          ride: {
            select: {
              id: true,
              driverId: true,
              rideType: true,
              startLocation: true,
              destinationLocation: true,
              departureTime: true,
              seatsAvailable: true,
              farePerSeat: true,
              isUrgent: true,
              genderPreference: true,
            },
          },
          pickupStop: true,
          dropStop: true,
        },
      });

      const isInstantRide = request.ride.rideType === 'INSTANT';

      // If instant, decrement seats immediately
      if (isInstantRide) {
        if (request.ride.seatsAvailable < request.requestedSeats) {
          throw new Error('This ride just became full.');
        }
        await tx.ride.update({
          where: { id: rideId },
          data: {
            seatsAvailable: {
              decrement: request.requestedSeats,
            },
          },
        });
      }

      const driverNotification = await tx.notification.create({
        data: {
          userId: request.ride.driverId,
          rideId: request.ride.id,
          channel: 'IN_APP_TOAST',
          status: 'PENDING',
          title: isInstantRide
            ? 'Instant ride join request'
            : 'New booking request',
          message: isInstantRide
            ? `${request.passenger.fullName} wants to join your instant ride right away.`
            : `${request.passenger.fullName} requested a seat on your ride.`,
          payload: {
            type: isInstantRide
              ? 'INSTANT_BOOKING_ALERT'
              : 'STANDARD_BOOKING_REQUEST',
            priority: isInstantRide ? 'HIGH' : 'NORMAL',
            presentation: isInstantRide ? 'LIVE_TOAST' : 'STANDARD_PUSH',
            bookingRequestId: request.id,
            passengerId: request.passenger.id,
            passengerName: request.passenger.fullName,
            rideId: request.ride.id,
            pickupStopId: request.pickupStopId,
            dropStopId: request.dropStopId,
            requestedSeats: request.requestedSeats,
          },
        },
      });

      return { request, driverNotification };
    });

    if (result.request.ride.rideType === 'INSTANT') {
      try {
        emitToUser(result.request.ride.driverId, 'ride-toast', {
          type: 'INSTANT_BOOKING_ALERT',
          bookingRequestId: result.request.id,
          rideId: result.request.ride.id,
          passengerId: result.request.passenger.id,
          passengerName: result.request.passenger.fullName,
          requestedSeats: result.request.requestedSeats,
          title: 'Instant ride join request',
          message: `${result.request.passenger.fullName} wants to join your instant ride right away.`,
        });
      } catch (sseError) {
        console.error('Failed to emit instant ride SSE event:', sseError);
      }
    }

    return {
      ...result.request,
      requestActionLabel:
        result.request.ride.rideType === 'INSTANT'
          ? 'Join Ride Instantly'
          : 'Request Seat',
      driverNotificationType:
        result.request.ride.rideType === 'INSTANT'
          ? 'INSTANT_BOOKING_ALERT'
          : 'STANDARD_BOOKING_REQUEST',
      driverNotificationId: result.driverNotification.id,
    };
  } catch (err) {
    if (err.code === 'P2002') {
      const e = new Error('You already have an active request for this ride.');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
};

const listMyBookingRequests = async (passengerId) => {
  return prisma.bookingRequest.findMany({
    where: {
      passengerId,
    },
    include: {
      ride: {
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              gender: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              color: true,
              registrationNumber: true,
            },
          },
        },
      },
      pickupStop: true,
      dropStop: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

const getBookingRequestById = async (bookingRequestId, currentUserId) => {
  const bookingRequest = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: {
      passenger: {
        select: {
          id: true,
          fullName: true,
          gender: true,
        },
      },
      ride: {
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              gender: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              color: true,
              registrationNumber: true,
            },
          },
          stops: {
            orderBy: { sequence: 'asc' },
          },
        },
      },
      pickupStop: true,
      dropStop: true,
    },
  });

  if (!bookingRequest) {
    const err = new Error('Booking request not found.');
    err.statusCode = 404;
    throw err;
  }

  const isPassengerOwner = bookingRequest.passengerId === currentUserId;
  const isRideDriver = bookingRequest.ride.driverId === currentUserId;

  if (!isPassengerOwner && !isRideDriver) {
    const err = new Error('You are not allowed to access this booking request.');
    err.statusCode = 403;
    throw err;
  }

  return bookingRequest;
};

const respondToBookingRequest = async ({
  bookingRequestId,
  driverId,
  status,
}) => {
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    throw createError('Status must be ACCEPTED or REJECTED.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      include: {
        ride: true,
        passenger: {
          select: {
            id: true,
            fullName: true,
            gender: true,
          },
        },
        pickupStop: true,
        dropStop: true,
      },
    });

    if (!current) {
      throw createError('Booking request not found.', 404);
    }

    if (current.ride.driverId !== driverId) {
      throw createError('Only the ride driver can respond to this request.', 403);
    }

    if (current.status !== 'PENDING') {
      throw createError('This booking request has already been processed.', 409);
    }

    if (current.ride.status !== 'PUBLISHED') {
      throw createError('Cannot respond to a request for a non-published ride.', 400);
    }

    let updatedRide = current.ride;

    if (status === 'ACCEPTED') {
      const reserve = await tx.ride.updateMany({
        where: {
          id: current.rideId,
          status: 'PUBLISHED',
          seatsAvailable: {
            gte: current.requestedSeats,
          },
        },
        data: {
          seatsAvailable: {
            decrement: current.requestedSeats,
          },
        },
      });

      if (reserve.count === 0) {
        throw createError('Not enough seats available to accept this request.', 409);
      }

      updatedRide = await tx.ride.findUnique({
        where: { id: current.rideId },
        select: {
          id: true,
          driverId: true,
          startLocation: true,
          destinationLocation: true,
          departureTime: true,
          rideType: true,
          seatsAvailable: true,
          status: true,
          isUrgent: true,
        },
      });
    }

    const mark = await tx.bookingRequest.updateMany({
      where: {
        id: bookingRequestId,
        status: 'PENDING',
      },
      data: {
        status,
        respondedAt: new Date(),
      },
    });

    if (mark.count === 0) {
      throw createError('This booking request has already been processed.', 409);
    }

    const updatedRequest = await tx.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      include: {
        passenger: {
          select: {
            id: true,
            fullName: true,
            gender: true,
          },
        },
        ride: {
          include: {
            driver: {
              select: {
                id: true,
                fullName: true,
                gender: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                color: true,
                registrationNumber: true,
              },
            },
          },
        },
        pickupStop: true,
        dropStop: true,
      },
    });

    const isInstantRide = current.ride.rideType === 'INSTANT';

    const passengerNavigation =
      isInstantRide && status === 'ACCEPTED'
        ? 'TRACK_RIDE'
        : status === 'ACCEPTED'
          ? 'BOOKING_CONFIRMED'
          : 'REQUEST_REJECTED';

    const trackUrl =
      isInstantRide && status === 'ACCEPTED'
        ? `/api/ride-execution/rides/${current.rideId}/track`
        : null;

    const passengerNotification = await tx.notification.create({
      data: {
        userId: current.passengerId,
        rideId: current.rideId,
        channel: 'IN_APP_TOAST',
        status: 'PENDING',
        title:
          status === 'ACCEPTED'
            ? 'Booking request accepted'
            : 'Booking request rejected',
        message:
          status === 'ACCEPTED'
            ? `Your booking request for the ride from ${current.ride.startLocation} to ${current.ride.destinationLocation} was accepted.`
            : `Your booking request for the ride from ${current.ride.startLocation} to ${current.ride.destinationLocation} was rejected.`,
        payload: {
          type:
            status === 'ACCEPTED'
              ? 'BOOKING_REQUEST_ACCEPTED'
              : 'BOOKING_REQUEST_REJECTED',
          priority:
            isInstantRide && status === 'ACCEPTED' ? 'HIGH' : 'NORMAL',
          presentation:
            isInstantRide && status === 'ACCEPTED'
              ? 'LIVE_TOAST'
              : 'STANDARD_PUSH',
          bookingRequestId: current.id,
          rideId: current.rideId,
          passengerId: current.passengerId,
          driverId: current.ride.driverId,
          requestedSeats: current.requestedSeats,
          rideType: current.ride.rideType,
          passengerNavigation,
          ...(trackUrl ? { trackUrl } : {}),
        },
      },
    });

    return {
      ...updatedRequest,
      ride: {
        ...updatedRequest.ride,
        seatsAvailable: updatedRide.seatsAvailable,
      },
      passengerNavigation,
      ...(trackUrl ? { trackUrl } : {}),
      passengerNotificationId: passengerNotification.id,
      passengerNotificationType:
        status === 'ACCEPTED'
          ? 'BOOKING_REQUEST_ACCEPTED'
          : 'BOOKING_REQUEST_REJECTED',
    };
  });
};

const cancelBookingRequest = async ({ bookingRequestId, passengerId }) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      include: {
        ride: true,
        passenger: {
          select: {
            id: true,
            fullName: true,
            gender: true,
          },
        },
        pickupStop: true,
        dropStop: true,
      },
    });

    if (!current) {
      throw createError('Booking request not found.', 404);
    }

    if (current.passengerId !== passengerId) {
      throw createError('Only the passenger can cancel this request.', 403);
    }

    if (!['PENDING', 'ACCEPTED'].includes(current.status)) {
      throw createError('Only pending or accepted requests can be cancelled.', 400);
    }

    if (current.ride.status !== 'PUBLISHED') {
      throw createError('Booking can only be cancelled before the ride starts.', 400);
    }

    const cancelMark = await tx.bookingRequest.updateMany({
      where: {
        id: bookingRequestId,
        status: {
          in: ['PENDING', 'ACCEPTED'],
        },
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    if (cancelMark.count === 0) {
      throw createError('This booking request can no longer be cancelled.', 409);
    }

    let updatedRide = current.ride;

    if (current.status === 'ACCEPTED') {
      const restore = await tx.ride.updateMany({
        where: {
          id: current.rideId,
          status: 'PUBLISHED',
        },
        data: {
          seatsAvailable: {
            increment: current.requestedSeats,
          },
        },
      });

      if (restore.count === 0) {
        throw createError('Booking can only be cancelled before the ride starts.', 400);
      }

      updatedRide = await tx.ride.findUnique({
        where: { id: current.rideId },
      });
    }

    const updatedRequest = await tx.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      include: {
        passenger: {
          select: {
            id: true,
            fullName: true,
            gender: true,
          },
        },
        ride: true,
        pickupStop: true,
        dropStop: true,
      },
    });

    const isInstantRide = current.ride.rideType === 'INSTANT';

    const driverNotification = await tx.notification.create({
      data: {
        userId: current.ride.driverId,
        rideId: current.rideId,
        channel: 'IN_APP_TOAST',
        status: 'PENDING',
        title: 'Passenger cancelled booking',
        message: `${current.passenger.fullName} cancelled their booking before ride start.`,
        payload: {
          type: 'PASSENGER_CANCELLED_RIDE',
          priority: isInstantRide ? 'HIGH' : 'NORMAL',
          presentation: isInstantRide ? 'LIVE_TOAST' : 'STANDARD_PUSH',
          bookingRequestId: current.id,
          passengerId: current.passengerId,
          passengerName: current.passenger.fullName,
          rideId: current.rideId,
          pickupStopId: current.pickupStopId,
          dropStopId: current.dropStopId,
          requestedSeats: current.requestedSeats,
        },
      },
    });

    return {
      ...updatedRequest,
      ride: {
        ...updatedRequest.ride,
        seatsAvailable: updatedRide.seatsAvailable,
      },
      driverNotificationType: 'PASSENGER_CANCELLED_RIDE',
      driverNotificationId: driverNotification.id,
    };
  });
};

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const listIncomingBookingRequests = async (driverId, query = {}) => {
  const { rideId, status } = query;

  const allowedStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];
  const normalizedStatus = status ? String(status).toUpperCase() : null;

  if (normalizedStatus && !allowedStatuses.includes(normalizedStatus)) {
    throw createError(
      'status must be one of PENDING, ACCEPTED, REJECTED, CANCELLED.',
      400
    );
  }

  return prisma.bookingRequest.findMany({
    where: {
      ride: {
        is: {
          driverId,
        },
      },
      ...(rideId ? { rideId } : {}),
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
    },
    include: {
      passenger: {
        select: {
          id: true,
          fullName: true,
          gender: true,
        },
      },
      ride: {
        select: {
          id: true,
          startLocation: true,
          destinationLocation: true,
          departureTime: true,
          rideType: true,
          status: true,
          isUrgent: true,
          seatsAvailable: true,
        },
      },
      pickupStop: true,
      dropStop: true,
    },
    orderBy: [
      { requestedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  });
};

const deleteBookingRequest = async ({ bookingRequestId, passengerId }) => {
  const bookingRequest = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
  });

  if (!bookingRequest) {
    const err = new Error('Booking request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (bookingRequest.passengerId !== passengerId) {
    const err = new Error('Only the passenger can delete this booking request.');
    err.statusCode = 403;
    throw err;
  }

  if (bookingRequest.status === 'ACCEPTED') {
    const err = new Error('Accepted booking requests must be cancelled, not deleted.');
    err.statusCode = 400;
    throw err;
  }

  await prisma.bookingRequest.delete({
    where: { id: bookingRequestId },
  });

  return { id: bookingRequestId };
};

module.exports = {
  createBookingRequest,
  listMyBookingRequests,
  listIncomingBookingRequests,
  getBookingRequestById,
  respondToBookingRequest,
  cancelBookingRequest,
  deleteBookingRequest,
};