import type { Context, Next } from 'hono';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Env, Variables, User, UserArea } from '../types';

export const COOKIE_NAME = 's5_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface JWTPayload {
  sub: number;
  tv: number;
  exp: number;
  [key: string]: unknown;
}

export async function createSessionToken(
  user: User,
  secret: string
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload: JWTPayload = {
    sub: user.id,
    tv: user.token_version,
    exp,
  };
  return await sign(payload, secret, 'HS256');
}

export function setSessionCookie(c: Context<any>, token: string): void {
  const url = new URL(c.req.url);
  const isHttps = url.protocol === 'https:';
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(c: Context<any>): void {
  deleteCookie(c, COOKIE_NAME, {
    path: '/',
  });
}

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const token = getCookie(c, COOKIE_NAME);

  if (!token) {
    return c.json({ error: 'Unauthorized: No session cookie provided' }, 401);
  }

  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as unknown as JWTPayload;
    if (!payload || !payload.sub) {
      return c.json({ error: 'Unauthorized: Invalid token payload' }, 401);
    }

    // Verify user in DB
    const user = await c.env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.sub)
      .first<User>();

    if (!user || user.active !== 1 || user.token_version !== payload.tv) {
      return c.json({ error: 'Unauthorized: Session expired or account inactive' }, 401);
    }

    // Load user area assignments
    const areasRes = await c.env.DB
      .prepare('SELECT user_id, area_id, role FROM user_areas WHERE user_id = ?')
      .bind(user.id)
      .all<UserArea>();

    c.set('user', user);
    c.set('userAreas', areasRes.results || []);

    await next();
  } catch (err) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }
}

export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
): Promise<Response | void> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) {
    return await next();
  }

  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as unknown as JWTPayload;
    if (payload && payload.sub) {
      const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(payload.sub)
        .first<User>();

      if (user && user.active === 1 && user.token_version === payload.tv) {
        const areasRes = await c.env.DB
          .prepare('SELECT user_id, area_id, role FROM user_areas WHERE user_id = ?')
          .bind(user.id)
          .all<UserArea>();

        c.set('user', user);
        c.set('userAreas', areasRes.results || []);
      }
    }
  } catch {
    // Ignore invalid session in optional auth
  }

  await next();
}
