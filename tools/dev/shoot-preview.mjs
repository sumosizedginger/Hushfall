// REAL-GAME stills of THE PREVIEW (PT-043, design/PREVIEW.md), in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1; never the owner's mouse): the hub, the bestiary (every new creature asleep, as a sponge, live where it lives,
// the clapper at the ends of its swing), the fourteen look rooms, the scenery pavilion and the lineup. The pictures go to review/preview/ (default) and are read by me before anything is called ready.
//   node tools/dev/shoot-preview.mjs [outDir] [what,...]     what = hub,bestiary,looks,scenery,lineup,variants,boss,end   (HIVEBOSS and HIVEEND are separate maps: `boss` and `end` load them)
import { savePng } from './savepng.mjs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(process.argv[2] ?? path.join(root, 'review/preview'));
const want = new Set((process.argv[3] ?? 'hub,bestiary,looks,scenery,lineup,variants').split(','));
fs.mkdirSync(out, { recursive: true });
const port = 5281, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const shot = async (name, wait = 600) => { await sleep(wait); await savePng(page, path.join(out, name + '.png')); console.log('shot', name); };
const frames = async (n = 5) => { for (let i = 0; i < n; i++) await T('t.render(0.05)'); };
const R = { errors, probes: {} };
const load = (id) => JSON.parse(fs.readFileSync(path.join(root, 'maps-dev', id + '.json'), 'utf8'));
const CELL = 2;
/** put the camera `dist` m from the cell (cx, cz), looking at it: `bearing` is the yaw (0 looks north (-z), PI/2 west (-x), PI south, -PI/2 east); `h` raises the aim point */
const look = async (cx, cz, dist, bearing = 0, pitch = -0.05, { side = 0, wait = 4, ticks = 2 } = {}) => {
  const tx = (cx + 0.5) * CELL, tz = (cz + 0.5) * CELL, s = Math.sin(bearing), c = Math.cos(bearing), px = tx + dist * s + side * c, pz = tz + dist * c - side * s;
  await T(`t.setup_teleport(${px}, ${pz}, ${bearing}); t.setup_player({ pitch: ${pitch}, hp: 100000 })`); await T(`t.tick(${ticks})`); await frames(wait);
};
const open = async (id) => { await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.clearOverlays()'); if (!process.env.PV_HUD) await page.addStyleTag({ content: '#objective, #range-hud, #boss, #toasts, #comms, #hint, #use-hint, #tips, #hud { display: none !important }' }); };          // the stills are of the world: PV_HUD=1 keeps the HUD

if (['hub', 'bestiary', 'looks', 'scenery', 'lineup', 'variants'].some((k) => want.has(k))) {
  const hive = load('HIVE'); await open('HIVE');
  const ent = (kind, f = () => true) => hive.entities.filter((e) => e.kind === kind && f(e));
  if (want.has('hub')) { await look(85, 70, 0.1, 0, -0.04, { wait: 6 }); await shot('hub-1-north'); await T('t.setup_teleport(171, 141, 3.14159); t.setup_player({ pitch: -0.04, hp: 100000 })'); await T('t.tick(2)'); await frames(5); await shot('hub-2-south'); }
  if (want.has('bestiary')) {
    const rs = ent('resonant'); const asleep = rs.find((e) => e.sight === 2.5 && !e.group), sponge = rs.find((e) => e.hold === 'inert');
    await look(asleep.at[0], asleep.at[1], 5.2, Math.PI / 2, -0.1); await shot('resonant-1-asleep-front'); await look(asleep.at[0], asleep.at[1], 5.2, Math.PI / 4, -0.1); await shot('resonant-2-three-quarter');
    await look(sponge.at[0], sponge.at[1], 5.2, Math.PI, -0.1); await shot('resonant-3-side'); await look(sponge.at[0], sponge.at[1], 5.2, -Math.PI / 2, -0.1); await shot('resonant-4-back');
    // the pens: wake them and watch the rings
    await T('t.setup_teleport(115, 123, 3.14159); t.setup_player({ pitch: 0, hp: 100000 })'); await T('t.tick(2)'); await T("t.press('use')"); await T('t.tick(2)'); await T("t.release('use')");
    const mid = ent('resonant', (e) => e.group === 'rs-three')[0]; await look(mid.at[0], mid.at[1], 9, Math.PI / 2, -0.1, { wait: 2 }); await T('t.setup_wakeAll()'); await T('t.tick(100)'); await frames(3); await shot('resonant-5-pens-awake', 100);
    await T('t.tick(60)'); await frames(3); await shot('resonant-6-rings', 100); R.probes.pulses = await T('t.pulseProbe()');
    const hc = ent('hivecantor'), hcA = hc.find((e) => e.sight === 2.5), hcS = hc.find((e) => e.hold === 'inert');
    await look(hcA.at[0], hcA.at[1], 9, Math.PI / 2, 0.12, { wait: 6 }); await shot('hivecantor-1-asleep'); await look(hcA.at[0], hcA.at[1], 11, Math.PI / 4, 0.15); await shot('hivecantor-2-three-quarter');
    await look(hcS.at[0], hcS.at[1], 14, Math.PI / 2, 0.08, { wait: 6 }); await shot('hivecantor-3-sponge-and-choir'); await look(hcS.at[0], hcS.at[1], 8, Math.PI / 2, 0.2); await shot('hivecantor-4-threads');
    const rb = ent('rootbell'), rbA = rb.find((e) => e.sight === 2.5), rbS = rb.find((e) => e.hold === 'inert' && !e.swing), rbW = rb.find((e) => e.swing);
    await look(rbA.at[0], rbA.at[1], 12, Math.PI / 2, 0.1, { wait: 6 }); await shot('rootbell-1-asleep'); await look(rbA.at[0], rbA.at[1], 9, Math.PI / 3, -0.02); await shot('rootbell-2-low');
    await look(rbS.at[0], rbS.at[1], 11, Math.PI, 0.1); await shot('rootbell-3-still-side');
    for (let k = 0; k < 4; k++) { await look(rbW.at[0], rbW.at[1], 16, Math.PI / 2, 0.05, { wait: 3, ticks: k === 0 ? 5 : 45 }); await shot('rootbell-4-swing-' + k, 100); }
    const an = ent('rootanchor', (e) => !e.hold)[0]; await look(an.at[0], an.at[1], 7, Math.PI / 2, 0.1, { wait: 5 }); await shot('rootanchor-1');
  }
  if (want.has('looks')) {
    const rooms = [[18, 16, 'N'], [44, 16, 'N'], [70, 16, 'N'], [96, 16, 'N'], [122, 16, 'N'], [148, 16, 'N'], [174, 16, 'N'], [18, 40, 'S'], [44, 40, 'S'], [68, 40, 'S'], [106, 40, 'S'], [132, 40, 'S'], [158, 40, 'S'], [184, 40, 'S']];
    for (const [i, [cx, cz, side]] of rooms.entries()) {
      const doorZ = side === 'N' ? 24 : 32, inZ = side === 'N' ? 10 : 46, yaw = side === 'N' ? 0 : Math.PI;                      // from the doorway: north rooms are entered looking north (-z)
      await T(`t.setup_teleport(${(cx + 0.5) * CELL}, ${(side === 'N' ? 25 : 31) * CELL}, ${yaw}); t.setup_player({ pitch: -0.03, hp: 100000 })`); await T('t.tick(2)'); await frames(8); await shot('look-' + String(i + 1).padStart(2, '0') + '-a-door', 100);
      await T(`t.setup_teleport(${(cx + 0.5) * CELL}, ${(side === 'N' ? 22 : 34) * CELL}, ${side === 'N' ? Math.PI : 0}); t.setup_player({ pitch: 0.02, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('look-' + String(i + 1).padStart(2, '0') + '-b-back', 100);
    }
  }
  if (want.has('scenery')) {
    await T('t.setup_teleport(201, 141, 0); t.setup_player({ pitch: 0.35, hp: 100000 })'); await T('t.tick(2)'); await frames(6); await shot('scenery-1-north');
    await T('t.setup_teleport(241, 141, 0); t.setup_player({ pitch: 0.3, hp: 100000 })'); await T('t.tick(2)'); await frames(6); await shot('scenery-2-north-east');
    await T('t.setup_teleport(215, 141, 3.14159); t.setup_player({ pitch: 0.3, hp: 100000 })'); await T('t.tick(2)'); await frames(6); await shot('scenery-3-south');
  }
  if (want.has('lineup')) {
    const xs = hive.entities.filter((e) => e.type === 'enemy' && e.at[1] === 107 && e.hold === 'inert').map((e) => e.at[0]);
    for (let k = 0; k < xs.length; k += 6) { const x = xs[Math.min(xs.length - 1, k + 2)]; await T(`t.setup_teleport(${(x + 0.5) * CELL}, ${111 * CELL}, 0); t.setup_player({ pitch: 0.0, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('lineup-' + String(k / 6 + 1).padStart(2, '0')); }
  }
  if (want.has('variants')) { for (const [k, x] of [[1, 28], [2, 38]]) { await T(`t.setup_teleport(${(x + 0.5) * CELL}, ${(108 + 0.5) * CELL}, 3.14159); t.setup_player({ pitch: -0.02, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('variants-' + k); } }
}
const probe = () => T('t.hiveProbe()');
const killAll = async (kind) => { for (let i = 0; i < 80; i++) { const hp = await T(`t.setup_hurtEnemy('${kind}', 1e7)`); if (hp == null) break; } };
if (want.has('boss')) {
  const hb = load('HIVEBOSS'), pod = hb.entities.find((e) => e.kind === 'hivecantor'), CX = pod.at[0], CZ = pod.at[1]; await open('HIVEBOSS'); R.probes.boss = {};
  await T(`t.setup_teleport(19, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.05, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('boss-1-start-hall');
  await T(`t.setup_teleport(${(CX - 21) * CELL}, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.08, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('boss-2-the-gate');
  await T(`t.setup_teleport(${(CX - 17.5) * CELL}, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.12, hp: 100000 })`); await T('t.tick(60)'); await frames(6); await shot('boss-3-bowl-from-the-rim'); R.probes.boss.awake = await probe();
  // the beat floors and the conductor's windup and ring
  let seen = {};
  for (let i = 0; i < 80 && !(seen.windup && seen.ring); i++) { await T('t.tick(10)'); await frames(1); const p = await probe(); if (p.cantor?.pulseT >= 0 && !seen.windup) { seen.windup = p.tick; await frames(2); await shot('boss-4-windup', 50); } if (p.pulses > 0 && !seen.ring) { seen.ring = p.tick; await frames(2); await shot('boss-5-ring', 50); R.probes.boss.ring = p; } }
  R.probes.boss.seen = seen;
  await T(`t.setup_teleport(${(CX - 9) * CELL}, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: 0.15, hp: 100000 })`); await T('t.tick(2)'); await frames(8); await shot('boss-6-the-conductor'); R.probes.boss.threads = await probe();
  // the unison shield: a shot while the choir sings, then with the choir dead
  const hp0 = await T("t.setup_hurtEnemy('hivecantor', 100)"), hp1 = await T("t.setup_hurtEnemy('hivecantor', 100)"); R.probes.boss.shielded = { before: 1500, afterTwoHundred: hp1, lost: 1500 - hp1 };
  await killAll('tollbearer'); await killAll('chorister'); await killAll('zealot'); await T('t.tick(5)'); await frames(4); R.probes.boss.choirDead = await probe();
  const a = await T("t.setup_hurtEnemy('hivecantor', 100)"), b = await T("t.setup_hurtEnemy('hivecantor', 100)"); R.probes.boss.open = { lost: (a - b) };
  await T('t.tick(120)'); await frames(4); await shot('boss-7-phase-two', 100); R.probes.boss.phaseTwo = await probe();
  await T("t.setup_hurtEnemy('hivecantor', 1e7)"); await T('t.tick(240)'); await frames(6); await shot('boss-8-dead', 100); R.probes.boss.dead = await probe();
}
if (want.has('bell')) {
  const CX = 62, CZ = 42; await open('BELLBOSS'); R.probes.bell = {};
  await T(`t.setup_teleport(19, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.05, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('bell-1-start-hall-dark');
  await T("t.press('lamp')"); await T('t.tick(3)'); await T("t.release('lamp')"); await T('t.tick(10)'); await frames(8); await shot('bell-2-start-hall-lit');
  await T(`t.setup_teleport(${(CX - 14.5) * CELL}, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.1, hp: 100000 })`); await T('t.tick(30)'); await frames(8); await shot('bell-3-the-rim-lit'); R.probes.bell.awake = await probe();
  const samples = []; for (let k = 0; k < 14; k++) { await T('t.tick(30)'); await frames(1); samples.push(await probe()); if (k % 4 === 1) await shot('bell-4-swing-' + k, 50); } R.probes.bell.swing = samples.map((p) => ({ t: p.tick, x: +p.bell.x.toFixed(2), lift: +p.bell.lift.toFixed(2), phi: +(p.bell.phi ?? 0).toFixed(2), rootX: +p.bell.rootX.toFixed(2), rigY: +p.bell.rigY.toFixed(2), pulses: p.pulses, hp: p.hp }));
  for (let i = 0; i < 4; i++) await T("t.setup_hurtEnemy('rootanchor', 1e7)");
  await T('t.tick(20)'); await frames(3); await shot('bell-5-falling', 50); await T('t.tick(90)'); await frames(4); await shot('bell-6-on-the-ground', 100); R.probes.bell.ground = await probe();
  let seenSpike = false; for (let i = 0; i < 30 && !seenSpike; i++) { await T('t.tick(10)'); await frames(1); const p = await probe(); if (p.spikes > 0) { seenSpike = true; await frames(2); await shot('bell-7-spikes', 50); R.probes.bell.spikes = p; } }
  const bid = (await probe()).bell.id; await T(`t.setup_enemy(${bid}, { hp: 600 })`); await T('t.tick(150)'); await frames(6); await shot('bell-8-last-note', 100); R.probes.bell.last = await probe();
  await T("t.setup_hurtEnemy('rootbell', 1e7)"); await T('t.tick(40)'); await frames(4); R.probes.bell.dying = await probe(); await T('t.tick(300)'); await frames(6); await shot('bell-9-hanging-still', 100); R.probes.bell.dead = await probe(); R.probes.bell.audio = (await T('t.state()')).audio.last;
}
if (want.has('end')) {
  await open('HIVEEND'); R.probes.end = {};
  await T(`t.setup_teleport(17, ${(13 + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.04, hp: 100000 })`); await T('t.tick(2)'); await frames(6); await shot('end-1-the-bell-floor');
  await T("t.press('lamp')"); await T('t.tick(3)'); await T("t.release('lamp')"); await T('t.tick(10)'); await frames(6); await shot('end-2-lamp-lit');
  await T(`t.setup_teleport(${(98 + 0.5) * CELL}, ${(13 + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: 0.0, hp: 100000 })`); await T('t.tick(40)'); await frames(6); await shot('end-3-the-hall-of-the-gate');
  await T(`t.setup_teleport(${(105 + 0.5) * CELL}, ${(13 + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: 0.0, hp: 100000 })`); await T('t.tick(40)'); await frames(6); await shot('end-4-at-the-door'); R.probes.end.atDoor = await probe();
  await T('t.setup_epilogue(0, 2)'); await frames(2); await shot('end-5-epilogue-card-1', 200); await T('t.setup_epilogue(30, 2)'); await frames(2); await shot('end-6-epilogue-card-3', 200); await T('t.setup_epilogue(60, 2)'); await frames(2); await shot('end-7-epilogue-card-5', 200);
}
console.log(JSON.stringify(R, null, 1));
await browser.close(); await server.close(); process.exit(errors.length ? 1 : 0);
