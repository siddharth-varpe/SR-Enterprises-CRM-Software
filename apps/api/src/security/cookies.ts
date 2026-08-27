import type { CookieSerializeOptions } from '@fastify/cookie';
import { env } from '../config/env';

export const AUTH_COOKIE_NAME = 'sr_crm_session';
export const SESSION_COOKIE_NAME = AUTH_COOKIE_NAME;

/**
 * Standard secure cookie options for session management
 */
export function getCookieOptions(maxAgeSeconds = env.SESSION_TTL_SECONDS): CookieSerializeOptions {
  const isProduction = env.NODE_ENV === 'production';

  return {
    path: '/',
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: maxAgeSeconds,
    signed: false, // Opaque session ID stored in Redis
  };
}

export function getSessionCookieOptions(): CookieSerializeOptions {
  return getCookieOptions();
}

/**
 * Cookie options for invalidating/clearing session cookie
 */
export function getClearCookieOptions(): CookieSerializeOptions {
  const isProduction = env.NODE_ENV === 'production';

  return {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 0,
    expires: new Date(0),
  };
}
