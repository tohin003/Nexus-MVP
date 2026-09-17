// GET /api/ping — no database: isolates function runtime from Neon connectivity.
export default async function handler() {
  return new Response(JSON.stringify({ pong: true, at: new Date().toISOString() }), {
    headers: { 'content-type': 'application/json' },
  });
}
