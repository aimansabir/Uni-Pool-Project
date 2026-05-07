const prisma = require('../lib/prisma');
const { haversineMeters } = require('../utils/geo');

// ─── Helpers ────────────────────────────────────────────────────────

const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const LOCATION_FRESH_MS = Number(process.env.LOCATION_FRESH_MS || 60_000);
const DEFAULT_FALLBACK_SPEED_KMH = Number(process.env.ETA_FALLBACK_SPEED_KMH || 25);
const FALLBACK_ROAD_FACTOR = Number(process.env.ETA_FALLBACK_ROAD_FACTOR || 1.25);

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasCoords = (lat, lng) => toFiniteNumber(lat) != null && toFiniteNumber(lng) != null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTrackUrl = (rideId) => {
  const baseUrl = process.env.APP_BASE_URL
    ? process.env.APP_BASE_URL.replace(/\/$/, '')
    : '';

  const trackPath = `/api/ride-execution/rides/${rideId}/track`;
  return baseUrl ? `${baseUrl}${trackPath}` : trackPath;
};

const snapshotBookingStops = (booking) => ({
  pickupStopName: booking.pickupStop?.stopName || null,
  dropoffStopName: booking.dropStop?.stopName || null,
  pickupLat: booking.pickupStop?.lat ?? null,
  pickupLng: booking.pickupStop?.lng ?? null,
  dropoffLat: booking.dropStop?.lat ?? null,
  dropoffLng: booking.dropStop?.lng ?? null,
});

const buildWaypointCandidatesFromBookings = (ride) => {
  const points = [];

  for (const br of ride.bookingRequests) {
    if (br.pickupLat != null && br.pickupLng != null) {
      points.push({
        key: `pickup-${br.id}`,
        kind: 'pickup',
        bookingRequestId: br.id,
        passengerId: br.passengerId,
        stopName: br.pickupStopName || br.pickupStop?.stopName || 'Pickup',
        lat: br.pickupLat ?? br.pickupStop?.lat ?? null,
        lng: br.pickupLng ?? br.pickupStop?.lng ?? null,
      });
    }

    if (br.dropoffLat != null && br.dropoffLng != null) {
      points.push({
        key: `dropoff-${br.id}`,
        kind: 'dropoff',
        bookingRequestId: br.id,
        passengerId: br.passengerId,
        stopName: br.dropoffStopName || br.dropStop?.stopName || 'Drop-off',
        lat: br.dropoffLat ?? br.dropStop?.lat ?? null,
        lng: br.dropoffLng ?? br.dropStop?.lng ?? null,
      });
    }
  }

  return points.filter((p) => p.lat != null && p.lng != null);
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

const getRouteAverageSpeedKmh = (ride) => {
  const distanceKm = toFiniteNumber(ride?.distanceKm);
  const durationMin = toFiniteNumber(ride?.durationMin);

  if (!distanceKm || !durationMin || distanceKm <= 0 || durationMin <= 0) {
    return null;
  }

  return clamp(distanceKm / (durationMin / 60), 10, 80);
};

const getFallbackEtaMinutes = (fromLat, fromLng, toLat, toLng, ride) => {
  const startLat = toFiniteNumber(fromLat);
  const startLng = toFiniteNumber(fromLng);
  const endLat = toFiniteNumber(toLat);
  const endLng = toFiniteNumber(toLng);

  if ([startLat, startLng, endLat, endLng].some((value) => value == null)) {
    return null;
  }

  const distanceMeters = haversineMeters(startLat, startLng, endLat, endLng);
  if (!Number.isFinite(distanceMeters)) return null;
  if (distanceMeters < 50) return 0;

  const speedKmh = getRouteAverageSpeedKmh(ride) || DEFAULT_FALLBACK_SPEED_KMH;
  const roadDistanceKm = (distanceMeters / 1000) * FALLBACK_ROAD_FACTOR;
  return Math.max(1, Math.ceil((roadDistanceKm / speedKmh) * 60));
};

const getOsrmEtaMinutes = async (fromLat, fromLng, toLat, toLng) => {
  const startLat = toFiniteNumber(fromLat);
  const startLng = toFiniteNumber(fromLng);
  const endLat = toFiniteNumber(toLat);
  const endLng = toFiniteNumber(toLng);

  if ([startLat, startLng, endLat, endLng].some((value) => value == null)) {
    return null;
  }

  const url = new URL(
    `/route/v1/driving/${startLng},${startLat};${endLng},${endLat}`,
    process.env.ROUTE_ENGINE_BASE_URL || 'https://router.project-osrm.org'
  );
  url.searchParams.set('overview', 'false');

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const durationSeconds = data?.routes?.[0]?.duration;
    if (typeof durationSeconds !== 'number') return null;

    return Math.max(0, Math.round(durationSeconds / 60));
  } catch {
    return null;
  }
};

const getLiveEtaMinutes = async (fromLat, fromLng, toLat, toLng, ride) => {
  const osrmEta = await getOsrmEtaMinutes(fromLat, fromLng, toLat, toLng);
  if (osrmEta != null) return osrmEta;

  return getFallbackEtaMinutes(fromLat, fromLng, toLat, toLng, ride);
};

/** Clamp ETA: null/NaN/Infinity/negative/> MAX → null */
const MAX_ETA_MINUTES = 240;
const clampEta = (eta) => {
  const v = toFiniteNumber(eta);
  if (v == null || v < 0 || v > MAX_ETA_MINUTES) return null;
  return Math.round(v);
};

/** Extract destination coordinates from ride data */
const getDestinationCoords = (ride) => {
  // 1. Last coordinate from routeGeometry
  const coords = ride.routeGeometry?.coordinates;
  if (coords && coords.length >= 2) {
    const last = coords[coords.length - 1]; // [lng, lat]
    if (hasCoords(last[1], last[0])) {
      return { lat: last[1], lng: last[0] };
    }
  }
  // 2. Last ride stop with lat/lng
  if (ride.stops && ride.stops.length > 0) {
    const lastStop = ride.stops[ride.stops.length - 1];
    if (hasCoords(lastStop.lat, lastStop.lng)) {
      return { lat: lastStop.lat, lng: lastStop.lng };
    }
  }
  return null;
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
          },
          pickupStop: true,
          dropStop: true,
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

  // ── Departure time guard (5-min early window allowed) ──
  if (ride.departureTime) {
    const now = new Date();
    const departure = new Date(ride.departureTime);
    const EARLY_GRACE_MS = 5 * 60 * 1000; // allow 5 min early
    if (now < new Date(departure.getTime() - EARLY_GRACE_MS)) {
      const timeStr = departure.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
      throw createError(
        `You can start this ride at departure time (${timeStr}).`,
        400
      );
    }
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

    for (const br of ride.bookingRequests) {
      await tx.bookingRequest.update({
        where: { id: br.id },
        data: {
          participantStatus: 'BOOKED',
          ...snapshotBookingStops(br),
        }
      });
    }

    const paymentData = ride.bookingRequests.map((br) => ({
      rideId,
      bookingRequestId: br.id,
      passengerId: br.passengerId,
      driverId,
      amount: ride.farePerSeat * (br.requestedSeats || 1)
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

  const bookingWaypoints = buildWaypointCandidatesFromBookings(ride);
  const navigationLink =
    bookingWaypoints.length > 0
      ? buildNavigationLink(bookingWaypoints)
      : buildNavigationLink(ride.stops);

  return {
    ride: result,
    navigationLink,
    trackUrl,
    acceptedPassengers: ride.bookingRequests.length,
    waypoints: bookingWaypoints.length > 0 ? bookingWaypoints : ride.stops
  };
};

// ─── Get Navigation Link ────────────────────────────────────────────

const getNavigationLink = async (rideId, driverId) => {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      stops: { orderBy: { sequence: 'asc' } },
      bookingRequests: {
        where: { status: 'ACCEPTED' },
        include: {
          pickupStop: true,
          dropStop: true,
        }
      }
    }
  });

  if (!ride) throw createError('Ride not found.', 404);
  if (ride.driverId !== driverId) {
    throw createError('Only the ride owner can access navigation.', 403);
  }

  const bookingWaypoints = buildWaypointCandidatesFromBookings(ride);
  let navigationLink =
    bookingWaypoints.length > 0
      ? buildNavigationLink(bookingWaypoints)
      : buildNavigationLink(ride.stops);

  // Fallback: use routeGeometry start/end coordinates if no stops had valid lat/lng
  if (!navigationLink && ride.routeGeometry?.coordinates?.length >= 2) {
    const coords = ride.routeGeometry.coordinates;
    const start = coords[0];           // [lng, lat]
    const end = coords[coords.length - 1]; // [lng, lat]
    navigationLink = `https://www.google.com/maps/dir/?api=1&origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}`;
  }

  return {
    navigationLink,
    waypoints: bookingWaypoints.length > 0 ? bookingWaypoints : ride.stops
  };
};

// ─── Update Live Location ───────────────────────────────────────────

const updateLocation = async (rideId, driverId, lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError('lat and lng are required and must be valid numbers.', 400);
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
        include: {
          passenger: {
            select: { id: true, fullName: true, gender: true }
          },
        },
      }
    }
  });

  if (!ride) throw createError('Ride not found.', 404);

  const isDriver = ride.driverId === userId;
  const viewerBooking = ride.bookingRequests.find((br) => br.passengerId === userId);
  const isAcceptedPassenger = Boolean(viewerBooking);

  if (!isDriver && !isAcceptedPassenger) {
    throw createError('You do not have permission to track this ride.', 403);
  }

  if (
    viewerBooking &&
    viewerBooking.participantStatus === 'NO_SHOW'
  ) {
    throw createError('Tracking is not available for this booking status.', 403);
  }

  if (ride.status === 'CANCELLED') {
    throw createError('This ride has been cancelled.', 400);
  }

  // ── driverLocationFresh ───────────────────────────────────────────
  const driverLat = toFiniteNumber(ride.currentLat);
  const driverLng = toFiniteNumber(ride.currentLng);
  const hasDriverLoc = hasCoords(driverLat, driverLng);
  const locationAgeMs = ride.lastLocationAt
    ? Date.now() - new Date(ride.lastLocationAt).getTime()
    : null;
  const driverLocationFresh =
    hasDriverLoc &&
    locationAgeMs != null &&
    locationAgeMs >= 0 &&
    locationAgeMs < LOCATION_FRESH_MS;
  const locationStale = !driverLocationFresh;
  const canUseDriverLocation = hasDriverLoc && driverLocationFresh;

  // ── viewer (passenger) ETA ────────────────────────────────────────
  let etaToPickupMin = null;
  let etaToDropoffMin = null;

  if (viewerBooking && canUseDriverLocation) {
    const status = viewerBooking.participantStatus;

    if (status === 'PICKED_UP' && hasCoords(viewerBooking.dropoffLat, viewerBooking.dropoffLng)) {
      etaToDropoffMin = await getLiveEtaMinutes(
        driverLat,
        driverLng,
        viewerBooking.dropoffLat,
        viewerBooking.dropoffLng,
        ride
      );
    } else if (
      status !== 'DROPPED_OFF' &&
      status !== 'NO_SHOW' &&
      hasCoords(viewerBooking.pickupLat, viewerBooking.pickupLng)
    ) {
      etaToPickupMin = await getLiveEtaMinutes(
        driverLat,
        driverLng,
        viewerBooking.pickupLat,
        viewerBooking.pickupLng,
        ride
      );
    }
  }

  // Keep existing estimatedArrivalMinutes for compatibility with older clients.
  let estimatedArrivalMinutes = etaToPickupMin ?? etaToDropoffMin;

  // ── per-passenger ETAs ────────────────────────────────────────────
  const enrichedBookings = await Promise.all(
    ride.bookingRequests.map(async (br) => {
      let etaToPickupMinutes = null;
      let etaToDropoffMinutes = null;

      try {
        if (canUseDriverLocation && (br.participantStatus === 'BOOKED' || !br.participantStatus) &&
            hasCoords(br.pickupLat, br.pickupLng)) {
          etaToPickupMinutes = clampEta(await getLiveEtaMinutes(
            driverLat, driverLng, br.pickupLat, br.pickupLng, ride
          ));
        }
        if (canUseDriverLocation && br.participantStatus === 'PICKED_UP' &&
            hasCoords(br.dropoffLat, br.dropoffLng)) {
          etaToDropoffMinutes = clampEta(await getLiveEtaMinutes(
            driverLat, driverLng, br.dropoffLat, br.dropoffLng, ride
          ));
        }
      } catch { /* OSRM failure — return null for this booking */ }

      return {
        id: br.id,
        passengerId: br.passengerId,
        participantStatus: br.participantStatus,
        plateVerified: br.plateVerified,
        pickupLat: br.pickupLat,
        pickupLng: br.pickupLng,
        dropoffLat: br.dropoffLat,
        dropoffLng: br.dropoffLng,
        pickupStopName: br.pickupStopName,
        dropoffStopName: br.dropoffStopName,
        arrivedAtStopAt: br.arrivedAtStopAt ?? null,
        pickedUpAt: br.pickedUpAt ?? null,
        droppedOffAt: br.droppedOffAt ?? null,
        noShowMarkedAt: br.noShowMarkedAt ?? null,
        etaToPickupMin: etaToPickupMinutes,
        etaToDropoffMin: etaToDropoffMinutes,
        etaToPickupMinutes,
        etaToDropoffMinutes,
        passenger: br.passenger,
      };
    })
  );

  // ── nextWaypoint + nextStopEtaMinutes for driver ─────────────────
  let nextStopEtaMinutes = null;
  let nextWaypoint = null;
  const destCoords = getDestinationCoords(ride);

  try {
    if (canUseDriverLocation) {
      // Priority A: first BOOKED passenger pickup
      const nextBooked = enrichedBookings.find(
        (b) => (b.participantStatus === 'BOOKED' || !b.participantStatus) && hasCoords(b.pickupLat, b.pickupLng)
      );
      if (nextBooked) {
        nextStopEtaMinutes = nextBooked.etaToPickupMinutes;
        nextWaypoint = {
          type: 'PICKUP',
          bookingRequestId: nextBooked.id,
          passengerName: nextBooked.passenger?.fullName || 'Passenger',
          label: `ETA to pickup: ${nextBooked.passenger?.fullName || 'Passenger'}`,
          lat: nextBooked.pickupLat,
          lng: nextBooked.pickupLng,
          etaMinutes: nextBooked.etaToPickupMinutes,
        };
      } else {
        // Priority B: first PICKED_UP passenger dropoff
        const nextDropoff = enrichedBookings.find(
          (b) => b.participantStatus === 'PICKED_UP'
        );
        if (nextDropoff) {
          if (hasCoords(nextDropoff.dropoffLat, nextDropoff.dropoffLng)) {
            nextStopEtaMinutes = nextDropoff.etaToDropoffMinutes;
            nextWaypoint = {
              type: 'DROPOFF',
              bookingRequestId: nextDropoff.id,
              passengerName: nextDropoff.passenger?.fullName || 'Passenger',
              label: `ETA to drop-off: ${nextDropoff.passenger?.fullName || 'Passenger'}`,
              lat: nextDropoff.dropoffLat,
              lng: nextDropoff.dropoffLng,
              etaMinutes: nextDropoff.etaToDropoffMinutes,
            };
          } else if (destCoords) {
            // Passenger has no selected drop stop → use destination
            const destEta = clampEta(await getLiveEtaMinutes(
              driverLat, driverLng, destCoords.lat, destCoords.lng, ride
            ));
            nextStopEtaMinutes = destEta;
            nextWaypoint = {
              type: 'DESTINATION',
              bookingRequestId: null,
              passengerName: null,
              label: 'ETA to destination',
              lat: destCoords.lat,
              lng: destCoords.lng,
              etaMinutes: destEta,
            };
          }
        } else if (destCoords) {
          // Priority C: no actionable passengers → destination
          const destEta = clampEta(await getLiveEtaMinutes(
            driverLat, driverLng, destCoords.lat, destCoords.lng, ride
          ));
          nextStopEtaMinutes = destEta;
          nextWaypoint = {
            type: 'DESTINATION',
            bookingRequestId: null,
            passengerName: null,
            label: 'ETA to destination',
            lat: destCoords.lat,
            lng: destCoords.lng,
            etaMinutes: destEta,
          };
        }
      }
    }
  } catch { /* OSRM failure — return null */ }

  // Clamp viewer ETA as well
  etaToPickupMin = clampEta(etaToPickupMin);
  etaToDropoffMin = clampEta(etaToDropoffMin);

  if (estimatedArrivalMinutes == null && isDriver) {
    estimatedArrivalMinutes = nextStopEtaMinutes;
  }
  estimatedArrivalMinutes = clampEta(estimatedArrivalMinutes);
  nextStopEtaMinutes = clampEta(nextStopEtaMinutes);

  return {
    rideId: ride.id,
    status: ride.status,
    driverId: ride.driverId,
    driver: ride.driver,
    vehicle: ride.vehicle,
    currentLat: driverLat,
    currentLng: driverLng,
    lastLocationAt: ride.lastLocationAt,
    hasDriverLocation: hasDriverLoc,
    driverLocationFresh,
    locationStale,
    locationAgeSeconds: locationAgeMs == null ? null : Math.max(0, Math.round(locationAgeMs / 1000)),
    etaToPickupMin,
    etaToDropoffMin,
    estimatedArrivalMinutes,
    nextStopEtaMinutes,
    nextWaypoint,
    stops: ride.stops,
    startedAt: ride.startedAt,
    departureTime: ride.departureTime,
    startLocation: ride.startLocation,
    destinationLocation: ride.destinationLocation,
    bookingRequests: enrichedBookings,
  };
};

// ─── Verify Plate ───────────────────────────────────────────────────

const verifyPlate = async (bookingRequestId, passengerId, registrationNumber) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: {
      ride: {
        include: {
          vehicle: {
            select: {
              registrationNumber: true
            }
          }
        }
      }
    }
  });

  if (!booking) throw createError('Booking request not found.', 404);

  if (booking.passengerId !== passengerId) {
    throw createError('Only the booking passenger can verify the plate.', 403);
  }

  if (booking.status !== 'ACCEPTED') {
    throw createError('Booking must be accepted to verify plate.', 400);
  }

  if (
    booking.participantStatus === 'NO_SHOW' ||
    booking.participantStatus === 'DROPPED_OFF'
  ) {
    throw createError('Cannot verify plate for this booking status.', 400);
  }

  if (!registrationNumber || typeof registrationNumber !== 'string') {
    throw createError('registrationNumber is required for plate verification.', 400);
  }

  const submitted = registrationNumber.trim().toUpperCase();
  const actual = booking.ride.vehicle.registrationNumber.trim().toUpperCase();

  if (submitted !== actual) {
    throw createError(
      'The provided registration number does not match the ride vehicle.',
      400
    );
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

    await tx.ride.update({
      where: { id: booking.rideId },
      data: {
        seatsAvailable: {
          increment: booking.requestedSeats || 1
        }
      }
    });

    const existingPayment = await tx.ridePayment.findUnique({
      where: { bookingRequestId: bookingRequestId }
    });

    if (existingPayment && existingPayment.status !== 'PAID') {
      await tx.ridePayment.update({
        where: { bookingRequestId: bookingRequestId },
        data: {
          status: 'WAIVED'
        }
      });
    }

    await tx.notification.create({
      data: {
        userId: booking.passengerId,
        rideId: booking.rideId,
        channel: 'IN_APP',
        title: 'Marked as No-Show',
        message: 'You were marked as a no-show by the driver. Your seat has been released.'
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
        message: 'Your payment is now due for this ride.',
        payload: {
          bookingRequestId: booking.id,
          rideId: booking.rideId,
          type: 'PAYMENT_DUE'
        }
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
    const autoDropped = await tx.bookingRequest.findMany({
      where: {
        rideId,
        status: 'ACCEPTED',
        participantStatus: 'PICKED_UP'
      }
    });

    if (autoDropped.length > 0) {
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
    }

    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    const finalBookings = await tx.bookingRequest.findMany({
      where: {
        rideId,
        status: 'ACCEPTED'
      },
      select: {
        id: true,
        passengerId: true,
        participantStatus: true
      }
    });

    const droppedOffPassengers = finalBookings.filter(
      (br) => br.participantStatus === 'DROPPED_OFF'
    );

    const passengerNotifications = droppedOffPassengers.map((br) => ({
      userId: br.passengerId,
      rideId,
      channel: 'IN_APP',
      title: 'Ride Completed',
      message: 'Your ride has been completed. Please rate your experience!',
      payload: {
        type: 'RATE_DRIVER',
        rideId,
        bookingRequestId: br.id
      }
    }));

    const driverNotifications = droppedOffPassengers.map((br) => ({
      userId: driverId,
      rideId,
      channel: 'IN_APP',
      title: 'Rate Passenger',
      message: 'Please rate a passenger who completed this ride.',
      payload: {
        type: 'RATE_PASSENGER',
        rideId,
        bookingRequestId: br.id,
        passengerId: br.passengerId
      }
    }));

    const paymentNotifications = autoDropped.map((br) => ({
      userId: br.passengerId,
      rideId,
      channel: 'IN_APP',
      title: 'Payment Due',
      message: 'Your payment is now due for this ride.',
      payload: {
        type: 'PAYMENT_DUE',
        rideId,
        bookingRequestId: br.id
      }
    }));

    const allNotifications = [
      ...passengerNotifications,
      ...driverNotifications,
      ...paymentNotifications
    ];

    if (allNotifications.length > 0) {
      await tx.notification.createMany({ data: allNotifications });
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
