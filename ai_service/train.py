"""
Trains an Isolation Forest on real logged journeys.

Run this manually (not automatically on server start) whenever you've
collected more real journey data and want to retrain:
    python train.py

Requires journey_locations rows in Postgres (populated by the mobile app's
throttled GPS pings during JourneyTrackingScreen - see logLocation()).

Feature order MUST match what deviationClassifier.js's callAiService sends
and what main.py's /predict expects: [distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs]
"""

import os
import math
import numpy as np
import psycopg2
import joblib
from dotenv import load_dotenv
from sklearn.ensemble import IsolationForest

load_dotenv()

# Same threshold as the mobile app's DEVIATION_THRESHOLD_METERS - keep these
# in sync, since this defines what counts as "off route" in the training data.
DEVIATION_THRESHOLD_METERS = 60
MIN_EVENTS_TO_TRAIN = 2
MIN_EVENTS_FOR_GOOD_QUALITY = 20


def bearing(lat1, lon1, lat2, lon2):
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    dlon = math.radians(lon2 - lon1)
    y = math.sin(dlon) * math.cos(lat2r)
    x = math.cos(lat1r) * math.sin(lat2r) - math.sin(lat1r) * math.cos(lat2r) * math.cos(dlon)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def bearing_delta(a, b):
    diff = abs(a - b) % 360
    return 360 - diff if diff > 180 else diff


def fetch_pings():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        """
        SELECT journey_id, latitude, longitude, speed_kph, distance_from_route_m, recorded_at
        FROM journey_locations
        ORDER BY journey_id, recorded_at ASC
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def extract_events(rows):
    """Groups consecutive off-route pings into events, one feature vector per event."""
    events = []
    current_event = []
    prev_point = None
    prev_journey = None

    def flush():
        nonlocal current_event
        if len(current_event) >= 2:
            max_dist = max(p["dist"] for p in current_event)
            avg_speed = float(np.mean([p["speed"] for p in current_event]))
            duration_ms = (current_event[-1]["time"] - current_event[0]["time"]).total_seconds() * 1000
            end_heading = bearing(
                current_event[0]["lat"], current_event[0]["lon"],
                current_event[-1]["lat"], current_event[-1]["lon"],
            )
            heading_change = bearing_delta(current_event[0]["entry_heading"], end_heading)
            events.append([max_dist, avg_speed, heading_change, duration_ms])
        current_event = []

    for journey_id, lat, lon, speed, dist, recorded_at in rows:
        speed = speed or 0
        dist = dist or 0

        if journey_id != prev_journey:
            flush()
            prev_point = None
            prev_journey = journey_id

        point = {"lat": lat, "lon": lon, "speed": speed, "dist": dist, "time": recorded_at}

        if dist > DEVIATION_THRESHOLD_METERS:
            if not current_event:
                point["entry_heading"] = (
                    bearing(prev_point["lat"], prev_point["lon"], lat, lon) if prev_point else 0
                )
            current_event.append(point)
        else:
            flush()

        prev_point = point

    flush()
    return events


def main():
    rows = fetch_pings()
    events = extract_events(rows)
    print(f"Extracted {len(events)} deviation events from {len(rows)} location pings.")

    if len(events) < MIN_EVENTS_TO_TRAIN:
        print(
            "Not enough deviation events to train on at all (need at least "
            f"{MIN_EVENTS_TO_TRAIN}). Log more journeys with real deviations first, "
            "then re-run this script."
        )
        return

    if len(events) < MIN_EVENTS_FOR_GOOD_QUALITY:
        print(
            f"WARNING: only {len(events)} events found (recommend {MIN_EVENTS_FOR_GOOD_QUALITY}+ "
            "for a meaningful model). Training anyway - treat this as a placeholder model and "
            "retrain once more real journeys are logged."
        )

    X = np.array(events)

    # contamination = expected proportion of events that are genuinely
    # anomalous. Set explicitly (not 'auto') because 'auto' infers this from
    # whatever's in the training data, which is circular - we want to state
    # our real-world assumption directly: most deviations are ordinary
    # reroutes, a minority are worth treating with more caution. Revisit
    # this number once you have real data and can sanity-check it against
    # how often deviations you'd actually call "suspicious" occur.
    model = IsolationForest(contamination=0.15, random_state=42)
    model.fit(X)

    os.makedirs("model", exist_ok=True)
    joblib.dump(model, "model/isolation_forest.joblib")
    print("Model saved to model/isolation_forest.joblib")


if __name__ == "__main__":
    main()