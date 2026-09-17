// POST /api/auth/signin { email, password } → sets session cookie.
import { db, json, fail, readJson, verifyPassword, createSession, sessionCookie, publicUser } from '../_lib.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return fail(response, 'Method not allowed.', 405);
  let body;
  try { body = await readJson(request); } catch { return fail(response, 'Invalid JSON body.'); }
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!email || !password) return fail(response, 'Enter your email and password.');

  const { rows } = await db().query('select * from users where lower(email) = lower($1) limit 1', [email]);
  const user = rows[0];
  // Generic response regardless of which factor failed.
  const ok = user && !user.suspended ? await verifyPassword(password, user.password_hash) : false;
  if (!ok) return fail(response, 'Email or password is incorrect.', 401);

  const session = await createSession(user.id);
  response.setHeader('set-cookie', sessionCookie(session.token, session.expiresAt));
  json(response, { user: publicUser(user) });
}
