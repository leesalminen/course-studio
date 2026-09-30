import { createServer } from 'node:http';
import { readFile, open, unlink } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAuth } from './auth.mjs';
import { createJobs } from './jobs.mjs';
import { privateDirectory, readJSON, writeJSON } from './storage.mjs';
import { briefSchema, previewSchema, courseInstructions, validatePreview } from './course.mjs';
import { listModels, structuredResponse } from './inference.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.pdf': 'application/pdf', '.zip': 'application/zip', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8' };

export function allowedRequest(req, origin) {
  return req.headers.host === new URL(origin).host &&
    (!req.headers.origin || req.headers.origin === origin) &&
    !['cross-site', 'same-site'].includes(req.headers['sec-fetch-site']);
}

async function body(req) {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 12000) throw new Error('That brief is too long. Please shorten it.'); }
  return JSON.parse(text || '{}');
}

export async function startServer({ port = 1455, directory = join(homedir(), '.local/share/course-studio'), authFactory = createAuth, modelList = listModels, inference = structuredResponse } = {}) {
  await privateDirectory(directory);
  const lockPath = join(directory, 'runtime.lock');
  // One runtime owns rotating credentials and jobs, even if another port is chosen.
  try {
    const lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(String(process.pid)); await lock.close();
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await readFile(lockPath, 'utf8'));
    let running = true;
    try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') running = false; }
    if (running) throw new Error('Course Studio is already running with this data folder.');
    await unlink(lockPath);
    const lock = await open(lockPath, 'wx', 0o600); await lock.writeFile(String(process.pid)); await lock.close();
  }
  let origin, auth, jobs, mutating = false;
  const browserId = randomBytes(32).toString('base64url');
  const csrf = randomBytes(32).toString('base64url');
  const hasSession = req => (req.headers.cookie || '').split(';').some(c => c.trim() === `course_session=${browserId}`);
  async function models() { return modelList(await auth.accessToken()); }
  async function validateModel(model) { if (!(await models()).some(m => m.slug === model)) throw new Error('Choose a model available to your ChatGPT account.'); }
  function send(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    let ownsMutation = false;
    try {
      const url = new URL(req.url, origin);
      const callbackNavigation = url.pathname === '/auth/callback' && req.method === 'GET' && req.headers.host === new URL(origin).host && !req.headers.origin;
      if (!callbackNavigation && !allowedRequest(req, origin)) { send(res, 403, { error: 'Open Course Studio directly on this computer.' }); return; }
      if (url.pathname === '/runtime-config.json') { send(res, 200, { mode: 'local' }); return; }
      if (url.pathname === '/auth/callback') {
        if (!hasSession(req) || mutating || jobs.busy) throw new Error('Please finish or pause the current operation, then sign in again.');
        mutating = true; ownsMutation = true;
        await auth.callback(url, browserId);
        res.writeHead(303, { Location: '/studio.html?connected=1' }); res.end(); return;
      }
      if (url.pathname.startsWith('/api/')) {
        if (!hasSession(req)) { send(res, 403, { error: 'Open the Course Studio workspace first.' }); return; }
        if (req.method === 'POST') {
          if (req.headers.origin !== origin || req.headers['x-course-studio-csrf'] !== csrf) { send(res, 403, { error: 'Refresh the workspace to continue.' }); return; }
          if (mutating) { send(res, 409, { error: 'Another operation is still running.' }); return; }
          mutating = true; ownsMutation = true;
        } else if (req.method !== 'GET') { send(res, 405, { error: 'Unsupported request.' }); return; }
        const session = await auth.session();
        const owner = session.active;
        const path = url.pathname;
        if (req.method === 'GET' && path === '/api/session') { send(res, 200, { ...session, csrf, mode: 'local' }); return; }
        if (req.method === 'GET' && path === '/api/models') { send(res, 200, await models()); return; }
        if (req.method === 'GET' && path === '/api/latest') { send(res, 200, owner ? await jobs.latest(owner) : null); return; }
        if (req.method === 'GET' && path.startsWith('/api/courses/')) {
          const [, , , id, filename] = path.split('/');
          if (!owner || !session.connected) throw new Error('Sign in to your course’s ChatGPT account first.');
          if (!filename) send(res, 200, await jobs.status(id, owner));
          else {
            const name = decodeURIComponent(filename);
            const file = await jobs.file(id, name, owner);
            const bytes = await readFile(file);
            res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"` }); res.end(bytes);
          }
          return;
        }
        if (req.method !== 'POST') { send(res, 404, { error: 'Not found.' }); return; }
        const input = await body(req);
        if (path === '/api/pause') { await jobs.pause(z.uuid().parse(input.id), owner); send(res, 200, { paused: true }); return; }
        if (jobs.busy) throw new Error('Pause the course before changing accounts or making another request.');
        if (path === '/api/auth/start') { send(res, 200, await auth.begin(browserId, z.object({ profileId: z.uuid().optional(), newAccount: z.boolean().optional() }).strict().parse(input))); return; }
        if (path === '/api/auth/select') { await auth.select(z.uuid().parse(input.id)); send(res, 200, { selected: true }); return; }
        if (path === '/api/auth/signout') { send(res, 200, await auth.signOut()); return; }
        if (path === '/api/auth/acknowledge') { await auth.acknowledge(); send(res, 200, { acknowledged: true }); return; }
        if (!session.sharing) throw new Error('Continue with ChatGPT and enable ChatGPT plan usage first.');
        if (path === '/api/preview') {
          const brief = briefSchema.parse(input.brief);
          const model = z.string().min(1).max(200).parse(input.model);
          await validateModel(model);
          const preview = validatePreview(await inference({ token: await auth.accessToken(), model, instructions: await courseInstructions(root), input: { task: 'Create a concrete preview, not the full course yet. Include exactly the requested number of weeks and session titles per week, a representative teaching passage, worked example, hands-on activity, and parent note. State low-risk assumptions.', brief }, schema: previewSchema, name: 'course_preview' }), brief);
          const saved = { id: randomUUID(), brief, preview, model };
          await writeJSON(join(directory, `preview-${owner}.json`), saved);
          send(res, 200, saved); return;
        }
        if (path === '/api/build') {
          const saved = await readJSON(join(directory, `preview-${owner}.json`), null);
          if (!saved || saved.id !== input.previewId) throw new Error('Make a fresh preview before creating the materials.');
          await validateModel(saved.model); send(res, 200, await jobs.start(saved, owner)); return;
        }
        if (path === '/api/resume') {
          const id = z.uuid().parse(input.id);
          // Refresh credentials before dispatch; each subsequent request uses the active profile.
          await auth.accessToken(); send(res, 200, await jobs.resume(id, owner)); return;
        }
        send(res, 404, { error: 'Not found.' }); return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { send(res, 405, { error: 'Unsupported request.' }); return; }
      const relative = url.pathname === '/' ? 'studio.html' : decodeURIComponent(url.pathname).slice(1);
      const staticRoot = join(root, 'website');
      let file = resolve(staticRoot, relative);
      if (!file.startsWith(staticRoot + '/')) throw new Error('Not found.');
      if (relative.startsWith('downloads/')) {
        const downloads = { 'Pocket-Lab-Learner.pdf': 'output/pdf/Pocket-Lab-Learner.pdf', 'Pocket-Lab-Parent-Teacher-Guide.pdf': 'output/pdf/Pocket-Lab-Parent-Teacher-Guide.pdf', 'START-COURSE-STUDIO.md': 'chatgpt/START-COURSE-STUDIO.md', 'Course-Studio-Starter-Kit.zip': 'Course-Studio-Starter-Kit.zip' };
        const mapped = downloads[relative.slice(10)]; if (!mapped) throw new Error('Not found.'); file = join(root, mapped);
      }
      const bytes = await readFile(file);
      if (extname(file) === '.html') res.setHeader('Set-Cookie', `course_session=${browserId}; HttpOnly; SameSite=Lax; Path=/`);
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      const message = error instanceof z.ZodError ? 'Check the fields in your course brief and try again.' : error.code === 'ENOENT' ? 'Not found.' : error.message;
      send(res, error.code === 'ENOENT' ? 404 : 400, { error: message, code: error.code ?? 'request_failed' });
    } finally { if (ownsMutation) mutating = false; }
  });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
    auth = authFactory(directory, origin);
    jobs = createJobs(root, directory, async options => inference({ ...options, token: await auth.accessToken(), signal: AbortSignal.any([options.signal, AbortSignal.timeout(300000)]) }), await courseInstructions(root));
  } catch (error) { await unlink(lockPath); server.close(); throw error; }
  server.on('close', () => { void unlink(lockPath).catch(() => {}); });
  return { server, origin };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.COURSE_STUDIO_PORT || 1455);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose COURSE_STUDIO_PORT between 1024 and 65535.');
  const { server, origin } = await startServer({ port, ...(process.env.COURSE_STUDIO_DATA_DIR ? { directory: resolve(process.env.COURSE_STUDIO_DATA_DIR) } : {}) });
  console.log(`Course Studio is ready at ${origin}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
}
