// Dictionary to map equivalent physical locations to a single canonical key
// This ensures that string-based matching works reliably without PostGIS
const LOCATION_ALIASES = {
    'institute-of-business-administration': 'iba-main-campus',
    'iba-karachi': 'iba-main-campus',
    'university-of-karachi': 'ku',
    'karachi-university': 'ku',
    'ned-university': 'ned',
    'habib-university': 'habib',
    'city-campus': 'iba-city-campus',
};

const normalizeLocationKey = (value = '') => {
    const rawKey = String(value).split('|')[0]
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

    // Check if the raw key contains any known synonyms and map it to the canonical version
    for (const [synonym, canonical] of Object.entries(LOCATION_ALIASES)) {
        if (rawKey.includes(synonym)) {
            // Replace the synonym with the canonical version to group equivalent places
            return rawKey.replace(synonym, canonical);
        }
    }

    return rawKey;
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