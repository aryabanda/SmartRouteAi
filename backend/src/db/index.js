// Postgres connection pool + one-time schema setup.
// Uses parameterized queries everywhere (never string-concatenated SQL)
// to avoid SQL injection.

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const {Pool} = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured.');
}

// Local PostgreSQL does not require SSL.
// Render PostgreSQL requires SSL/TLS.
const isLocal =
  databaseUrl.includes('localhost') ||
  databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: databaseUrl,

  ssl: isLocal
    ? false
    : {
        rejectUnauthorized: false,
      },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function initDb() {
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8',
  );

  await pool.query(schema);

  console.log('✅ PostgreSQL connected and schema initialized');
}
