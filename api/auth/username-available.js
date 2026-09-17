// GET /api/auth/username-available?u=name → { available: boolean }
import { db, json, fail, validUsername } from '../_lib.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return fail(response, 'Method not allowed.', 405);
  const url = new URL(request.url, 'https://placeholder.local');
  const username = String(url.searchParams.get('u') ?? '').trim();
  if (!validUsername(username)) return json(response, { available: false, reason: 'invalid' });
  try {
    const { rows } = await db().query('select 1 from users where lower(username) = lower($1) limit 1', [username]);
    json(response, { available: rows.length === 0, reason: rows.length ? 'taken' : null });
  } catch (error) {
    console.error('username check failed', error.message);
    return fail(response, 'Could not check that username. Please try again.', 500);
  }
}
