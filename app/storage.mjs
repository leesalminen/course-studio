import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function readJSON(path, initial) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return initial; throw error; }
}

export async function privateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chmod(path, 0o700);
}

export async function writeJSON(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, path);
  await chmod(path, 0o600);
}

export async function hostID(directory) {
  const path = join(directory, 'host.json');
  const saved = await readJSON(path, null);
  if (saved) return saved.id;
  const id = `urn:uuid:${randomUUID()}`;
  await writeJSON(path, { id });
  return id;
}
