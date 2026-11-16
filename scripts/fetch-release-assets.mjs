// Restore media/prepared-narration assets for a source-only release download. Node 20+.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const origin = 'https://junior-space-commander.sentientstudios.chatgpt.site/';
const response = await fetch(new URL('source-assets.json', origin));
if (!response.ok) throw Error('Asset manifest unavailable');
const queue = await response.json();
await Promise.all(Array.from({length: 6}, async () => {
  while (queue.length) {
    const file = queue.shift();
    if (!file.path.startsWith('assets/') && !['LICENSE.txt', 'THIRD-PARTY.txt', 'SI-USE.json'].includes(file.path) && !file.path.startsWith('licenses/')) continue;
    if (file.path.split('/').includes('..') || file.path.startsWith('/')) throw Error('Invalid asset path');
    const r = await fetch(new URL(file.path, origin));
    if (!r.ok) throw Error(`Could not download ${file.path}`);
    const target = path.join('public', file.path);
    await mkdir(path.dirname(target), {recursive:true});
    await writeFile(target, new Uint8Array(await r.arrayBuffer()));
  }
}));
console.log('Release assets restored. Run npm ci, then npm run dev or npm run build.');
