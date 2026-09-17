/**
 * Local end-to-end check of the api/ functions against the live Neon database.
 * Usage: node scripts/check-api.mjs   (resolves DATABASE_URL from Vercel)
 * Boots each handler directly with Request/Response objects — no server needed.
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const token = readFileSync(new URL('../.env.vercel', import.meta.url), 'utf8').match(/^VERCEL_TOKEN=(.+)$/m)?.[1];
const envs = await (await fetch('https://api.vercel.com/v9/projects/prj_3s4pHLMzKc007WfJJ36fXf4HStZJ/env?teamId=team_N5idOJlO1oMP54wXhPZsaDQM', { headers: { Authorization: `Bearer ${token}` } })).json();
const row = envs.envs.find(e => e.key === 'DATABASE_URL');
const detail = await (await fetch(`https://api.vercel.com/v1/projects/prj_3s4pHLMzKc007WfJJ36fXf4HStZJ/env/${row.id}?teamId=team_N5idOJlO1oMP54wXhPZsaDQM`, { headers: { Authorization: `Bearer ${token}` } })).json();
process.env.DATABASE_URL = detail.value;

const signup = (await import('../api/auth/signup.js')).default;
const signin = (await import('../api/auth/signin.js')).default;
const signout = (await import('../api/auth/signout.js')).default;
const me = (await import('../api/auth/me.js')).default;
const health = (await import('../api/health.js')).default;

const post = (path, body, cookie) => new Request(`https://x.test/api/${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
const get = (path, cookie) => new Request(`https://x.test/api/${path}`, { headers: cookie ? { cookie } : {} });
const asRequest = (input) => input instanceof Request ? input : Object.assign(new Request('https://x.test/api/x', { method: 'POST', body: '{}' }), input);
const getCookie = (res) => res.headers.get('set-cookie')?.split(';')[0];

let pass = 0, failed = 0;
const check = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${detail}`); }
};

const unique = Date.now().toString(36);
const email = `tester-${unique}@example.com`;
const username = `tester_${unique}`;
const password = 'correct-horse-battery';

console.log('health:');
const h = await health();
console.log(' ', h.status, (await h.json()).db);

console.log('signup:');
const good = await signup(post('auth/signup', { email, username, password }));
const goodBody = await good.json();
check('201 created', good.status === 201, `got ${good.status}`);
check('sets HttpOnly cookie', /nexus_session=.*HttpOnly/i.test(good.headers.get('set-cookie') ?? ''));
check('returns public user without hash', goodBody.user?.username === username && !('password_hash' in (goodBody.user ?? {})));
const goodCookie = (good.headers.get('set-cookie') ?? '').match(/nexus_session=[^;]+/)?.[0];
const dupUser = await signup(post('auth/signup', { email: `other-${unique}@example.com`, username, password }));
check('duplicate username → 409', dupUser.status === 409, `got ${dupUser.status}`);
const badPw = await signup(post('auth/signup', { email: `x-${unique}@example.com`, username: `x_${unique}`, password: 'short' }));
check('weak password rejected', badPw.status === 400, `got ${badPw.status}`);

console.log('signin:');
const wrong = await signin(post('auth/signin', { email, password: 'wrong-password-123' }));
check('wrong password → 401', wrong.status === 401, `got ${wrong.status}`);
const right = await signin(post('auth/signin', { email, password }));
check('correct password → 200', right.status === 200, `got ${right.status}`);
const signinCookie = (right.headers.get('set-cookie') ?? '').match(/nexus_session=[^;]+/)?.[0];
const unknown = await signin(post('auth/signin', { email: `nobody-${unique}@example.com`, password }));
check('unknown email → 401', unknown.status === 401, `got ${unknown.status}`);

console.log('me:');
const authed = await me(get('auth/me', signinCookie));
check('me with session → 200', authed.status === 200, `got ${authed.status}`);
check('me returns username', (await authed.json()).user?.username === username);
const anon = await me(get('auth/me'));
check('me without session → 401', anon.status === 401, `got ${anon.status}`);
const revoked = await me(get('auth/me', goodCookie));
check('signup cookie still valid before signout', revoked.status === 200, `got ${revoked.status}`);

console.log('signout:');
const out = await signout(post('auth/signout', {}, signinCookie));
check('signout → 200', out.status === 200, `got ${out.status}`);
const after = await me(get('auth/me', signinCookie));
check('revoked session rejected after signout', after.status === 401, `got ${after.status}`);

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
