import {Router} from 'express';
import {getRouteTrafficSegments, getTrafficTileBuffer} from '../services/traffic.js';

export const trafficRouter = Router();

// POST /api/traffic/route
// body: { coordinates: [{latitude, longitude}, ...] }
// Used to colour-code the planned route line itself (blue/yellow/red)
// in JourneyTrackingScreen's trafficRouteGeoJSON.
trafficRouter.post('/route', async (req, res) => {
  const {coordinates} = req.body ?? {};

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({error: 'coordinates (2+ points) are required'});
  }

  try {
    const segments = await getRouteTrafficSegments(coordinates);
    res.json({segments});
  } catch (err) {
    console.error('Traffic route fetch failed:', err.message);
    res.status(502).json({error: err.message});
  }
});

// GET /api/traffic/tiles/:z/:x/:y.png
// Proxies TomTom's raster traffic-flow tiles for the RasterSource overlay,
// keeping TOMTOM_API_KEY server-side instead of embedding it in a tile
// URL template shipped to the mobile app.
trafficRouter.get('/tiles/:z/:x/:y.png', async (req, res) => {
  const {z, x, y} = req.params;

  try {
    const buffer = await getTrafficTileBuffer(z, x, y);
    res.set('Content-Type', 'image/png');
    // Traffic flow data doesn't change fast enough to need a fresh fetch
    // per pan/zoom tick - a short cache cuts TomTom calls substantially
    // while keeping the overlay reasonably current.
    res.set('Cache-Control', 'public, max-age=60');
    res.send(buffer);
  } catch (err) {
    console.error('Traffic tile fetch failed:', err.message);
    res.status(502).json({error: err.message});
  }
});