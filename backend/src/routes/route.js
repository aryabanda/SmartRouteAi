import {Router} from 'express';
import {fetchRoute} from '../services/directions.js';

export const routeRouter = Router();

// POST /api/route
// body: { origin: {latitude, longitude}, destination: {latitude, longitude} | string }
routeRouter.post('/', async (req, res) => {
  const {origin, destination} = req.body ?? {};

  if (!origin || !destination) {
    return res.status(400).json({error: 'origin and destination are required'});
  }

  try {
    const routeInfo = await fetchRoute(origin, destination);
    res.json(routeInfo);
  } catch (err) {
    console.error('Route fetch failed:', err.message);
    res.status(502).json({error: err.message});
  }
});

// POST /api/route/recalculate
// Same shape as /api/route - it's a separate path mainly for clarity in
// logs/analytics (you can tell "fresh route request" apart from
// "recalculation after a deviation" server-side).
routeRouter.post('/recalculate', async (req, res) => {
  const {origin, destination} = req.body ?? {};

  if (!origin || !destination) {
    return res.status(400).json({error: 'origin and destination are required'});
  }

  try {
    const routeInfo = await fetchRoute(origin, destination);
    res.json(routeInfo);
  } catch (err) {
    console.error('Route recalculation failed:', err.message);
    res.status(502).json({error: err.message});
  }
});
