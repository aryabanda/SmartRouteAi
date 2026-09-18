// Calls TomTom's Traffic APIs server-side, so TOMTOM_API_KEY never ships
// inside the mobile app bundle (same reasoning as directions.js/geocoding.js
// keeping MAPBOX_ACCESS_TOKEN server-side).
//
// Two separate things live here, matching the two ways
// JourneyTrackingScreen.tsx consumes traffic:
//
// 1. getTrafficTileBuffer  - proxies TomTom's raster "Traffic Flow" tiles
//    for the RasterSource overlay drawn on top of the base map.
// 2. getRouteTrafficSegments - samples TomTom's Flow Segment Data API at
//    points along the planned route and reshapes the result into the
//    {startIndex, endIndex, status, currentSpeedKph, freeFlowSpeedKph,
//    relativeSpeed} segment shape trafficRouteGeoJSON expects, so the
//    route line itself can be colour-coded blue/yellow/red.

const TOMTOM_FLOW_SEGMENT_URL =
  'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';
const TOMTOM_TILE_URL = 'https://api.tomtom.com/traffic/map/4/tile/flow/relative';

// How many points along the route to sample. TomTom's free tier has a
// daily request cap, and one call per coordinate would be excessive for a
// route with hundreds of points - this keeps a single traffic refresh
// (which itself repeats every 60s from the client) to a small, fixed
// number of calls regardless of route length.
const MAX_SAMPLE_POINTS = 20;

// Relative speed = currentSpeed / freeFlowSpeed. These thresholds are the
// standard rough bands TomTom's own docs suggest for flow severity.
function classifySpeed(relativeSpeed) {
  if (relativeSpeed >= 0.90) return 'normal';
  if (relativeSpeed >= 0.60) return 'moderate';
  return 'heavy';
}

function requireApiKey() {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('TOMTOM_API_KEY is not configured on the server.');
  }
  return apiKey;
}

// Picks up to MAX_SAMPLE_POINTS evenly-spaced indices from the route's
// coordinate array (always including the first and last point), so a
// short 10-point route and a long 500-point route both get sensible,
// bounded coverage.
function pickSampleIndices(coordCount) {
  if (coordCount <= MAX_SAMPLE_POINTS) {
    return Array.from({length: coordCount}, (_, i) => i);
  }

  const step = (coordCount - 1) / (MAX_SAMPLE_POINTS - 1);
  const indices = new Set();
  for (let i = 0; i < MAX_SAMPLE_POINTS; i++) {
    indices.add(Math.round(i * step));
  }
  return [...indices].sort((a, b) => a - b);
}

export async function getRouteTrafficSegments(coordinates) {
  const apiKey = requireApiKey();

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return [];
  }

  const sampleIndices = pickSampleIndices(coordinates.length);

  const samples = await Promise.all(
    sampleIndices.map(async index => {
      const point = coordinates[index];
      const params = new URLSearchParams({
        point: `${point.latitude},${point.longitude}`,
        key: apiKey,
      });

      try {
        const res = await fetch(`${TOMTOM_FLOW_SEGMENT_URL}?${params.toString()}`);
        if (!res.ok) return {index, flow: null};

        const data = await res.json();
        const flow = data?.flowSegmentData;
        if (!flow || !flow.freeFlowSpeed) return {index, flow: null};

        return {
          index,
          flow: {
            currentSpeedKph: flow.currentSpeed,
            freeFlowSpeedKph: flow.freeFlowSpeed,
            relativeSpeed: flow.currentSpeed / flow.freeFlowSpeed,
          },
        };
      } catch {
        // One failed sample point shouldn't take down the whole refresh -
        // it just leaves that stretch of the route uncoloured (rendered
        // as "normal" by trafficRouteGeoJSON's own gap-filling).
        return {index, flow: null};
      }
    }),
  );

  const segments = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const {index: startIndex, flow} = samples[i];
    const endIndex = samples[i + 1].index;
    if (!flow) continue;

    segments.push({
      startIndex,
      endIndex,
      status: classifySpeed(flow.relativeSpeed),
      currentSpeedKph: flow.currentSpeedKph,
      freeFlowSpeedKph: flow.freeFlowSpeedKph,
      relativeSpeed: flow.relativeSpeed,
    });
  }

  return segments;
}

export async function getTrafficTileBuffer(z, x, y) {
  const apiKey = requireApiKey();

  const url = `${TOMTOM_TILE_URL}/${z}/${x}/${y}.png?key=${apiKey}`+
  `&tileSize=256&thickness=2`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`TomTom tile request failed (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}