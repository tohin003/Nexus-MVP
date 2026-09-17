// GET /api/auth/me — returns the signed-in user or 401.
import { json, fail, requireUser, publicUser } from '../_lib.js';

export default async function handler(request) {
  if (request.method !== 'GET') return fail('Method not allowed.', 405);
  const user = await requireUser(request);
  if (!user) return fail('Not signed in.', 401);
  return json({ user: publicUser(user) });
}
