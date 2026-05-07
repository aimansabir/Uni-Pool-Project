const prisma = require('../lib/prisma');
const { emitToUser } = require('../lib/sseHub');
const { normalizeLocationKey } = require('../utils/routekey');

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

// ── Fuzzy location matching ──────────────────────────────────────
// Uses the same normalizeLocationKey from routekey.js (shared with
// Find Ride search) so that "IBA Main Campus" matches "iba-main-campus".
const locationMatches = (savedLocation, rideLocation) => {
    if (!savedLocation || !rideLocation) return false;
    const s = normalizeLocationKey(savedLocation);
    const r = normalizeLocationKey(rideLocation);
    return s === r || s.includes(r) || r.includes(s);
};

const rideMatchesSubscription = (ride, sub) => {
    const pickupMatch = locationMatches(sub.startLocation, ride.startLocation);
    const dropoffMatch = locationMatches(sub.destinationLocation, ride.destinationLocation);
    if (pickupMatch && dropoffMatch) return true;

    // Fallback: exact routeKey or destinationKey match
    if (sub.routeKey && ride.routeKey && sub.routeKey === ride.routeKey) return true;
    if (sub.destinationKey && ride.destinationKey && sub.destinationKey === ride.destinationKey) return true;

    return false;
};

// ── Main dispatch logic ──────────────────────────────────────────
const dispatchRideNotifications = async (ride) => {
    if (!ride) return;

    // Pull ALL active subscriptions / searches (not pre-filtered by routeKey)
    const [allSubs, allSearches] = await Promise.all([
        prisma.routeSubscription.findMany({
            where: { isActive: true, userId: { not: ride.driverId } },
            include: { user: { select: { id: true, gender: true, ibaEmail: true } } },
        }),
        prisma.activeRouteSearch.findMany({
            where: { isActive: true, userId: { not: ride.driverId } },
            include: { user: { select: { id: true, gender: true } } },
        }),
    ]);

    // Filter by nearby match
    const matchedSubs = allSubs.filter(s => rideMatchesSubscription(ride, s));
    const matchedSearches = allSearches.filter(s => rideMatchesSubscription(ride, s));

    // Gender guard: FEMALES_ONLY → only female users
    const isFemaleOnly = ride.genderPreference === 'FEMALES_ONLY';
    const eligibleSubs = isFemaleOnly
        ? matchedSubs.filter(s => s.user?.gender === 'female')
        : matchedSubs;
    const eligibleSearches = isFemaleOnly
        ? matchedSearches.filter(s => s.user?.gender === 'female')
        : matchedSearches;

    console.log(`[notifications] Ride ${ride.id} (${ride.rideType}) — ` +
        `${allSubs.length} subs checked, ${matchedSubs.length} matched, ${eligibleSubs.length} eligible | ` +
        `${allSearches.length} searches checked, ${matchedSearches.length} matched, ${eligibleSearches.length} eligible`);

    // ── SCHEDULED ride → Route Alert to subscribers ──────────────
    if (ride.rideType === 'SCHEDULED') {
        const msg = `${ride.startLocation} → ${ride.destinationLocation} at ${new Date(
            ride.departureTime
        ).toLocaleString()}`;

        const basePayload = {
            type: 'ROUTE_ALERT_RIDE_AVAILABLE',
            rideId: ride.id,
            routeKey: ride.routeKey,
            destinationKey: ride.destinationKey,
            rideType: ride.rideType,
            startLocation: ride.startLocation,
            destinationLocation: ride.destinationLocation,
            departureTime: ride.departureTime,
            farePerSeat: ride.farePerSeat,
            genderPreference: ride.genderPreference,
            priority: 'NORMAL',
            presentation: 'STANDARD_PUSH',
        };

        for (const sub of eligibleSubs) {
            const channel = sub.channel || 'EMAIL';

            if (channel === 'EMAIL') {
                const notif = await createNotification({
                    userId: sub.userId,
                    rideId: ride.id,
                    channel: 'EMAIL',
                    title: 'New scheduled ride on your saved route',
                    message: msg,
                    payload: basePayload,
                });

                try {
                    const result = await sendEmailIfPossible({
                        to: sub.user.ibaEmail,
                        subject: 'UniPool: New scheduled ride available',
                        text: `${ride.startLocation} → ${ride.destinationLocation}\nDeparture: ${new Date(
                            ride.departureTime).toLocaleString()}\nFare per seat: PKR ${ride.farePerSeat}`,
                    });
                    await prisma.notification.update({
                        where: { id: notif.id },
                        data: { status: result.sent ? 'SENT' : 'PENDING' },
                    });
                } catch (_) {
                    await prisma.notification.update({
                        where: { id: notif.id },
                        data: { status: 'FAILED' },
                    });
                }
            } else {
                const notif = await createNotification({
                    userId: sub.userId,
                    rideId: ride.id,
                    channel: channel,
                    status: 'SENT',
                    title: 'Ride found for your saved route',
                    message: msg,
                    payload: basePayload,
                });

                // Push via SSE — event name: 'ride-notification'
                // Frontend NotificationStream listens for this and checks
                // payload.type === 'ROUTE_ALERT_RIDE_AVAILABLE'
                emitToUser(sub.userId, 'ride-notification', {
                    id: notif.id,
                    ...basePayload,
                    title: 'Ride found for your saved route',
                    message: msg,
                });

                console.log(`[notifications] Emitted route-alert to user ${sub.userId} (notif ${notif.id})`);
            }
        }
    }

    // ── INSTANT ride → Urgent modal to active searchers ──────────
    if (ride.rideType === 'INSTANT') {
        for (const search of eligibleSearches) {
            const payload = {
                type: 'INSTANT_RIDE_AVAILABLE',
                rideId: ride.id,
                routeKey: ride.routeKey,
                destinationKey: ride.destinationKey,
                startLocation: ride.startLocation,
                destinationLocation: ride.destinationLocation,
                departureTime: ride.departureTime,
                farePerSeat: ride.farePerSeat,
                rideType: ride.rideType,
            };

            const notif = await createNotification({
                userId: search.userId,
                rideId: ride.id,
                channel: 'IN_APP_TOAST',
                title: 'Instant ride available now',
                message: `${ride.startLocation} → ${ride.destinationLocation} leaving shortly`,
                payload,
            });

            await prisma.notification.update({
                where: { id: notif.id },
                data: { status: 'SENT' },
            });

            emitToUser(search.userId, 'ride-toast', {
                id: notif.id,
                title: 'Instant ride available now',
                message: `${ride.startLocation} → ${ride.destinationLocation} leaving shortly`,
                ...payload,
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