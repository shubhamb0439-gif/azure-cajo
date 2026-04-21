import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'cajo-erp-super-secret-jwt-key-2026-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface TokenPayload {
  userId: string;
  authUserId: string;
  email: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: any): TokenPayload | null {
  let auth = '';
  if (typeof req.headers?.get === 'function') {
    auth = req.headers.get('authorization') || '';
  } else {
    auth = req.headers?.authorization || req.headers?.Authorization || '';
  }
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  return verifyToken(token);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signIn(email: string, password: string) {
  const user = await queryOne(
    `SELECT * FROM users WHERE email = @email`,
    { email: email.toLowerCase().trim() }
  );

  if (!user) return { error: 'Invalid email or password' };
  if (!user.enabled) return { error: 'Account pending approval. Contact administrator.' };

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return { error: 'Invalid email or password' };

  const payload: TokenPayload = {
    userId: user.id,
    authUserId: user.auth_user_id,
    email: user.email,
    role: user.role,
  };

  const access_token = signToken(payload);
  const refresh_token = uuidv4();
  const expires_at = Date.now() + 24 * 60 * 60 * 1000;

  await execute(
    `UPDATE users SET refresh_token = @refresh_token, last_sign_in = SYSUTCDATETIME() WHERE id = @id`,
    { refresh_token, id: user.id }
  );

  const { password_hash, refresh_token: _, ...safeUser } = user;

  return {
    access_token,
    refresh_token,
    expires_at,
    user: safeUser,
  };
}

export async function refreshSession(refresh_token: string) {
  const user = await queryOne(
    `SELECT * FROM users WHERE refresh_token = @refresh_token`,
    { refresh_token }
  );

  if (!user) return { error: 'Invalid refresh token' };
  if (!user.enabled) return { error: 'Account disabled' };

  const payload: TokenPayload = {
    userId: user.id,
    authUserId: user.auth_user_id,
    email: user.email,
    role: user.role,
  };

  const access_token = signToken(payload);
  const new_refresh_token = uuidv4();
  const expires_at = Date.now() + 24 * 60 * 60 * 1000;

  await execute(
    `UPDATE users SET refresh_token = @new_refresh_token WHERE id = @id`,
    { new_refresh_token, id: user.id }
  );

  const { password_hash, refresh_token: _, ...safeUser } = user;

  return { access_token, refresh_token: new_refresh_token, expires_at, user: safeUser };
}
