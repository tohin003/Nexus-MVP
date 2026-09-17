// POST /api/auth/signout — revokes the current session and clears the cookie.
import { db, json, fail, hashToken, clearSessionCookie, SESSION_COOKIE } from '../_lib.js';

export default async function handler(request) {
  if (request.method !== 'POST') return fail('Method not allowed.', 405);
  const match = (request.headers.get('cookie') ?? '').match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) {
    await db().query('update sessions set revoked_at = now() where token_hash = $1', [await hashToken(match[1])]);
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie() });
}
