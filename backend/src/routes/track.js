import {Router} from 'express';

import {pool} from '../db/index.js';

export const trackRouter = Router();


/*
 * GET /api/public/track/:shareToken
 *
 * This endpoint is intentionally NOT authenticated.
 *
 * The emergency contact receives the secret tracking URL
 * through SMS and opens it in a normal browser.
 *
 * Only the latest location is returned.
 */
trackRouter.get('/:shareToken', async (req, res) => {
  try {
    const {shareToken} = req.params;

    if (!shareToken || shareToken.length < 20) {
      return res.status(404).json({
        error: 'Tracking link not found or expired.',
      });
    }

    /*
     * Find the journey using the random share token.
     */
    const journeyResult = await pool.query(
      `
      SELECT
        id,
        destination,
        status

      FROM journeys

      WHERE share_token = $1
      `,
      [shareToken],
    );

    if (journeyResult.rows.length === 0) {
      return res.status(404).json({
        error:
          'Tracking link not found or expired.',
      });
    }

    const journey = journeyResult.rows[0];


    /*
     * Get ONLY the latest location.
     *
     * We intentionally do not expose the entire GPS history.
     */
    const locationResult = await pool.query(
      `
      SELECT
        latitude,
        longitude,
        recorded_at

      FROM journey_locations

      WHERE journey_id = $1

      ORDER BY recorded_at DESC

      LIMIT 1
      `,
      [journey.id],
    );


    res.json({
      destination: journey.destination,
      status: journey.status,
      location:
        locationResult.rows[0] ?? null,
    });
  } catch (err) {
    console.error(
      'Track lookup failed:',
      err.message,
    );

    res.status(500).json({
      error:
        'Failed to fetch tracking information.',
    });
  }
});