import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from './api';

/** Minimal fetch stub: maps URL/method/body to canned responses. */
function stubFetch(routes: (input: { url: string; method: string; body: unknown }) => { status: number; data: unknown } | undefined) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    let body: unknown = undefined;
    if (typeof init?.body === 'string') { try { body = JSON.parse(init.body); } catch { body = init.body; } }
    const match = routes({ url, method, body });
    if (!match) throw new TypeError('network down');
    return new Response(JSON.stringify(match.data), { status: match.status, headers: { 'content-type': 'application/json' } });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('usernameAvailable maps true/false and null on unreachable API', async () => {
    vi.stubGlobal('fetch', stubFetch(({ url }) => url.includes('username-available')
      ? { status: 200, data: { available: false, reason: 'taken' } } : undefined));
    expect(await api.usernameAvailable('taken')).toBe(false);

    vi.stubGlobal('fetch', stubFetch(({ url }) => url.includes('username-available')
      ? { status: 200, data: { available: true, reason: null } } : undefined));
    expect(await api.usernameAvailable('free')).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await api.usernameAvailable('anything')).toBeNull();
  });

  it('signup returns user on 201 and error message on 409', async () => {
    vi.stubGlobal('fetch', stubFetch(({ url }) => url.endsWith('/api/auth/signup')
      ? { status: 201, data: { user: { id: 'u1', username: 'new', email: 'e@x.com', name: 'new', city: '', privacy: {} } } } : undefined));
    const created = await api.signup({ email: 'e@x.com', username: 'new', password: 'long-enough' });
    expect(created).toEqual({ ok: true, user: expect.objectContaining({ username: 'new' }) });

    vi.stubGlobal('fetch', stubFetch(({ url }) => url.endsWith('/api/auth/signup')
      ? { status: 409, data: { error: 'That username is already in use.' } } : undefined));
    const conflict = await api.signup({ email: 'e@x.com', username: 'new', password: 'long-enough' });
    expect(conflict).toEqual({ ok: false, error: 'That username is already in use.' });

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await api.signup({ email: 'e@x.com', username: 'new', password: 'long-enough' })).toBeNull();
  });

  it('signin maps 401 to a friendly error and signout to boolean', async () => {
    vi.stubGlobal('fetch', stubFetch(({ url }) => url.endsWith('/api/auth/signin')
      ? { status: 401, data: { error: 'Email or password is incorrect.' } } : undefined));
    const denied = await api.signin({ email: 'e@x.com', password: 'wrong' });
    expect(denied).toEqual({ ok: false, error: 'Email or password is incorrect.' });

    vi.stubGlobal('fetch', stubFetch(({ url }) => url.endsWith('/api/auth/signout') ? { status: 200, data: { ok: true } } : undefined));
    expect(await api.signout()).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await api.signout()).toBe(false);
  });
});
