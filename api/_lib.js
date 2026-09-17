// Shared serverless helpers: Neon connection, sessions, password hashing, validation.
// Handlers use the Node (request, response) signature — supported by every Vercel
// Node runtime, unlike returning a Response (which hangs the connection here).
import { Pool } from 'pg';

let pool;
export function db() {
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

export function json(response, data, status = 200, headers = {}) {
  response.statusCode = status;
  for (const [key, value] of Object.entries({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers })) {
    response.setHeader(key, value);
  }
  response.end(JSON.stringify(data));
}
export const fail = (response, message, status = 400) => json(response, { error: message }, status);

export async function readJson(request) {
  if (typeof request.json === 'function') return request.json(); // Web Request (tests)
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

export function getCookie(request, name) {
  const raw = typeof request.headers?.get === 'function' ? request.headers.get('cookie') : request.headers?.cookie;
  return raw?.match(new RegExp(`${name}=([^;]+)`))?.[1] ?? null;
}

export function timingSafeEqual(a, b) {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

const PBKDF2_ITERATIONS = 600000; // OWASP 2024 guidance for PBKDF2-HMAC-SHA256
const hex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, saltHexValue, hash] = String(stored).split('$');
  if (scheme !== 'pbkdf2' || !saltHexValue || !hash) return false;
  const candidate = await hashPassword(password, Uint8Array.from(saltHexValue.match(/../g).map(h => parseInt(h, 16))));
  return timingSafeEqual(candidate, stored);
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return hex(new Uint8Array(digest));
}

export const SESSION_COOKIE = 'nexus_session';
const SESSION_TTL_DAYS = 30;

export async function createSession(userId) {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = await hashToken(token);
  const { rows } = await db().query(
    'insert into sessions (user_id, token_hash) values ($1, $2) returning id, expires_at',
    [userId, tokenHash],
  );
  return { token, expiresAt: rows[0].expires_at };
}

export function sessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
export const clearSessionCookie = () => `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

export async function requireUser(request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const { rows } = await db().query(
    `select u.id, u.email, u.username, u.name, u.city, u.avatar, u.roles, u.interests, u.skills, u.needs,
            u.availability, u.experience, u.privacy, u.is_admin, u.suspended, u.created_at
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export function publicUser(row) {
  return {
    id: row.id, email: row.email, username: row.username, name: row.name, city: row.city,
    avatar: row.avatar, roles: row.roles, interests: row.interests, skills: row.skills, needs: row.needs,
    availability: row.availability, experience: row.experience, privacy: row.privacy,
    isAdmin: row.is_admin, suspended: row.suspended, onboardingComplete: true, createdAt: row.created_at,
  };
}

/** Reject cross-origin unsafe requests (defense in depth alongside SameSite=Lax). */
export function sameOrigin(request) {
  const origin = request.headers?.origin ?? (typeof request.headers?.get === 'function' ? request.headers.get('origin') : null);
  if (!origin) return true; // non-browser clients — cookie auth still required
  try { return new URL(origin).host === new URL(request.url, 'https://placeholder.local').host; } catch { return false; }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (value) => typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
export const validUsername = (value) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{3,40}$/.test(value);
export const validPassword = (value) => typeof value === 'string' && value.length >= 10 && value.length <= 200;
