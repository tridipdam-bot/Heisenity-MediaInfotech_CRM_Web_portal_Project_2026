let tokenCache = null;
/* ===================================================================
   CONSTANTS
   NOTE: Updated endpoints for current Mappls API
=================================================================== */
const TOKEN_URL = 'https://outpost.mapmyindia.com/api/security/oauth/token';
const GEOCODE_URL = 'https://apis.mapmyindia.com/advancedmaps/v1';
const ATLAS_GEOCODE_URL = 'https://atlas.mapmyindia.com/api/places/geocode';
const ATLAS_SEARCH_URL = 'https://atlas.mapmyindia.com/api/places/search/json';
const ELOC_URL = 'https://atlas.mapmyindia.com/api/places/eloc/json';
/* ===================================================================
   SMALL HELPERS
=================================================================== */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export function formatCoordinates(c) {
    return `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`;
}
function detectGranularity(type) {
    if (!type)
        return 'unknown';
    switch (type.toLowerCase()) {
        case 'house':
        case 'building':
        case 'poi':
        case 'premise':
            return 'exact';
        case 'street':
        case 'road':
        case 'route':
            return 'street';
        case 'locality':
        case 'sublocality':
        case 'neighbourhood':
            return 'neighbourhood';
        case 'city':
        case 'town':
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
function radiusFor(granularity) {
    return {
        exact: 50,
        street: 200,
        neighbourhood: 1000,
        city: 5000,
        region: 50000,
        country: 100000,
        unknown: 2000
    }[granularity] ?? 2000;
}
/* ===================================================================
   TOKEN
=================================================================== */
async function safeReadText(res) {
    try {
        return await res.text();
    }
    catch {
        return '';
    }
}
async function getAccessToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 5000) {
        return tokenCache.accessToken;
    }
    const id = process.env.MAPMYINDIA_CLIENT_ID;
    const secret = process.env.MAPMYINDIA_CLIENT_SECRET;
    if (!id || !secret) {
        console.error('MapMyIndia credentials missing: set MAPMYINDIA_CLIENT_ID and MAPMYINDIA_CLIENT_SECRET');
        return null;
    }
    try {
        const res = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        if (!res.ok) {
            const body = await safeReadText(res);
            console.error('MapMyIndia token request failed', res.status, body);
            return null;
        }
        const data = await res.json();
        const token = data.access_token || data.accessToken;
        const expiresIn = Number(data.expires_in || data.expiresIn || 3600);
        if (!token) {
            console.error('MapMyIndia token response missing access_token', data);
            return null;
        }
        tokenCache = {
            accessToken: token,
            expiresAt: Date.now() + expiresIn * 1000
        };
        return tokenCache.accessToken;
    }
    catch (err) {
        console.error('Failed to fetch MapMyIndia token', err);
        return null;
    }
}
/* ===================================================================
   eLoc → Coordinates (CORRECT ENDPOINT)
=================================================================== */
async function resolveELoc(token, eLoc) {
    try {
        const res = await fetch(`${ELOC_URL}?eloc=${encodeURIComponent(eLoc)}`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const body = await safeReadText(res);
            console.error('eLoc lookup failed', res.status, body);
            return null;
        }
        const data = await res.json();
        const lat = Number(data.latitude ?? data.lat);
        const lng = Number(data.longitude ?? data.lng);
        return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
    }
    catch (err) {
        console.error('eLoc resolution error', err);
        return null;
    }
}
/* ===================================================================
   MAIN FUNCTION
   - Multiple fallback approaches for MapMyIndia/Mappls API
   - Try different endpoints and authentication methods
=================================================================== */
export async function getCoordinatesFromMapMyIndia(locationText) {
    if (!locationText?.trim())
        return null;
    const token = await getAccessToken();
    if (!token) {
        console.error('Unable to obtain MapMyIndia access token');
        return null;
    }
    // If input is lat,lng -> return immediate
    const coordsMatch = locationText.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
        const lat = Number(coordsMatch[1]);
        const lng = Number(coordsMatch[2]);
        if (isFinite(lat) && isFinite(lng)) {
            return {
                latitude: lat,
                longitude: lng,
                displayName: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                granularity: 'exact',
                estimatedRadiusMeters: 50,
                importance: 1
            };
        }
    }
    // Try multiple geocoding approaches
    const approaches = [
        // Approach 1: Atlas geocode endpoint
        async () => {
            console.log('Trying Atlas geocode endpoint...');
            const res = await fetch(`${ATLAS_GEOCODE_URL}?address=${encodeURIComponent(locationText)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                const body = await safeReadText(res);
                console.error('Atlas geocode failed', res.status, res.statusText, body);
                return null;
            }
            return await res.json();
        },
        // Approach 2: Atlas search endpoint
        async () => {
            console.log('Trying Atlas search endpoint...');
            const res = await fetch(`${ATLAS_SEARCH_URL}?query=${encodeURIComponent(locationText)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                const body = await safeReadText(res);
                console.error('Atlas search failed', res.status, res.statusText, body);
                return null;
            }
            return await res.json();
        },
        // Approach 3: Legacy API key approach (if available)
        async () => {
            const apiKey = process.env.MAPMYINDIA_API_KEY;
            if (!apiKey)
                return null;
            console.log('Trying legacy API key approach...');
            const res = await fetch(`${GEOCODE_URL}/${apiKey}/geo?addr=${encodeURIComponent(locationText)}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) {
                const body = await safeReadText(res);
                console.error('Legacy geocode failed', res.status, res.statusText, body);
                return null;
            }
            return await res.json();
        }
    ];
    // Try each approach
    for (let i = 0; i < approaches.length; i++) {
        try {
            const data = await approaches[i]();
            if (!data)
                continue;
            console.log(`Approach ${i + 1} response:`, JSON.stringify(data, null, 2));
            // Process the response based on different possible formats
            const result = await processGeocodingResponse(data, locationText, token);
            if (result) {
                console.log(`Successfully geocoded "${locationText}" using approach ${i + 1}`);
                return result;
            }
        }
        catch (err) {
            console.error(`Approach ${i + 1} failed:`, err);
            continue;
        }
    }
    // If all MapMyIndia approaches fail, try Google as fallback
    console.log('All MapMyIndia approaches failed, trying Google Geocoding as fallback...');
    const googleResult = await getCoordinatesFromGoogle(locationText);
    if (googleResult) {
        console.log(`Successfully geocoded "${locationText}" using Google Geocoding fallback`);
        return googleResult;
    }
    // Last resort: try to extract city/area and provide approximate coordinates
    console.log('Trying approximate coordinates based on known locations...');
    const approximateResult = getApproximateCoordinates(locationText);
    if (approximateResult) {
        console.log(`Using approximate coordinates for "${locationText}"`);
        return approximateResult;
    }
    console.error(`All geocoding approaches failed for location: "${locationText}"`);
    return null;
}
/* ===================================================================
   RESPONSE PROCESSING
   Handle different response formats from MapMyIndia/Mappls API
=================================================================== */
async function processGeocodingResponse(data, locationText, token) {
    // Handle different response structures
    let results = data?.results || data?.suggestedLocations || data?.copResults || data?.cop_results || data;
    // If results is an array, take the first result
    if (Array.isArray(results)) {
        results = results[0];
    }
    if (!results) {
        console.error('No results found in response:', data);
        return null;
    }
    // Try to extract coordinates directly
    const lat = Number(results.latitude || results.lat || results.geo?.lat);
    const lng = Number(results.longitude || results.lng || results.geo?.lng);
    if (isFinite(lat) && isFinite(lng)) {
        const granularity = detectGranularity(results.geocodeLevel || results.place_type || results.type);
        return {
            latitude: lat,
            longitude: lng,
            displayName: results.formattedAddress || results.formatted_address || results.placeName || locationText,
            granularity,
            estimatedRadiusMeters: radiusFor(granularity),
            importance: results.confidenceScore || results.confidence || 0.8,
            raw: results
        };
    }
    // Try to resolve eLoc if present
    const eLoc = results.eLoc || results.eloc;
    if (eLoc) {
        console.log(`Found eLoc: ${eLoc}, attempting to resolve...`);
        const coords = await resolveELoc(token, eLoc);
        if (coords) {
            const granularity = detectGranularity(results.geocodeLevel || results.place_type || results.type);
            return {
                latitude: coords.lat,
                longitude: coords.lng,
                displayName: results.formattedAddress || results.formatted_address || results.placeName || locationText,
                granularity,
                estimatedRadiusMeters: radiusFor(granularity),
                importance: results.confidenceScore || results.confidence || 0.5,
                raw: results
            };
        }
        else {
            console.error('eLoc present but resolution failed:', eLoc);
        }
    }
    console.error('Could not extract coordinates from response:', results);
    return null;
}
/* ===================================================================
   APPROXIMATE COORDINATES FALLBACK
   Provide approximate coordinates for known Indian cities/areas
=================================================================== */
function getApproximateCoordinates(locationText) {
    const text = locationText.toLowerCase();
    // Common Indian cities and areas with approximate coordinates
    const knownLocations = {
        'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata, West Bengal' },
        'barrackpore': { lat: 22.7606, lng: 88.3742, name: 'Barrackpore, North 24 Parganas' },
        'north 24 parganas': { lat: 22.6757, lng: 88.4328, name: 'North 24 Parganas, West Bengal' },
        'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra' },
        'delhi': { lat: 28.7041, lng: 77.1025, name: 'Delhi' },
        'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bangalore, Karnataka' },
        'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu' },
        'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad, Telangana' },
        'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune, Maharashtra' },
        'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad, Gujarat' },
        'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat, Gujarat' },
        'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur, Rajasthan' },
        'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow, Uttar Pradesh' },
        'kanpur': { lat: 26.4499, lng: 80.3319, name: 'Kanpur, Uttar Pradesh' },
        'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur, Maharashtra' },
        'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore, Madhya Pradesh' },
        'thane': { lat: 19.2183, lng: 72.9781, name: 'Thane, Maharashtra' },
        'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal, Madhya Pradesh' },
        'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam, Andhra Pradesh' },
        'pimpri': { lat: 18.6298, lng: 73.7997, name: 'Pimpri-Chinchwad, Maharashtra' }
    };
    // Try to find a matching location
    for (const [key, coords] of Object.entries(knownLocations)) {
        if (text.includes(key)) {
            return {
                latitude: coords.lat,
                longitude: coords.lng,
                displayName: `${coords.name} (Approximate)`,
                granularity: 'city',
                estimatedRadiusMeters: 10000, // 10km radius for city-level approximation
                importance: 0.3, // Low confidence for approximate coordinates
                raw: { source: 'approximate', matched: key }
            };
        }
    }
    return null;
}
/* ===================================================================
   GOOGLE GEOCODING FALLBACK
   Use Google Geocoding API as a fallback when MapMyIndia fails
=================================================================== */
async function getCoordinatesFromGoogle(locationText) {
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
        console.log('Google Maps API key not available for fallback');
        return null;
    }
    try {
        console.log('Trying Google Geocoding API as fallback...');
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationText)}&key=${googleApiKey}`);
        if (!res.ok) {
            console.error('Google Geocoding API request failed', res.status);
            return null;
        }
        const data = await res.json();
        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
            console.error('Google Geocoding API returned no results', data.status);
            return null;
        }
        const result = data.results[0];
        const location = result.geometry.location;
        // Determine granularity based on location type
        let granularity = 'unknown';
        if (result.types.includes('street_address') || result.types.includes('premise')) {
            granularity = 'exact';
        }
        else if (result.types.includes('route') || result.types.includes('street_number')) {
            granularity = 'street';
        }
        else if (result.types.includes('neighborhood') || result.types.includes('sublocality')) {
            granularity = 'neighbourhood';
        }
        else if (result.types.includes('locality') || result.types.includes('administrative_area_level_3')) {
            granularity = 'city';
        }
        else if (result.types.includes('administrative_area_level_1') || result.types.includes('administrative_area_level_2')) {
            granularity = 'region';
        }
        else if (result.types.includes('country')) {
            granularity = 'country';
        }
        console.log(`Google Geocoding successful for "${locationText}"`);
        return {
            latitude: location.lat,
            longitude: location.lng,
            displayName: result.formatted_address,
            granularity,
            estimatedRadiusMeters: radiusFor(granularity),
            importance: 0.7, // Lower confidence since it's fallback
            raw: result
        };
    }
    catch (err) {
        console.error('Google Geocoding API error:', err);
        return null;
    }
}
/* ===================================================================
   HUMAN READABLE
=================================================================== */
export async function getHumanReadableLocation(coordinates) {
    try {
        const loc = await getCoordinatesFromMapMyIndia(`${coordinates.latitude},${coordinates.longitude}`);
        if (!loc)
            return formatCoordinates(coordinates);
        return loc.displayName || formatCoordinates(coordinates);
    }
    catch (err) {
        console.error('human_readable_failure', err);
        return formatCoordinates(coordinates);
    }
}
