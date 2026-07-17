-- Run automatically on server startup (see db/index.js's initDb), so you
-- don't need to run this by hand - but it's here for reference/inspection.

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

-- Speeds up "get all contacts for this user" - the most frequent query.
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
