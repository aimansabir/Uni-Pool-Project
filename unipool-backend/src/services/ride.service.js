const prisma = require('../lib/prisma');
const { buildRideIntelligence, computeFareSuggestion } = require('./mapping.service');
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
        selectedRouteOptionNumber,
        startCoords,
        destinationCoords,
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

    // ── Departure time and target slot guard for SCHEDULED rides ──
    if (normalizedRideType === 'SCHEDULED') {
        if (!departureTime) {
            const err = new Error('Departure time is required for scheduled rides.');
            err.statusCode = 400;
            throw err;
        }

        const dep = new Date(departureTime);
        if (isNaN(dep.getTime())) {
            const err = new Error('Invalid departure time.');
            err.statusCode = 400;
            throw err;
        }

        if (dep < new Date()) {
            const err = new Error('Departure time cannot be in the past.');
            err.statusCode = 400;
            throw err;
        }

        if (targetSlot) {
            const match = targetSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
                let hours = parseInt(match[1], 10);
                const minutes = parseInt(match[2], 10);
                const period = match[3] ? match[3].toUpperCase() : null;

                if (period === 'PM' && hours < 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;

                const slotStart = new Date(dep);
                slotStart.setHours(hours, minutes, 0, 0);

                if (slotStart < new Date()) {
                    const err = new Error('This class slot has already started. Please choose a later slot.');
                    err.statusCode = 400;
                    throw err;
                }

                if (dep >= slotStart) {
                    const err = new Error('Departure time must be before the selected class slot starts.');
                    err.statusCode = 400;
                    throw err;
                }
            }
        }
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
        startCoords,
        destinationCoords,
        seatsTotal: seatCount,
        rideType: normalizedRideType,
        departureTime,
    });

    // If driver selected a specific route option, override intelligence with that option's values
    if (selectedRouteOptionNumber != null && intelligence.routeOptions) {
        const chosen = intelligence.routeOptions.find(
            (opt) => opt.optionNumber === Number(selectedRouteOptionNumber)
        );
        if (chosen) {
            intelligence.routeGeometry = chosen.routeGeometry;
            intelligence.distanceKm = chosen.distanceKm;
            intelligence.durationMin = chosen.durationMin;
            intelligence.suggestedLandmarks = chosen.suggestedLandmarks;
            intelligence.fareSuggestion = computeFareSuggestion(chosen.distanceKm, seatCount);
        }
    }

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

    // ── Duplicate ride guard (inside transaction to prevent race conditions) ──
    const ride = await prisma.$transaction(async (tx) => {

        if (normalizedRideType === 'INSTANT') {
            // Block if another PUBLISHED/IN_PROGRESS instant ride for same driver+vehicle exists within ±30 min
            const windowStart = new Date(Date.now() - 30 * 60 * 1000);
            const windowEnd   = new Date(Date.now() + 30 * 60 * 1000);
            const existingInstant = await tx.ride.findFirst({
                where: {
                    driverId,
                    vehicleId,
                    rideType: 'INSTANT',
                    status: { in: ['PUBLISHED', 'IN_PROGRESS'] },
                    departureTime: { gte: windowStart, lte: windowEnd },
                },
                select: { id: true },
            });
            if (existingInstant) {
                const err = new Error('You already have a ride with this vehicle for this slot/time.');
                err.statusCode = 400;
                throw err;
            }
        } else {
            // SCHEDULED: block on same driver + vehicle + same calendar date + same targetSlot (if provided)
            // OR on same departureTime within a ±5 minute window when no targetSlot
            const resolvedDeparture = new Date(intelligence.departureTime);
            const dayStart = new Date(resolvedDeparture);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(resolvedDeparture);
            dayEnd.setHours(23, 59, 59, 999);

            const duplicateWhere = {
                driverId,
                vehicleId,
                status: { in: ['PUBLISHED', 'IN_PROGRESS'] },
                departureTime: { gte: dayStart, lte: dayEnd },
            };

            if (targetSlot) {
                duplicateWhere.targetSlot = targetSlot;
            } else {
                // Exact time mode: block within ±5 min window
                duplicateWhere.departureTime = {
                    gte: new Date(resolvedDeparture.getTime() - 5 * 60 * 1000),
                    lte: new Date(resolvedDeparture.getTime() + 5 * 60 * 1000),
                };
            }

            const existingScheduled = await tx.ride.findFirst({
                where: duplicateWhere,
                select: { id: true },
            });
            if (existingScheduled) {
                const err = new Error('You already have a ride with this vehicle for this slot/time.');
                err.statusCode = 400;
                throw err;
            }
        }

        // All clear — create the ride
        return tx.ride.create({
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
    });

    await dispatchRideNotifications(ride);

    return ride;
};

const getMyRides = async (userId) => {
    // Return rides where user is the driver OR has an accepted booking as passenger
    const rides = await prisma.ride.findMany({
        where: {
            OR: [
                { driverId: userId },
                {
                    bookingRequests: {
                        some: {
                            passengerId: userId,
                            status: 'ACCEPTED',
                        },
                    },
                },
            ],
        },
        include: {
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
            bookingRequests: {
                where: { status: 'ACCEPTED' },
                select: {
                    id: true,
                    passengerId: true,
                    participantStatus: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Add a role flag so frontend knows if user is driver or passenger
    return rides.map(ride => ({
        ...ride,
        userRole: ride.driverId === userId ? 'DRIVER' : 'PASSENGER',
    }));
};


const getRideById = async (rideId, userId) => {
    const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
            driver: {
                select: { id: true, fullName: true, trustScore: true, phone: true, avatarUrl: true }
            },
            vehicle: true,
            stops: {
                orderBy: { sequence: 'asc' },
            },
            bookingRequests: {
                where: {
                    OR: [
                        { status: 'ACCEPTED' },
                        { passengerId: userId }
                    ]
                },
                include: {
                    passenger: {
                        select: {
                            id: true,
                            fullName: true,
                            gender: true,
                            phone: true,
                            avatarUrl: true
                        }
                    },
                    payment: true,
                    ratings: {
                        where: {
                            raterId: userId,
                            ratingType: 'DRIVER_TO_PASSENGER'
                        }
                    }
                },
            },
        },
    });

    if (!ride) {
        throw new Error('Ride not found.');
    }

    const isDriver = ride.driverId === userId;
    const isPassenger = ride.bookingRequests.some(br => br.passengerId === userId);

    if (!isDriver && !isPassenger) {
        throw new Error('Unauthorized.');
    }

    // Enhance booking requests with summary flags for frontend convenience
    const enhancedBookings = ride.bookingRequests.map(br => {
        const pStatus = br.payment?.status;
        const paymentCompleted = pStatus === 'PAID' || pStatus === 'WAIVED' || br.payment?.paidAt != null;
        const ratingCompleted = br.ratings && br.ratings.length > 0;
        
        let settlementCompleted = paymentCompleted;
        if (br.participantStatus === 'NO_SHOW' || pStatus === 'WAIVED') {
            settlementCompleted = true;
        }
        
        return {
            ...br,
            paymentStatus: pStatus || null,
            paymentPaidAt: br.payment?.paidAt || null,
            paymentCompleted,
            ratingCompleted,
            settlementCompleted
        };
    });

    return {
        ...ride,
        bookingRequests: enhancedBookings,
        userRole: isDriver ? 'DRIVER' : 'PASSENGER',
    };
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

        // If driver selected a specific route option, override refreshed values
        if (data.selectedRouteOptionNumber != null && refreshed.routeOptions) {
            const chosen = refreshed.routeOptions.find(
                (opt) => opt.optionNumber === Number(data.selectedRouteOptionNumber)
            );
            if (chosen) {
                refreshed.routeGeometry = chosen.routeGeometry;
                refreshed.distanceKm = chosen.distanceKm;
                refreshed.durationMin = chosen.durationMin;
                refreshed.suggestedLandmarks = chosen.suggestedLandmarks;
                const nextSeats = data.seatsTotal ?? existingRide.seatsTotal;
                refreshed.fareSuggestion = computeFareSuggestion(chosen.distanceKm, nextSeats);
            }
        }
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
                emitToUser(passengerId, 'instant-cancelled-critical', {
                    rideId: ride.id,
                    title: 'Instant Ride Cancelled',
                    message: 'Your instant ride has been cancelled by the driver. Do not wait at the pickup — please find an alternative immediately.',
                    startLocation: ride.startLocation,
                    destinationLocation: ride.destinationLocation,
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

const getDashboardStats = async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const earnedPayments = await prisma.ridePayment.aggregate({
        where: {
            driverId: userId,
            status: 'PAID',
            paidAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { amount: true }
    });

    const splitPayments = await prisma.ridePayment.aggregate({
        where: {
            passengerId: userId,
            paidAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { amount: true }
    });

    const pendingReceivablesAgg = await prisma.ridePayment.aggregate({
        where: { driverId: userId, status: 'PENDING' },
        _sum: { amount: true }
    });

    const pendingPayablesAgg = await prisma.ridePayment.aggregate({
        where: { passengerId: userId, status: 'PENDING', paidAt: null },
        _sum: { amount: true }
    });

    let earned = earnedPayments._sum.amount || 0;
    let split = splitPayments._sum.amount || 0;
    let pendingReceivables = pendingReceivablesAgg._sum.amount || 0;
    let pendingPayables = pendingPayablesAgg._sum.amount || 0;

    // 2. Recent Activities (Include ALL activities: published, pending, completed, cancelled)
    const recentDriverRides = await prisma.ride.findMany({
        where: { driverId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: { stops: true, payments: true }
    });

    const recentPassengerBookings = await prisma.bookingRequest.findMany({
        where: { passengerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: { ride: { include: { stops: true } }, payment: true }
    });

    const formatDate = (date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    let activities = [
        ...recentDriverRides.map(r => {
            const firstStop = r.stops?.[0]?.stopName || r.startLocation;
            const lastStop = r.stops?.[r.stops.length - 1]?.stopName || r.destinationLocation;
            
            let displayStatus = r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase();
            let displayAmount = r.farePerSeat; 

            if (r.status === 'COMPLETED') {
                const paidTotal = r.payments?.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0) || 0;
                const anyPending = r.payments?.some(p => p.status === 'PENDING');
                
                if (paidTotal > 0) {
                    displayStatus = 'Payment Confirmed';
                    displayAmount = paidTotal;
                } else if (anyPending) {
                    displayStatus = 'Pending Payment';
                    displayAmount = 0;
                } else {
                    displayAmount = 0;
                }
            }

            return {
                id: r.id,
                role: 'Driver',
                date: r.completedAt ? formatDate(new Date(r.completedAt)) : formatDate(new Date(r.updatedAt)),
                time: r.completedAt ? formatTime(new Date(r.completedAt)) : formatTime(new Date(r.updatedAt)),
                rawDate: r.completedAt || r.updatedAt,
                from: firstStop,
                to: lastStop,
                amount: displayAmount,
                status: displayStatus
            };
        }),
        ...recentPassengerBookings.map(b => {
            const r = b.ride;
            let displayStatus = b.status.charAt(0).toUpperCase() + b.status.slice(1).toLowerCase();
            let displayAmount = b.requestedSeats * r.farePerSeat;

            if (r.status === 'COMPLETED' && b.participantStatus !== 'NO_SHOW') {
                if (b.payment?.status === 'PAID' || b.payment?.paidAt) {
                    displayStatus = 'Paid';
                    displayAmount = b.payment.amount;
                } else if (b.payment) {
                    displayStatus = 'Pending Payment';
                    displayAmount = 0; 
                } else {
                    displayAmount = 0;
                }
            } else if (b.participantStatus === 'NO_SHOW') {
                displayStatus = 'No Show';
                displayAmount = 0;
            }

            return {
                id: b.id,
                role: 'Passenger',
                date: r.completedAt ? formatDate(new Date(r.completedAt)) : formatDate(new Date(r.updatedAt)),
                time: r.completedAt ? formatTime(new Date(r.completedAt)) : formatTime(new Date(r.updatedAt)),
                rawDate: r.completedAt || r.updatedAt,
                from: b.pickupStopName || r.startLocation,
                to: b.dropoffStopName || r.destinationLocation,
                amount: displayAmount,
                status: displayStatus
            };
        })
    ];

    activities.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    activities = activities.slice(0, 3).map(a => {
        const { rawDate, ...rest } = a;
        return rest;
    });

    return {
        earned,
        split,
        total: earned + split,
        pendingReceivables,
        pendingPayables,
        recentActivities: activities
    };
};

module.exports = {
    createRide,
    getMyRides,
    getRideById,
    updateRide,
    deleteRide,
    getDashboardStats,
};