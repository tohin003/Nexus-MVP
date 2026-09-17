/**
 * Local end-to-end check of the api/ functions against the live Neon database.
 * Usage: node scripts/check-api.mjs   (resolves DATABASE_URL from Vercel)
 * Handlers are Node-style (request, response); adapt() maps them to Request → Response.
 */
import { readFileSync } from 'node:fs';

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
const usernameAvailable = (await import('../api/auth/username-available.js')).default;

function adapt(handler) {
  return async (request) => {
    let statusCode = 200;
    const headers = new Map();
    let body = '';
    const response = {
      setHeader: (key, value) => headers.set(String(key).toLowerCase(), value),
      set statusCode(value) { statusCode = value; },
      get statusCode() { return statusCode; },
      end(payload) { body = payload ?? ''; },
    };
    await handler(request, response);
    return new Response(body, { status: statusCode, headers: Object.fromEntries(headers) });
  };
}

const S = { signup: adapt(signup), signin: adapt(signin), signout: adapt(signout), me: adapt(me), health: adapt(health), usernameAvailable: adapt(usernameAvailable) };
const post = (path, body, cookie) => new Request(`https://x.test/api/${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
const get = (path, cookie) => new Request(`https://x.test/api/${path}`, { headers: cookie ? { cookie } : {} });
const sessionOf = (res) => (res.headers.get('set-cookie') ?? '').match(/nexus_session=[^;]+/)?.[0];

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
const healthRes = await S.health();
const healthBody = await healthRes.json().catch(() => ({}));
check('health → 200 + db reachable', healthRes.status === 200 && healthBody.db === 'reachable', `got ${healthRes.status} ${JSON.stringify(healthBody).slice(0, 80)}`);

console.log('signup:');
const good = await S.signup(post('auth/signup', { email, username, password }));
const goodBody = await good.json().catch(() => ({}));
check('201 created', good.status === 201, `got ${good.status} ${JSON.stringify(goodBody).slice(0, 80)}`);
check('sets HttpOnly cookie', /nexus_session=.*HttpOnly/i.test(good.headers.get('set-cookie') ?? ''));
check('returns public user without hash', goodBody.user?.username === username && !('password_hash' in (goodBody.user ?? {})));
const goodCookie = sessionOf(good);
check('signup issues session cookie', Boolean(goodCookie));
const dupUser = await S.signup(post('auth/signup', { email: `other-${unique}@example.com`, username, password }));
check('duplicate username → 409', dupUser.status === 409, `got ${dupUser.status}`);
const dupEmail = await S.signup(post('auth/signup', { email, username: `other_${unique}`, password }));
check('duplicate email → 409', dupEmail.status === 409, `got ${dupEmail.status}`);
const badPw = await S.signup(post('auth/signup', { email: `x-${unique}@example.com`, username: `x_${unique}`, password: 'short' }));
check('weak password → 400', badPw.status === 400, `got ${badPw.status}`);
const badName = await S.signup(post('auth/signup', { email: `y-${unique}@example.com`, username: 'bad name!', password }));
check('invalid username → 400', badName.status === 400, `got ${badName.status}`);
const withProfile = await S.signup(post('auth/signup', { email: `p-${unique}@example.com`, username: `prof_${unique}`, password, name: 'Profiler', city: 'Jaipur', roles: ['creator'], interests: ['filmmaking'], availability: 'weekends', experience: 'intermediate' }));
const profiled = await withProfile.json().catch(() => ({}));
check('signup saves profile fields', withProfile.status === 201 && profiled.user?.name === 'Profiler' && profiled.user?.city === 'Jaipur' && profiled.user?.roles?.[0] === 'creator' && profiled.user?.availability === 'weekends', `got ${withProfile.status} ${JSON.stringify(profiled.user ?? {}).slice(0, 120)}`);

console.log('signin:');
const wrong = await S.signin(post('auth/signin', { email, password: 'wrong-password-123' }));
check('wrong password → 401', wrong.status === 401, `got ${wrong.status}`);
const right = await S.signin(post('auth/signin', { email, password }));
check('correct password → 200', right.status === 200, `got ${right.status}`);
const signinCookie = sessionOf(right);
const unknown = await S.signin(post('auth/signin', { email: `nobody-${unique}@example.com`, password }));
check('unknown email → 401', unknown.status === 401, `got ${unknown.status}`);

console.log('me:');
const authed = await S.me(get('auth/me', signinCookie));
check('me with session → 200', authed.status === 200, `got ${authed.status}`);
check('me returns the username', (await authed.json()).user?.username === username);
const anon = await S.me(get('auth/me'));
check('me without session → 401', anon.status === 401, `got ${anon.status}`);
const stillValid = await S.me(get('auth/me', goodCookie));
check('signup cookie valid before signout', stillValid.status === 200, `got ${stillValid.status}`);

console.log('signout:');
const out = await S.signout(post('auth/signout', {}, signinCookie));
check('signout → 200', out.status === 200, `got ${out.status}`);
const after = await S.me(get('auth/me', signinCookie));
check('revoked session rejected after signout', after.status === 401, `got ${after.status}`);

console.log('username availability:');
const taken = await S.usernameAvailable(get('auth/username-available?u=' + encodeURIComponent(username)));
check('taken username → available:false', (await taken.json()).available === false, `got ${taken.status}`);
const free = await S.usernameAvailable(get('auth/username-available?u=brandnew_' + unique));
check('free username → available:true', (await free.json()).available === true, `got ${free.status}`);
const invalid = await S.usernameAvailable(get('auth/username-available?u=bad%20name'));
check('invalid username → available:false', (await invalid.json()).available === false, `got ${invalid.status}`);

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
