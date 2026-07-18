import {Router} from 'express';
import {pool} from '../db/index.js';
import {requireAuth} from '../middleware/requireAuth.js';

export const journeysRouter = Router();

journeysRouter.use(requireAuth);

// POST /api/journeys - called when a journey starts
// body: { destination, origin: {lat,lng}, destination_coords: {lat,lng}, distanceKm, durationMin }
journeysRouter.post('/', async (req, res) => {
  const {destination, origin, destinationCoords, distanceKm, durationMin} =
    req.body ?? {};

  if (!destination?.trim()) {
    return res.status(400).json({error: 'destination is required.'});
  }

  try {
    const result = await pool.query(
      `INSERT INTO journeys
        (user_id, destination, origin_lat, origin_lng, destination_lat, destination_lng, distance_km, duration_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id::text, destination, status, started_at`,
      [
        req.userId,
        destination.trim(),
        origin?.latitude ?? null,
        origin?.longitude ?? null,
        destinationCoords?.latitude ?? null,
        destinationCoords?.longitude ?? null,
        distanceKm ?? null,
        durationMin ?? null,
      ],
    );
    res.status(201).json({journey: result.rows[0]});
  } catch (err) {
    console.error('Failed to create journey:', err.message);
    res.status(500).json({error: 'Failed to create journey.'});
  }
});

// PATCH /api/journeys/:id - called when a journey ends (or SOS fires)
// body: { status: 'completed' | 'sos_triggered', deviationCount }
journeysRouter.patch('/:id', async (req, res) => {
  const journeyId = Number(req.params.id);
  const {status, deviationCount} = req.body ?? {};

  if (!Number.isInteger(journeyId)) {
    return res.status(400).json({error: 'Invalid journey id.'});
  }
  if (!['completed', 'sos_triggered', 'in_progress'].includes(status)) {
    return res.status(400).json({error: 'Invalid status.'});
  }

  try {
    const result = await pool.query(
      `UPDATE journeys
       SET status = $1,
           deviation_count = COALESCE($2, deviation_count),
           ended_at = CASE WHEN $1 != 'in_progress' THEN now() ELSE ended_at END
       WHERE id = $3 AND user_id = $4
       RETURNING id::text, destination, status, deviation_count, started_at, ended_at`,
      [status, deviationCount ?? null, journeyId, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Journey not found.'});
    }

    res.json({journey: result.rows[0]});
  } catch (err) {
    console.error('Failed to update journey:', err.message);
    res.status(500).json({error: 'Failed to update journey.'});
  }
});

// GET /api/journeys - list this user's journey history, most recent first
journeysRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id::text, destination, distance_km, duration_min, status,
              deviation_count, started_at, ended_at
       FROM journeys
       WHERE user_id = $1
       ORDER BY started_at DESC`,
      [req.userId],
    );
    res.json({journeys: result.rows});
  } catch (err) {
    console.error('Failed to fetch journeys:', err.message);
    res.status(500).json({error: 'Failed to fetch journeys.'});
  }
});
