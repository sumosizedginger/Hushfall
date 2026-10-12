// REAL-GAME stills of the Campaign 2 pieces and of the screens nobody has seen yet (PT-037, PT-036), in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1):
//   the Record (the pause menu's list of every message received: found documents set apart), the epilogue's cards and the campaign tally (PT-036: never seen), the peaceful Vael calm and afraid,
//   a resonator ringing, a seed beside its shed, the current of the aqueduct
//   node tools/dev/shoot-pt37.mjs [outDir] [record,ending,folk,pieces]   -> <outDir>/*.png (default review/pt-037) and the probes as JSON
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/pt-037'));
const want = new Set((process.argv[3] ?? 'record,ending,folk,pieces').split(','));
fs.mkdirSync(out, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const server = await createServer({ root, logLevel: 'error', server: { port: 5277, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5277/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name, wait = 1200) => { await sleep(wait); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const map = (id) => page.evaluate(`fetch('/maps/${id}.json').then((r) => r.json())`);
const R = { errors, probes: {} };

if (want.has('record')) {
  // a Record with entries from both campaigns: what a player who had read a few messages would see
  const rec = {};
  for (const id of ['C1E1M01', 'C1E4M08', 'C2M01', 'C2M03', 'C2M05']) rec[id] = (await map(id)).messages.map((m) => m.id);
  await T("t.newGame('normal', 3, { mapId: 'C2M03' })"); await T('t.clearOverlays()');
  await T(`t.setup_progress({ record: ${JSON.stringify(rec)} })`);
  R.probes.record = await T("t.openRecord('pause')"); await shot('record-1-top');
  await page.evaluate(() => { const l = document.getElementById('record-list'); l.scrollTop = l.scrollHeight * 0.55; }); await shot('record-2-middle', 400);
  await page.evaluate(() => { const l = document.getElementById('record-list'); l.scrollTop = l.scrollHeight; }); await shot('record-3-end', 400);
  await T('t.closeRecord()');
}

if (want.has('ending')) {
  const ranks = ['S', 'A', 'A', 'B', 'A', 'S', 'A', 'B', 'A', 'A', 'S', 'B', 'A', 'C', 'A', 'B', 'S', 'A', 'A', 'B', 'A', 'A', 'S', 'B', 'A', 'B', 'A', 'A', 'S', 'A', 'B', 'A'];
  const records = {}; let i = 0;
  for (const m of manifest.maps.filter((x) => x.campaign === 1)) {
    if (m.kind === 'main') { records[m.id] = { rank: ranks[i % ranks.length], score: 4000 + i * 90, time: 300 + (i * 37) % 420, kills: 18 + (i * 5) % 30, secrets: i % 3 === 0 ? 2 : 1, paid: 10 }; i++; }
    else if (i % 2 === 0) records[m.id] = { rank: 'B', score: 2500, time: 190, kills: 9, secrets: 0, paid: 5 };
  }
  await T("t.newGame('normal', 3, { mapId: 'C1E4M08' })"); await T('t.clearOverlays()');
  await T(`t.setup_progress({ salvage: 140, records: ${JSON.stringify(records)} })`);
  R.probes.start = await T('t.setup_epilogue(0)'); await shot('ending-0-start');
  R.probes.card0 = await T('t.setup_epilogue(4.5)'); await shot('ending-1-card0-typed');
  R.probes.card1 = await T('t.setup_epilogue(9)'); await shot('ending-2-card1');
  R.probes.card4 = await T('t.setup_epilogue(30)'); await shot('ending-3-card4');
  R.probes.tally = await T("t.setup_epilogue('tally')"); await shot('ending-4-tally');
  await T('t.press_epilogue()'); await sleep(1200); await T('t.press_epilogue()'); R.probes.after = await T('t.epilogueProbe()'); await shot('ending-5-after-tally');
}

// stand `dist` metres south of a cell, look north and a little down (the closeup recipe)
const stand = async (cx, cz, dist, pitch = -0.1, yaw = 0, side = 0) => { await T(`t.setup_teleport(${(cx + 0.5) * 2 + side}, ${(cz + 0.5) * 2 + dist}, ${yaw}); t.setup_player({ pitch: ${pitch}, hp: 100000 })`); await T('t.tick(3)'); for (let i = 0; i < 4; i++) await T('t.render(0.03)'); };

if (want.has('folk')) {
  // the cage of C2M03 from the south, then two peaceful Vael in the open next to the start: one calm, one afraid
  const m = await map('C2M03'), folk = m.entities.filter((e) => e.type === 'enemy' && e.kind === 'vaelfolk');
  await T("t.newGame('normal', 3, { mapId: 'C2M03' })"); await T('t.clearOverlays()');
  const [fx, fz] = folk[0].at;
  await stand(fx, fz, 4.5, -0.12, 0); await shot('folk-1-cage');
  const s0 = (await T('t.state()')).player;
  await T(`t.setup_teleport(${s0.x}, ${s0.z}, 0); t.setup_player({ pitch: -0.08, hp: 100000 })`);
  const a = await T(`t.setup_spawnEnemy('vaelfolk', ${s0.x - 1.1}, ${s0.z - 3.4}, 0, 'calm')`), b = await T(`t.setup_spawnEnemy('vaelfolk', ${s0.x + 1.1}, ${s0.z - 3.4}, 0, 'flee')`);
  await T('t.tick(4)'); for (let i = 0; i < 4; i++) await T('t.render(0.03)'); R.probes.folk = { calm: a, afraid: b }; await shot('folk-2-calm-and-afraid');
}

if (want.has('pieces')) {
  // a resonator beside its ring, a seed, the aqueduct's current
  const m4 = await map('C2M04'), r = m4.entities.find((e) => e.kind === 'resonator');
  await T("t.newGame('normal', 3, { mapId: 'C2M04' })"); await T('t.clearOverlays()');
  await stand(r.at[0], r.at[1], 3.2, -0.05, 0); await shot('piece-1-fork');
  await T("t.press('fire')"); await T('t.tick(12)'); await T("t.release('fire')"); await T('t.tick(6)'); // a shot: the fork should ring
 for (let i = 0; i < 3; i++) await T('t.render(0.05)'); await shot('piece-2-fork-after-noise', 300);
  const m7 = await map('C2M07'), s = m7.entities.find((e) => e.kind === 'bellnode');
  await T("t.newGame('normal', 3, { mapId: 'C2M07' })"); await T('t.clearOverlays()');
  await stand(s.at[0], s.at[1], 3.4, -0.1, 0); await shot('piece-3-seed');
  await T('t.tick(60 * 70)'); for (let i = 0; i < 3; i++) await T('t.render(0.05)'); await shot('piece-4-seed-later', 300);
  await T("t.newGame('normal', 3, { mapId: 'C2M06' })"); await T('t.clearOverlays()');
  await stand(52, 44, 0.5, -0.6, 0); for (let i = 0; i < 6; i++) { await T('t.tick(5)'); await T('t.render(0.1)'); } await shot('piece-5-current-a', 200);
  await T('t.tick(40)'); for (let i = 0; i < 3; i++) await T('t.render(0.1)'); await shot('piece-6-current-b', 200);
}
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
