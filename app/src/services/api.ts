/**
 * Thin browser client for the deployed auth API (same origin in production).
 * Every call degrades gracefully: if the API is unreachable (local demo/preview),
 * callers get `null` instead of a throw so the local demo keeps working.
 */
import type { User } from '../domain/types';

const jsonHeaders = { 'content-type': 'application/json' };

async function call(path: string, init?: RequestInit): Promise<{ status: number; data: any } | null> {
  try {
    const response = await fetch(path, { credentials: 'same-origin', ...init });
    // A dev server without /api functions answers with an HTML SPA fallback (HTTP 200).
    // Treating that as JSON would read as `available:false` — unreachable must stay null.
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) return null;
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch {
    return null; // offline / local preview without functions
  }
}

export type ServerUser = Pick<User, 'id' | 'username' | 'name' | 'city' | 'privacy'> & Partial<Pick<User, 'avatar' | 'roles' | 'interests' | 'skills' | 'needs' | 'availability' | 'experience' | 'isAdmin' | 'suspended'>> & { email: string; createdAt?: string };
export type SignupInput = { email: string; username: string; password: string; name?: string; city?: string; roles?: string[]; interests?: string[]; skills?: string[]; needs?: string[]; availability?: string; experience?: string };

export const api = {
  async me(): Promise<ServerUser | null> {
    const result = await call('/api/auth/me');
    return result?.status === 200 ? result.data.user : null;
  },
  async usernameAvailable(username: string): Promise<boolean | null> {
    const result = await call(`/api/auth/username-available?u=${encodeURIComponent(username)}`);
    if (!result || result.status !== 200) return null;
    return result.data.available === true;
  },
  async signup(input: SignupInput): Promise<{ ok: true; user: ServerUser } | { ok: false; error: string } | null> {
    const result = await call('/api/auth/signup', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(input) });
    if (!result) return null;
    return result.status === 201 ? { ok: true, user: result.data.user } : { ok: false, error: result.data.error ?? 'Could not create your account.' };
  },
  async signin(input: { email: string; password: string }): Promise<{ ok: true; user: ServerUser } | { ok: false; error: string } | null> {
    const result = await call('/api/auth/signin', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(input) });
    if (!result) return null;
    return result.status === 200 ? { ok: true, user: result.data.user } : { ok: false, error: result.data.error ?? 'Email or password is incorrect.' };
  },
  async signout(): Promise<boolean> {
    const result = await call('/api/auth/signout', { method: 'POST' });
    return result?.status === 200;
  },
};
