// Postgres connection pool + one-time schema setup. Uses parameterized
// queries everywhere (never string-concatenated SQL) to avoid SQL injection.

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const {Pool} = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}
