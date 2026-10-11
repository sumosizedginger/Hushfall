// A creature seen from a few metres in the real game (PT-035: made to judge the contact shadows and a rig's grounding): stand 4 m from the first creature of a kind on a map, look a little down, and save the frame.
//   node tools/dev/shoot-closeup.mjs <outDir> <MAPID:kind> [<MAPID:kind> ...] [--dist=4.2] [--pitch=-0.28]      ONE headless-Chrome job: run it with tools/dev/low.ps1 (the machine-load rule)
// It also prints the dev hook's shadow probe (how many contact shadows the view is drawing).
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { savePng } from './savepng.mjs';

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; })), pos = args.filter((a) => !a.startsWith('--'));
const out = path.resolve(pos[0] ?? 'review/closeups'), shots = pos.slice(1).map((s) => s.split(':')), DIST = Number(flags.dist ?? 4.2), PITCH = Number(flags.pitch ?? -0.28);
if (!shots.length) { console.error('usage: shoot-closeup.mjs <outDir> MAPID:kind ...'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const root = path.resolve(import.meta.dirname, '../..'), port = 5288;
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
for (const [id, kind] of shots) {
  await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()');
  const m = await page.evaluate(`fetch('/maps/${id}.json').then((r) => r.json())`);
  const e = m.entities.find((q) => q.type === 'enemy' && q.kind === kind); if (!e) { console.log(id, kind, 'no such creature'); continue; }
  const [cx, cz] = e.at, x = (cx + 0.5) * 2, z = (cz + 0.5) * 2 + DIST;
  await T(`t.setup_teleport(${x}, ${z}, 0); t.setup_player({ pitch: ${PITCH}, hp: 100000 })`); await T('t.tick(3)'); for (let i = 0; i < 4; i++) await T('t.render(0.03)');
  console.log(id, kind, JSON.stringify(await T('t.shadowProbe()')));
  await savePng(page, path.join(out, `${id}-${kind}.png`));
}
console.log(JSON.stringify({ errors })); await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
