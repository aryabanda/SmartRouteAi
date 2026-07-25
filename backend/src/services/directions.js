// Calls Mapbox's Directions API and reshapes the response into the flat
// {coordinates, distance, duration} shape the mobile app expects from
// routeInfo (matches what JourneyTrackingScreen.tsx consumes).
//
// Switched from OpenRouteService (api.heigit.org) to Mapbox Directions
// after ORS started returning persistent 502/proxy errors on both the
// old and new domains. Reuses the same MAPBOX_ACCESS_TOKEN already
// configured for geocoding.js, so no new env var is needed.
//
// Mapbox's geojson geometry already gives coordinates as plain [lon, lat]
// pairs when geometries=geojson is set - no polyline decoding needed.

const MAPBOX_DIRECTIONS_URL =
  'https://api.mapbox.com/directions/v5/mapbox/driving';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callMapbox(url, attempt = 1) {
  const res = await fetch(url);

  // Mapbox can occasionally return HTML (e.g. a gateway error page)
  // instead of JSON when their infrastructure is briefly overloaded -
  // parsing that as JSON would throw a confusing "Unexpected token <"
  // error, so check content-type first and handle it as a clean message.
  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const isRetryableGatewayError = [502, 503, 504].includes(res.status);

    if (isRetryableGatewayError && attempt <= MAX_RETRIES) {
      console.warn(
        `Mapbox returned ${res.status} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`,
      );
      await sleep(RETRY_DELAY_MS);
      return callMapbox(url, attempt + 1);
    }

    throw new Error(
      `Directions API returned a non-JSON response (status ${res.status}). This is usually a temporary issue on Mapbox's end - try again in a moment.`,
    );
  }

  const data = await res.json();

  if (!res.ok) {
    const message = data?.message ?? `Mapbox error (${res.status})`;
    throw new Error(`Directions API error: ${message}`);
  }

  return data;
}

/**
 * @param {{latitude:number, longitude:number}} origin
 * @param {{latitude:number, longitude:number}} destination
 *   Mapbox's directions endpoint takes coordinates only (no place-name
 *   strings) - if you're passing a typed destination string anywhere,
 *   geocode it with Mapbox first (same as DestinationSearchScreen already
 *   does) and pass coordinates through here.
 */
export async function fetchRoute(origin, destination) {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken || accessToken === 'your_token_here') {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured on the server.');
  }

  if (typeof destination === 'string') {
    throw new Error(
      'Mapbox requires coordinates, not a place name. Geocode the destination first before calling fetchRoute.',
    );
  }

  const coordString = [
    `${origin.longitude},${origin.latitude}`,
    `${destination.longitude},${destination.latitude}`,
  ].join(';');

  const params = new URLSearchParams({
    access_token: accessToken,
    geometries: 'geojson',
    overview: 'full',
  });

  const url = `${MAPBOX_DIRECTIONS_URL}/${coordString}?${params.toString()}`;

  const data = await callMapbox(url);

  if (!data.routes || data.routes.length === 0) {
    throw new Error('Directions API error: no route found between the given points.');
  }

  const route = data.routes[0];

  return {
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    distance: route.distance / 1000, // meters -> km, matches calculateDistance() units used client-side
    duration: route.duration / 60, // seconds -> minutes
  };
}