const $ = selector => document.querySelector(selector);
const form = $('#brief-form');
const fieldNames = ['interest', 'age', 'readiness', 'weeks', 'sessions', 'minutes', 'supplies', 'language', 'paper'];
let mode, session, preview, job, poll, working = false;
const draftKey = 'course-studio-brief-v1';

function brief() {
  return { interest: $('#interest').value.trim(), age: Number($('#age').value), readiness: $('#readiness').value.trim(), weeks: Number($('#weeks').value), sessionsPerWeek: Number($('#sessions').value), minutes: Number($('#minutes').value), supplies: $('#supplies').value.trim(), language: $('#language').value, paper: $('#paper').value };
}
function fill(value) {
  const fields = { ...value, sessions: value.sessionsPerWeek };
  for (const name of fieldNames) if (fields[name] !== undefined) $(`#${name}`).value = fields[name];
  updateCover();
}
function saveDraft() { try { sessionStorage.setItem(draftKey, JSON.stringify(brief())); } catch { /* Private-mode storage can be unavailable. */ } }
function updateCover() {
  $('#cover-title').textContent = $('#interest').value.trim() || 'Something wonderful to learn.';
  $('#cover-age').textContent = `Age ${$('#age').value || '…'}`;
  $('#cover-rhythm').textContent = `${$('#weeks').value} week${$('#weeks').value === '1' ? '' : 's'} · ${$('#sessions').value} session${$('#sessions').value === '1' ? '' : 's'} a week`;
}
function showStep(step, focus = true) {
  document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; });
  document.querySelectorAll('[data-step]').forEach(button => {
    button.disabled = Number(button.dataset.step) > step;
    if (Number(button.dataset.step) === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  });
  if (focus) $(`[data-panel="${step}"] h2`).focus();
}
function status(message, code) {
  $('#status').textContent = message;
  $('#usage-error').hidden = code !== 'usage_limit';
}
function controls() {
  const busy = working || job?.status === 'building';
  document.querySelectorAll('[data-step], #brief-form input, #brief-form textarea, #brief-form select, #next, #brief-form button, #profiles, #model, #connect, #add-account, #signout, #refine, #clear-brief, #import-brief').forEach(el => { el.disabled = busy; });
  $('#preview-button').disabled = busy || !session?.sharing;
  $('#build').disabled = busy || !session?.sharing;
  $('#resume').disabled = busy || !session?.sharing;
  if (!busy) {
    const step = Number($('[data-panel]:not([hidden])').dataset.panel);
    document.querySelectorAll('[data-step]').forEach(el => { el.disabled = Number(el.dataset.step) > step; });
  }
}
async function api(path, data) {
  const response = await fetch(path, data === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Course-Studio-CSRF': session.csrf }, body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || 'Something interrupted the request. Try again.'); error.code = result.code; throw error; }
  return result;
}
async function action(fn, message) {
  working = true; controls(); status(message);
  try { await fn(); } catch (error) { status(error.message, error.code); }
  finally { working = false; controls(); }
}
function validPanel(step) {
  for (const input of document.querySelectorAll(`[data-panel="${step}"] input, [data-panel="${step}"] textarea, [data-panel="${step}"] select`)) {
    if (!input.reportValidity()) return false;
  }
  return true;
}
function personalize() {
  const b = brief();
  $('#personal-message').value = `Set up Course Studio from https://github.com/leesalminen/course-studio. Read the README and follow docs/CHATGPT-WORK-SETUP.md. Use this brief for a quick-start course; the basic parent questions are already answered. State any additional assumptions, show a concrete course preview, and then make the complete learner materials, printable PDFs, and separate parent/teacher guide with answers.\n\nInterest: ${b.interest}\nAge: ${b.age}\nComfort and support: ${b.readiness}\nSchedule: ${b.weeks} weeks, ${b.sessionsPerWeek} sessions per week, ${b.minutes} minutes per session\nSupplies and constraints: ${b.supplies}\nLanguage: ${b.language}\nPaper: ${b.paper}\n\nUse hands-on activities and a self-contained offline core. No child account or public uploads. Create the actual teaching materials, not only an outline.`;
}
function section(target, title, value) {
  const heading = document.createElement('h4'); heading.textContent = title; target.append(heading);
  if (Array.isArray(value)) { const ul = document.createElement('ul'); value.forEach(v => { const li = document.createElement('li'); li.textContent = v; ul.append(li); }); target.append(ul); }
  else { const p = document.createElement('p'); p.textContent = value; target.append(p); }
}
function renderPreview(p) {
  const target = $('#preview'); target.replaceChildren(); target.hidden = false;
  const title = document.createElement('h3'); title.textContent = p.title; target.append(title);
  const promise = document.createElement('p'); promise.textContent = p.promise; target.append(promise);
  section(target, 'What they’ll learn', p.goals);
  p.weeks.forEach((week, i) => { section(target, `Week ${i + 1}: ${week.title}`, week.focus); section(target, 'Sessions', week.sessions); });
  section(target, 'The final project', p.capstone); section(target, 'Gather', p.supplies); section(target, 'Your preparation', p.parentPrep);
  section(target, 'A taste of the teaching', p.sample.teaching); section(target, 'A worked example', p.sample.example); section(target, 'Try this', p.sample.activity); section(target, 'Your parent note', p.sample.parentNote); section(target, 'Starting assumptions', p.assumptions);
  $('#cover-title').textContent = p.title;
}
async function refreshConnection() {
  session = await api('/api/session');
  $('#account-status').textContent = session.connected ? `${session.email || 'ChatGPT account'} · ${session.sharing ? 'ChatGPT plan enabled' : 'Plan usage is not enabled'}` : 'Connect your ChatGPT account to shape the course.';
  $('#connect').hidden = session.sharing;
  $('#account-actions').hidden = !session.profiles.length;
  const picker = $('#profiles'); picker.replaceChildren();
  for (const profile of session.profiles) { const option = document.createElement('option'); option.value = profile.id; option.textContent = `${profile.label} · ${profile.suffix}`; option.selected = profile.id === session.active; picker.append(option); }
  $('#model-area').hidden = !session.sharing;
  if (session.sharing) {
    const catalog = await api('/api/models'); const select = $('#model'); select.replaceChildren();
    for (const model of catalog) { const option = document.createElement('option'); option.value = model.slug; option.textContent = model.display_name; select.append(option); }
    if (!catalog.length) { session.sharing = false; status('No models are available for this connection. Check your ChatGPT usage settings.'); }
  }
  if (session.welcome) $('#welcome').showModal();
  controls();
}
function renderJob(value) {
  job = value; $('#build-area').hidden = false;
  $('#build-progress').max = value.total; $('#build-progress').value = value.done;
  $('#build-status').textContent = value.status === 'ready' ? `Your teaching drafts are ready. ${value.done} sessions, a learner pack, and a parent guide.` : value.status === 'paused' ? `Paused after ${value.done} of ${value.total} sessions. ${value.error || 'Resume when you’re ready.'}` : value.done === value.total ? 'Writing your parent guide and laying out the PDFs…' : `Writing session ${value.done + 1} of ${value.total}. Completed sessions are saved.`;
  $('#pause').hidden = value.status !== 'building'; $('#resume').hidden = value.status !== 'paused';
  $('#review-note').hidden = value.status !== 'ready'; $('#preview-actions').hidden = true;
  $('#cover-title').textContent = value.title;
  const target = $('#files'); target.replaceChildren();
  for (const file of value.files) {
    const a = document.createElement('a'); a.href = `/api/courses/${value.id}/${encodeURIComponent(file.name)}`; a.download = file.name;
    const label = document.createElement('strong'); label.textContent = file.name.replaceAll('-', ' ');
    const meta = document.createElement('span'); meta.textContent = file.pages ? `${file.pages} pages · PDF ↗` : 'Download ↗'; a.append(label, meta); target.append(a);
  }
  if (value.code === 'usage_limit') status(value.error, value.code);
  controls();
}
function watchJob() {
  clearTimeout(poll);
  if (job?.status !== 'building') return;
  poll = setTimeout(async () => {
    try { renderJob(await api(`/api/courses/${job.id}`)); watchJob(); }
    catch (error) { status(`${error.message} Your completed sessions stay saved. Refresh to reconnect.`); }
  }, 2000);
}

$('#next').addEventListener('click', () => { if (validPanel(1)) { saveDraft(); showStep(2); } });
form.addEventListener('submit', event => { event.preventDefault(); if (validPanel(1) && validPanel(2)) { saveDraft(); personalize(); showStep(3); controls(); } });
// Validation is scoped to the visible step, so hidden required fields cannot block navigation.
form.noValidate = true;
form.addEventListener('input', () => { preview = null; $('#preview').hidden = true; $('#preview-actions').hidden = true; updateCover(); saveDraft(); });
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
$('#copy-brief').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#personal-message').value); status('Message copied. Paste it into a ChatGPT Work session.'); }
  catch { $('#personal-message').focus(); $('#personal-message').select(); status('Use your device’s copy command to copy the selected message.'); }
});
$('#connect').addEventListener('click', () => action(async () => { const result = await api('/api/auth/start', {}); location.assign(result.url); }, 'Opening ChatGPT sign-in…'));
$('#add-account').addEventListener('click', () => action(async () => { const result = await api('/api/auth/start', { newAccount: true }); location.assign(result.url); }, 'Opening ChatGPT to add an account…'));
$('#profiles').addEventListener('change', () => action(async () => { await api('/api/auth/select', { id: $('#profiles').value }); preview = null; $('#preview').hidden = true; $('#preview-actions').hidden = true; job = null; $('#build-area').hidden = true; await refreshConnection(); const latest = await api('/api/latest'); if (latest) { renderJob(latest); watchJob(); } status('ChatGPT account selected.'); }, 'Selecting your account…'));
$('#signout').addEventListener('click', () => action(async () => { const result = await api('/api/auth/signout', {}); await refreshConnection(); preview = null; $('#preview-actions').hidden = true; status(result.revoked ? 'Signed out. Saved course files stay on this computer.' : 'Signed out on this computer. Remote revocation was not confirmed; disconnect Course Studio in ChatGPT settings.'); }, 'Signing out…'));
$('#welcome-close').addEventListener('click', () => action(async () => { await api('/api/auth/acknowledge', {}); $('#welcome').close(); status('Ready to shape your course.'); }, 'Saving your choice…'));
$('#welcome').addEventListener('cancel', event => { event.preventDefault(); $('#welcome-close').click(); });
$('#preview-button').addEventListener('click', () => action(async () => {
  if (!validPanel(1) || !validPanel(2)) { showStep(1); return; }
  preview = await api('/api/preview', { brief: brief(), model: $('#model').value });
  renderPreview(preview.preview); $('#preview-actions').hidden = false; $('#build-area').hidden = true;
  $('#request-count').textContent = `Creates ${brief().weeks * brief().sessionsPerWeek} complete sessions plus a parent guide. Each writing request uses your ChatGPT plan. You can pause and resume.`;
  status('Your course idea is ready. Adjust the brief or make the materials.');
}, 'Shaping the idea around your family…'));
$('#refine').addEventListener('click', () => { showStep(1); status('Change the interest, skills, or schedule, then make a fresh preview.'); });
$('#build').addEventListener('click', () => action(async () => { renderJob(await api('/api/build', { previewId: preview.id })); watchJob(); status('Making the teaching materials. You can leave this tab open or return later. Keep the local app running.'); }, 'Starting your teaching pack…'));
$('#pause').addEventListener('click', () => action(async () => { await api('/api/pause', { id: job.id }); status('Pausing after the current request stops. Completed sessions are saved.'); }, 'Pausing…'));
$('#resume').addEventListener('click', () => action(async () => { renderJob(await api('/api/resume', { id: job.id })); watchJob(); status('Picking up from the saved sessions.'); }, 'Resuming…'));
$('#download-brief').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(brief(), null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'course-brief.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('Brief saved. Keep it private; it contains your family’s learning details.'); });
$('#import-brief').addEventListener('change', async event => {
  try {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 12000) throw new Error('This file is too large for a course brief.');
    const value = JSON.parse(await file.text());
    if (typeof value.interest !== 'string' || typeof value.readiness !== 'string' || typeof value.supplies !== 'string' || !Number.isInteger(value.age) || !Number.isInteger(value.weeks) || !Number.isInteger(value.sessionsPerWeek) || ![20, 30, 40, 60, 90].includes(value.minutes) || !['English', 'Spanish'].includes(value.language) || !['A4', 'Letter'].includes(value.paper)) throw new Error('Choose a brief saved from Course Studio.');
    fill(value); saveDraft(); showStep(1); preview = null; $('#preview').hidden = true; $('#preview-actions').hidden = true; status('Brief opened. Check the details before continuing.');
  } catch (error) { status(error.message); }
  event.target.value = '';
});
$('#clear-brief').addEventListener('click', () => { form.reset(); try { sessionStorage.removeItem(draftKey); } catch {} preview = null; $('#preview').hidden = true; $('#preview-actions').hidden = true; $('#personal-message').value = ''; showStep(1); updateCover(); status('Browser brief cleared. Downloaded files and local course files are kept.'); });

async function initialize() {
  try { const saved = sessionStorage.getItem(draftKey); if (saved) fill(JSON.parse(saved)); } catch { /* No saved brief. */ }
  updateCover();
  try {
    const response = await fetch('runtime-config.json'); if (!response.ok) throw new Error('The workspace configuration could not be loaded.');
    mode = (await response.json()).mode;
    if (!['hosted', 'local'].includes(mode)) throw new Error('Unknown workspace configuration.');
    $('#hosted-path').hidden = mode !== 'hosted'; $('#local-path').hidden = mode !== 'local';
    if (mode === 'local') {
      $('#privacy').textContent = 'The brief stays in this tab until you request a preview. Then the local app sends it to OpenAI using your plan. Credentials and course files stay on this computer. No child account needed.';
      await refreshConnection();
      const latest = await api('/api/latest');
      if (latest) { fill(latest.brief); renderPreview(latest.preview); renderJob(latest); showStep(3, false); watchJob(); }
      else if (new URLSearchParams(location.search).has('connected')) showStep(3, false);
      history.replaceState(null, '', location.pathname);
    }
  } catch (error) { status(error.message); }
}
initialize();
