// Talks to the SmartRouteAi backend instead of hitting Google's Directions
// API (or a classifier) directly from the device. Set BACKEND_URL to your
// machine's LAN IP while developing (localhost won't resolve from a phone
// or emulator to your dev machine) - e.g. http://192.168.1.5:4000
// For a physical Android device on the same Wi-Fi as your dev machine,
// run `ipconfig` (Windows) / `ifconfig` (Mac/Linux) to find that IP.

const BACKEND_URL = 'http://localhost:4000'; // <-- change this

export type Coord = {latitude: number; longitude: number};

export type RouteInfo = {
  coordinates: Coord[];
  distance: number; // km
  duration: number; // minutes
  destinationAddress?: string;
};

export async function getRoute(
  origin: Coord,
  destination: Coord | string,
): Promise<RouteInfo> {
  const res = await fetch(`${BACKEND_URL}/api/route`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({origin, destination}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Route request failed (${res.status})`);
  }

  return res.json();
}

export async function recalculateRoute(
  origin: Coord,
  destination: Coord | string,
): Promise<RouteInfo> {
  const res = await fetch(`${BACKEND_URL}/api/route/recalculate`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({origin, destination}),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Recalculation failed (${res.status})`);
  }

  return res.json();
}

export type DeviationClassification = {
  label: 'intentional_reroute' | 'suspicious';
  confidence: number;
  reason: string;
};

export async function classifyDeviation(features: {
  distanceFromRoute: number;
  speedKph: number;
  headingChangeDeg: number;
  timeOffRouteMs: number;
}): Promise<DeviationClassification> {
  const res = await fetch(`${BACKEND_URL}/api/deviation/classify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(features),
  });

  if (!res.ok) {
    // Fail-safe: if the backend is unreachable, treat it as suspicious
    // rather than silently doing nothing. Safety systems should fail
    // toward caution, not toward staying quiet.
    return {
      label: 'suspicious',
      confidence: 0,
      reason: 'Backend unreachable - defaulting to caution.',
    };
  }

  return res.json();
}
