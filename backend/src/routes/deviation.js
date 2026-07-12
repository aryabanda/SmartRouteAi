import {Router} from 'express';
import {classifyDeviation} from '../services/deviationClassifier.js';

export const deviationRouter = Router();

// POST /api/deviation/classify
// body: { distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs }
deviationRouter.post('/classify', (req, res) => {
  const {distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs} =
    req.body ?? {};

  if (
    distanceFromRoute == null ||
    speedKph == null ||
    headingChangeDeg == null ||
    timeOffRouteMs == null
  ) {
    return res.status(400).json({
      error:
        'distanceFromRoute, speedKph, headingChangeDeg, and timeOffRouteMs are all required',
    });
  }

  const result = classifyDeviation({
    distanceFromRoute,
    speedKph,
    headingChangeDeg,
    timeOffRouteMs,
  });

  res.json(result);
});
