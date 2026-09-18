import {Router} from 'express';
import crypto from 'crypto';

import {pool} from '../db/index.js';
import {requireAuth} from '../middleware/requireAuth.js';

export const journeysRouter = Router();

journeysRouter.use(requireAuth);


/*
 * POST /api/journeys
 *
 * Called when a new journey starts.
 *
 * Body:
 * {
 *   destination,
 *   origin: {
 *     latitude,
 *     longitude
 *   },
 *   destinationCoords: {
 *     latitude,
 *     longitude
 *   },
 *   distanceKm,
 *   durationMin
 * }
 */
journeysRouter.post('/', async (req, res) => {
  const {
    destination,
    origin,
    destinationCoords,
    distanceKm,
    durationMin,
  } = req.body ?? {};

  if (!destination?.trim()) {
    return res.status(400).json({
      error: 'destination is required.',
    });
  }

  try {
    /*
     * Generate a random public tracking token.
     *
     * Do NOT use journey.id because journey IDs are sequential
     * and therefore guessable.
     */
    const shareToken = crypto.randomBytes(16).toString('hex');

    const result = await pool.query(
      `
      INSERT INTO journeys (
        user_id,
        destination,
        origin_lat,
        origin_lng,
        destination_lat,
        destination_lng,
        distance_km,
        duration_min,
        share_token
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING
        id::text,
        destination,
        distance_km,
        duration_min,
        status,
        deviation_count,
        started_at,
        ended_at,
        share_token
      `,
      [
        req.userId,
        destination.trim(),

        origin?.latitude ?? null,
        origin?.longitude ?? null,

        destinationCoords?.latitude ?? null,
        destinationCoords?.longitude ?? null,

        distanceKm ?? null,
        durationMin ?? null,

        shareToken,
      ],
    );

    res.status(201).json({
      journey: result.rows[0],
    });
  } catch (err) {
    console.error(
      'Failed to create journey:',
      err.message,
    );

    res.status(500).json({
      error: 'Failed to create journey.',
    });
  }
});


/*
 * PATCH /api/journeys/:id
 *
 * Used when:
 * - journey completes
 * - SOS is triggered
 *
 * Body:
 * {
 *   status: 'completed' | 'sos_triggered',
 *   deviationCount
 * }
 */
journeysRouter.patch('/:id', async (req, res) => {
  const journeyId = Number(req.params.id);

  const {
    status,
    deviationCount,
  } = req.body ?? {};

  if (!Number.isInteger(journeyId)) {
    return res.status(400).json({
      error: 'Invalid journey id.',
    });
  }

  if (
    ![
      'completed',
      'sos_triggered',
      'in_progress',
    ].includes(status)
  ) {
    return res.status(400).json({
      error: 'Invalid status.',
    });
  }

  try {
    /*
     * IMPORTANT:
     *
     * ended_at is updated ONLY when the journey is actually completed.
     *
     * For SOS:
     *     status = sos_triggered
     *     ended_at remains NULL
     *
     * This allows live tracking to continue after SOS.
     */
    const result = await pool.query(
      `
      UPDATE journeys
      SET
        status = $1,

        deviation_count =
          COALESCE($2, deviation_count),

        ended_at =
          CASE
            WHEN $1 = 'completed'
            THEN now()
            ELSE ended_at
          END

      WHERE id = $3
        AND user_id = $4

      RETURNING
        id::text,
        destination,
        distance_km,
        duration_min,
        status,
        deviation_count,
        started_at,
        ended_at,
        share_token
      `,
      [
        status,
        deviationCount ?? null,
        journeyId,
        req.userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Journey not found.',
      });
    }

    res.json({
      journey: result.rows[0],
    });
  } catch (err) {
    console.error(
      'Failed to update journey:',
      err.message,
    );

    res.status(500).json({
      error: 'Failed to update journey.',
    });
  }
});


/*
 * POST /api/journeys/:id/locations
 *
 * Stores a GPS location during a journey.
 */
journeysRouter.post('/:id/locations', async (req, res) => {
  const journeyId = Number(req.params.id);

  const {
    latitude,
    longitude,
    speedKph,
    distanceFromRouteM,
  } = req.body ?? {};

  if (
    !Number.isInteger(journeyId) ||
    latitude == null ||
    longitude == null
  ) {
    return res.status(400).json({
      error:
        'journeyId, latitude, and longitude are required.',
    });
  }

  try {
    /*
     * Verify that the journey belongs to the
     * authenticated user.
     */
    const owns = await pool.query(
      `
      SELECT id
      FROM journeys
      WHERE id = $1
        AND user_id = $2
      `,
      [
        journeyId,
        req.userId,
      ],
    );

    if (owns.rows.length === 0) {
      return res.status(404).json({
        error: 'Journey not found.',
      });
    }

    await pool.query(
      `
      INSERT INTO journey_locations (
        journey_id,
        latitude,
        longitude,
        speed_kph,
        distance_from_route_m
      )
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        journeyId,
        latitude,
        longitude,
        speedKph ?? null,
        distanceFromRouteM ?? null,
      ],
    );

    res.status(201).json({
      logged: true,
    });
  } catch (err) {
    console.error(
      'Failed to log location ping:',
      err.message,
    );

    res.status(500).json({
      error: 'Failed to log location ping.',
    });
  }
});


/*
 * GET /api/journeys/:id/locations
 *
 * Authenticated endpoint for viewing the user's
 * complete journey history.
 */
journeysRouter.get('/:id/locations', async (req, res) => {
  const journeyId = Number(req.params.id);

  if (!Number.isInteger(journeyId)) {
    return res.status(400).json({
      error: 'Invalid journey id.',
    });
  }

  try {
    const owns = await pool.query(
      `
      SELECT id
      FROM journeys
      WHERE id = $1
        AND user_id = $2
      `,
      [
        journeyId,
        req.userId,
      ],
    );

    if (owns.rows.length === 0) {
      return res.status(404).json({
        error: 'Journey not found.',
      });
    }

    const result = await pool.query(
      `
      SELECT
        latitude,
        longitude,
        speed_kph,
        distance_from_route_m,
        recorded_at

      FROM journey_locations

      WHERE journey_id = $1

      ORDER BY recorded_at ASC
      `,
      [journeyId],
    );

    res.json({
      locations: result.rows,
    });
  } catch (err) {
    console.error(
      'Failed to fetch journey trail:',
      err.message,
    );

    res.status(500).json({
      error: 'Failed to fetch journey trail.',
    });
  }
});


/*
 * GET /api/journeys
 *
 * Returns authenticated user's journey history.
 */
journeysRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id::text,
        destination,
        distance_km,
        duration_min,
        status,
        deviation_count,
        started_at,
        ended_at

      FROM journeys

      WHERE user_id = $1

      ORDER BY started_at DESC
      `,
      [req.userId],
    );

    res.json({
      journeys: result.rows,
    });
  } catch (err) {
    console.error(
      'Failed to fetch journeys:',
      err.message,
    );

    res.status(500).json({
      error: 'Failed to fetch journeys.',
    });
  }
});