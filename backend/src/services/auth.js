// Registration/login logic: hashes passwords with bcrypt (never store or
// compare plain text passwords), issues short-lived JWTs for authenticated
// requests. The mobile app stores the returned token and sends it back on
// the Authorization header for anything that needs to know "which user".

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {pool} from '../db/index.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '30d'; // long-lived since this is a mobile app, not a web session

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'change_this_secret') {
    throw new Error(
      'JWT_SECRET is not configured on the server. Set a real random value in .env.',
    );
  }
  return secret;
}

function signToken(userId) {
  return jwt.sign({userId}, getJwtSecret(), {expiresIn: TOKEN_EXPIRY});
}

export async function registerUser(name, email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name.trim(), normalizedEmail, passwordHash],
  );

  const user = result.rows[0];
  const token = signToken(user.id);

  return {
    token,
    user: {
      id: `${user.id}`,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
  };
}

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
    [normalizedEmail],
  );
  const user = result.rows[0];

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new Error('Invalid email or password.');
  }

  const token = signToken(user.id);

  return {
    token,
    user: {
      id: `${user.id}`,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
    },
  };
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret()); // throws if invalid/expired
}
