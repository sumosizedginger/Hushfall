// Level tour for any map: screenshots from the vantage points listed in maps-src/<ID>.views.json (appearance evidence, not correctness).
// Views use CELL coordinates: {name, x, z, yaw (radians or east|west|north|south), pitch, y?, open?, wake?, ticks? (run the sim that long before the shot), ambient?, hp?}. `open: true` opens every door/closet first.
// Usage: node tools/dev/shoot-map.mjs <ID> [only-view-name]   ->  review/level-<id>/<name>.png
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const id = process.argv[2]; if (!id) { console.error('usage: shoot-map.mjs <ID> [view]'); process.exit(2); }
const only = process.argv[3];
const views = JSON.parse(fs.readFileSync(path.join(root, 'maps-src', id + '.views.json'), 'utf8'));
const out = path.join(root, 'review', 'level-' + id.toLowerCase());
fs.mkdirSync(out, { recursive: true });
const port = 5260 + (Math.abs([...id].reduce((a, c) => a + c.charCodeAt(0), 0)) % 30);
const server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } });
await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()');
const YAW = { east: -Math.PI / 2, west: Math.PI / 2, north: 0, south: Math.PI };
let opened = false;
for (const v of views) {
  if (only && v.name !== only) continue;
  if (v.open && !opened) { await T('t.setup_openDoors()'); opened = true; }
  const yaw = typeof v.yaw === 'string' ? YAW[v.yaw] : v.yaw;
  await T(`t.setup_teleport(${v.x * 2}, ${v.z * 2}, ${yaw}); t.setup_player({ pitch: ${v.pitch ?? 0}, hp: 100, hurt: 0 })`);
  if (v.wake) await T('t.setup_wakeAll()');
  if (v.ticks) { await T(`t.setup_player({ hp: 100000 }); t.tick(${v.ticks})`); await T('t.setup_player({ hp: 100 })'); }
  if (v.ambient != null) await T(`t.setup_ambient(${v.ambient})`);
  await T('t.clearOverlays(); t.render(0.02)');
  await savePng(page, path.join(out, v.name + '.png')); console.log('shot', v.name);
}
console.log(JSON.stringify({ errors }));
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
