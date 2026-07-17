// Protects a route by requiring a valid "Authorization: Bearer <token>"
// header. On success, attaches req.userId so route handlers know which
// user is making the request (used for scoping contacts to their owner).

import {verifyToken} from '../services/auth.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({error: 'Missing or malformed Authorization header.'});
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    res.status(401).json({error: 'Invalid or expired token.'});
  }
}
