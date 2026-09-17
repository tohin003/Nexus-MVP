// GET /api/health — verifies function + database connectivity. No secrets in response.
import { db, json, fail } from './_lib.js';

export default async function handler() {
  try {
    const { rows } = await db().query('select now() as at, count(*)::int as users from users');
    return json({ ok: true, service: 'nexus-mvp', db: 'reachable', at: rows[0].at, users: rows[0].users });
  } catch (error) {
    console.error('health failed', error.message);
    return fail('Database unreachable.', 503);
  }
}
