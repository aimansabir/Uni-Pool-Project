const prisma = require('../lib/prisma');
const { buildRouteKey, buildDestinationKey } = require('../utils/routekey');

const upsertActiveSearch = async (userId, data) => {
    const startLocation = data.startLocation || data.pickupLocation || data.pickup || data.start;
    const destinationLocation = data.destinationLocation || data.dropoffLocation || data.dropoff || data.destination;

    if (!startLocation || !destinationLocation) {
        throw new Error('startLocation (pickup) and destinationLocation (dropoff) are required.');
    }

    const routeKey = data.routeKey || buildRouteKey(startLocation, destinationLocation);
    const destinationKey = data.destinationKey || buildDestinationKey(destinationLocation);

    return prisma.activeRouteSearch.upsert({
        where: {
            userId_routeKey: { userId, routeKey },
        },
        update: {
            startLocation,
            destinationLocation,
            destinationKey,
            isActive: true,
            lastSeenAt: new Date(),
        },
        create: {
            userId,
            routeKey,
            destinationKey,
            startLocation,
            destinationLocation,
            isActive: true,
            lastSeenAt: new Date(),
        },
    });
};

const heartbeatActiveSearch = async (userId, id) => {
    const existing = await prisma.activeRouteSearch.findFirst({
        where: {
            id,
            userId,
        },
    });

    if (!existing) {
        throw new Error('Active search not found.');
    }

    return prisma.activeRouteSearch.update({
        where: { id: existing.id },
        data: {
            isActive: true,
            lastSeenAt: new Date(),
        },
    });
};

const deactivateActiveSearch = async (userId, id) => {
    const existing = await prisma.activeRouteSearch.findFirst({
        where: {
            id,
            userId,
        },
    });

    if (!existing) {
        throw new Error('Active search not found.');
    }

    return prisma.activeRouteSearch.update({
        where: { id: existing.id },
        data: {
            isActive: false,
            deactivatedAt: new Date(),
        },
    });
};

module.exports = {
    upsertActiveSearch,
    heartbeatActiveSearch,
    deactivateActiveSearch,
};