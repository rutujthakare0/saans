import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const file = path.resolve(process.env.DATA_DIR || './server/data', 'db.json');
const empty = { decisions: [], rules: [] };
export async function load() {
  await mkdir(path.dirname(file), { recursive: true });
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { await save(empty); return structuredClone(empty); }
}
export async function save(db) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(db, null, 2)); }
export const id = () => randomUUID();
