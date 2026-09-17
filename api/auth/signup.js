// POST /api/auth/signup { email, username, password } → sets session cookie.
import { db, json, fail, readJson, hashPassword, validEmail, validUsername, validPassword, createSession, sessionCookie, publicUser } from '../_lib.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return fail(response, 'Method not allowed.', 405);
  let body;
  try { body = await readJson(request); } catch { return fail(response, 'Invalid JSON body.'); }
  const email = String(body.email ?? '').trim().toLowerCase();
  const username = String(body.username ?? '').trim();
  const password = body.password;

  if (!validEmail(email)) return fail(response, 'Enter a valid email address.');
  if (!validUsername(username)) return fail(response, 'Usernames use 3–40 letters, numbers, dots, dashes, or underscores.');
  if (!validPassword(password)) return fail(response, 'Passwords must be at least 10 characters.');

  const client = db();
  try {
    const existing = await client.query(
      'select id, username, email from users where lower(username) = lower($1) or lower(email) = lower($2) limit 2',
      [username, email],
    );
    if (existing.rows.some(row => row.username.toLowerCase() === username.toLowerCase())) return fail(response, 'That username is already in use.', 409);
    if (existing.rows.some(row => row.email.toLowerCase() === email)) return fail(response, 'An account with this email already exists. Try signing in.', 409);

    const passwordHash = await hashPassword(password);
    const { rows } = await client.query(
      'insert into users (email, password_hash, username, name) values ($1, $2, $3, $4) returning *',
      [email, passwordHash, username, username],
    );
    const user = rows[0];
    const session = await createSession(user.id);
    response.setHeader('set-cookie', sessionCookie(session.token, session.expiresAt));
    json(response, { user: publicUser(user) }, 201);
  } catch (error) {
    if (error.code === '23505') return fail(response, 'That username or email is already registered.', 409);
    console.error('signup failed', error.message);
    return fail(response, 'Could not create your account. Please try again.', 500);
  }
}
