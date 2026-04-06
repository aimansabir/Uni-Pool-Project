const prisma = require('../lib/prisma');
const { buildRideIntelligence } = require('./mapping.service');
const { dispatchRideNotifications } = require('./notification.service');
const { emitToUser } = require('../lib/sseHub');

const createRide = async (driverId, data) => {
    const {
        vehicleId,
        startLocation,
        destinationLocation,
        departureTime,
        targetSlot,
        rideType,
        seatsTotal,
        farePerSeat,
        genderPreference = 'ANY',
        confirmedStops,
    } = data;

    if (
        !vehicleId ||
        !startLocation ||
        !destinationLocation ||
        !rideType ||
        seatsTotal == null
    ) {
        throw new Error(
            'vehicleId, startLocation, destinationLocation, rideType, and seatsTotal are required.'
        );
    }

    const [driver, vehicle] = await Promise.all([
        prisma.user.findUnique({ where: { id: driverId } }),
        prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    ]);

    if (!driver) {
        throw new Error('Driver not found.');
    }

    if (!vehicle) {
        throw new Error('Vehicle not found.');
    }

    if (vehicle.driverId !== driverId) {
        throw new Error('You can only publish rides using your own vehicle.');
    }

    if (!driver.isVerified) {
        const err = new Error('Only verified users can publish rides.');
        err.statusCode = 403;
        throw err;
    }

    if (!driver.isDriver) {
        const err = new Error('Only users with Driver status can publish rides.');
        err.statusCode = 403;
        throw err;
    }

    const normalizedRideType = String(rideType).toUpperCase();
    if (!['SCHEDULED', 'INSTANT'].includes(normalizedRideType)) {
        const err = new Error('rideType must be SCHEDULED or INSTANT.');
        err.statusCode = 400;
        throw err;
    }

    const normalizedGenderPreference = String(genderPreference).toUpperCase();

    if (!['ANY', 'FEMALES_ONLY'].includes(normalizedGenderPreference)) {
        const err = new Error('genderPreference must be ANY or FEMALES_ONLY.');
        err.statusCode = 400;
        throw err;
    }

    if (
        normalizedGenderPreference === 'FEMALES_ONLY' &&
        !(driver.gender === 'female' && driver.genderVerified)
    ) {
        const err = new Error(
            'Only gender-verified female drivers can publish Females Only rides.'
        );
        err.statusCode = 403;
        throw err;
    }

    const seatCount = Number(seatsTotal);
    if (Number.isNaN(seatCount) || seatCount <= 0) {
        throw new Error('seatsTotal must be a positive number.');
    }

    const intelligence = await buildRideIntelligence({
        startLocation,
        destinationLocation,
        seatsTotal: seatCount,
        rideType: normalizedRideType,
        departureTime,
    });

    const requestedFare =
        farePerSeat != null
            ? Number(farePerSeat)
            : intelligence.fareSuggestion.suggestedFarePerSeat;

    if (Number.isNaN(requestedFare) || requestedFare < 0) {
        throw new Error('farePerSeat must be a valid non-negative number.');
    }

    if (requestedFare > intelligence.fareSuggestion.fareCap) {
        throw new Error(
            `farePerSeat cannot exceed capped limit of PKR ${intelligence.fareSuggestion.fareCap}.`
        );
    }

    if (!Array.isArray(confirmedStops)) {
        const err = new Error(
            'confirmedStops array is required. Confirm suggested stops or send [] if there are no intermediate stops.'
        );
        err.statusCode = 400;
        throw err;
    }

    const stopSource = confirmedStops.map((stop, index) => ({
        stopName: stop.stopName,
        sequence: stop.sequence ?? index + 1,
        lat: stop.lat ?? null,
        lng: stop.lng ?? null,
        isSuggested: false,
        isConfirmed: true,
    }));

    const ride = await prisma.ride.create({
        data: {
            driverId,
            vehicleId,
            startLocation,
            destinationLocation,
            departureTime: intelligence.departureTime,
            targetSlot: targetSlot ?? null,
            rideType: intelligence.rideType,
            seatsTotal: seatCount,
            seatsAvailable: seatCount,
            farePerSeat: requestedFare,
            genderPreference: normalizedGenderPreference,
            status: 'PUBLISHED',
            isUrgent: intelligence.isUrgent,
            routeKey: intelligence.routeKey,
            destinationKey: intelligence.destinationKey,
            routeGeometry: intelligence.routeGeometry,
            distanceKm: intelligence.distanceKm,
            durationMin: intelligence.durationMin,
            suggestedFarePerSeat: intelligence.fareSuggestion.suggestedFarePerSeat,
            fareCap: intelligence.fareSuggestion.fareCap,
            mappingProvider: intelligence.mappingProvider,
            stops: {
                create: stopSource,
            },
        },
        include: {
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
        },
    });

    await dispatchRideNotifications(ride);

    return ride;
};

const getMyRides = async (driverId) => {
    return prisma.ride.findMany({
        where: { driverId },
        include: {
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

const getRideById = async (rideId, driverId) => {
    const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
        },
    });

    if (!ride) {
        throw new Error('Ride not found.');
    }

    if (ride.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    return ride;
};

const updateRide = async (rideId, driverId, data) => {
    const existingRide = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
            stops: true,
        },
    });

    if (!existingRide) {
        throw new Error('Ride not found.');
    }

    if (existingRide.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    const driver = await prisma.user.findUnique({
        where: { id: driverId },
    });

    if (!driver) {
        throw new Error('Driver not found.');
    }

    if (data.vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: data.vehicleId },
        });

        if (!vehicle) {
            throw new Error('Vehicle not found.');
        }

        if (vehicle.driverId !== driverId) {
            throw new Error('You can only use your own vehicle.');
        }
    }

    const nextGenderPreferenceRaw =
        data.genderPreference ?? existingRide.genderPreference;

    const nextGenderPreference = String(nextGenderPreferenceRaw).toUpperCase();

    if (!['ANY', 'FEMALES_ONLY'].includes(nextGenderPreference)) {
        const err = new Error('genderPreference must be ANY or FEMALES_ONLY.');
        err.statusCode = 400;
        throw err;
    }

    if (
        nextGenderPreference === 'FEMALES_ONLY' &&
        !(driver.gender === 'female' && driver.genderVerified)
    ) {
        const err = new Error(
            'Only gender-verified female drivers can publish Females Only rides.'
        );
        err.statusCode = 403;
        throw err;
    }

    const nextRideType = data.rideType
        ? String(data.rideType).toUpperCase()
        : existingRide.rideType;

    if (!['SCHEDULED', 'INSTANT'].includes(nextRideType)) {
        throw new Error('rideType must be SCHEDULED or INSTANT.');
    }

    const shouldRefreshIntelligence =
        data.startLocation ||
        data.destinationLocation ||
        data.seatsTotal != null ||
        data.rideType ||
        data.departureTime;

    let refreshed = null;

    if (shouldRefreshIntelligence) {
        refreshed = await buildRideIntelligence({
            startLocation: data.startLocation ?? existingRide.startLocation,
            destinationLocation:
                data.destinationLocation ?? existingRide.destinationLocation,
            seatsTotal: data.seatsTotal ?? existingRide.seatsTotal,
            rideType: nextRideType,
            departureTime: data.departureTime ?? existingRide.departureTime,
        });
    }

    const updateData = {
        vehicleId: data.vehicleId ?? existingRide.vehicleId,
        startLocation: data.startLocation ?? existingRide.startLocation,
        destinationLocation:
            data.destinationLocation ?? existingRide.destinationLocation,
        targetSlot: data.targetSlot ?? existingRide.targetSlot,
        rideType: nextRideType,
        seatsTotal:
            data.seatsTotal != null ? Number(data.seatsTotal) : existingRide.seatsTotal,
        farePerSeat:
            data.farePerSeat != null
                ? Number(data.farePerSeat)
                : existingRide.farePerSeat,
        genderPreference: nextGenderPreference,
        status: existingRide.status,
        isUrgent: refreshed ? refreshed.isUrgent : existingRide.isUrgent,
        routeKey: refreshed ? refreshed.routeKey : existingRide.routeKey,
        destinationKey: refreshed
            ? refreshed.destinationKey
            : existingRide.destinationKey,
        routeGeometry: refreshed ? refreshed.routeGeometry : existingRide.routeGeometry,
        distanceKm: refreshed ? refreshed.distanceKm : existingRide.distanceKm,
        durationMin: refreshed ? refreshed.durationMin : existingRide.durationMin,
        suggestedFarePerSeat: refreshed
            ? refreshed.fareSuggestion.suggestedFarePerSeat
            : existingRide.suggestedFarePerSeat,
        fareCap: refreshed ? refreshed.fareSuggestion.fareCap : existingRide.fareCap,
        mappingProvider: refreshed
            ? refreshed.mappingProvider
            : existingRide.mappingProvider,
    };

    if (data.departureTime && !refreshed) {
        const parsedDate = new Date(data.departureTime);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new Error('Invalid departureTime.');
        }
        updateData.departureTime = parsedDate;
    } else if (refreshed) {
        updateData.departureTime = refreshed.departureTime;
    }

    if (Number.isNaN(updateData.seatsTotal) || updateData.seatsTotal <= 0) {
        throw new Error('seatsTotal must be a positive number.');
    }

    if (Number.isNaN(updateData.farePerSeat) || updateData.farePerSeat < 0) {
        throw new Error('farePerSeat must be a valid non-negative number.');
    }

    const effectiveFareCap =
        refreshed?.fareSuggestion?.fareCap ??
        existingRide.fareCap ??
        updateData.farePerSeat;

    if (updateData.farePerSeat > effectiveFareCap) {
        throw new Error(
            `farePerSeat cannot exceed capped limit of PKR ${effectiveFareCap}.`
        );
    }

    const reservedSeats = existingRide.seatsTotal - existingRide.seatsAvailable;

    if (updateData.seatsTotal < reservedSeats) {
        const err = new Error('Cannot reduce seatsTotal below already reserved seats.');
        err.statusCode = 400;
        throw err;
    }

    updateData.seatsAvailable = updateData.seatsTotal - reservedSeats;

    const shouldReplaceStops =
        Array.isArray(data.confirmedStops) || Array.isArray(data.stops);

    const incomingStops = Array.isArray(data.confirmedStops)
        ? data.confirmedStops
        : Array.isArray(data.stops)
            ? data.stops
            : [];

    return prisma.ride.update({
        where: { id: rideId },
        data: {
            ...updateData,
            ...(shouldReplaceStops
                ? {
                    stops: {
                        deleteMany: {},
                        create: incomingStops.map((stop, index) => ({
                            stopName: stop.stopName,
                            sequence: stop.sequence ?? index + 1,
                            lat: stop.lat ?? null,
                            lng: stop.lng ?? null,
                            isSuggested: stop.isSuggested ?? false,
                            isConfirmed: stop.isConfirmed ?? true,
                        })),
                    },
                }
                : {}),
        },
        include: {
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
        },
    });
};

const deleteRide = async (rideId, driverId) => {
    const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
            bookingRequests: {
                where: { status: 'ACCEPTED' },
                select: { passengerId: true },
            },
        },
    });

    if (!ride) {
        throw new Error('Ride not found.');
    }

    if (ride.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    if (ride.status !== 'PUBLISHED') {
        const err = new Error(
            'Only published rides can be cancelled. Rides that are in progress, completed, or already cancelled cannot be cancelled.'
        );
        err.statusCode = 400;
        throw err;
    }

    const passengerIds = ride.bookingRequests.map(
        (booking) => booking.passengerId
    );

    if (passengerIds.length > 0) {
        const title = 'Ride Cancelled';

        const message =
            ride.rideType === 'INSTANT'
                ? `Your instant ride from ${ride.startLocation} → ${ride.destinationLocation} has been cancelled by the driver. Please find an alternative immediately.`
                : `Your scheduled ride from ${ride.startLocation} → ${ride.destinationLocation} has been cancelled by the driver. Please find an alternative ride.`;

        await prisma.notification.createMany({
            data: passengerIds.map((passengerId) => ({
                userId: passengerId,
                channel: 'IN_APP_TOAST',
                status: 'SENT',
                title,
                message,
                payload: {
                    type: 'DRIVER_CANCELLED_RIDE',
                    rideId: ride.id,
                    rideType: ride.rideType,
                    startLocation: ride.startLocation,
                    destinationLocation: ride.destinationLocation,
                    severity: ride.rideType === 'INSTANT' ? 'critical' : 'high',
                    presentation: ride.rideType === 'INSTANT' ? 'FULL_SCREEN' : 'STANDARD_PUSH',
                },
            })),
        });

        if (ride.rideType === 'INSTANT') {
            for (const passengerId of passengerIds) {
                emitToUser(passengerId, 'ride-cancelled', {
                    rideId: ride.id,
                    title: 'Ride Cancelled',
                    message:
                        'Your instant ride has been cancelled. Please book an alternative immediately.',
                    severity: 'critical',
                    presentation: 'FULL_SCREEN',
                });
            }
        }
    }

    return prisma.$transaction(async (tx) => {
        // Cancel all active booking requests linked to this ride
        await tx.bookingRequest.updateMany({
            where: {
                rideId,
                status: { in: ['PENDING', 'ACCEPTED'] },
            },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });

        // Mark the ride as cancelled (soft-delete)
        return tx.ride.update({
            where: { id: rideId },
            data: { status: 'CANCELLED' },
        });
    });
};

module.exports = {
    createRide,
    getMyRides,
    getRideById,
    updateRide,
    deleteRide,
};