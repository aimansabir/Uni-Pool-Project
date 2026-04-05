const prisma = require('../lib/prisma');
const { buildRouteKey, buildDestinationKey } = require('../utils/routekey');

const upsertRouteSubscription = async (userId, data) => {
    const { startLocation, destinationLocation, channel = 'EMAIL' } = data;

    if (!startLocation || !destinationLocation) {
        throw new Error('startLocation and destinationLocation are required.');
    }

    const routeKey = buildRouteKey(startLocation, destinationLocation);
    const destinationKey = buildDestinationKey(destinationLocation);

    return prisma.routeSubscription.upsert({
        where: {
            userId_routeKey: { userId, routeKey },
        },
        update: {
            startLocation,
            destinationLocation,
            destinationKey,
            channel,
            isActive: true,
        },
        create: {
            userId,
            startLocation,
            destinationLocation,
            routeKey,
            destinationKey,
            channel,
            isActive: true,
        },
    });
};

const getMyRouteSubscriptions = async (userId) => {
    return prisma.routeSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};

const deleteRouteSubscription = async (userId, id) => {
    const existing = await prisma.routeSubscription.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
        throw new Error('Route subscription not found.');
    }

    return prisma.routeSubscription.delete({ where: { id } });
};

module.exports = {
    upsertRouteSubscription,
    getMyRouteSubscriptions,
    deleteRouteSubscription,
};