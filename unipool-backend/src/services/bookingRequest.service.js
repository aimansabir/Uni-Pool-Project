const prisma = require('../lib/prisma');

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
    },
  });

  if (!stop) {
    const err = new Error(`${label} stop is invalid for this ride.`);
    err.statusCode = 400;
    throw err;
  }

  return stop;
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

  const seats = Number(requestedSeats || 1);
  if (!Number.isInteger(seats) || seats < 1) {
    const err = new Error('requestedSeats must be a positive integer.');
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

  await validateStopBelongsToRide(rideId, pickupStopId, 'Pickup');
  await validateStopBelongsToRide(rideId, dropStopId, 'Drop');

  return prisma.$transaction(async (tx) => {
    const request = await tx.bookingRequest.create({
      data: {
        passengerId,
        rideId,
        pickupStopId: pickupStopId || null,
        dropStopId: dropStopId || null,
        requestedSeats: seats,
        note: note || null,
        status: 'PENDING',
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
          },
        },
        pickupStop: true,
        dropStop: true,
      },
    });

    const driverNotification = await tx.notification.create({
      data: {
        userId: request.ride.driverId,
        rideId: request.ride.id,
        channel: 'IN_APP_TOAST',
        status: 'PENDING',
        title:
          request.ride.rideType === 'INSTANT'
            ? 'Instant ride join request'
            : 'New booking request',
        message:
          request.ride.rideType === 'INSTANT'
            ? `${request.passenger.fullName} wants to join your instant ride right away.`
            : `${request.passenger.fullName} requested a seat on your ride.`,
        payload: {
          type:
            request.ride.rideType === 'INSTANT'
              ? 'INSTANT_BOOKING_ALERT'
              : 'STANDARD_BOOKING_REQUEST',
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

    return {
      ...request,
      requestActionLabel:
        request.ride.rideType === 'INSTANT'
          ? 'Join Ride Instantly'
          : 'Request Seat',
      driverNotificationType:
        request.ride.rideType === 'INSTANT'
          ? 'INSTANT_BOOKING_ALERT'
          : 'STANDARD_BOOKING_REQUEST',
      driverNotificationId: driverNotification.id,
    };
  });
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
    const err = new Error('Status must be ACCEPTED or REJECTED.');
    err.statusCode = 400;
    throw err;
  }

  const bookingRequest = await prisma.bookingRequest.findUnique({
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

  if (!bookingRequest) {
    const err = new Error('Booking request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (bookingRequest.ride.driverId !== driverId) {
    const err = new Error('Only the ride driver can respond to this request.');
    err.statusCode = 403;
    throw err;
  }

  if (bookingRequest.status !== 'PENDING') {
    const err = new Error('Only pending requests can be updated by the driver.');
    err.statusCode = 400;
    throw err;
  }

  if (bookingRequest.ride.status !== 'PUBLISHED') {
    const err = new Error('Cannot respond to a request for a non-published ride.');
    err.statusCode = 400;
    throw err;
  }

  if (
    status === 'ACCEPTED' &&
    bookingRequest.ride.seatsAvailable < bookingRequest.requestedSeats
  ) {
    const err = new Error('Not enough seats available to accept this request.');
    err.statusCode = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        status,
        respondedAt: new Date(),
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

    let updatedRide = updatedRequest.ride;

    if (status === 'ACCEPTED') {
      updatedRide = await tx.ride.update({
        where: { id: bookingRequest.rideId },
        data: {
          seatsAvailable: {
            decrement: bookingRequest.requestedSeats,
          },
        },
      });
    }

    const passengerNotification = await tx.notification.create({
      data: {
        userId: bookingRequest.passengerId,
        rideId: bookingRequest.rideId,
        channel: 'IN_APP_TOAST',
        status: 'PENDING',
        title:
          status === 'ACCEPTED'
            ? 'Booking request accepted'
            : 'Booking request rejected',
        message:
          status === 'ACCEPTED'
            ? `Your booking request for the ride from ${bookingRequest.ride.startLocation} to ${bookingRequest.ride.destinationLocation} was accepted.`
            : `Your booking request for the ride from ${bookingRequest.ride.startLocation} to ${bookingRequest.ride.destinationLocation} was rejected.`,
        payload: {
          type:
            status === 'ACCEPTED'
              ? 'BOOKING_REQUEST_ACCEPTED'
              : 'BOOKING_REQUEST_REJECTED',
          bookingRequestId: bookingRequest.id,
          rideId: bookingRequest.rideId,
          passengerId: bookingRequest.passengerId,
          driverId: bookingRequest.ride.driverId,
          requestedSeats: bookingRequest.requestedSeats,
          rideType: bookingRequest.ride.rideType,
          passengerNavigation:
            bookingRequest.ride.rideType === 'INSTANT' && status === 'ACCEPTED'
              ? 'TRACK_RIDE'
              : status === 'ACCEPTED'
              ? 'BOOKING_CONFIRMED'
              : 'REQUEST_REJECTED',
        },
      },
    });

    return {
      ...updatedRequest,
      ride: {
        ...updatedRequest.ride,
        seatsAvailable: updatedRide.seatsAvailable,
      },
      passengerNavigation:
        updatedRequest.ride.rideType === 'INSTANT' && status === 'ACCEPTED'
          ? 'TRACK_RIDE'
          : status === 'ACCEPTED'
          ? 'BOOKING_CONFIRMED'
          : 'REQUEST_REJECTED',
      passengerNotificationId: passengerNotification.id,
      passengerNotificationType:
        status === 'ACCEPTED'
          ? 'BOOKING_REQUEST_ACCEPTED'
          : 'BOOKING_REQUEST_REJECTED',
    };
  });
};

const cancelBookingRequest = async ({ bookingRequestId, passengerId }) => {
  const bookingRequest = await prisma.bookingRequest.findUnique({
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

  if (!bookingRequest) {
    const err = new Error('Booking request not found.');
    err.statusCode = 404;
    throw err;
  }

  if (bookingRequest.passengerId !== passengerId) {
    const err = new Error('Only the passenger can cancel this request.');
    err.statusCode = 403;
    throw err;
  }

  if (!['PENDING', 'ACCEPTED'].includes(bookingRequest.status)) {
    const err = new Error('Only pending or accepted requests can be cancelled.');
    err.statusCode = 400;
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
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

    let updatedRide = updatedRequest.ride;

    if (bookingRequest.status === 'ACCEPTED') {
      updatedRide = await tx.ride.update({
        where: { id: bookingRequest.rideId },
        data: {
          seatsAvailable: {
            increment: bookingRequest.requestedSeats,
          },
        },
      });
    }

    const driverNotification = await tx.notification.create({
      data: {
        userId: bookingRequest.ride.driverId,
        rideId: bookingRequest.rideId,
        channel: 'IN_APP_TOAST',
        status: 'PENDING',
        title: 'Passenger cancelled booking',
        message: `${bookingRequest.passenger.fullName} cancelled their booking before ride start.`,
        payload: {
          type: 'PASSENGER_CANCELLED_RIDE',
          bookingRequestId: bookingRequest.id,
          passengerId: bookingRequest.passengerId,
          passengerName: bookingRequest.passenger.fullName,
          rideId: bookingRequest.rideId,
          pickupStopId: bookingRequest.pickupStopId,
          dropStopId: bookingRequest.dropStopId,
          requestedSeats: bookingRequest.requestedSeats,
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
  getBookingRequestById,
  respondToBookingRequest,
  cancelBookingRequest,
  deleteBookingRequest,
};