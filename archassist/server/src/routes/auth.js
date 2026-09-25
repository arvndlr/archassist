import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError, validate } from '../lib/errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  role: z.enum(['student', 'admin']).optional(), // the "Sign in as" choice on the login screen
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// Students self-register. Admin accounts are created by the system (see migrate.js).
router.post('/register', async (req, res) => {
  const data = validate(registerSchema, req.body);
  const exists = await query('SELECT 1 FROM users WHERE email = $1', [data.email]);
  if (exists.rowCount) throw new HttpError(409, 'An account with this email already exists');
  const hash = await bcrypt.hash(data.password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING *`,
    [data.name, data.email, hash],
  );
  res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
});

router.post('/login', async (req, res) => {
  const data = validate(loginSchema, req.body);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [data.email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (data.role && data.role !== user.role) {
    throw new HttpError(403, data.role === 'admin' ? 'This account does not have admin access.' : 'This is an admin account — sign in as Admin.');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(rows[0]) });
});

export default router;
