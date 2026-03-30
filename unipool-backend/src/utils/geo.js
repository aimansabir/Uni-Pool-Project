const toRadians = (deg) => (deg * Math.PI) / 180;

const haversineMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
};

const minDistanceToRouteMeters = (routeCoordinates, point) => {
    if (!Array.isArray(routeCoordinates) || routeCoordinates.length === 0) return Infinity;

    let min = Infinity;

    for (const coord of routeCoordinates) {
        const [lon, lat] = coord;
        const distance = haversineMeters(lat, lon, point.lat, point.lng);
        if (distance < min) min = distance;
    }

    return min;
};

module.exports = {
    haversineMeters,
    minDistanceToRouteMeters,
};