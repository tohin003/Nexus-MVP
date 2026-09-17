// POST /api/auth/signup { email, username, password, profile? } → sets session cookie.
import { db, json, fail, readJson, hashPassword, validEmail, validUsername, validPassword, createSession, sessionCookie, publicUser } from '../_lib.js';

const cleanString = (value, max) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};
const cleanList = (value, maxItems, maxItemLength) => {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim().slice(0, maxItemLength)).slice(0, maxItems);
  return items.length ? items : undefined;
};
const AVAILABILITY = ['mornings', 'evenings', 'weekends', 'full-time', 'flexible'];
const EXPERIENCE = ['beginner', 'intermediate', 'experienced'];

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

  // Optional onboarding profile (saved with the account; never required).
  const name = cleanString(body.name, 100) ?? username;
  const city = cleanString(body.city, 100) ?? '';
  const roles = cleanList(body.roles, 3, 40) ?? [];
  const interests = cleanList(body.interests, 50, 60) ?? [];
  const skills = cleanList(body.skills, 50, 60) ?? [];
  const needs = cleanList(body.needs, 50, 60) ?? [];
  const availability = AVAILABILITY.includes(body.availability) ? body.availability : 'flexible';
  const experience = ['beginner', 'intermediate', 'experienced'].includes(body.experience) ? body.experience : 'beginner';

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
      `insert into users (email, password_hash, username, name, city, roles, interests, skills, needs, availability, experience)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *`,
      [email, passwordHash, username, name, city, roles, interests, skills, needs, availability, experience],
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
