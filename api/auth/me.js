// GET /api/auth/me — returns the signed-in user or 401.
import { json, fail, requireUser, publicUser } from '../_lib.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return fail(response, 'Method not allowed.', 405);
  const user = await requireUser(request);
  if (!user) return fail(response, 'Not signed in.', 401);
  json(response, { user: publicUser(user) });
}
