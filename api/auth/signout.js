// POST /api/auth/signout — revokes the current session and clears the cookie.
import { db, json, fail, hashToken, getCookie, clearSessionCookie, SESSION_COOKIE } from '../_lib.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return fail(response, 'Method not allowed.', 405);
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await db().query('update sessions set revoked_at = now() where token_hash = $1', [await hashToken(token)]);
  response.setHeader('set-cookie', clearSessionCookie());
  json(response, { ok: true });
}
