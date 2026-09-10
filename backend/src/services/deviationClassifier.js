// Decides, once the mobile app has already confirmed a route deviation
// (distance-from-route over threshold for a sustained window), whether it
// looks like a deliberate detour or something to treat as suspicious.
//
// Primary path: calls the Python AI service (ai_service/main.py), which
// serves predictions from a trained Isolation Forest. Falls back to the
// rule-based logic below if that service is unreachable, times out, or
// hasn't been trained yet (see ai_service/README.md) - this keeps the
// safety-critical path working even if the AI service is down, which
// matters a lot more for a safety app than for most ML integrations.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const AI_SERVICE_TIMEOUT_MS = 3000;

async function callAiService(features) {
  const res = await fetch(`${AI_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(features),
    signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`AI service returned ${res.status}`);
  }

  return res.json();
}

/**
 * @param {object} features
 * @param {number} features.distanceFromRoute   meters off the planned route
 * @param {number} features.speedKph            current speed, km/h
 * @param {number} features.headingChangeDeg    change in bearing since deviation started, degrees
 * @param {number} features.timeOffRouteMs      how long they've been off-route, ms
 */
function ruleBasedClassify(features) {
  const {distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs} =
    features;

  // Very low speed while off-route: could mean stopped, parked somewhere
  // unplanned, or in distress. Treat cautiously.
  if (speedKph < 3 && timeOffRouteMs > 15000) {
    return {
      label: 'suspicious',
      confidence: 0.8,
      reason: 'Stationary or near-stationary while off planned route (rule-based fallback).',
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
      reason: 'Steady movement with a deliberate-looking turn, moderate distance from route (rule-based fallback).',
    };
  }

  // Far off-route regardless of speed - don't assume it's a benign detour.
  if (distanceFromRoute > 400) {
    return {
      label: 'suspicious',
      confidence: 0.7,
      reason: 'Distance from planned route is large (rule-based fallback).',
    };
  }

  // Default: not enough evidence either way - err toward caution since this
  // is a safety system, not a routing convenience feature.
  return {
    label: 'suspicious',
    confidence: 0.5,
    reason: 'Ambiguous deviation pattern; defaulting to caution (rule-based fallback).',
  };
}

export async function classifyDeviation(features) {
  try {
    return await callAiService(features);
  } catch (err) {
    console.warn(
      `AI service unavailable (${err.message}), falling back to rule-based classification.`,
    );
    return ruleBasedClassify(features);
  }
}
