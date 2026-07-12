// Calls OpenRouteService's Directions API and reshapes the response into
// the flat {coordinates, distance, duration} shape the mobile app expects
// from routeInfo (matches what JourneyTrackingScreen.tsx consumes).
//
// ORS's geojson response already gives coordinates as plain [lon, lat]
// pairs - no polyline decoding needed, unlike Google's encoded polyline.

const ORS_DIRECTIONS_URL =
  'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

/**
 * @param {{latitude:number, longitude:number}} origin
 * @param {{latitude:number, longitude:number}} destination
 *   ORS's directions endpoint takes coordinates only (no place-name
 *   strings) - if you're passing a typed destination string anywhere,
 *   geocode it with Mapbox first (same as DestinationSearchScreen already
 *   does) and pass coordinates through here.
 */
export async function fetchRoute(origin, destination) {
  const apiKey = process.env.OPEN_ROUTE_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('OPEN_ROUTE_API_KEY is not configured on the server.');
  }

  if (typeof destination === 'string') {
    throw new Error(
      'ORS requires coordinates, not a place name. Geocode the destination (e.g. via Mapbox) before calling fetchRoute.',
    );
  }

  const body = {
    coordinates: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
  };

  const res = await fetch(ORS_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/geo+json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error?.message ?? data?.error ?? `ORS error (${res.status})`;
    throw new Error(`Directions API error: ${message}`);
  }

  const feature = data.features[0];
  const summary = feature.properties.summary;

  return {
    coordinates: feature.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    distance: summary.distance / 1000, // meters -> km, matches calculateDistance() units used client-side
    duration: summary.duration / 60, // seconds -> minutes
  };
}
