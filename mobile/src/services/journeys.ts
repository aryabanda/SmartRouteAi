// Talks to the backend's /api/journeys endpoints. Same BACKEND_URL /
// auth-token pattern as ContactsContext - keep BACKEND_URL in sync across
// all service files (route.ts, search.ts, auth.ts, journeys.ts).

const BACKEND_URL = 'http://localhost:4000';

export type Coord = {latitude: number; longitude: number};

export type JourneyStatus = 'in_progress' | 'completed' | 'sos_triggered';

export type Journey = {
  id: string;
  destination: string;
  distance_km: number | null;
  duration_min: number | null;
  status: JourneyStatus;
  deviation_count: number;
  started_at: string;
  ended_at: string | null;
};

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body;
}

export async function createJourney(
  token: string,
  params: {
    destination: string;
    origin?: Coord;
    destinationCoords?: Coord;
    distanceKm?: number;
    durationMin?: number;
  },
): Promise<{journey: Journey}> {
  const res = await fetch(`${BACKEND_URL}/api/journeys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  return handleResponse(res);
}

export async function endJourney(
  token: string,
  journeyId: string,
  status: 'completed' | 'sos_triggered',
  deviationCount: number,
): Promise<{journey: Journey}> {
  const res = await fetch(`${BACKEND_URL}/api/journeys/${journeyId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({status, deviationCount}),
  });
  return handleResponse(res);
}

export async function listJourneys(
  token: string,
): Promise<{journeys: Journey[]}> {
  const res = await fetch(`${BACKEND_URL}/api/journeys`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  return handleResponse(res);
}
