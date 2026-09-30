import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readJSON, writeJSON, privateDirectory } from './storage.mjs';
import { briefSchema, previewSchema, lessonSchema, guideSchema, validateLesson, validatePreview } from './course.mjs';
import { publishCourse } from './publish.mjs';

export function createJobs(root, directory, request, instructions) {
  let active;
  let controller;
  const jobPath = id => join(directory, 'courses', id, 'job.json');
  const save = job => writeJSON(jobPath(job.id), job);
  const publicJob = job => ({ id: job.id, status: job.status, done: job.lessons.length, total: job.brief.weeks * job.brief.sessionsPerWeek, title: job.preview.title, error: job.error, code: job.code, files: job.files ?? [], brief: job.brief, preview: job.preview });
  async function get(id, owner) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Course not found.');
    const job = await readJSON(jobPath(id), null);
    if (!job || job.owner !== owner) throw new Error('Course not found for this ChatGPT account.');
    if (job.status === 'building' && active !== id) { job.status = 'paused'; await save(job); }
    return job;
  }
  async function run(job) {
    try {
      const total = job.brief.weeks * job.brief.sessionsPerWeek;
      while (job.lessons.length < total) {
        const index = job.lessons.length;
        const week = Math.floor(index / job.brief.sessionsPerWeek);
        const session = index % job.brief.sessionsPerWeek;
        const result = await request({
          model: job.model, instructions, schema: lessonSchema, name: 'course_lesson', signal: controller.signal,
          input: { task: 'Write this complete session and its corresponding adult notes. Include setup and cleanup in timing blocks; their sum must exactly equal minutes. Include all teaching text and worked examples, full readings when useful, and substantive activity steps. Write answers for every question. No placeholders. Keep the subject facts modest and disclose unverified source claims.', brief: job.brief, preview: job.preview, week: week + 1, session: session + 1, sessionTitle: job.preview.weeks[week].sessions[session], completedSessions: job.lessons.map(l => ({ title: l.title, purpose: l.purpose })) },
        });
        job.lessons.push(validateLesson(result, job.brief)); await save(job);
      }
      if (!job.guide) {
        job.guide = guideSchema.parse(await request({ model: job.model, instructions, schema: guideSchema, name: 'parent_guide', signal: controller.signal, input: { task: 'Write the course-level adult guide. Session notes and answers already exist and will be printed separately in this guide. Give a practical print plan, consolidated supplies with alternatives, a capstone rubric, portfolio checklist, weekly feedback prompts, and next steps. Do not invent PDF page numbers.', brief: job.brief, preview: job.preview, sessions: job.lessons.map(l => ({ title: l.title, materials: l.materials, parent: l.parent })) } }));
        await save(job);
      }
      if (controller.signal.aborted) throw new Error('Build paused.');
      job.files = await publishCourse(root, join(directory, 'courses', job.id), job);
      job.status = 'ready'; job.error = null; job.code = null;
    } catch (error) {
      job.status = 'paused'; job.error = controller.signal.aborted ? 'Paused. Your completed lessons are saved.' : error.message;
      job.code = error.code || 'build_paused';
    } finally { await save(job); active = undefined; controller = undefined; }
  }
  return {
    get busy() { return Boolean(active); },
    async start({ brief, preview, model }, owner) {
      if (active) throw new Error('A course is already being made. Wait or pause it first.');
      brief = briefSchema.parse(brief); preview = validatePreview(preview, brief);
      const job = { id: randomUUID(), owner, brief, preview, model, lessons: [], status: 'building', created: new Date().toISOString() };
      await privateDirectory(join(directory, 'courses', job.id)); await save(job);
      await writeJSON(join(directory, `latest-${owner}.json`), { id: job.id });
      active = job.id; controller = new AbortController();
      void run(job); return publicJob(job);
    },
    async latest(owner) { const latest = await readJSON(join(directory, `latest-${owner}.json`), null); return latest ? publicJob(await get(latest.id, owner)) : null; },
    async status(id, owner) { return publicJob(await get(id, owner)); },
    async resume(id, owner) {
      if (active) throw new Error('A course is already being made.');
      const job = await get(id, owner);
      if (job.status === 'ready') return publicJob(job);
      active = job.id; controller = new AbortController(); job.status = 'building'; job.error = null;
      await save(job); void run(job); return publicJob(job);
    },
    async pause(id, owner) { await get(id, owner); if (active === id) controller.abort(); },
    async file(id, name, owner) {
      const job = await get(id, owner);
      if (job.status !== 'ready' || !job.files.some(f => f.name === name)) throw new Error('This file is not ready.');
      return join(directory, 'courses', id, name);
    },
  };
}
