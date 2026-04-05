const normalizeLocationKey = (value = '') => {
    return String(value)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
};

const buildRouteKey = (startLocation, destinationLocation) => {
    return `${normalizeLocationKey(startLocation)}__${normalizeLocationKey(destinationLocation)}`;
};

const buildDestinationKey = (destinationLocation) => {
    return normalizeLocationKey(destinationLocation);
};

module.exports = {
    normalizeLocationKey,
    buildRouteKey,
    buildDestinationKey,
};