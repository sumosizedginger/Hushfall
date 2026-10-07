// Stills of the refined rigs through the game's own post pass (tools/look/dev.js). Output goes under review/look-bible/rigs/ unless <outDir> says otherwise. Appearance evidence only.
//   node tools/look/shoot-rigs.mjs close   <outDir> [kind ...] [--preset=dusk|hall|dark] [--dist=5]    one still per creature, facing the camera
//   node tools/look/shoot-rigs.mjs lineup  <outDir> [kind ...] [--preset=...] [--dist=11]             all in a row, to scale, at a distance
//   node tools/look/shoot-rigs.mjs poses   <outDir> <kind> [--preset=...]                             idle, walk phases, the attack tell, death
//   node tools/look/shoot-rigs.mjs sil     <outDir> [kind ...]                                        true-scale silhouettes of the real geometry (the sil-matrix.mjs format)
//   node tools/look/shoot-rigs.mjs empty   <outDir>                                                   the backgrounds of the close-ups (readability.mjs)
//   node tools/look/shoot-rigs.mjs merge   <outDir> [kind ...]                                        each creature asleep: merged to one mesh per material, as view.js does
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const [mode, outArg, ...rest] = process.argv.slice(2);
if (!mode || !outArg) { console.error('usage: shoot-rigs.mjs close|lineup|poses|sil|merge <outDir> [kind ...] [--preset=] [--dist=]'); process.exit(2); }
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const out = path.resolve(root, outArg); fs.mkdirSync(out, { recursive: true });
const { FACTORIES } = await import('./rigs_v2.js');
const kinds = rest.filter((a) => !a.startsWith('--')); const KINDS = kinds.length ? kinds : Object.keys(FACTORIES);
const base = (k) => k.replace(/^old_/, '');
const port = Number(process.env.LOOK_DEV_PORT || 5292);
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/tools/look/dev.html`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__LOOK__ && window.__LOOK__.ready', { timeout: 180000 });
const L = (code) => page.evaluate(`(() => { const L = window.__LOOK__; ${code} })()`);
const shot = async (name) => { await L('L.frame()'); await page.screenshot({ path: path.join(out, name + '.png') }); console.log('shot', name); };
const opts = (k) => (k === 'tollbearer0' ? ['tollbearer', { stage: 0 }] : k.startsWith('old_') ? ['old:' + k.slice(4), {}] : [k, {}]);       // old_<kind> = the SHIPPED rig, drawn the same way
const preset = flags.preset ?? 'dusk';
await L(`L.setup('${preset}')`);

if (mode === 'close') {
  const dist = Number(flags.dist ?? 5);
  for (const k of KINDS) {
    const [kind, o] = opts(k), big = ['cantor', 'graftmother', 'wardengraft'].includes(base(kind.replace('old:', ''))), d = big ? dist * 1.9 : dist;
    await L('L.clear()'); await L(`L.place('${kind}', { x: 0, z: 0, yaw: 0, o: ${JSON.stringify(o)}, pose: { t: 1.3 } }); L.camera({ x: 0, y: 1.6, z: ${d}, yaw: 0, pitch: ${kind.endsWith('gill') ? 0.12 : 0.02} })`);
    await shot(`close-${k}`);
  }
} else if (mode === 'empty') {                  // the same frames with nobody in them (the background of every close-up), for tools/look/readability.mjs
  for (const d of [3.2, 6.08]) { await L('L.clear()'); await L(`L.camera({ x: 0, y: 1.6, z: ${d}, yaw: 0, pitch: 0.02 })`); await shot(`empty-${d}`); }
  await L('L.clear()'); await L('L.camera({ x: 0, y: 1.6, z: 3.2, yaw: 0, pitch: 0.12 })'); await shot('empty-gill');
} else if (mode === 'lineup') {
  const dist = Number(flags.dist ?? 11); await L('L.clear()'); let x = 0; const xs = {};
  const W = { gaunt: 1.2, tollbearer: 1.5, tollbearer0: 1.4, bellhand: 1.6, sexton: 1.3, bellnode: 1.4, wardengraft: 2.0, gill: 1.6, feeder: 1.8, cantor: 2.4, graftmother: 3.4 };
  for (const k of KINDS) { x += (W[k] ?? 1.5) / 2; xs[k] = x; x += (W[k] ?? 1.5) / 2 + 0.5; }
  for (const k of KINDS) { const [kind, o] = opts(k); await L(`L.place('${kind}', { x: ${xs[k] - x / 2}, z: 0, yaw: 0, o: ${JSON.stringify(o)} })`); }
  await L(`L.camera({ x: 0, y: 1.6, z: ${dist}, yaw: 0, pitch: 0.02 })`); await shot('lineup');
} else if (mode === 'poses') {
  const [kind, o] = opts(KINDS[0]);
  for (const [name, pose] of [['idle', {}], ['walk0', { walk: 1, phase: 0.8 }], ['walk1', { walk: 1, phase: 3.9 }], ['tell1', { attack: 0.25 }], ['tell2', { attack: 0.5 }], ['strike', { attack: 0.62 }], ['dying', { dead: 0.5 }], ['dead', { dead: 1 }]]) {
    await L('L.clear()'); await L(`L.place('${kind}', { x: 0, z: 0, yaw: 0.5, o: ${JSON.stringify(o)}, pose: ${JSON.stringify({ t: 1.3, ...pose })} }); L.camera({ x: 0, y: 1.6, z: 5, yaw: 0, pitch: 0.02 })`);
    await shot(`pose-${kind}-${name}`);
  }
} else if (mode === 'sil') {
  for (const k of KINDS) {
    const [kind, o] = opts(k); await L('L.clear()'); await L(`L.place('${kind}', { o: ${JSON.stringify(o)} })`);
    const data = await L('return L.silhouette(0)'); fs.writeFileSync(path.join(out, `sil_${k}.png`), Buffer.from(data.split(',')[1], 'base64')); console.log('sil', k);
  }
} else if (mode === 'merge') {
  for (const k of KINDS) {
    const [kind, o] = opts(k); await L('L.clear()'); await L(`L.place('${kind}', { x: 0, z: 0, yaw: 0, o: ${JSON.stringify(o)} }); L.camera({ x: 0, y: 1.6, z: 5, yaw: 0, pitch: 0.02 })`);
    const n = await L('return L.freeze(0)'); console.log(k, 'asleep: merged to', n, 'mesh(es)'); await shot(`asleep-${k}`);
  }
}
console.log(JSON.stringify({ errors }));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
