const prisma = require('../lib/prisma');

const validateRegistration = (regNo) => {
    if (!regNo) return;
    const pattern = /^[A-Z0-9]+-[A-Z0-9]+$/;
    if (!pattern.test(regNo)) {
        const err = new Error('Invalid registration number format. Example: ABC-123');
        err.statusCode = 400;
        throw err;
    }
};
const createVehicle = async (driverId, { make, model, color, registrationNumber, imageUrl, ownerFullName, ownerName }) => {
    if (!make || !model || !registrationNumber) {
        const err = new Error('Make, model, and registration number are required.');
        err.statusCode = 400;
        throw err;
    }

    validateRegistration(registrationNumber);

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
        where: { driverId, isActive: true },
        orderBy: { createdAt: 'desc' },
    });
};

const getVehicleById = async (id, driverId) => {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id },
    });

    if (!vehicle || !vehicle.isActive) {
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

    if (!vehicle || !vehicle.isActive) {
        throw new Error('Vehicle not found.');
    }

    if (vehicle.driverId !== driverId) {
        throw new Error('Unauthorized.');
    }

    // If registration number is changing, check for uniqueness
    if (data.registrationNumber && data.registrationNumber !== vehicle.registrationNumber) {
        validateRegistration(data.registrationNumber);
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

    if (!vehicle || !vehicle.isActive) {
        const err = new Error('Vehicle not found.');
        err.statusCode = 404;
        throw err;
    }

    if (vehicle.driverId !== driverId) {
        const err = new Error('Unauthorized.');
        err.statusCode = 403;
        throw err;
    }

    // Check for PUBLISHED or IN_PROGRESS rides
    const activeRide = await prisma.ride.findFirst({
        where: {
            vehicleId: id,
            status: { in: ['PUBLISHED', 'IN_PROGRESS'] }
        },
    });

    if (activeRide) {
        const err = new Error('Cannot delete a vehicle attached to active or published rides.');
        err.statusCode = 400;
        throw err;
    }

    // Check if the vehicle is attached to any active accepted/pending bookings via a ride
    const activeBooking = await prisma.bookingRequest.findFirst({
        where: {
            ride: { vehicleId: id },
            status: { in: ['PENDING', 'ACCEPTED'] }
        }
    });

    if (activeBooking) {
        const err = new Error('Cannot delete a vehicle that has pending or accepted bookings.');
        err.statusCode = 400;
        throw err;
    }

    // Check if the vehicle has any historical rides
    const anyRide = await prisma.ride.findFirst({
        where: { vehicleId: id }
    });

    if (anyRide) {
        // Soft delete
        return prisma.vehicle.update({
            where: { id },
            data: { isActive: false }
        });
    }

    // Hard delete if never used
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