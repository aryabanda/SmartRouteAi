import {Router} from 'express';
import {registerUser, loginUser} from '../services/auth.js';

export const authRouter = Router();

// POST /api/auth/register
// body: { name, email, password }
authRouter.post('/register', async (req, res) => {
  const {name, email, password} = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({error: 'name, email, and password are all required.'});
  }
  if (password.length < 6) {
    return res.status(400).json({error: 'Password must be at least 6 characters.'});
  }

  try {
    const result = await registerUser(name, email, password);
    res.status(201).json(result);
  } catch (err) {
    res.status(409).json({error: err.message});
  }
});

// POST /api/auth/login
// body: { email, password }
authRouter.post('/login', async (req, res) => {
  const {email, password} = req.body ?? {};

  if (!email?.trim() || !password) {
    return res.status(400).json({error: 'email and password are required.'});
  }

  try {
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({error: err.message});
  }
});
