const LegalFacility = require('../models/LegalFacility');

/**
 * Calculates distance in kilometers between two lat/lon coordinates using the Haversine formula.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Find nearby legal facilities based on latitude and longitude coordinates.
 */
const searchNearby = async (lat, lon) => {
    const facilities = await LegalFacility.find({});
    const results = facilities.map(f => {
        const dist = calculateDistance(lat, lon, f.latitude, f.longitude);
        return {
            ...f.toObject(),
            distance: parseFloat(dist.toFixed(2))
        };
    });
    // Sort by distance ascending
    results.sort((a, b) => a.distance - b.distance);
    return results;
};

/**
 * Find legal facilities based on manual city and state text search.
 */
const searchManual = async (city, state) => {
    const query = {};
    if (city) {
        query.city = { $regex: new RegExp(city.trim(), 'i') };
    }
    if (state) {
        query.state = { $regex: new RegExp(state.trim(), 'i') };
    }
    const facilities = await LegalFacility.find(query);
    return facilities.map(f => ({
        ...f.toObject(),
        distance: null
    }));
};

module.exports = { searchNearby, searchManual };
