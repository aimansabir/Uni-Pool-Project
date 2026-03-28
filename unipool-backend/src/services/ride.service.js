const prisma = require('../lib/prisma');

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
        genderPreference,
        isUrgent,
        stops = [],
    } = data;

    if (
        !vehicleId ||
        !startLocation ||
        !destinationLocation ||
        !rideType ||
        seatsTotal == null ||
        farePerSeat == null
    ) {
        throw new Error('vehicleId, startLocation, destinationLocation, rideType, seatsTotal, and farePerSeat are required.');
    }

    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
    });

    if (!vehicle) {
        throw new Error('Vehicle not found.');
    }

    if (vehicle.driverId !== driverId) {
        throw new Error('You can only publish rides using your own vehicle.');
    }

    const normalizedRideType = String(rideType).toUpperCase();

    if (!['SCHEDULED', 'INSTANT'].includes(normalizedRideType)) {
        throw new Error('rideType must be SCHEDULED or INSTANT.');
    }

    const totalSeats = Number(seatsTotal);
    const price = Number(farePerSeat);

    if (Number.isNaN(totalSeats) || totalSeats <= 0) {
        throw new Error('seatsTotal must be a positive number.');
    }

    if (Number.isNaN(price) || price < 0) {
        throw new Error('farePerSeat must be a valid non-negative number.');
    }

    let finalDepartureTime;

    if (normalizedRideType === 'INSTANT') {
        finalDepartureTime = departureTime
            ? new Date(departureTime)
            : new Date(Date.now() + 10 * 60 * 1000);
    } else {
        if (!departureTime) {
            throw new Error('departureTime is required for scheduled rides.');
        }
        finalDepartureTime = new Date(departureTime);
    }

    if (Number.isNaN(finalDepartureTime.getTime())) {
        throw new Error('Invalid departureTime.');
    }

    const formattedStops = Array.isArray(stops)
        ? stops.map((stop, index) => ({
            stopName: stop.stopName,
            sequence: stop.sequence ?? index + 1,
            lat: stop.lat ?? null,
            lng: stop.lng ?? null,
        }))
        : [];

    return prisma.ride.create({
        data: {
            driverId,
            vehicleId,
            startLocation,
            destinationLocation,
            departureTime: finalDepartureTime,
            targetSlot: targetSlot ?? null,
            rideType: normalizedRideType,
            seatsTotal: totalSeats,
            seatsAvailable: totalSeats,
            farePerSeat: price,
            genderPreference: genderPreference ?? 'ANY',
            status: 'PUBLISHED',
            isUrgent: normalizedRideType === 'INSTANT' ? true : Boolean(isUrgent),
            stops: {
                create: formattedStops,
            },
        },
        include: {
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
        },
    });
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
        include: { stops: true },
    });

    if (!existingRide) {
        throw new Error('Ride not found.');
    }

    if (existingRide.driverId !== driverId) {
        throw new Error('Unauthorized.');
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

    const updateData = {
        vehicleId: data.vehicleId ?? existingRide.vehicleId,
        startLocation: data.startLocation ?? existingRide.startLocation,
        destinationLocation: data.destinationLocation ?? existingRide.destinationLocation,
        targetSlot: data.targetSlot ?? existingRide.targetSlot,
        rideType: data.rideType ? String(data.rideType).toUpperCase() : existingRide.rideType,
        seatsTotal: data.seatsTotal != null ? Number(data.seatsTotal) : existingRide.seatsTotal,
        farePerSeat: data.farePerSeat != null ? Number(data.farePerSeat) : existingRide.farePerSeat,
        genderPreference: data.genderPreference ?? existingRide.genderPreference,
        status: data.status ?? existingRide.status,
        isUrgent: data.isUrgent != null ? Boolean(data.isUrgent) : existingRide.isUrgent,
    };

    if (data.departureTime) {
        const parsedDate = new Date(data.departureTime);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new Error('Invalid departureTime.');
        }
        updateData.departureTime = parsedDate;
    }

    if (updateData.seatsTotal <= 0) {
        throw new Error('seatsTotal must be a positive number.');
    }

    if (updateData.farePerSeat < 0) {
        throw new Error('farePerSeat must be a valid non-negative number.');
    }

    if (existingRide.seatsAvailable > updateData.seatsTotal) {
        throw new Error('Cannot reduce seatsTotal below already available capacity logic.');
    }

    updateData.seatsAvailable = Math.min(existingRide.seatsAvailable, updateData.seatsTotal);

    const shouldReplaceStops = Array.isArray(data.stops);

    return prisma.ride.update({
        where: { id: rideId },
        data: {
            ...updateData,
            ...(shouldReplaceStops
                ? {
                    stops: {
                        deleteMany: {},
                        create: data.stops.map((stop, index) => ({
                            stopName: stop.stopName,
                            sequence: stop.sequence ?? index + 1,
                            lat: stop.lat ?? null,
                            lng: stop.lng ?? null,
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
    });

    if (!ride) {
        throw new Error('Ride not found.');
    }

    if (ride.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    return prisma.ride.delete({
        where: { id: rideId },
    });
};

module.exports = {
    createRide,
    getMyRides,
    getRideById,
    updateRide,
    deleteRide,
};