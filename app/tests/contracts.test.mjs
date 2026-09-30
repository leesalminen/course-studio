import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAuth, consumeCallback, verifyIdentity } from '../auth.mjs';
import { generateKeyPair, SignJWT } from 'jose';
import { readResponseStream, structuredResponse, listModels } from '../inference.mjs';
import { briefSchema, previewSchema, validatePreview, validateLesson } from '../course.mjs';
import { startServer, allowedRequest } from '../server.mjs';
import { createJobs } from '../jobs.mjs';
import { privateDirectory, writeJSON } from '../storage.mjs';
import { unzipSync, strFromU8 } from 'fflate';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
import { brief, preview, lesson, guide } from './fixtures.mjs';

async function temp(t) { const path = await mkdtemp(join(tmpdir(), 'course-studio-test-')); t.after(() => rm(path, { recursive: true, force: true })); return path; }
function stream(events, terminal = true) {
  const text = events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join('') + (terminal ? 'data: {"type":"response.completed"}\r\n\r\n' : '');
  return new ReadableStream({ start(controller) { const bytes = new TextEncoder().encode(text); for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } });
}

test('OAuth callback requires state, browser binding, expiry, code, and exact returning client', () => {
  const attempt = { browserId: 'browser', state: 'state', expires: 100, clientId: 'oaiapp_one' };
  const good = new URL('http://127.0.0.1/auth/callback?code=code&state=state');
  assert.equal(consumeCallback(attempt, good, 'browser', 1).clientId, 'oaiapp_one');
  for (const [a, u, b, now] of [[undefined, good, 'browser', 1], [attempt, good, 'other', 1], [attempt, good, 'browser', 100], [attempt, new URL(good + '&client_id=oaiapp_other'), 'browser', 1], [attempt, new URL(good + '&error=access_denied'), 'browser', 1], [{ ...attempt, clientId: undefined }, good, 'browser', 1]]) assert.throws(() => consumeCallback(a, u, b, now));
});

test('registration, consent, refresh, identity binding, sign-out and private persistence', async t => {
  const directory = await temp(t); const calls = [];
  const auth = createAuth(directory, 'http://127.0.0.1:1455', {
    verify: async (token, client, nonce) => { assert.equal(token, 'id-token'); assert.equal(client, 'oaiapp_one'); assert.ok(nonce); return { sub: 'parent-one', email: 'fictional@example.invalid' }; },
    fetcher: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('openid-configuration')) return Response.json({ issuer: 'https://auth.openai.com', revocation_endpoint: 'https://auth.openai.com/revoke' });
      if (url.endsWith('/revoke')) return new Response(null, { status: 200 });
      return Response.json({ access_token: 'plan-access', refresh_token: 'rotated-refresh', id_token: 'id-token', token_type: 'Bearer', expires_in: options.body.get('grant_type') === 'refresh_token' ? 3600 : 1, scope: 'openid chatgpt.tokens.use.direct' });
    },
  });
  const first = new URL((await auth.begin('browser')).url);
  assert.equal(first.searchParams.get('client_id'), 'dynamic_agent_client');
  assert.equal(first.searchParams.get('redirect_uri'), 'http://127.0.0.1:1455/auth/callback');
  assert.equal(first.searchParams.get('code_challenge_method'), 'S256');
  await auth.callback(new URL(`http://127.0.0.1:1455/auth/callback?code=one&state=${first.searchParams.get('state')}&client_id=oaiapp_one`), 'browser');
  await assert.rejects(() => auth.callback(new URL('http://127.0.0.1:1455/auth/callback?code=one'), 'browser'));
  assert.equal((await auth.session()).sharing, true);
  const tokens = await Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken()]);
  assert.deepEqual(tokens, ['plan-access', 'plan-access', 'plan-access']);
  assert.equal(calls.filter(c => c.options?.body?.get('grant_type') === 'refresh_token').length, 1);
  const saved = JSON.parse(await readFile(join(directory, 'accounts.json')));
  assert.equal(saved.profiles[0].refresh_token, 'rotated-refresh');
  assert.equal((await stat(join(directory, 'accounts.json'))).mode & 0o777, 0o600);
  assert.ok(!JSON.stringify(await auth.session()).includes('plan-access'));
  const returning = new URL((await auth.begin('browser')).url);
  assert.equal(returning.searchParams.get('client_id'), 'oaiapp_one');
  assert.equal(returning.searchParams.get('ext_agent_host_id'), first.searchParams.get('ext_agent_host_id'));
  assert.equal(returning.searchParams.has('agent_name_hint'), false);
  assert.equal((await auth.signOut()).revoked, true);
  assert.equal((await auth.session()).sharing, false);
  assert.equal((await auth.session()).profiles.length, 1);
  await assert.rejects(() => auth.accessToken());
});

test('identity-only consent cannot authorize plan usage', async t => {
  const directory = await temp(t);
  const auth = createAuth(directory, 'http://127.0.0.1:1455', { verify: async () => ({ sub: 'parent-one' }), fetcher: async () => Response.json({ access_token: 'identity-access', id_token: 'id', token_type: 'Bearer', expires_in: 3600, scope: 'openid profile email' }) });
  const url = new URL((await auth.begin('browser')).url);
  await auth.callback(new URL(`http://127.0.0.1:1455/auth/callback?code=one&state=${url.searchParams.get('state')}&client_id=oaiapp_identity`), 'browser');
  assert.equal((await auth.session()).sharing, false); await assert.rejects(() => auth.accessToken());
});

test('ID tokens require a valid signature, issuer, audience, expiry and nonce', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const sign = (payload = {}, options = {}) => new SignJWT({ sub: 'parent-one', nonce: 'nonce', ...payload }).setProtectedHeader({ alg: 'RS256' }).setIssuedAt().setIssuer(options.issuer ?? 'https://auth.openai.com').setAudience(options.audience ?? 'oaiapp_one').setExpirationTime(options.expiration ?? '5m').sign(privateKey);
  assert.equal((await verifyIdentity(await sign(), 'oaiapp_one', 'nonce', publicKey)).sub, 'parent-one');
  for (const token of [await sign({ nonce: 'wrong' }), await sign({}, { issuer: 'https://evil.invalid' }), await sign({}, { audience: 'other' }), await sign({}, { expiration: 1 })]) await assert.rejects(() => verifyIdentity(token, 'oaiapp_one', 'nonce', publicKey));
  const other = await generateKeyPair('RS256'); await assert.rejects(async () => verifyIdentity(await sign(), 'oaiapp_one', 'nonce', other.publicKey));
});

test('failed new registration retains its client without replacing the active verified account', async t => {
  const directory = await temp(t);
  await writeJSON(join(directory, 'accounts.json'), { active: 'original', profiles: [{ id: 'original', subject: 'parent-original', client_id: 'oaiapp_original', scopes: [] }] });
  const auth = createAuth(directory, 'http://127.0.0.1:1455', { fetcher: async () => new Response(null, { status: 400 }) });
  const first = new URL((await auth.begin('browser', { newAccount: true })).url);
  await assert.rejects(() => auth.callback(new URL(`http://127.0.0.1:1455/auth/callback?code=expired&state=${first.searchParams.get('state')}&client_id=oaiapp_pending`), 'browser'));
  assert.equal((await auth.session()).active, 'original');
  const retry = new URL((await auth.begin('browser', { newAccount: true })).url);
  assert.equal(retry.searchParams.get('client_id'), 'oaiapp_pending');
  assert.equal(retry.searchParams.has('id_token_hint'), false);
});

test('SSE handles fragmented UTF-8 and requires completed inference', async () => {
  const events = [{ type: 'response.output_text.delta', delta: 'Español: ' }, { type: 'response.output_text.delta', delta: 'curiosidad' }];
  assert.equal(await readResponseStream(stream(events)), 'Español: curiosidad');
  await assert.rejects(() => readResponseStream(stream(events, false)));
  await assert.rejects(() => readResponseStream(stream([...events, { type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } }], false)), error => error.code === 'usage_limit');
  await assert.rejects(() => readResponseStream(stream([{ type: 'response.incomplete' }], false)));
});

test('model catalog and Responses requests follow the account-specific public contract', async () => {
  assert.deepEqual(await listModels('token', async () => Response.json({ models: [{ slug: 'available', display_name: 'Available', visibility: 'list' }, { slug: 'hidden', display_name: 'Hidden', visibility: 'hidden' }] })), [{ slug: 'available', display_name: 'Available' }]);
  const result = await structuredResponse({ token: 'token', model: 'available', instructions: 'canonical', input: { brief }, schema: previewSchema, name: 'preview' }, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.stream, true); assert.equal(body.model, 'available'); assert.equal(body.text.format.strict, true);
    return new Response(stream([{ type: 'response.output_text.delta', delta: JSON.stringify(preview) }]));
  });
  assert.deepEqual(result, preview);
});

test('typed briefs, exact coverage, and lesson timing reject inconsistent output', () => {
  assert.deepEqual(briefSchema.parse(brief), brief); validatePreview(preview, brief); validateLesson(lesson, brief);
  assert.throws(() => briefSchema.parse({ ...brief, weeks: 7 }));
  assert.throws(() => validatePreview(preview, { ...brief, weeks: 2 }));
  assert.throws(() => validateLesson(lesson, { ...brief, minutes: 60 }));
});

test('loopback API rejects foreign hosts/origins and permits a state-bound OpenAI callback', async t => {
  const directory = await temp(t); let callbackCount = 0;
  const { server, origin } = await startServer({ port: 0, directory, authFactory: () => ({ session: async () => ({ connected: false, sharing: false, active: null, profiles: [] }), callback: async () => { callbackCount++; } }) });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const page = await fetch(origin); assert.equal(page.status, 200); const cookie = page.headers.get('set-cookie').split(';')[0];
  const state = await (await fetch(origin + '/api/session', { headers: { cookie } })).json();
  assert.ok(state.csrf);
  assert.equal((await fetch(origin + '/api/session')).status, 403);
  assert.equal(allowedRequest({ headers: { host: 'evil.invalid' } }, origin), false);
  assert.equal((await fetch(origin + '/api/auth/start', { method: 'POST', headers: { cookie, Origin: 'https://evil.invalid', 'X-Course-Studio-CSRF': state.csrf }, body: '{}' })).status, 403);
  assert.equal((await fetch(origin + '/api/auth/start', { method: 'POST', headers: { cookie, Origin: origin }, body: '{}' })).status, 403);
  const callback = await fetch(origin + '/auth/callback?code=code&state=state', { headers: { cookie, 'Sec-Fetch-Site': 'cross-site' }, redirect: 'manual' });
  assert.equal(callback.status, 303); assert.equal(callbackCount, 1);
  const config = await (await fetch(origin + '/runtime-config.json')).json(); assert.equal(config.mode, 'local');
});

test('saved jobs enforce ownership, preserve completed work, and export separate answers', async t => {
  const directory = await temp(t); let calls = 0;
  const jobs = createJobs(root, directory, async ({ name }) => { calls++; return name === 'parent_guide' ? guide : lesson; }, 'canonical');
  const started = await jobs.start({ brief, preview, model: 'available' }, 'parent-one');
  await assert.rejects(() => jobs.status(started.id, 'parent-two'));
  let value;
  for (let i = 0; i < 100; i++) { value = await jobs.status(started.id, 'parent-one'); if (value.status !== 'building') break; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.equal(value.status, 'ready'); assert.equal(calls, 2); assert.ok(value.files.some(f => f.name === 'Learner-Pack.pdf'));
  const archive = unzipSync(new Uint8Array(await readFile(await jobs.file(started.id, 'Course-Pack.zip', 'parent-one'))));
  assert.equal(strFromU8(archive['manifest.json']).includes('draft-needs-adult-review'), true);
  assert.ok(archive['Parent-Teacher-Guide.pdf']); assert.ok(archive['Learner-Pack.pdf']);
  assert.equal((await jobs.resume(started.id, 'parent-one')).status, 'ready'); assert.equal(calls, 2);
  const saved = JSON.parse(await readFile(join(directory, 'courses', started.id, 'job.json')));
  saved.status = 'building'; saved.files = []; await writeJSON(join(directory, 'courses', started.id, 'job.json'), saved);
  const restart = createJobs(root, directory, async () => { throw new Error('Must not request completed lessons or guide'); }, 'canonical');
  assert.equal((await restart.latest('parent-one')).status, 'paused');
  await restart.resume(started.id, 'parent-one');
  for (let i = 0; i < 100; i++) { value = await restart.status(started.id, 'parent-one'); if (value.status !== 'building') break; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.equal(value.status, 'ready');
});

test('usage failure preserves completed lessons and resumes only remaining work', async t => {
  const directory = await temp(t);
  const twoBrief = { ...brief, sessionsPerWeek: 2 };
  const twoPreview = { ...preview, weeks: [{ ...preview.weeks[0], sessions: ['Build a bridge', 'Improve a bridge'] }] };
  let lessonCalls = 0;
  const jobs = createJobs(root, directory, async ({ name }) => {
    if (name === 'parent_guide') return guide;
    lessonCalls++;
    if (lessonCalls === 2) { const error = new Error('Usage limit reached.'); error.code = 'usage_limit'; throw error; }
    return lesson;
  }, 'canonical');
  const started = await jobs.start({ brief: twoBrief, preview: twoPreview, model: 'available' }, 'parent-one');
  let value;
  for (let i = 0; i < 100; i++) { value = await jobs.status(started.id, 'parent-one'); if (value.status !== 'building') break; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.equal(value.status, 'paused'); assert.equal(value.done, 1); assert.equal(value.code, 'usage_limit');
  await jobs.resume(started.id, 'parent-one');
  for (let i = 0; i < 100; i++) { value = await jobs.status(started.id, 'parent-one'); if (value.status !== 'building') break; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.equal(value.status, 'ready'); assert.equal(value.done, 2); assert.equal(lessonCalls, 3);
});
