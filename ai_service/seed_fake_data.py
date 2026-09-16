"""
Seeds journeys + journey_locations with SYNTHETIC data so you can test the
full train.py -> main.py pipeline without physically walking/driving test
routes.

IMPORTANT - read this before using the results anywhere:
This is fabricated data for exercising the pipeline (does training run?
does the model load? does /predict respond sensibly?), NOT real user
behavior. A model trained only on this doesn't reflect anything real and
shouldn't be presented as "the trained model" in your report - use it to
confirm the mechanics work, then retrain on real logged journeys once
you've collected some (see ai_service/README.md).

Usage:
    python seed_fake_data.py
"""

import os
import random
from datetime import datetime, timedelta
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Roughly Hyderabad-area coordinates, matching the rest of your test data.
BASE_LAT = 17.4896
BASE_LON = 78.4842

NUM_JOURNEYS = 40


def get_or_create_test_user(cur):
    cur.execute("SELECT id FROM users ORDER BY id LIMIT 1")
    row = cur.fetchone()
    if row:
        return row[0]

    # No users at all yet - create a throwaway one so this script can run standalone.
    cur.execute(
        """
        INSERT INTO users (name, email, password_hash)
        VALUES ('Seed Test User', 'seed-test-user@example.com', 'not_a_real_hash')
        RETURNING id
        """
    )
    return cur.fetchone()[0]


def jitter(base, meters):
    # Rough meters-to-degrees conversion, fine for small offsets like this.
    return base + (random.uniform(-meters, meters) / 111320)


def seed_journey(cur, user_id, journey_index):
    destination = f"Seed Test Destination {journey_index}"
    cur.execute(
        """
        INSERT INTO journeys (user_id, destination, origin_lat, origin_lng, distance_km, duration_min, status)
        VALUES (%s, %s, %s, %s, %s, %s, 'completed')
        RETURNING id
        """,
        (user_id, destination, BASE_LAT, BASE_LON, round(random.uniform(2, 10), 1), round(random.uniform(10, 30), 1)),
    )
    journey_id = cur.fetchone()[0]

    start_time = datetime.now() - timedelta(days=random.randint(0, 10))
    t = start_time
    lat, lon = BASE_LAT, BASE_LON

    def insert_ping(lat, lon, speed, dist_from_route, recorded_at):
        cur.execute(
            """
            INSERT INTO journey_locations (journey_id, latitude, longitude, speed_kph, distance_from_route_m, recorded_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (journey_id, lat, lon, speed, dist_from_route, recorded_at),
        )

    # A few normal on-route pings before the deviation.
    for _ in range(3):
        lat = jitter(lat, 15)
        lon = jitter(lon, 15)
        insert_ping(lat, lon, random.uniform(20, 40), random.uniform(0, 40), t)
        t += timedelta(seconds=15)

    # One deviation "event" per journey. Deliberately IMBALANCED (~85%
    # normal-looking, ~15% stationary/suspicious-looking) - this matches
    # the real-world assumption the whole model depends on: most deviations
    # are ordinary reroutes, genuine distress is rare. An even 50/50 split
    # gives Isolation Forest no rarity signal to key off, so which pattern
    # gets flagged as "the outlier" becomes arbitrary - this imbalance is
    # what makes the anomaly-detection approach actually meaningful.
    is_stationary_pattern = random.random() < 0.15

    num_deviation_points = random.randint(2, 4)
    for _ in range(num_deviation_points):
        if is_stationary_pattern:
            # Near-stationary while off-route - mimics the "suspicious" rule shape.
            speed = random.uniform(0, 2)
            dist = random.uniform(80, 200)
        else:
            # Steady movement, larger displacement - mimics "intentional reroute" shape.
            speed = random.uniform(15, 45)
            dist = random.uniform(70, 350)
            lat = jitter(lat, 40)
            lon = jitter(lon, 40)

        insert_ping(lat, lon, speed, dist, t)
        t += timedelta(seconds=random.randint(8, 15))

    # Back on route for a couple more pings.
    for _ in range(2):
        lat = jitter(lat, 15)
        lon = jitter(lon, 15)
        insert_ping(lat, lon, random.uniform(20, 40), random.uniform(0, 40), t)
        t += timedelta(seconds=15)


def main():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    user_id = get_or_create_test_user(cur)

    for i in range(NUM_JOURNEYS):
        seed_journey(cur, user_id, i)

    conn.commit()
    cur.close()
    conn.close()

    print(f"Seeded {NUM_JOURNEYS} synthetic journeys with location pings and deviation events.")
    print("Run train.py now to train against this data.")
    print("Remember: this is synthetic, for testing the pipeline only - see this file's docstring.")


if __name__ == "__main__":
    main()