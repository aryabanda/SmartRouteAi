// Decides, once the mobile app has already confirmed a route deviation
// (distance-from-route over threshold for a sustained window), whether it
// looks like a deliberate detour or something to treat as suspicious.
//
// This is intentionally rule-based for now - see the AI HOOK comment below
// for exactly where a trained model (Isolation Forest / classifier over
// logged journeys) would replace it later. Keeping the interface stable
// means swapping the internals doesn't require any mobile-app changes.

/**
 * @param {object} features
 * @param {number} features.distanceFromRoute   meters off the planned route
 * @param {number} features.speedKph            current speed, km/h
 * @param {number} features.headingChangeDeg    change in bearing since deviation started, degrees
 * @param {number} features.timeOffRouteMs      how long they've been off-route, ms
 */
export function classifyDeviation(features) {
  const {distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs} =
    features;

  // ---- AI HOOK ----
  // Once you have logged journeys (normal + deviated), train an Isolation
  // Forest / One-Class SVM on vectors like
  // [distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs] and
  // call it here instead of the rules below, e.g.:
  //
  //   const score = await model.predict([distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs]);
  //   if (score > SUSPICIOUS_THRESHOLD) return { label: 'suspicious', confidence: score, reason: 'model' };
  //
  // Rules below are the safety-critical fallback and should stay even after
  // a model is added, in case the model is unavailable or unsure.

  // Very low speed while off-route: could mean stopped, parked somewhere
  // unplanned, or in distress. Treat cautiously.
  if (speedKph < 3 && timeOffRouteMs > 15000) {
    return {
      label: 'suspicious',
      confidence: 0.8,
      reason: 'Stationary or near-stationary while off planned route.',
    };
  }

  // Moving steadily with a consistent, moderate heading change looks like a
  // deliberate turn onto an alternate road - classic "took a detour" shape.
  if (
    speedKph >= 8 &&
    headingChangeDeg >= 20 &&
    headingChangeDeg <= 160 &&
    distanceFromRoute < 400
  ) {
    return {
      label: 'intentional_reroute',
      confidence: 0.75,
      reason: 'Steady movement with a deliberate-looking turn, moderate distance from route.',
    };
  }

  // Far off-route regardless of speed - don't assume it's a benign detour.
  if (distanceFromRoute > 400) {
    return {
      label: 'suspicious',
      confidence: 0.7,
      reason: 'Distance from planned route is large.',
    };
  }

  // Default: not enough evidence either way - err toward caution since this
  // is a safety system, not a routing convenience feature.
  return {
    label: 'suspicious',
    confidence: 0.5,
    reason: 'Ambiguous deviation pattern; defaulting to caution.',
  };
}
