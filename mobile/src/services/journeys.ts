import Config from 'react-native-config';


/*
 * IMPORTANT:
 *
 * This must be a publicly accessible backend URL.
 *
 * Example:
 *
 * BACKEND_URL=https://your-backend.onrender.com
 *
 * Do NOT use localhost for the tracking URL that is
 * sent to emergency contacts.
 */
const BACKEND_URL =
  Config.BACKEND_URL;


export type Coord = {
  latitude: number;
  longitude: number;
};


export type JourneyStatus =
  | 'in_progress'
  | 'completed'
  | 'sos_triggered';


export type Journey = {
  id: string;

  destination: string;

  distance_km: number | null;

  duration_min: number | null;

  status: JourneyStatus;

  deviation_count: number;

  started_at: string;

  ended_at: string | null;

  /*
   * Random token used for public live tracking.
   */
  share_token?: string;
};


async function handleResponse<T>(
  res: Response,
): Promise<T> {

  const body =
    await res
      .json()
      .catch(() => ({}));


  if (!res.ok) {

    throw new Error(
      body.error ??
      `Request failed (${res.status})`,
    );
  }


  return body;
}


/*
 * Creates a journey on the backend.
 *
 * The backend automatically generates
 * the share_token.
 */
export async function createJourney(
  token: string,

  params: {
    destination: string;

    origin?: Coord;

    destinationCoords?: Coord;

    distanceKm?: number;

    durationMin?: number;
  },
): Promise<{
  journey: Journey;
}> {

  const res =
    await fetch(
      `${BACKEND_URL}/api/journeys`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify(params),
      },
    );


  return handleResponse(res);
}


/*
 * Builds the URL that is sent to emergency contacts.
 *
 * Example:
 *
 * https://your-backend.onrender.com/track/
 * 9f84a7....
 */
export function buildTrackingUrl(
  shareToken: string,
): string {

  if (!shareToken) {
    throw new Error(
      'Missing journey share token.',
    );
  }


  return (
    `${BACKEND_URL}/track/${shareToken}`
  );
}


/*
 * Ends or updates a journey.
 *
 * IMPORTANT:
 *
 * sos_triggered does NOT mean the GPS tracking
 * has stopped.
 */
export async function endJourney(
  token: string,

  journeyId: string,

  status:
    | 'completed'
    | 'sos_triggered',

  deviationCount: number,
): Promise<{
  journey: Journey;
}> {

  const res =
    await fetch(
      `${BACKEND_URL}/api/journeys/${journeyId}`,
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify({
            status,
            deviationCount,
          }),
      },
    );


  return handleResponse(res);
}


/*
 * Sends one GPS location to the backend.
 *
 * The JourneyTrackingScreen calls this periodically
 * while the journey is active.
 */
export async function logLocation(
  token: string,

  journeyId: string,

  params: {
    latitude: number;

    longitude: number;

    speedKph?: number;

    distanceFromRouteM?: number;
  },
): Promise<void> {

  const res =
    await fetch(
      `${BACKEND_URL}/api/journeys/${journeyId}/locations`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,
        },

        body:
          JSON.stringify(params),
      },
    );


  /*
   * We deliberately don't throw here.
   *
   * A temporary network failure shouldn't interrupt
   * the actual journey.
   */
  if (!res.ok) {

    console.warn(
      'Failed to upload GPS location:',
      res.status,
    );
  }
}


/*
 * Gets journey history.
 */
export async function listJourneys(
  token: string,
): Promise<{
  journeys: Journey[];
}> {

  const res =
    await fetch(
      `${BACKEND_URL}/api/journeys`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    );


  return handleResponse(res);
}