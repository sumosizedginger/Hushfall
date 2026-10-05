// Audio QA: renders every SFX recipe and the score offline in headless Chrome, measures them, and writes WAVs for listening.
// Objective checks only (finite, audible, not clipped, deterministic, decays). Whether it SOUNDS good needs a human: listen to review/audio/*.wav.
// Usage: node tools/dev/audio-qa.mjs   -> review/audio/*.wav + validation/audio.json
import { sourceShas } from '../textsha.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const outDir = path.join(root, 'review/audio');
fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(path.join(root, 'validation'), { recursive: true });

function wav(rate, b64) {
  const pcm = Buffer.from(b64, 'base64'), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
/** loudest 50 ms window and the RMS of the final 200 ms (does it decay?) from PCM16 */
function envelope(b64, rate) {
  const pcm = Buffer.from(b64, 'base64'), n = pcm.length / 2, s = (i) => pcm.readInt16LE(i * 2) / 32767;
  const win = Math.floor(rate * 0.05); let maxWin = 0;
  for (let i = 0; i + win <= n; i += win) { let a = 0; for (let k = 0; k < win; k++) a += s(i + k) ** 2; maxWin = Math.max(maxWin, Math.sqrt(a / win)); }
  let tail = 0; const t0 = n - Math.floor(rate * 0.2); for (let i = t0; i < n; i++) tail += s(i) ** 2;
  let last = 0; for (let i = n - 1; i >= 0; i--) if (Math.abs(s(i)) > 0.002) { last = i; break; }
  return { loudestWindowRms: maxWin, tailRms: Math.sqrt(tail / (n - t0)), audibleSeconds: +(last / rate).toFixed(2) };
}

const maxDiff = (x, y) => { const A = Buffer.from(x, 'base64'), B = Buffer.from(y, 'base64'); let m = A.length === B.length ? 0 : Infinity; for (let i = 0; i < A.length / 2; i++) m = Math.max(m, Math.abs(A.readInt16LE(i * 2) - B.readInt16LE(i * 2))); return m; };

const server = await createServer({ root, logLevel: 'error', server: { port: 5230, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5230/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const call = (code) => page.evaluate(`(async () => { const t = window.__GAME_TEST__; return ${code}; })()`);

const ids = await call('await t.sfxIds()');
const rows = [], failures = [];
const check = (name, ok, detail) => { if (!ok) failures.push(`${name}: ${detail}`); };
for (const id of ids) {
  const a = await call(`await t.audioRender('${id}', 3)`), b = await call(`await t.audioRender('${id}', 3)`);
  const env = envelope(a.b64, a.rate);
  fs.writeFileSync(path.join(outDir, id + '.wav'), wav(a.rate, a.b64));
  const row = { id, seconds: +a.duration.toFixed(2), peak: +a.peak.toFixed(3), rms: +a.rms.toFixed(4), loudestWindowRms: +env.loudestWindowRms.toFixed(4), tailRms: +env.tailRms.toFixed(5), audibleSeconds: env.audibleSeconds, nan: a.nan, maxDiffLSB: maxDiff(a.b64, b.b64), bitExact: a.b64 === b.b64 };
  rows.push(row);
  check(id + ' finite', a.nan === 0, `${a.nan} non-finite samples`);
  check(id + ' audible', env.loudestWindowRms > 0.01, `loudest 50 ms window RMS ${env.loudestWindowRms.toFixed(4)}`);
  check(id + ' not clipped', a.peak <= 1.0, `peak ${a.peak.toFixed(3)}`);
  check(id + ' decays before render end', env.tailRms < 0.004, `tail RMS ${env.tailRms.toFixed(5)} (sound still ringing at 3 s)`);
  check(id + ' reproducible offline (<= 8 LSB, about -72 dBFS; not claimed bit-exact)', row.maxDiffLSB <= 8, `two renders differ by up to ${row.maxDiffLSB} LSB`);
}
const music = {};
for (const [name, intensity] of [['calm', 0], ['combat', 0.9]]) {
  const m = await call(`await t.audioMusic(14, ${intensity})`); const env = envelope(m.b64, m.rate);
  fs.writeFileSync(path.join(outDir, 'music_' + name + '.wav'), wav(m.rate, m.b64));
  music[name] = { peak: +m.peak.toFixed(3), rms: +m.rms.toFixed(4), loudestWindowRms: +env.loudestWindowRms.toFixed(4), nan: m.nan };
  check('music ' + name + ' finite', m.nan === 0, `${m.nan} bad samples`); check('music ' + name + ' audible', m.rms > 0.004, `rms ${m.rms.toFixed(4)}`); check('music ' + name + ' not clipped', m.peak <= 1.0, `peak ${m.peak.toFixed(3)}`);
}
check('combat layer is louder than calm (tension is audible)', music.combat.rms > music.calm.rms * 1.25, `calm ${music.calm.rms} vs combat ${music.combat.rms}`);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
console.table(rows.map((r) => ({ id: r.id, sec: r.seconds, peak: r.peak, rms: r.rms, loud50ms: r.loudestWindowRms, tail: r.tailRms })));
console.log('music', JSON.stringify(music));
fs.writeFileSync(path.join(root, 'validation/audio.json'), JSON.stringify({ when: new Date().toISOString(), sources: sourceShas(root), commit: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; } })(), env: 'headless Chrome 154, OfflineAudioContext 44.1 kHz mono', scope: 'each recipe rendered ALONE offline; the live master chain, overlap and music-vs-effects balance are not measured', sfx: rows, music, failures, note: 'objective metrics only; subjective quality needs a human listen (review/audio/*.wav)' }, null, 2));
await browser.close(); await server.close();
console.log(failures.length ? 'FAILURES:\n' + failures.join('\n') : `audio QA OK: ${rows.length} sounds + 2 music renders`);
process.exit(failures.length ? 1 : 0);
