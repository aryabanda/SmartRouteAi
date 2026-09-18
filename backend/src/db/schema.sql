CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id
ON contacts(user_id);


CREATE TABLE IF NOT EXISTS journeys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  destination TEXT NOT NULL,

  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,

  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,

  distance_km DOUBLE PRECISION,
  duration_min DOUBLE PRECISION,

  status TEXT NOT NULL DEFAULT 'in_progress',
  -- in_progress | completed | sos_triggered

  deviation_count INTEGER NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,

  -- Random public token used by emergency contacts.
  -- Do NOT expose the sequential journey ID.
  share_token TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_journeys_user_id
ON journeys(user_id);


CREATE TABLE IF NOT EXISTS journey_locations (
  id SERIAL PRIMARY KEY,

  journey_id INTEGER NOT NULL
    REFERENCES journeys(id)
    ON DELETE CASCADE,

  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  speed_kph DOUBLE PRECISION,
  distance_from_route_m DOUBLE PRECISION,

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_locations_journey_id
ON journey_locations(journey_id);

CREATE INDEX IF NOT EXISTS idx_journey_locations_latest
ON journey_locations(journey_id, recorded_at DESC);


-- Add this safely if the database already exists.
ALTER TABLE journeys
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;