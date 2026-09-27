import { cp, mkdir, readdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const distDirectory = resolve(projectRoot, 'dist');
const clientDirectory = resolve(distDirectory, 'client');
const serverDirectory = resolve(distDirectory, 'server');
const preservedEntries = new Set(['.openai', 'client', 'server']);

await mkdir(clientDirectory, { recursive: true });
await mkdir(serverDirectory, { recursive: true });

for (const entry of await readdir(distDirectory)) {
  if (!preservedEntries.has(entry)) {
    await rename(resolve(distDirectory, entry), resolve(clientDirectory, entry));
  }
}

await cp(resolve(projectRoot, 'sites-worker.js'), resolve(serverDirectory, 'index.js'));

