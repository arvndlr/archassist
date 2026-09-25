import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Authentication required'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, name: payload.name, email: payload.email };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden'));
    next();
  };
}
