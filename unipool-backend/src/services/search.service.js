const prisma = require('../lib/prisma');

const buildOccupancyMix = (acceptedBookings, driverGender) => {
  const maleDriverCount = driverGender === 'male' ? 1 : 0;
  const femaleDriverCount = driverGender === 'female' ? 1 : 0;

  let malePassengerCount = 0;
  let femalePassengerCount = 0;

  for (const booking of acceptedBookings) {
    if (booking.passenger?.gender === 'male') malePassengerCount += 1;
    if (booking.passenger?.gender === 'female') femalePassengerCount += 1;
  }

  return {
    maleDriverCount,
    femaleDriverCount,
    malePassengerCount,
    femalePassengerCount,
    totalOccupants:
      maleDriverCount +
      femaleDriverCount +
      malePassengerCount +
      femalePassengerCount,
    text:
      `${maleDriverCount ? '1 Male Driver' : '1 Female Driver'}, ` +
      `${malePassengerCount} Male Passengers, ${femalePassengerCount} Female Passengers`,
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

const normalize = (value = '') => String(value).trim().toLowerCase();

const buildOrderedStops = (ride) => {
  const confirmedStops = ride.stops
    .filter((stop) => stop.isConfirmed !== false)
    .sort((a, b) => a.sequence - b.sequence);

  return [
    { stopName: ride.startLocation, sequence: -1 },
    ...confirmedStops,
    { stopName: ride.destinationLocation, sequence: Number.MAX_SAFE_INTEGER },
  ];
};

const getPrimaryName = (location = '') => {
  return String(location).split(',')[0].trim();
};

const findStopPosition = (orderedStops, term) => {
  if (!term) return null;

  const q = normalize(term);
  const primaryQ = normalize(getPrimaryName(term));

  // Try exact match or contains first
  let idx = orderedStops.findIndex((stop) =>
    normalize(stop.stopName).includes(q) || q.includes(normalize(stop.stopName))
  );

  // If no match, try primary name match
  if (idx === -1 && primaryQ) {
    idx = orderedStops.findIndex((stop) =>
      normalize(stop.stopName).includes(primaryQ) || primaryQ.includes(normalize(stop.stopName))
    );
  }

  return idx;
};

const matchesRouteDirection = (ride, pickup, dropoff) => {
  const orderedStops = buildOrderedStops(ride);

  const pickupPos = pickup ? findStopPosition(orderedStops, pickup) : null;
  const dropPos = dropoff ? findStopPosition(orderedStops, dropoff) : null;

  // If we searched for it, we must find it
  if (pickup && pickupPos === -1) return false;
  if (dropoff && dropPos === -1) return false;

  if (pickup && dropoff && dropPos <= pickupPos) {
    return false;
  }

  return true;
};

const searchRides = async ({
  pickup,
  dropoff,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  targetSlot,
  rideType,
  onlyUrgent,
}) => {
  const { normalizeLocationKey } = require('../utils/routekey');
  const { haversineMeters, minDistanceToRouteMeters } = require('../utils/geo');
  const pickupKey = pickup ? normalizeLocationKey(pickup) : null;
  const dropoffKey = dropoff ? normalizeLocationKey(dropoff) : null;

  // Fuzzy matching parts
  const primaryPickup = pickup ? getPrimaryName(pickup) : null;
  const primaryDropoff = dropoff ? getPrimaryName(dropoff) : null;

  const where = {
    status: 'PUBLISHED',
    seatsAvailable: { gt: 0 },
    ...(rideType ? { rideType: rideType.toUpperCase() } : {}),
    ...(onlyUrgent === 'true' || onlyUrgent === true ? { isUrgent: true } : {}),
    AND: [
      pickup && !pickupLat // If no coordinates, strictly enforce text match in DB
        ? {
          OR: [
            { startLocation: { contains: pickup, mode: 'insensitive' } },
            { startLocation: { contains: primaryPickup, mode: 'insensitive' } },
            { routeKey: { startsWith: pickupKey || pickup, mode: 'insensitive' } },
            {
              stops: {
                some: {
                  isConfirmed: true,
                  OR: [
                    { stopName: { contains: pickup, mode: 'insensitive' } },
                    { stopName: { contains: primaryPickup, mode: 'insensitive' } }
                  ]
                },
              },
            },
          ],
        }
        : {},
      dropoff && !dropoffLat // If no coordinates, strictly enforce text match in DB
        ? {
          OR: [
            {
              destinationLocation: {
                contains: dropoff,
                mode: 'insensitive',
              },
            },
            {
              destinationLocation: {
                contains: primaryDropoff,
                mode: 'insensitive',
              },
            },
            { destinationKey: { contains: dropoffKey || dropoff, mode: 'insensitive' } },
            { routeKey: { endsWith: dropoffKey || dropoff, mode: 'insensitive' } },
            {
              stops: {
                some: {
                  isConfirmed: true,
                  OR: [
                    { stopName: { contains: dropoff, mode: 'insensitive' } },
                    { stopName: { contains: primaryDropoff, mode: 'insensitive' } }
                  ]
                },
              },
            },
          ],
        }
        : {},
      targetSlot && targetSlot !== 'undefined'
        ? {
          OR: [
            { targetSlot: { contains: targetSlot, mode: 'insensitive' } },
            // Backward compatibility
            { targetSlot: null }
          ]
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

  const filteredRides = rides.filter((ride) => {
    // 1. Fallback text string matching
    const stringMatch = matchesRouteDirection(ride, pickup, dropoff);

    // 2. If no coords provided at all, we must rely entirely on string matching
    if (!pickupLat && !dropoffLat) {
      return stringMatch;
    }

    // 3. Coordinate Threshold / Radius Logic (500 meters)
    const SEARCH_RADIUS_M = 500;
    let pickupMatch = true;
    let dropoffMatch = true;

    // A. Check Pickup Radius
    if (pickupLat && pickupLng) {
      if (ride.routeGeometry && Array.isArray(ride.routeGeometry.coordinates) && ride.routeGeometry.coordinates.length > 0) {
        const startCoord = ride.routeGeometry.coordinates[0];
        const distToStart = haversineMeters(startCoord[1], startCoord[0], Number(pickupLat), Number(pickupLng));
        
        // Match strictly near the start location for now
        pickupMatch = (distToStart <= SEARCH_RADIUS_M);
      } else {
        // Fallback to string match if ride has no geometry (legacy ride)
        pickupMatch = matchesRouteDirection(ride, pickup, null);
      }
    }

    // B. Check Dropoff Radius
    if (dropoffLat && dropoffLng) {
      if (ride.routeGeometry && Array.isArray(ride.routeGeometry.coordinates) && ride.routeGeometry.coordinates.length > 0) {
        const coords = ride.routeGeometry.coordinates;
        const endCoord = coords[coords.length - 1];
        const distToEnd = haversineMeters(endCoord[1], endCoord[0], Number(dropoffLat), Number(dropoffLng));
        
        // Match strictly near the dropoff location
        dropoffMatch = (distToEnd <= SEARCH_RADIUS_M);
      } else {
        dropoffMatch = matchesRouteDirection(ride, null, dropoff);
      }
    }

    // A ride is valid if it passes coordinate radius constraints OR text constraints
    return (pickupMatch && dropoffMatch) || stringMatch;
  });

  return filteredRides.map(mapRideCard);
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

  const confirmedStops = ride.stops.filter((stop) => stop.isConfirmed !== false);

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
    stops: confirmedStops,
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