// GET /api/ping — no database: isolates function runtime from Neon connectivity.
export default async function handler(request, response) {
  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ pong: true, at: new Date().toISOString() }));
}
