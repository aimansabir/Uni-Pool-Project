const prisma = require('../lib/prisma');

const buildOccupancyMix = (acceptedBookings, driverGender) => {
  let maleCount = driverGender === 'male' ? 1 : 0;
  let femaleCount = driverGender === 'female' ? 1 : 0;

  for (const booking of acceptedBookings) {
    const passengerGender = booking.passenger?.gender;
    if (passengerGender === 'male') maleCount += booking.requestedSeats || 1;
    if (passengerGender === 'female') femaleCount += booking.requestedSeats || 1;
  }

  return {
    male: maleCount,
    female: femaleCount,
    text: `Occupants: ${maleCount} Male, ${femaleCount} Female`,
  };
};

const mapRideCard = (ride) => {
  const acceptedBookings = ride.bookingRequests.filter(
    (booking) => booking.status === 'ACCEPTED'
  );

  const occupancyMix = buildOccupancyMix(acceptedBookings, ride.driver.gender);

  return {
    id: ride.id,
    rideType: ride.rideType,
    bookingActionLabel:
      ride.rideType === 'INSTANT' ? 'Join Ride Instantly' : 'Request Seat',
    status: ride.status,
    isUrgent: ride.isUrgent,
    startLocation: ride.startLocation,
    destinationLocation: ride.destinationLocation,
    departureTime: ride.departureTime,
    targetSlot: ride.targetSlot,
    seatsTotal: ride.seatsTotal,
    seatsAvailable: ride.seatsAvailable,
    farePerSeat: ride.farePerSeat,
    genderPreference: ride.genderPreference,
    routeKey: ride.routeKey,
    destinationKey: ride.destinationKey,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    suggestedFarePerSeat: ride.suggestedFarePerSeat,
    fareCap: ride.fareCap,
    driver: {
      id: ride.driver.id,
      fullName: ride.driver.fullName,
      gender: ride.driver.gender,
      trustScore: ride.driver.trustScore,
    },
    vehicle: ride.vehicle
      ? {
          id: ride.vehicle.id,
          make: ride.vehicle.make,
          model: ride.vehicle.model,
          color: ride.vehicle.color,
          registrationNumber: ride.vehicle.registrationNumber,
        }
      : null,
    occupancyMix,
  };
};

const searchRides = async ({
  pickup,
  dropoff,
  targetSlot,
  rideType,
  onlyUrgent,
}) => {
  const where = {
    status: 'PUBLISHED',
    seatsAvailable: { gt: 0 },
    ...(rideType ? { rideType } : {}),
    ...(onlyUrgent === 'true' || onlyUrgent === true ? { isUrgent: true } : {}),
    AND: [
      pickup
        ? {
            OR: [
              { startLocation: { contains: pickup, mode: 'insensitive' } },
              { routeKey: { contains: pickup, mode: 'insensitive' } },
              {
                stops: {
                  some: {
                    stopName: { contains: pickup, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {},
      dropoff
        ? {
            OR: [
              {
                destinationLocation: {
                  contains: dropoff,
                  mode: 'insensitive',
                },
              },
              { destinationKey: { contains: dropoff, mode: 'insensitive' } },
              {
                stops: {
                  some: {
                    stopName: { contains: dropoff, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {},
      targetSlot
        ? {
            targetSlot: {
              contains: targetSlot,
              mode: 'insensitive',
            },
          }
        : {},
    ],
  };

  const rides = await prisma.ride.findMany({
    where,
    include: {
      driver: {
        select: {
          id: true,
          fullName: true,
          gender: true,
          trustScore: true,
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
      bookingRequests: {
        where: {
          status: 'ACCEPTED',
        },
        include: {
          passenger: {
            select: {
              id: true,
              gender: true,
            },
          },
        },
      },
    },
    orderBy: [
      { isUrgent: 'desc' },
      { departureTime: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return rides.map(mapRideCard);
};

const getRidePreview = async (rideId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: {
        select: {
          id: true,
          fullName: true,
          gender: true,
          trustScore: true,
          phone: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          color: true,
          registrationNumber: true,
          imageUrl: true,
        },
      },
      stops: {
        orderBy: { sequence: 'asc' },
      },
      bookingRequests: {
        where: {
          status: 'ACCEPTED',
        },
        include: {
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
      },
    },
  });

  if (!ride || ride.status !== 'PUBLISHED') {
    const err = new Error('Ride not found.');
    err.statusCode = 404;
    throw err;
  }

  const occupancyMix = buildOccupancyMix(
    ride.bookingRequests,
    ride.driver.gender
  );

  return {
    id: ride.id,
    rideType: ride.rideType,
    bookingActionLabel:
      ride.rideType === 'INSTANT' ? 'Join Ride Instantly' : 'Request Seat',
    status: ride.status,
    isUrgent: ride.isUrgent,
    startLocation: ride.startLocation,
    destinationLocation: ride.destinationLocation,
    departureTime: ride.departureTime,
    targetSlot: ride.targetSlot,
    seatsTotal: ride.seatsTotal,
    seatsAvailable: ride.seatsAvailable,
    farePerSeat: ride.farePerSeat,
    genderPreference: ride.genderPreference,
    routeKey: ride.routeKey,
    destinationKey: ride.destinationKey,
    routeGeometry: ride.routeGeometry,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    suggestedFarePerSeat: ride.suggestedFarePerSeat,
    fareCap: ride.fareCap,
    mappingProvider: ride.mappingProvider,
    driver: ride.driver,
    vehicle: ride.vehicle,
    stops: ride.stops,
    occupancyMix,
    acceptedPassengers: ride.bookingRequests.map((booking) => ({
      id: booking.id,
      requestedSeats: booking.requestedSeats,
      passenger: booking.passenger,
      pickupStop: booking.pickupStop,
      dropStop: booking.dropStop,
    })),
  };
};

module.exports = {
  searchRides,
  getRidePreview,
};