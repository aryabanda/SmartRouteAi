// Calls Mapbox's Geocoding API (place search/autocomplete) server-side, so
// MAPBOX_ACCESS_TOKEN never ships inside the mobile app bundle.
//
// Returns the raw `features` array as-is - the mobile app's useSearch hook
// already expects each item to have .id, .text, .place_name, .center
// (Mapbox's native shape), so there's no reshaping needed here, unlike the
// directions endpoint which had to normalize between providers.

const MAPBOX_GEOCODING_URL =
  'https://api.mapbox.com/geocoding/v5/mapbox.places';

export async function searchPlace(query, latitude, longitude) {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken || accessToken === 'your_token_here') {
    throw new Error('MAPBOX_ACCESS_TOKEN is not configured on the server.');
  }

  if (!query || !query.trim()) return [];

  const params = new URLSearchParams({
    access_token: accessToken,
    autocomplete: 'true',
    limit: '5',
    country: 'IN',
  });

  if (latitude !== undefined && longitude !== undefined) {
    params.set('proximity', `${longitude},${latitude}`);
  }

  const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(
    query,
  )}.json?${params.toString()}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const message = data?.message ?? `Mapbox error (${res.status})`;
    throw new Error(message);
  }

  return data.features;
}
