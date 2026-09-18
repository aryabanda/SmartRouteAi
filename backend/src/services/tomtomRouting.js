const TOMTOM_ROUTING_URL =
  'https://api.tomtom.com/routing/1/calculateRoute';

// TomTom's magnitudeOfDelay: 0=unknown, 1=minor, 2=moderate, 3=major,
// 4=road closed/undefined (treated as heavy here - rare in practice but
// worth flagging in a report as an edge case rather than pretending
// certainty). Bucketed down to 3 categories to keep the map legend simple.
function congestionFromMagnitude(magnitude) {
  if (magnitude >= 3) return 'heavy';
  if (magnitude === 2) return 'moderate';
  return 'low';
}

export async function fetchTomTomRoute(origin, destination) {
  const apiKey = process.env.TOMTOM_API_KEY;

  if (!apiKey) {
    throw new Error('TOMTOM_API_KEY is not configured.');
  }

  const locations =
    `${origin.latitude},${origin.longitude}:` +
    `${destination.latitude},${destination.longitude}`;

  const params = new URLSearchParams({
    key: apiKey,
    routeType: 'fastest',
    traffic: 'true',
    travelMode: 'car',
    routeRepresentation: 'polyline',
    computeTravelTimeFor: 'all',
    // Requests the per-segment traffic breakdown alongside the route
    // itself - this is what lets us color individual stretches of the
    // line instead of only knowing one aggregate delay for the whole trip.
    sectionType: 'traffic',
    language: 'en-GB',
  });

  const url = `${TOMTOM_ROUTING_URL}/${locations}/json?${params}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detailedError?.message || 'TomTom routing request failed',
    );
  }

  if (!data.routes?.length) {
    throw new Error('TomTom returned no route.');
  }

  const route = data.routes[0];

  const coordinates = route.legs
    .flatMap(leg => leg.points || [])
    .map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
    }));

  // Traffic sections reference point INDEXES into the flattened coordinate
  // array above (startPointIndex/endPointIndex), so this only works
  // correctly if `coordinates` above is built the same way, in the same
  // order, as what TomTom used when computing those indexes - single leg
  // routes (the normal case here) are safe; a multi-leg route would need
  // an offset per leg, which this doesn't handle (not needed for a single
  // origin->destination route as used throughout this app).
  const trafficSections = (route.sections || [])
    .filter(section => section.sectionType === 'TRAFFIC')
    .map(section => ({
      startIndex: section.startPointIndex,
      endIndex: section.endPointIndex,
      congestion: congestionFromMagnitude(section.magnitudeOfDelay ?? 0),
    }));

  const summary = route.summary;

  return {
    coordinates,
    trafficSections,

    distance: summary.lengthInMeters / 1000,

    // TRAFFIC-AWARE ETA
    duration: summary.travelTimeInSeconds / 60,

    freeFlowDuration:
      summary.noTrafficTravelTimeInSeconds != null
        ? summary.noTrafficTravelTimeInSeconds / 60
        : undefined,

    trafficDelay:
      summary.trafficDelayInSeconds != null
        ? summary.trafficDelayInSeconds / 60
        : 0,

    trafficLengthMeters: summary.trafficLengthInMeters ?? 0,

    liveTrafficDuration:
      summary.liveTrafficIncidentsTravelTimeInSeconds != null
        ? summary.liveTrafficIncidentsTravelTimeInSeconds / 60
        : undefined,
  };
}