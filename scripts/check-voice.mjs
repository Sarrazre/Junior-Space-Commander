import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../public/assets/voice/', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + 'manifest.json'));
let totalSeconds = 0, maxPeak = 0;
const durations = {};
for (const entry of Object.values(manifest.clips)) {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', root + entry.file, '-f', 'f32le', '-ac', '1', '-ar', '24000', 'pipe:1'], { maxBuffer: 16 * 1024 * 1024 });
  let peak = 0, sum = 0;
  for (let i = 0; i < pcm.length; i += 4) { const n = pcm.readFloatLE(i); if (!Number.isFinite(n)) throw Error('Invalid audio: ' + entry.file); peak = Math.max(peak, Math.abs(n)); sum += n * n; }
  if (peak < 0.001 || sum === 0) throw Error('Silent audio: ' + entry.file);
  const seconds = pcm.length / 4 / 24000; totalSeconds += seconds; maxPeak = Math.max(peak, maxPeak);
  if (entry.text.split(' ').length > 50) durations[entry.text.slice(0, 55)] = +seconds.toFixed(2);
}
console.log(JSON.stringify({ clips: Object.keys(manifest.clips).length, totalSeconds: +totalSeconds.toFixed(2), maxPeak, longClipSeconds: durations }, null, 2));
