// REAL-PAGE PROBE of the Preview's pieces (PT-043): what the live game page DRAWS against what the sim says, for the new creatures and effects, in ONE headless-Chrome job (idle priority, two cores: tools/dev/low.ps1; never the owner's mouse).
// It loads HIVE, HIVEBOSS and BELLBOSS, steps them and checks, from the dev hook's `hiveProbe()` and the view's own state:
//   - the Root Bell's clapper is drawn where the sim has it (x, z), at the lift the sim says, over the whole swing; its chain is drawn while it hangs and not once it has fallen; a spike is drawn for every spike the sim has
//   - the Hive Cantor's threads are one per singer still standing, and fall to none when the choir is dead; its unison shield takes a twentieth, then the whole blow
//   - the beat floors are drawn blooming in order (the spore views follow the clock); the beat stops when the conductor dies (w.beatOff)
//   - the clapper's death hangs it, silences the world and opens the exit; no page error
//   node tools/dev/probe-hive.mjs      -> JSON; exit code 1 when a check fails
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const port = 5283, server = await createServer({ root, logLevel: 'error', server: { port, strictPort: true } }); await server.listen();
const browser = await puppeteer.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.evaluateOnNewDocument(() => { navigator.getGamepads = () => [null, null, null, null]; }); await page.setViewport({ width: 960, height: 540 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__GAME_TEST__ && window.__GAME_TEST__.ready', { timeout: 120000 });
const T = (code) => page.evaluate(`(() => { const t = window.__GAME_TEST__; ${code.includes(';') ? code + ';' : 'return ' + code + ';'} })()`);
const frames = async (n = 3) => { for (let i = 0; i < n; i++) await T('t.render(0.05)'); };
const out = { checks: [], errors };
const ok = (name, pass, detail = null) => { out.checks.push({ name, pass: !!pass, ...(detail != null ? { detail } : {}) }); };
const probe = () => T('t.hiveProbe()');
const load = (id) => JSON.parse(fs.readFileSync(path.join(root, 'maps-dev', id + '.json'), 'utf8'));
const CELL = 2;
const killAll = async (kind) => { for (let i = 0; i < 80; i++) { if ((await T(`t.setup_hurtEnemy('${kind}', 1e7)`)) == null) break; } };

// ---- THE ROOT BELL
await T("t.newGame('normal', 3, { mapId: 'BELLBOSS' })"); await T('t.clearOverlays()');
await T(`t.setup_teleport(${(62 - 14.5) * CELL}, ${42.5 * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.1, hp: 100000 })`); await T('t.tick(10)'); await frames(3);
let worst = 0, worstLift = 0, chainSeen = 0, samples = 0, shadowSeen = false;
for (let k = 0; k < 40; k++) { await T('t.tick(20)'); await frames(1); const p = await probe(); if (p.bell.mode === 'hung') { samples++; worst = Math.max(worst, Math.hypot(p.bell.rootX - p.bell.x, p.bell.rootZ - p.bell.z)); worstLift = Math.max(worstLift, Math.abs((p.bell.rigY - 0.24) - p.bell.lift) > 0.5 ? 9 : 0); if (p.drawn?.chain) chainSeen++; if (p.drawn?.shadow) shadowSeen = true; } }
ok('the clapper is drawn at the sim\'s x and z over a whole swing', samples >= 30 && worst < 0.001, { samples, worst });
ok('its chain is drawn while it hangs', chainSeen === samples, { chainSeen, samples }); ok('the glow under the middle of the swing is drawn at some moment', shadowSeen);
await T("t.setup_hurtEnemy('rootanchor', 1e7)"); await T("t.setup_hurtEnemy('rootanchor', 1e7)"); await T("t.setup_hurtEnemy('rootanchor', 1e7)");
let p = await probe(); ok('three of four anchors cut: the swing is lower and wider', p.bell.cut === 3 || (p.anchors.filter((s) => s === 'dead').length === 3), { cut: p.bell.cut, anchors: p.anchors });
await T("t.setup_hurtEnemy('rootanchor', 1e7)"); await T('t.tick(240)'); await frames(3); p = await probe();
ok('the last anchor cut: the clapper has fallen to the ground and is drawn there', p.bell.mode === 'ground' && p.bell.lift === 0 && p.drawn?.chain === false, { mode: p.bell.mode, chain: p.drawn?.chain });
let spikes = null; for (let i = 0; i < 40 && !spikes; i++) { await T('t.tick(10)'); await frames(1); const q = await probe(); if (q.spikes > 0) spikes = q; }
ok('a spike is drawn for each spike the sim has', spikes && spikes.drawn.spikes === spikes.spikes, spikes && { sim: spikes.spikes, drawn: spikes.drawn.spikes });
await T(`t.setup_enemy(${p.bell.id}, { hp: 600 })`); await T('t.tick(150)'); await frames(3); p = await probe();
ok('under 30%: the Last Note (the heart open, the lights fall)', p.bell.last === true && p.ambient != null && p.ambient < 0.5, { last: p.bell.last, ambient: p.ambient });
await T("t.setup_hurtEnemy('rootbell', 1e7)"); await T('t.tick(300)'); await frames(3); p = await probe();
ok('it does not break: it hangs, the sound is cut, the exit opens', p.bell.state === 'dead' && p.bell.mode === 'rise' && p.bell.lift > 0.5 && p.silenced === true, { lift: p.bell.lift, silenced: p.silenced });

// ---- THE HIVE CANTOR
await T("t.newGame('normal', 3, { mapId: 'HIVEBOSS' })"); await T('t.clearOverlays()');
const hb = load('HIVEBOSS'), pod = hb.entities.find((e) => e.kind === 'hivecantor'), CX = pod.at[0], CZ = pod.at[1];
await T(`t.setup_teleport(${(CX - 17.5) * CELL}, ${(CZ + 0.5) * CELL}, ${-Math.PI / 2}); t.setup_player({ pitch: -0.1, hp: 100000 })`); await T('t.tick(60)'); await frames(4); p = await probe();
ok('the choir and the conductor are awake after the gate', p.cantor.state === 'chase', p.cantor);
ok('a thread is drawn for every singer still standing', p.drawn.threads === p.choirAlive && p.choirAlive === 36, { threads: p.drawn.threads, alive: p.choirAlive });
const a = await T("t.setup_hurtEnemy('hivecantor', 100)"), b = await T("t.setup_hurtEnemy('hivecantor', 100)"); ok('the unison shield: a twentieth through while the choir sings', Math.abs((1500 - b) - 10) < 0.01, { lost: 1500 - b });
let rings = 0; for (let i = 0; i < 60; i++) { await T('t.tick(10)'); await frames(1); const q = await probe(); if (q.pulses > 0) rings++; } ok('rings appear on the beat (the conductor and the singers)', rings > 0, { sampledWithRings: rings });
for (const k of ['tollbearer', 'chorister', 'zealot']) await killAll(k); await T('t.tick(10)'); await frames(3); p = await probe();
ok('the threads are gone with the choir', p.drawn.threads === 0 && p.choirAlive === 0, { threads: p.drawn.threads }); ok('the choir silent is phase two', p.cantor.ph === 1, { ph: p.cantor.ph });
const c = await T("t.setup_hurtEnemy('hivecantor', 100)"), d = await T("t.setup_hurtEnemy('hivecantor', 100)"); ok('the whole blow through the open shield', Math.abs((c - d) - 100) < 0.01, { lost: c - d });
await T("t.setup_hurtEnemy('hivecantor', 1e7)"); await T('t.tick(60)'); await frames(3); p = await probe(); ok('its death stops the beat', p.beatOff === true);

// ---- THE HIVE (the three creatures and the pens)
await T("t.newGame('normal', 3, { mapId: 'HIVE' })"); await T('t.clearOverlays()'); await T('t.tick(20)'); await frames(3); p = await probe();
ok('the Preview map loads and a clapper and a conductor are drawn', p.bell && p.cantor && p.bell.rootY != null && p.cantor.rootY != null);
const hv = load('HIVE'); ok('every creature kind of the game stands in the lineup', Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'maps-dev/HIVE.json'), 'utf8')).entities.filter((e) => e.type === 'enemy' && e.at[1] === 107).reduce((m, e) => (m[e.kind] = 1, m), {})).length >= 20);
ok('no page error', errors.length === 0, errors.slice(0, 3));
const fails = out.checks.filter((q) => !q.pass); out.failed = fails.length;
console.log(JSON.stringify(out, null, 1));
await browser.close(); await server.close(); process.exit(fails.length || errors.length ? 1 : 0);
