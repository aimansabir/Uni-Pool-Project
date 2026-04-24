const prisma = require('../lib/prisma');

const createVehicle = async (driverId, { make, model, color, registrationNumber, imageUrl, ownerFullName, ownerName }) => {
    const finalOwnerName = ownerFullName || ownerName;
    const existing = await prisma.vehicle.findUnique({
        where: { registrationNumber },
    });

    if (existing) {
        throw new Error('A vehicle with this registration number already exists.');
    }

    return prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.create({
            data: {
                driverId,
                make,
                model,
                color,
                ownerName: finalOwnerName,
                registrationNumber,
                imageUrl,
            },
        });

        await tx.user.update({
            where: { id: driverId },
            data: { isDriver: true },
        });

        return vehicle;
    });
};

const getMyVehicles = async (driverId) => {
    return prisma.vehicle.findMany({
        where: { driverId },
        orderBy: { createdAt: 'desc' },
    });
};

const getVehicleById = async (id, driverId) => {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id },
    });

    if (!vehicle) {
        throw new Error('Vehicle not found.');
    }

    if (vehicle.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    return vehicle;
};

const updateVehicle = async (id, driverId, data) => {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id },
    });

    if (!vehicle) {
        throw new Error('Vehicle not found.');
    }

    if (vehicle.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    // If registration number is changing, check for uniqueness
    if (data.registrationNumber && data.registrationNumber !== vehicle.registrationNumber) {
        const existing = await prisma.vehicle.findUnique({
            where: { registrationNumber: data.registrationNumber },
        });
        if (existing) {
            throw new Error('A vehicle with this registration number already exists.');
        }
    }

    return prisma.vehicle.update({
        where: { id },
        data: {
            make: data.make ?? vehicle.make,
            model: data.model ?? vehicle.model,
            color: data.color ?? vehicle.color,
            ownerName: data.ownerFullName ?? data.ownerName ?? vehicle.ownerName,
            registrationNumber: data.registrationNumber ?? vehicle.registrationNumber,
            imageUrl: data.imageUrl ?? vehicle.imageUrl,
        },
    });
};

const deleteVehicle = async (id, driverId) => {

    const vehicle = await prisma.vehicle.findUnique({
        where: { id },
    });


    if (!vehicle) {
        const err = new Error('Vehicle not found.');
        err.statusCode = 404;
        throw err;
    }

    if (vehicle.driverId !== driverId) {
        const err = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
    }

    const linkedRide = await prisma.ride.findFirst({
        where: {
            vehicleId: id,
        },
        select: {
            id: true,
            vehicleId: true,
            status: true,
        },
    });

    if (linkedRide) {
        const err = new Error(
            'Cannot delete a vehicle that is attached to existing rides. Delete the ride(s) first.'
        );
        err.statusCode = 400;
        throw err;
    }

    return prisma.vehicle.delete({
        where: { id },
    });
};

module.exports = {
    createVehicle,
    getMyVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
};