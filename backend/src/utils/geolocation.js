// Helper: Haversine distance (meters)
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Map MapMyIndia place_type to granularity
function detectMapMyIndiaGranularity(place_type) {
    if (!place_type)
        return 'unknown';
    switch (place_type.toLowerCase()) {
        case 'house':
        case 'building':
        case 'poi':
            return 'exact';
        case 'street':
        case 'road':
            return 'street';
        case 'locality':
        case 'sublocality':
            return 'neighbourhood';
        case 'city':
        case 'village':
            return 'city';
        case 'district':
        case 'state':
            return 'region';
        case 'country':
            return 'country';
        default:
            return 'unknown';
    }
}
// Fallback coordinates for specific areas in West Bengal
function getAreaBasedFallbackCoordinates(result) {
    const locality = result.locality?.toLowerCase() || '';
    const subLocality = result.subLocality?.toLowerCase() || '';
    const city = result.city?.toLowerCase() || '';
    const district = result.district?.toLowerCase() || '';
    const state = result.state?.toLowerCase() || '';
    let latitude = 0;
    let longitude = 0;
    let locationName = '';
    let granularity = 'unknown'; // Default to unknown instead of city
    // Specific coordinates for Barrackpore area
    if (city.includes('barrackpore') || locality.includes('barrackpore') ||
        locality.includes('chakraborty para') || subLocality.includes('chakraborty para')) {
        latitude = 22.7677;
        longitude = 88.3732;
        locationName = 'Barrackpore, North 24 Parganas';
        granularity = 'neighbourhood'; // More specific for Barrackpore area
    }
    // Jadavpur area
    else if (locality.includes('jadavpur') || subLocality.includes('jadavpur')) {
        latitude = 22.4999;
        longitude = 88.3697;
        locationName = 'Jadavpur, Kolkata';
        granularity = 'neighbourhood';
    }
    // General Kolkata
    else if (city.includes('kolkata') || city.includes('calcutta')) {
        latitude = 22.5726;
        longitude = 88.3639;
        locationName = 'Kolkata';
        granularity = 'city';
    }
    // North 24 Parganas district
    else if (district.includes('north twenty four parganas') || district.includes('north 24 parganas')) {
        latitude = 22.6757;
        longitude = 88.5410;
        locationName = 'North 24 Parganas District';
        granularity = 'region';
    }
    // West Bengal state
    else if (state.includes('west bengal')) {
        latitude = 22.9868;
        longitude = 87.8550;
        locationName = 'West Bengal';
        granularity = 'region';
    }
    else {
        console.log('Cannot determine coordinates for this location');
        return null;
    }
    console.log(`Using area-based fallback coordinates for ${locationName}: ${latitude}, ${longitude}`);
    // Set appropriate radius based on granularity - larger for fallback coordinates
    let estimatedRadiusMeters;
    switch (granularity) {
        case 'exact':
            estimatedRadiusMeters = 50;
            break;
        case 'street':
            estimatedRadiusMeters = 200;
            break;
        case 'neighbourhood':
            estimatedRadiusMeters = 2000; // Increased for neighbourhood fallback
            break;
        case 'city':
            estimatedRadiusMeters = 5000;
            break;
        case 'region':
            estimatedRadiusMeters = 10000; // Increased for region fallback
            break;
        case 'country':
            estimatedRadiusMeters = 50000;
            break;
        case 'unknown':
        default:
            estimatedRadiusMeters = 2000; // Default fallback radius
            break;
    }
    return {
        latitude,
        longitude,
        displayName: result.formattedAddress || result.placeName || locationName,
        osmType: undefined,
        osmClass: undefined,
        type: result.geocodeLevel || result.type,
        boundingbox: undefined,
        granularity,
        estimatedRadiusMeters,
        importance: 0.3, // Lower confidence for fallback coordinates
        raw: result
    };
}
// Get OAuth access token for MapMyIndia
async function getMapMyIndiaAccessToken() {
    try {
        const CLIENT_ID = process.env.MAPMYINDIA_CLIENT_ID;
        const CLIENT_SECRET = process.env.MAPMYINDIA_CLIENT_SECRET;
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error('MapMyIndia client credentials not found in environment variables');
            return null;
        }
        const tokenUrl = 'https://outpost.mapmyindia.com/api/security/oauth/token';
        const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        if (!response.ok) {
            console.error({ event: 'mapmyindia_token_error', status: response.status, statusText: response.statusText });
            return null;
        }
        const data = await response.json();
        return data.access_token;
    }
    catch (error) {
        console.error({ event: 'mapmyindia_token_failure', error: error instanceof Error ? error.message : error });
        return null;
    }
}
// Forward geocoding with MapMyIndia API
export async function getCoordinatesFromMapMyIndia(locationText) {
    try {
        if (!locationText || locationText.trim() === '')
            return null;
        // Get OAuth access token
        const accessToken = await getMapMyIndiaAccessToken();
        if (!accessToken) {
            console.error('Failed to get MapMyIndia access token');
            return null;
        }
        // Check if input is coordinates (lat,lng format) for reverse geocoding
        const coordsMatch = locationText.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordsMatch) {
            // Reverse geocoding - coordinates to address
            const [, lat, lng] = coordsMatch;
            const url = `https://atlas.mapmyindia.com/api/places/reverse-geocode?lat=${lat}&lng=${lng}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                console.error({ event: 'mapmyindia_reverse_geocode_error', status: res.status, statusText: res.statusText });
                return null;
            }
            const data = await res.json();
            if (!data.results || data.results.length === 0)
                return null;
            const result = data.results[0];
            return {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                displayName: result.formatted_address || result.address,
                osmType: undefined,
                osmClass: undefined,
                type: result.type,
                boundingbox: undefined,
                granularity: 'exact',
                estimatedRadiusMeters: 50,
                importance: 1,
                raw: result
            };
        }
        else {
            // Forward geocoding - address to coordinates
            // Use the correct MapMyIndia Atlas API endpoint that returns coordinates
            const url = `https://atlas.mapmyindia.com/api/places/search/json?query=${encodeURIComponent(locationText)}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                console.error({ event: 'mapmyindia_search_error', status: res.status, statusText: res.statusText });
                // Fallback to geocode API if search fails
                const geocodeUrl = `https://atlas.mapmyindia.com/api/places/geocode?address=${encodeURIComponent(locationText)}`;
                const geocodeRes = await fetch(geocodeUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!geocodeRes.ok) {
                    console.error({ event: 'mapmyindia_geocode_error', status: geocodeRes.status, statusText: geocodeRes.statusText });
                    return null;
                }
                const geocodeData = await geocodeRes.json();
                console.log('MapMyIndia Geocode API response:', JSON.stringify(geocodeData, null, 2));
                if (!geocodeData.copResults) {
                    console.log('No copResults in geocode response');
                    return null;
                }
                // Handle geocode response without coordinates - use eLoc to get coordinates
                const result = geocodeData.copResults;
                if (result.eLoc) {
                    // Use eLoc to get coordinates via place details API
                    const elocUrl = `https://atlas.mapmyindia.com/api/places/details/json?place_id=${result.eLoc}`;
                    const elocRes = await fetch(elocUrl, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (elocRes.ok) {
                        const elocData = await elocRes.json();
                        if (elocData.results && elocData.results.length > 0) {
                            const elocResult = elocData.results[0];
                            if (elocResult.geometry && elocResult.geometry.location) {
                                const latitude = parseFloat(elocResult.geometry.location.lat);
                                const longitude = parseFloat(elocResult.geometry.location.lng);
                                const granularity = detectMapMyIndiaGranularity(result.geocodeLevel || result.type);
                                let estimatedRadiusMeters;
                                switch (granularity) {
                                    case 'exact':
                                        estimatedRadiusMeters = 50;
                                        break;
                                    case 'street':
                                        estimatedRadiusMeters = 200;
                                        break;
                                    case 'neighbourhood':
                                        estimatedRadiusMeters = 1000;
                                        break;
                                    case 'city':
                                        estimatedRadiusMeters = 5000;
                                        break;
                                    case 'region':
                                        estimatedRadiusMeters = 50000;
                                        break;
                                    default:
                                        estimatedRadiusMeters = 1000;
                                        break;
                                }
                                return {
                                    latitude,
                                    longitude,
                                    displayName: result.formattedAddress || result.placeName || `${result.street}, ${result.locality}, ${result.city}`,
                                    osmType: undefined,
                                    osmClass: undefined,
                                    type: result.geocodeLevel || result.type,
                                    boundingbox: undefined,
                                    granularity,
                                    estimatedRadiusMeters,
                                    importance: result.confidenceScore || 1,
                                    raw: result
                                };
                            }
                        }
                    }
                }
                // Final fallback for specific areas
                console.log('No coordinates found, using area-based fallback coordinates');
                return getAreaBasedFallbackCoordinates(result);
            }
            const data = await res.json();
            console.log('MapMyIndia Search API response:', JSON.stringify(data, null, 2));
            if (!data.results || data.results.length === 0) {
                console.log('No results in search response');
                return null;
            }
            // Use the first result from search API
            const result = data.results[0];
            let latitude = 0;
            let longitude = 0;
            // Extract coordinates from search API response
            if (result.geometry && result.geometry.location) {
                latitude = parseFloat(result.geometry.location.lat);
                longitude = parseFloat(result.geometry.location.lng);
            }
            else if (result.latitude && result.longitude) {
                latitude = parseFloat(result.latitude);
                longitude = parseFloat(result.longitude);
            }
            else if (result.lat && result.lng) {
                latitude = parseFloat(result.lat);
                longitude = parseFloat(result.lng);
            }
            else {
                console.log('No coordinates in search response, trying fallback');
                return getAreaBasedFallbackCoordinates(result);
            }
            const granularity = detectMapMyIndiaGranularity(result.place_type || result.type);
            // MapMyIndia doesn't provide bounding box in the same format, so we'll estimate
            let estimatedRadiusMeters;
            switch (granularity) {
                case 'exact':
                    estimatedRadiusMeters = 50;
                    break;
                case 'street':
                    estimatedRadiusMeters = 200;
                    break;
                case 'neighbourhood':
                    estimatedRadiusMeters = 1000;
                    break;
                case 'city':
                    estimatedRadiusMeters = 5000;
                    break;
                case 'region':
                    estimatedRadiusMeters = 50000;
                    break;
                default:
                    estimatedRadiusMeters = 1000;
                    break;
            }
            return {
                latitude,
                longitude,
                displayName: result.formatted_address || result.place_name || result.display_name || `${result.place_name || locationText}`,
                osmType: undefined,
                osmClass: undefined,
                type: result.place_type || result.type,
                boundingbox: undefined,
                granularity,
                estimatedRadiusMeters,
                importance: result.relevance || result.confidence || 1,
                raw: result
            };
        }
    }
    catch (err) {
        console.error({ event: 'mapmyindia_geocode_failure', error: err instanceof Error ? err.message : err });
        return null;
    }
}
// Reverse geocode to human-readable address
export async function getHumanReadableLocation(coordinates) {
    try {
        const location = await getCoordinatesFromMapMyIndia(`${coordinates.latitude},${coordinates.longitude}`);
        if (!location)
            return `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        return location.displayName || `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }
    catch (err) {
        console.error({ event: 'human_readable_failure', error: err instanceof Error ? err.message : err });
        return `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }
}
// Convenience format
export function formatCoordinates(coordinates) {
    return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}
