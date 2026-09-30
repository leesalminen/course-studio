import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { hostID, readJSON, writeJSON } from './storage.mjs';

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const scopes = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const random = () => randomBytes(32).toString('base64url');
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifyIdentity(token, clientId, nonce, key = jwks) {
  const { payload } = await jwtVerify(token, key, {
    issuer, audience: clientId, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5,
  });
  if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('ChatGPT sign-in could not be verified. Please try again.');
  }
  return payload;
}

export function consumeCallback(attempt, url, browserId, now = Date.now()) {
  if (!attempt || attempt.browserId !== browserId || attempt.expires <= now ||
      url.searchParams.get('state') !== attempt.state) {
    throw new Error('This sign-in link expired or could not be verified. Please start again.');
  }
  if (url.searchParams.has('error')) throw new Error('ChatGPT sign-in was cancelled or denied. You can try again.');
  const code = url.searchParams.get('code');
  const supplied = url.searchParams.get('client_id');
  const clientId = supplied || attempt.clientId;
  if (!code || !clientId || clientId === 'dynamic_agent_client' ||
      (attempt.clientId && supplied && supplied !== attempt.clientId)) {
    throw new Error('ChatGPT registration was incomplete or changed. Please start again.');
  }
  return { code, clientId };
}

export function createAuth(directory, origin, { fetcher = fetch, verify = verifyIdentity } = {}) {
  let pending;
  let refresh;
  const path = join(directory, 'accounts.json');
  const load = () => readJSON(path, { active: null, profiles: [] });
  const selected = data => data.profiles.find(p => p.id === data.active);
  const sharing = profile => Boolean(profile?.access_token && profile.scopes.includes('chatgpt.tokens.use.direct'));

  async function tokenRequest(parameters) {
    const response = await fetcher(`${issuer}/api/accounts/oauth/token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...parameters, resource }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('Your ChatGPT connection needs a fresh sign-in. Your course progress is saved.');
    return response.json();
  }

  function credentials(tokens, previous = {}) {
    if (typeof tokens.access_token !== 'string' || tokens.token_type?.toLowerCase() !== 'bearer' ||
        !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) {
      throw new Error('ChatGPT did not return valid plan credentials. Please sign in again.');
    }
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? previous.refresh_token,
      id_token: tokens.id_token ?? previous.id_token,
      scopes: typeof tokens.scope === 'string' ? tokens.scope.split(' ') : previous.scopes ?? [],
      expires: Date.now() + tokens.expires_in * 1000,
    };
  }

  const api = {
    async session() {
      const data = await load();
      const active = selected(data);
      return {
        connected: Boolean(active?.access_token), sharing: sharing(active), active: data.active,
        profiles: data.profiles.map(p => ({ id: p.id, label: p.email || 'ChatGPT account', suffix: p.id.slice(0, 6) })),
        email: active?.email || null, welcome: sharing(active) && !active.welcomeSeen,
      };
    },
    async begin(browserId, { profileId, newAccount = false } = {}) {
      if (refresh) await refresh;
      const data = await load();
      const profile = newAccount ? data.profiles.find(p => p.id === data.pending_registration) : data.profiles.find(p => p.id === (profileId || data.active))
        ?? (!profileId && !data.active ? data.profiles.at(-1) : null);
      if (profileId && !profile) throw new Error('Select a saved ChatGPT account or add a new one.');
      const verifier = random();
      pending = {
        browserId, profileId: profile?.id, subject: profile?.subject, clientId: profile?.client_id,
        state: random(), nonce: random(), verifier,
        redirectUri: `${origin}/auth/callback`, expires: Date.now() + 10 * 60000,
      };
      const url = new URL(`${issuer}/api/accounts/authorize`);
      url.search = new URLSearchParams({
        client_id: profile?.client_id || 'dynamic_agent_client',
        ...(!profile?.client_id ? { agent_name_hint: 'Course Studio' } : {}),
        ext_agent_host_id: await hostID(directory), response_type: 'code',
        redirect_uri: pending.redirectUri, scope: scopes, resource,
        state: pending.state, nonce: pending.nonce, code_challenge_method: 'S256',
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      });
      return { url: url.toString() };
    },
    async callback(url, browserId) {
      const attempt = pending;
      pending = undefined; // one-time consumption, including failure
      const { code, clientId } = consumeCallback(attempt, url, browserId);
      const data = await load();
      let profile = data.profiles.find(p => p.id === attempt.profileId);
      if (!profile) {
        profile = { id: randomUUID(), client_id: clientId, scopes: [] };
        data.profiles.push(profile);
        data.pending_registration = profile.id;
        await writeJSON(path, data); // retain issued registration if code exchange fails
      }
      const tokens = await tokenRequest({
        grant_type: 'authorization_code', client_id: clientId, code,
        code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri,
      });
      const identity = await verify(tokens.id_token, clientId, attempt.nonce);
      if (attempt.subject && identity.sub !== attempt.subject) throw new Error('This is a different account. Use Add account instead.');
      Object.assign(profile, credentials(tokens), { subject: identity.sub, email: identity.email ?? null });
      data.active = profile.id;
      if (data.pending_registration === profile.id) delete data.pending_registration;
      await writeJSON(path, data);
    },
    async select(profileId) {
      if (refresh) await refresh;
      const data = await load();
      if (!data.profiles.some(p => p.id === profileId)) throw new Error('That account was not found.');
      pending = undefined;
      data.active = profileId;
      await writeJSON(path, data);
    },
    async acknowledge() {
      const data = await load();
      const active = selected(data);
      if (active) { active.welcomeSeen = true; await writeJSON(path, data); }
    },
    async signOut() {
      pending = undefined;
      if (refresh) await refresh;
      const data = await load();
      const profile = selected(data);
      let revoked = true;
      if (profile?.refresh_token) {
        try {
          const discovery = await fetcher(`${issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10000) });
          const config = await discovery.json();
          if (!discovery.ok || config.issuer !== issuer || new URL(config.revocation_endpoint).origin !== issuer) throw new Error('Invalid discovery');
          const result = await fetcher(config.revocation_endpoint, {
            method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: profile.refresh_token, token_type_hint: 'refresh_token', client_id: profile.client_id }),
            signal: AbortSignal.timeout(10000),
          });
          revoked = result.status === 200;
        } catch { revoked = false; }
      }
      if (profile) for (const key of ['access_token', 'refresh_token', 'id_token', 'expires']) delete profile[key];
      await writeJSON(path, data);
      return { revoked };
    },
    async accessToken() {
      if (refresh) await refresh;
      let data = await load();
      let profile = selected(data);
      if (!sharing(profile)) throw new Error('Continue with ChatGPT and enable ChatGPT plan usage first.');
      if (profile.expires <= Date.now() + 60000) {
        if (!profile.refresh_token) throw new Error('Please sign in with ChatGPT again.');
        refresh = (async () => {
          const tokens = await tokenRequest({ grant_type: 'refresh_token', client_id: profile.client_id, refresh_token: profile.refresh_token });
          Object.assign(profile, credentials(tokens, profile));
          await writeJSON(path, data);
        })();
        try { await refresh; } finally { refresh = undefined; }
        data = await load(); profile = selected(data);
      }
      if (!sharing(profile)) throw new Error('ChatGPT plan usage is no longer enabled. Check your ChatGPT usage settings.');
      return profile.access_token;
    },
  };
  // Serialize credential mutations and refresh across all callers, including model discovery.
  let queue = Promise.resolve();
  for (const name of Object.keys(api)) {
    if (name === 'session') continue;
    const operation = api[name];
    api[name] = (...args) => {
      const result = queue.then(() => operation(...args));
      queue = result.catch(() => {});
      return result;
    };
  }
  return api;
}
