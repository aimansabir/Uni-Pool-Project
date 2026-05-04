const LANDMARKS = require('../data/landmarks');
const { minDistanceToRouteMeters } = require('../utils/geo');
const { buildRouteKey, buildDestinationKey } = require('../utils/routekey');

const GEOCODER_BASE_URL =
    process.env.ROUTE_GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org';

const ROUTE_ENGINE_BASE_URL =
    process.env.ROUTE_ENGINE_BASE_URL || 'https://router.project-osrm.org';

const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || '';
const NOMINATIM_USER_AGENT =
    process.env.NOMINATIM_USER_AGENT || `uni-pool-backend/1.0 (${NOMINATIM_EMAIL || 'dev'})`;

const LANDMARK_RADIUS_METERS = Number(process.env.LANDMARK_RADIUS_METERS || 700);
const FARE_BASE_PKR = Number(process.env.FARE_BASE_PKR || 60);
const FARE_PER_KM_PKR = Number(process.env.FARE_PER_KM_PKR || 18);
const FARE_MAX_MULTIPLIER = Number(process.env.FARE_MAX_MULTIPLIER || 1.25);

const LOCATION_ALIASES = {
    'Maskan Gate': 'Maskan Chowrangi, Karachi',
    'Maskan Chowrangi': 'Maskan Chowrangi, Karachi',
    'IBA City Campus': 'IBA City Campus Karachi',
    'City Campus': 'IBA City Campus Karachi',
    'IBA Main Campus': 'Institute of Business Administration Karachi Main Campus',
    'Main Campus': 'Institute of Business Administration Karachi Main Campus',
};

const roundToNearest10 = (value) => Math.ceil(value / 10) * 10;

const normalizeLocationQuery = (query = '') => {
    const clean = String(query).trim();
    return LOCATION_ALIASES[clean] || clean;
};

const geocodeSingleAttempt = async (query) => {
    const url = new URL('/search', GEOCODER_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'pk');

    const response = await fetch(url, {
        headers: {
            'User-Agent': NOMINATIM_USER_AGENT,
            ...(NOMINATIM_EMAIL ? { From: NOMINATIM_EMAIL } : {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Geocoding failed for "${query}".`);
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
        throw new Error(`Could not geocode "${query}".`);
    }

    return {
        label: results[0].display_name,
        lat: Number(results[0].lat),
        lng: Number(results[0].lon),
    };
};

const geocodeLocation = async (query) => {
    const normalized = normalizeLocationQuery(query);

    const attempts = [normalized];
    
    // If normalization changed the query, add the original query as a fallback
    if (normalized !== query) {
        attempts.push(query);
    }

    // Generate extended attempts (Karachi/Pakistan suffixes)
    const baseAttempts = [...attempts];
    for (const base of baseAttempts) {
        if (!base.toLowerCase().includes('karachi')) {
            attempts.push(`${base}, Karachi`);
            attempts.push(`${base}, Karachi, Pakistan`);
        } else if (!base.toLowerCase().includes('pakistan')) {
            attempts.push(`${base}, Pakistan`);
        }
    }

    // Filter unique attempts
    const uniqueAttempts = [...new Set(attempts)];

    let lastError = null;

    for (const attempt of uniqueAttempts) {
        try {
            return await geocodeSingleAttempt(attempt);
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(`Could not geocode "${query}".`);
};

const fetchRoutes = async (start, destination) => {
    const coordinates = `${start.lng},${start.lat};${destination.lng},${destination.lat}`;
    const url =
        `${ROUTE_ENGINE_BASE_URL}/route/v1/driving/${coordinates}` +
        '?overview=full&geometries=geojson&steps=true&alternatives=true';

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Route generation failed.');
    }

    const data = await response.json();

    if (!data.routes || !data.routes.length) {
        throw new Error('No route found between selected locations.');
    }

    return data.routes;
};

const detectLandmarksAlongRoute = (routeCoordinates) => {
    const matches = LANDMARKS.map((landmark) => {
        const distance = minDistanceToRouteMeters(routeCoordinates, landmark);
        return { ...landmark, distance };
    })
        .filter((item) => item.distance <= LANDMARK_RADIUS_METERS)
        .sort((a, b) => a.distance - b.distance)
        .map((item, index) => ({
            stopName: item.name,
            sequence: index + 1,
            lat: item.lat,
            lng: item.lng,
            isSuggested: true,
            isConfirmed: false,
        }));

    return matches.slice(0, 6);
};

const computeFareSuggestion = (distanceKm, seatsTotal) => {
    const seatCount = Math.max(Number(seatsTotal) || 1, 1);
    const rawTotal = FARE_BASE_PKR + distanceKm * FARE_PER_KM_PKR;
    const suggestedFarePerSeat = roundToNearest10(rawTotal / seatCount);
    const fareCap = roundToNearest10(suggestedFarePerSeat * FARE_MAX_MULTIPLIER);

    return {
        suggestedFarePerSeat,
        fareCap,
    };
};

const extractRoadHighlights = (route) => {
    const seen = new Set();
    const highlights = [];

    for (const leg of route.legs || []) {
        for (const step of leg.steps || []) {
            const name = String(step.name || '').trim();

            if (!name) continue;
            if (name.length < 4) continue;
            if (seen.has(name.toLowerCase())) continue;

            seen.add(name.toLowerCase());
            highlights.push(name);

            if (highlights.length >= 6) {
                return highlights;
            }
        }
    }

    return highlights;
};

const buildRideIntelligence = async ({
    startLocation,
    destinationLocation,
    startCoords,
    destinationCoords,
    seatsTotal,
    rideType,
    departureTime,
}) => {
    if (!startLocation || !destinationLocation) {
        throw new Error('startLocation and destinationLocation are required.');
    }

    // Prioritize coords from frontend if available
    let start;
    if (startCoords && startCoords.lat && startCoords.lng) {
        start = { label: startLocation, lat: Number(startCoords.lat), lng: Number(startCoords.lng) };
    } else {
        start = await geocodeLocation(startLocation);
    }

    let destination;
    if (destinationCoords && destinationCoords.lat && destinationCoords.lng) {
        destination = { label: destinationLocation, lat: Number(destinationCoords.lat), lng: Number(destinationCoords.lng) };
    } else {
        destination = await geocodeLocation(destinationLocation);
    }

    const routes = await fetchRoutes(start, destination);

    const normalizedRideType = String(rideType || 'SCHEDULED').toUpperCase();

    let resolvedDepartureTime;

    if (normalizedRideType === 'INSTANT') {
        resolvedDepartureTime = new Date(Date.now() + 10 * 60 * 1000);
    } else {
        if (!departureTime) {
            throw new Error('departureTime is required for SCHEDULED rides.');
        }

        resolvedDepartureTime = new Date(departureTime);

        if (Number.isNaN(resolvedDepartureTime.getTime())) {
            throw new Error('Invalid departureTime.');
        }

        if (resolvedDepartureTime <= new Date()) {
            throw new Error('Scheduled departureTime must be in the future.');
        }
    }

    const routeOptions = routes.slice(0, 3).map((route, index) => {
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const durationMin = Math.ceil(route.duration / 60);
        const suggestedLandmarks = detectLandmarksAlongRoute(route.geometry.coordinates);
        const roadHighlights = extractRoadHighlights(route);

        return {
            optionNumber: index + 1,
            isPrimary: index === 0,
            distanceKm,
            durationMin,
            roadHighlights,
            routeGeometry: route.geometry,
            suggestedLandmarks,
        };
    });

    // use the first/best route as primary
    const primaryRoute = routeOptions[0];
    const fareSuggestion = computeFareSuggestion(primaryRoute.distanceKm, seatsTotal);

    return {
        mappingProvider: 'Nominatim + OSRM',
        startPoint: start,
        destinationPoint: destination,

        // old fields kept for compatibility / QA
        routeGeometry: primaryRoute.routeGeometry,
        distanceKm: primaryRoute.distanceKm,
        durationMin: primaryRoute.durationMin,
        suggestedLandmarks: primaryRoute.suggestedLandmarks,
        fareSuggestion,

        rideType: normalizedRideType,
        departureTime: resolvedDepartureTime,
        isUrgent: normalizedRideType === 'INSTANT',
        routeKey: buildRouteKey(startLocation, destinationLocation),
        destinationKey: buildDestinationKey(destinationLocation),

        // new field for frontend choice
        routeOptions,
    };
};

module.exports = {
    geocodeLocation,
    fetchRoutes,
    detectLandmarksAlongRoute,
    computeFareSuggestion,
    buildRideIntelligence,
};