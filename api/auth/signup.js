// POST /api/auth/signup { email, username, password, name? } → sets session cookie
import { db, json, fail, hashPassword, validEmail, validUsername, validPassword, createSession, sessionCookie, publicUser } from '../_lib.js';

export default async function handler(request) {
  if (request.method !== 'POST') return fail('Method not allowed.', 405);
  let body;
  try { body = await request.json(); } catch { return fail('Invalid JSON body.'); }
  const email = String(body.email ?? '').trim().toLowerCase();
  const username = String(body.username ?? '').trim();
  const password = body.password;
  const name = String(body.name ?? '').trim() || username;

  if (!validEmail(email)) return fail('Enter a valid email address.');
  if (!validUsername(username)) return fail('Usernames use 3–40 letters, numbers, dots, dashes, or underscores.');
  if (!validPassword(password)) return fail('Passwords must be at least 10 characters.');

  const client = db();
  try {
    const existing = await client.query(
      'select id, username, email from users where lower(username) = lower($1) or lower(email) = lower($2) limit 2',
      [username, email],
    );
    if (existing.rows.some(row => row.username.toLowerCase() === username.toLowerCase())) return fail('That username is already in use.', 409);
    if (existing.rows.some(row => row.email.toLowerCase() === email)) return fail('An account with this email already exists. Try signing in.', 409);

    const passwordHash = await hashPassword(password);
    const { rows } = await client.query(
      `insert into users (email, password_hash, username, name)
       values ($1, $2, $3, $4) returning *`,
      [email, passwordHash, username, username],
    );
    const user = rows[0];
    const session = await createSession(user.id);
    return json({ user: publicUser(user) }, 201, { 'set-cookie': sessionCookie(session.token, session.expiresAt) });
  } catch (error) {
    if (error.code === '23505') return fail('That username or email is already registered.', 409);
    console.error('signup failed', error.message);
    return fail('Could not create your account. Please try again.', 500);
  }
}
