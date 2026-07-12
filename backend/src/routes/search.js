import {Router} from 'express';
import {searchPlace} from '../services/geocoding.js';

export const searchRouter = Router();
// console.log("Hello");
// GET /api/search?query=...&latitude=...&longitude=...
// latitude/longitude are optional (used for Mapbox's proximity bias).
searchRouter.get('/', async (req, res) => {
  console.log("🔥 SEARCH API HIT");
  console.log(req.query);
  const {query, latitude, longitude} = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({error: 'query is required'});
  }

  try {
    const features = await searchPlace(
      query,
      latitude !== undefined ? Number(latitude) : undefined,
      longitude !== undefined ? Number(longitude) : undefined,
    );
    console.log(features)
    res.json({features});
  } catch (err) {
    console.error('Mapbox search failed:', err.message);
    res.status(502).json({error: err.message});
  }
});
