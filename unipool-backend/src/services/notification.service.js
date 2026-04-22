const prisma = require('../lib/prisma');
const { emitToUser } = require('../lib/sseHub');

let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    nodemailer = null;
}

const smtpEnabled =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    nodemailer;

const transporter = smtpEnabled
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
    : null;

const createNotification = async (data) => {
    return prisma.notification.create({ data });
};

const sendEmailIfPossible = async ({ to, subject, text }) => {
    if (!transporter) {
        return { sent: false, reason: 'SMTP not configured' };
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'UniPool <no-reply@unipool.local>',
        to,
        subject,
        text,
    });

    return { sent: true };
};

const dispatchRideNotifications = async (ride) => {
    if (!ride || !ride.routeKey) {
        return;
    }

    const buildRouteMatch = (ride) => {
        const orConditions = [{ routeKey: ride.routeKey }];

        if (ride.destinationKey) {
            orConditions.push({ destinationKey: ride.destinationKey });
        }

        return orConditions;
    };

    const [scheduledSubscribers, activeSearchUsers] = await Promise.all([
        prisma.routeSubscription.findMany({
            where: {
                isActive: true,
                userId: { not: ride.driverId },
                OR: buildRouteMatch(ride),
            },
            include: { user: true },
        }),
        prisma.activeRouteSearch.findMany({
            where: {
                isActive: true,
                userId: { not: ride.driverId },
                OR: buildRouteMatch(ride),
            },
            include: { user: true },
        }),
    ]);

    if (ride.rideType === 'SCHEDULED') {
        for (const subscriber of scheduledSubscribers) {
            const emailNotification = await createNotification({
                userId: subscriber.userId,
                rideId: ride.id,
                channel: 'EMAIL',
                title: 'New scheduled ride on your subscribed route',
                message: `${ride.startLocation} → ${ride.destinationLocation} at ${new Date(
                    ride.departureTime
                ).toLocaleString()}`,
                payload: {
                    rideId: ride.id,
                    routeKey: ride.routeKey,
                    destinationKey: ride.destinationKey,
                    rideType: ride.rideType,
                    departureTime: ride.departureTime,
                    farePerSeat: ride.farePerSeat,
                    priority: 'NORMAL',
                    presentation: 'STANDARD_PUSH',
                },
            });

            await createNotification({
                userId: subscriber.userId,
                rideId: ride.id,
                channel: 'IN_APP',
                status: 'SENT',
                title: 'New scheduled ride available',
                message: `${ride.startLocation} → ${ride.destinationLocation} at ${new Date(
                    ride.departureTime
                ).toLocaleString()}`,
                payload: {
                    rideId: ride.id,
                    routeKey: ride.routeKey,
                    destinationKey: ride.destinationKey,
                    rideType: ride.rideType,
                    departureTime: ride.departureTime,
                    farePerSeat: ride.farePerSeat,
                    priority: 'NORMAL',
                    presentation: 'STANDARD_PUSH',
                },
            });

            try {
                const result = await sendEmailIfPossible({
                    to: subscriber.user.ibaEmail,
                    subject: 'UniPool: New scheduled ride available',
                    text: `${ride.startLocation} → ${ride.destinationLocation}\nDeparture: ${new Date(
                        ride.departureTime
                    ).toLocaleString()}\nFare per seat: PKR ${ride.farePerSeat}`,
                });

                await prisma.notification.update({
                    where: { id: emailNotification.id },
                    data: { status: result.sent ? 'SENT' : 'PENDING' },
                });
            } catch (err) {
                await prisma.notification.update({
                    where: { id: emailNotification.id },
                    data: { status: 'FAILED' },
                });
            }
        }
    }

    if (ride.rideType === 'INSTANT') {
        for (const search of activeSearchUsers) {
            const notification = await createNotification({
                userId: search.userId,
                rideId: ride.id,
                channel: 'IN_APP_TOAST',
                title: 'Instant ride available now',
                message: `${ride.startLocation} → ${ride.destinationLocation} leaving shortly`,
                payload: {
                    rideId: ride.id,
                    routeKey: ride.routeKey,
                    destinationKey: ride.destinationKey,
                    departureTime: ride.departureTime,
                    farePerSeat: ride.farePerSeat,
                    rideType: ride.rideType,
                },
            });

            await prisma.notification.update({
                where: { id: notification.id },
                data: { status: 'SENT' },
            });

            emitToUser(search.userId, 'ride-toast', {
                id: notification.id,
                title: 'Instant ride available now',
                message: `${ride.startLocation} → ${ride.destinationLocation} leaving shortly`,
                rideId: ride.id,
                routeKey: ride.routeKey,
                destinationKey: ride.destinationKey,
                departureTime: ride.departureTime,
                farePerSeat: ride.farePerSeat,
            });
        }
    }
};

const getMyNotifications = async (userId) => {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};

const markNotificationRead = async (userId, id) => {
    const existing = await prisma.notification.findUnique({
        where: { id },
    });

    if (!existing || existing.userId !== userId) {
        const err = new Error('Notification not found.');
        err.statusCode = 404;
        throw err;
    }

    return prisma.notification.update({
        where: { id },
        data: { status: 'READ' },
    });
};

module.exports = {
    dispatchRideNotifications,
    getMyNotifications,
    markNotificationRead,
    sendEmailIfPossible,
};