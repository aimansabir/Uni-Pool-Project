const prisma = require('../lib/prisma');

const createVehicle = async (driverId, { make, model, color, registrationNumber, imageUrl }) => {
    const existing = await prisma.vehicle.findUnique({
        where: { registrationNumber },
    });

    if (existing) {
        throw new Error('A vehicle with this registration number already exists.');
    }

    return prisma.vehicle.create({
        data: {
            driverId,
            make,
            model,
            color,
            registrationNumber,
            imageUrl,
        },
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

    return prisma.vehicle.update({
        where: { id },
        data: {
            make: data.make ?? vehicle.make,
            model: data.model ?? vehicle.model,
            color: data.color ?? vehicle.color,
            imageUrl: data.imageUrl ?? vehicle.imageUrl,
        },
    });
};

const deleteVehicle = async (id, driverId) => {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id },
    });

    if (!vehicle) {
        throw new Error('Vehicle not found.');
    }

    if (vehicle.driverId !== driverId) {
        throw new Error('Unauthorized.');
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