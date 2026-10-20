// DEV-ONLY test interface (window.__GAME_TEST__). Loaded via `if (import.meta.env.DEV) import(...)` in main.js, so production
// builds contain none of it. Actions travel through the real input layer + fixed step; the only state writers are the
// clearly-labelled setup_* helpers.
import { Bot } from '../engine/bot.js';
import { hashWorld, spawnEnemy, updateBeams, damageEnemy } from '../engine/world.js';
import { groundAt } from '../engine/terrain.js';
import { PLAYER, ENEMIES, lookOf } from '../engine/defs.js';
import { sanitizeProgress, earn } from '../engine/progress.js';
import { ENDINGS, stepSequence, skipSequence } from './ending.js';
import { enemyBounds, enemyScreenRect, encounterProbe, debrisProbe } from '../render/diagnostics.js';
import { WEAPON_LIGHT } from '../render/view.js';

const ROUTES = Object.fromEntries(Object.entries(import.meta.glob('../../routes/*.json', { eager: true, import: 'default' })).map(([p, v]) => [p.split('/').pop().replace('.route.json', ''), v]));

function pcm(f32) {
  let peak = 0, sum = 0, nan = 0; const n = f32.length, i16 = new Int16Array(n);
  for (let i = 0; i < n; i++) { const v = f32[i]; if (!Number.isFinite(v)) { nan++; continue; } peak = Math.max(peak, Math.abs(v)); sum += v * v; i16[i] = Math.max(-1, Math.min(1, v)) * 32767; }
  let s = ''; const u8 = new Uint8Array(i16.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return { peak, rms: Math.sqrt(sum / n), nan, samples: n, b64: btoa(s) };
}

export function installTestHook(app) {
  const { g, MAPS, store, audio, ui } = app;
  let bot = null;
  const snap = () => {
    const w = g.world, p = w?.player;
    return {
      mode: g.mode, mapId: g.mapId, difficulty: g.difficulty, seed: g.seed, tick: w?.tick ?? null, status: w?.status ?? null, hash: w ? hashWorld(w) : null,
      progress: JSON.parse(JSON.stringify(g.progress)), upgrades: w?.upgrades ?? null,
      fov: g.view?.cam.fov ?? null, player: p && { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, ads: p.ads, sprint: p.sprint, sprinting: p.sprinting, hp: p.hp, armor: p.armor, ammo: p.ammo, keys: p.keys, weapon: p.weapon, weapons: p.weapons, cooldown: p.cooldown, graftT: p.graftT ?? 0, lamp: p.lamp ?? null },
      messagesSeen: w?.messagesSeen ?? null, explored: w ? w.explored.reduce((a, b) => a + b, 0) : null, stats: w?.stats ?? null, endStats: w?.endStats ?? null, secretsFound: w?.secretsFound ?? null,
      enemies: w?.enemies.map((e) => ({ id: e.id, x: e.x, z: e.z, hp: e.hp, state: e.state })) ?? null, pickups: w?.pickups.length ?? null,
      doors: w?.doors.map((d) => ({ cx: d.cx, cz: d.cz, open: d.open, target: d.target })) ?? null,
      lockFailed: g.lockFailed, settings: g.settings, audio: { state: audio.state, played: audio.stats.played, dropped: audio.stats.dropped, last: audio.stats.log.slice(-12).map((x) => x.id) },
    };
  };
  const render = (dt = 0) => { if (g.view && g.world) g.view.render(g.world, 1, dt); };
  window.__GAME_TEST__ = {
    ready: true,
    routes: Object.keys(ROUTES),
    state: snap,
    governorProbe: () => ({ width: g.governor.width, base: g.governor.base, rung: g.governor.rung, p95: g.governor.p95, samples: g.governor.samples.length }),      // PT-071 R21: what the quality governor has decided (tools/dev/probe-quality.mjs)
    drainEvents() { const e = g.events; g.events = []; return e; },
    // -- semantic actions (same path as the keyboard) --
    newGame(difficulty = 'normal', seed = 1, { realtime = false, mapId = null, keepProgress = false } = {}) { g.lockFailed = true; if (!keepProgress) g.progress = sanitizeProgress(null); /* PT-065: a new game starts a fresh campaign, as the real button does: a choice made in C2M11 leaked into the next map's world of the same page session and made the browser's state hash differ from the node sim's on every later Campaign Two map */ app.startLevel({ difficulty, seed, ...(mapId ? { mapId } : {}) }); g.manual = !realtime; return snap(); },
    realtime(on) { g.manual = !on; },
    press: (a) => g.input.press(a), release: (a) => g.input.release(a), addYaw: (r) => g.input.addYaw(r), addPitch: (r) => g.input.addPitch(r),
    tick(n = 1) { for (let i = 0; i < n; i++) { app.stepOnce(); if (g.mode !== 'playing') break; } render(); return snap(); },
    render, pause: app.pause, resume: app.resume,
    save: () => app.quickSave(), load: () => app.quickLoad(),
    /** PT-065 (V4/V12): the tone shoulder's two numbers, set live (a probe renders one state under several curves and measures the picture; `shoulder` in post.js and tonecurve.js) */
    setup_weaponLight(floor) { WEAPON_LIGHT.floor = floor; g.view.setPlace(g.view.look); },
    setup_tone(k, pre) { const u = g.view.post.uniforms; u.uShoulder.value = k; u.uShoulderPre.value = pre; },
    setSetting(k, v) { g.settings[k] = v; if (k === 'outline' || k === 'paint' || k === 'reducedMotion') g.view?.setLook(g.settings); if (k === 'internalWidth') g.governor.reset(v); },
    // -- route bot: same InputState as a human --
    startBot(name, opts = {}) { bot = new Bot(g.world, g.input, typeof name === 'string' ? ROUTES[name] : name, opts); return { ops: bot.route.length }; },
    stepBot(n = 60) { for (let i = 0; i < n && bot && !bot.done && !bot.failed && g.mode === 'playing'; i++) { bot.tick(); app.stepOnce(); } render(); return { done: bot?.done ?? null, failed: bot?.failed ?? null, op: bot?.i ?? null, ...snap() }; },
    perfStep(withRender = false) { if (!(bot && !bot.done && !bot.failed && g.mode === 'playing')) return g.mode !== 'playing' ? g.mode : bot?.done ? 'done' : bot?.failed ? 'failed' : 'idle'; bot.tick(); app.stepOnce(); if (withRender) render(0.016); return 'ok'; },          // PT-054: one frame of the route bot with NO snapshot (the snapshot hashes the whole world and would drown the numbers of tools/dev/probe-perf.mjs)
    // -- low-level setup (state writers; tests only) --
    setup_teleport(x, z, yaw) { const p = g.world.player; p.x = x; p.z = z; if (yaw != null) p.yaw = yaw; p.y = groundAt(g.world, x, z, PLAYER.radius); g.view.eyeBase = p.y; g.view.beforeStep(g.world); },
    setup_spawnEnemy(kind, x, z, yaw = Math.PI, state = 'idle', variant = null) { const e = spawnEnemy(g.world, kind, x, z, yaw); e.state = state; if (variant) e.variant = variant; return e.id; },
    /** PT-039: a tone pulse of the Sub-Cantor's kind (it turns back at `reflect` m) from (x, z), and what the view draws of the creature `id`: the colour of its first atlas material */
    /** PT-043 (the Preview): the new creatures and effects, what the SIM says and what the VIEW draws of it */
    hiveProbe() {
      const w = g.world, v = g.view; if (!w) return null;
      const bell = w.enemies.find((e) => e.kind === 'rootbell'), hc = w.enemies.find((e) => e.kind === 'hivecantor'), bv = bell && v?.enemyViews.get(bell.id), hv = hc && v?.enemyViews.get(hc.id);
      return {
        tick: w.tick, beatOff: !!w.beatOff, silenced: !!w.silenced, spikes: (w.spikes ?? []).length, pulses: w.pulses.length, pulseViews: v?.pulseViews.size ?? 0,
        bell: bell && { id: bell.id, state: bell.state, x: bell.x, z: bell.z, y: bell.y, lift: bell.lift, hp: bell.hp, mode: bell.rb?.mode, len: bell.rb?.len, amp: bell.rb?.amp, phi: bell.rb?.phi, last: !!bell.rb?.last, cut: bell.rb?.cut, rootY: bv?.root.position.y, rigY: bv?.rig.position.y, rootX: bv?.root.position.x, rootZ: bv?.root.position.z },
        cantor: hc && { state: hc.state, hp: hc.hp, ph: hc.ph ?? 0, pulseT: hc.pulseT, rootY: hv?.root.position.y, rigY: hv?.rig.position.y },
        anchors: w.enemies.filter((e) => e.kind === 'rootanchor').map((e) => e.state), choirAlive: w.enemies.filter((e) => e.group === 'choir' && e.state !== 'dead').length, choirTotal: w.enemies.filter((e) => e.group === 'choir').length,
        drawn: v?.hiveView?.counts() ?? null, lamp: w.player.lamp ? { on: w.player.lamp.on } : null, ambient: w.ambient ?? null, hp: w.player.hp, objective: w.objective, status: w.status,
      };
    },
    setup_hurtEnemy(kind, amount) { const w = g.world, e = w.enemies.find((q) => q.kind === kind && q.state !== 'dead'); if (e) damageEnemy(w, e, amount); return e ? e.hp : null; },
    setup_pulse(x, z, reflect = 22) { const w = g.world, P = ENEMIES.subcantor.pulse; w.pulses.push({ id: w.nextId++, x, z, y: groundAt(w, x, z, 0.3), r: 0.6, speed: P.speed, dmg: 0, width: P.width, maxR: P.maxR, hit: false, reflectAt: reflect }); },
    tintProbe(id) { const v = g.view?.enemyViews.get(id); if (!v) return null; let c = null; v.root.traverse((o) => { if (!c && o.isMesh && o.material?.map && o.material.color) c = o.material.color.getHex(); }); return c; },
    pulseProbe() { const w = g.world, v = g.view; return { pulses: w.pulses.map((q) => ({ r: q.r, back: !!q.back, hit: q.hit })), views: v.pulseViews.size }; },
    setup_enemy(id, fields) { Object.assign(g.world.enemies.find((e) => e.id === id), fields); },
    setup_addPickup(kind, x, z) { g.world.pickups.push({ id: g.world.nextId++, kind, x, z }); },
    /** render truth: per enemy, the sim's x/y/z + ground (groundAt) next to the world-space bounds and root position actually drawn (see GameView.enemyBounds) */
    shadowProbe() { const sh = g.view?.shadows; return sh ? { count: sh.mesh.count, visible: sh.mesh.visible, inScene: !!sh.mesh.parent, opacity: sh.mesh.material.opacity } : null; },                                  // PT-035: the contact shadows (shadows.js)
    enemyBounds() { return g.view && g.world ? enemyBounds(g.view, g.world) : []; },
    enemyScreenRect(id) { return g.view && g.world ? enemyScreenRect(g.view, g.world, id) : null; },
    /** feed events to the view as the game does (impact / explode make debris) and read the debris back */
    emitView(events) { g.view.handleEvents(events); },
    debrisProbe() { return g.view && g.world ? debrisProbe(g.view, g.world) : []; },
    setup_arcLife(seconds) { if (g.view) g.view.arcLife = seconds; },        // stills only: the lamp's lightning lives 0.09 s, too short to photograph
    boltProbe() { return g.view ? { streaks: g.view.bolts.filter((b) => b.streak).length, stuck: g.view.bolts.filter((b) => !b.streak).length, zoom: g.view.cam.fov, arcs: g.view.arcs.length, lamp: g.view.lampLight.intensity } : null; },        // the harpoon's view-only effects (streak, bolt left in a wall) and the camera's field of view
    /** PT-027: what the view draws for the ship's breath: the mortar's landing ring, each spore region's bed / mist, each breathing gate's slab height against the sim's `open` */
    /** PT-038 (E5): what the view draws for the hand lantern: its light's strength, whether the held lantern is there, the HUD gauge text */
    lampProbe() { const v = g.view, L = g.world?.player.lamp; return { lamp: L ? { on: L.on, oil: L.oil } : null, light: v?.handLamp ? { intensity: v.handLamp.intensity, k: v.lampK } : null, model: !!v?.lampModel, hud: { shown: !document.getElementById('hud-lamp').classList.contains('hidden'), oil: document.getElementById('hud-oil').textContent, label: document.getElementById('hud-oil-label').textContent } }; },
    /** PT-038 (E6): what the chime view draws: each chime's glow and the tree's lit fruit (the sim's own clock decides) */
    chimeProbe() { const cv = g.view?.chimeView; if (!cv) return null; return { chimes: [...cv.chimes].map(([id, c]) => ({ id, note: c.note, glow: c.glow.scale.x })), fruit: cv.fruit.map((f) => ({ note: f.note, scale: f.orb.scale.x })), treeLight: cv.fruit.light?.intensity ?? 0, played: g.world.chimes?.play ?? null, matched: Object.keys(g.world.chimes?.matched ?? {}) }; },
    breathProbe() {
      if (!g.view || !g.world) return null; const v = g.view, w = g.world;
      return { ring: v.aimRing ? { visible: v.aimRing.visible, x: v.aimRing.position.x, y: v.aimRing.position.y, z: v.aimRing.position.z } : null, beds: (v.lvl.sporeViews ?? []).map((s) => ({ bed: s.bed.opacity, mist: s.mist.opacity, mistVisible: s.mist.visible })),
        gates: w.doors.filter((d) => d.breath).map((d) => { const m = v.lvl.doorViews.get(d.cx + ',' + d.cz); return { cx: d.cx, cz: d.cz, open: d.open, target: d.target, y: m ? m.position.y - (m.userData.base ?? 0) : null, span: m?.userData.span ?? null }; }), shells: w.projectiles.filter((q) => q.weapon === 'mortar').length };
    },
    /** PT-028: what the view draws for the two elites: the Weeping Mother's tears in the air and the pools they leave (against the sim's), each Bulwark Shell's hinge angle (the open carapace is the tell) and each Mother's sac swell */
    eliteProbe() {
      if (!g.view || !g.world) return null; const v = g.view, w = g.world;
      return { wards: v.wardViews.size, tears: v.tearViews.size, simTears: w.tears?.length ?? 0, pools: [...v.poolViews.values()].map((m) => ({ opacity: m.material.opacity, scale: m.scale.x, x: m.position.x, y: m.position.y, z: m.position.z })), simPools: (w.patches ?? []).map((q) => ({ x: q.x, z: q.z, r: q.r, life: q.life })),
        shells: w.enemies.filter((e) => e.kind === 'bulwark' && e.state !== 'dead').map((e) => ({ id: e.id, attackT: e.attackT, hinge: v.enemyViews.get(e.id)?.J.shell.rotation.x ?? null })), mothers: w.enemies.filter((e) => e.kind === 'weeping' && e.state !== 'dead').map((e) => ({ id: e.id, broodT: e.broodT ?? -1, pulseT: e.pulseT ?? -1, sac: v.enemyViews.get(e.id)?.J.sac0.scale.x ?? null })) };
    },
    /** PT-030: the Brood Vats' and the Grand Cantor's state (sim) and how they are drawn (the dome's height scale, the horn's tilt), for the stills and the browser check */
    foundryProbe() {
      if (!g.view || !g.world) return null; const v = g.view, w = g.world;
      return { vats: w.enemies.filter((e) => e.kind === 'vat').map((e) => ({ id: e.id, state: e.state, vatT: e.vatT ?? -1, brood: (e.brood ?? []).length, dome: v.enemyViews.get(e.id)?.J.dome.scale.y ?? null })),
        grand: w.enemies.filter((e) => e.kind === 'grandcantor').map((e) => ({ id: e.id, state: e.state, hp: e.hp, stunT: e.stunT ?? 0, pulseT: e.pulseT ?? -1, echoT: e.echoT ?? 0, horn: v.enemyViews.get(e.id)?.J.horn.rotation.x ?? null })),
        reeds: w.enemies.filter((e) => e.kind === 'reed' && e.state !== 'dead').length, pulses: w.pulses.length, pulseViews: v.pulseViews.size, born: w.enemies.filter((e) => e.summoned).length };
    },
    /** PT-032: the air state and what is drawn for it: the player's height and the camera's, the field of view, every vent plate and falling load as the view has them */
    airProbe() {
      if (!g.view || !g.world) return null; const v = g.view, p = g.world.player;
      return { air: !!p.air, y: p.y, hp: p.hp, camY: v.cam.position.y, fov: v.cam.fov, baseFov: v.baseFov ?? null, airK: v.airK, ventViews: v.ventViews?.length ?? 0, skyBelow: !!v.skyBelow,
        loads: (v.loadViews ?? []).map((lv, i) => ({ visible: lv.box.visible, y: lv.box.position.y, scaleY: lv.box.scale.y, glow: lv.glow.material.opacity, shadow: lv.shadow.material.opacity, rect: g.world.map.loads[i].rect })), time: g.world.time };
    },
    /** PT-029: every moving floor: the sim's height, the height the view draws it at, and the clock (a timing platform follows `platformState`) */
    sectorProbe() { if (!g.view || !g.world) return null; return { time: g.world.time, sectors: g.world.sectors.map((s, i) => ({ id: s.id, h: s.h, y: g.view.lvl.sectorViews[i]?.position.y ?? null, ph: s.ph ?? null })) }; },
    /** PT-030: every node (bell nodes, feeders, reeds, vats) dead at once: a boss with none left has no shield (the Range's stills) */
    setup_killNodes() { for (const e of g.world.enemies) if (ENEMIES[e.kind].node) { e.state = 'dead'; e.hp = 0; e.dead = 1; } },
    /** where the Cantor's shield and the ring beams are drawn (world space) */
    encounterProbe() { return g.view ? encounterProbe(g.view) : null; },
    /** send a moving floor to its 'high' or 'low' stop (the same field the switch actions set) */
    setup_sectorTo(id, pos) { const s = g.world.sectors.find((q) => q.id === id), def = g.world.map.sectors.find((q) => q.id === id); s.target = pos === 'high' ? def.high : def.low; },
    setup_ambient(v) { g.world.ambient = v; if (g.view) g.view.ambient = v; },
    showScreen(name, data = {}) { ui.show(name, data); },
    /** PT-036: the campaign epilogue as if the finale's exit had just been taken (the map in hand need not be one). `at` = seconds to step the sequence first, or 'tally' to go straight to the tally */
    setup_epilogue(at = 0, campaign = 1) {
      const w = g.world; if (w && !w.endStats) w.endStats = { time: 640, kills: 41, items: 12, secrets: 1, total: { enemies: 44, secrets: 1, items: 14 }, damageTaken: 90, dest: 'main' };
      if (w && !g.lastEarn) { g.lastEarn = earn(g.progress, g.mapId, w.endStats, g.world.map.par?.time); g.progress = g.lastEarn.progress; }               // what the real exit did before it started the epilogue
      app.startEpilogue({ campaign, ...ENDINGS[campaign] }); const e = g.ending;
      e.seq = at === 'tally' ? skipSequence(e.seq, e.def.cards) : stepSequence(e.seq, e.def.cards, at); app.syncEpilogue(); return window.__GAME_TEST__.epilogueProbe();
    },
    /** PT-036: what the shell says about the epilogue and what the page shows (the card, the typed text, the tally's rows, the picture loaded) */
    epilogueProbe() {
      const e = g.ending, el = (id) => document.getElementById(id), art = el('ending-art');
      return { mode: g.mode, screen: ui.screen, active: !!e, card: e ? e.seq.i : null, phase: e?.seq.phase ?? null, tallied: e?.tallied ?? null, who: el('ending-who').textContent, text: el('ending-text').textContent, title: el('ending-title').textContent,
        tallyShown: !el('ending-tally').classList.contains('hidden'), tallyRows: el('tally-eps').children.length, discs: el('tally-eps').querySelectorAll('.disc').length, totals: el('tally-totals').children.length, art: art.src.split('/').pop(), artLoaded: art.complete && art.naturalWidth > 0 };
    },
    press_epilogue() { app.epiloguePress(); return window.__GAME_TEST__.epilogueProbe(); },
    /** PT-063 (R13): start a story scene on the map in hand as if its trigger had fired (`replay` plays it whatever the setting and the seen list say), run its clock `at` seconds, and say what the shell and the page show */
    setup_cinematic(id, at = 0, replay = true) { app.startCinematic(id, replay); if (g.cine && at > 0) app.stepCinematic(at); return window.__GAME_TEST__.cinematicProbe(); },
    step_cinematic(dt = 0.5) { app.stepCinematic(dt); return window.__GAME_TEST__.cinematicProbe(); },
    skip_cinematic() { app.skipCinematic(); return window.__GAME_TEST__.cinematicProbe(); },
    /** PT-063: the scene's clock, the camera the view actually has against the pose the scene asked for, and the overlay the page shows (the HUD must be gone, the subtitle typed, the black over it) */
    cinematicProbe() {
      const c = g.cine, el = (i) => document.getElementById(i), cam = g.view?.cam, want = g.view?.cine ?? null, hud = el('hud'), seen = g.progress?.cinematicsSeen ?? [];
      return { mode: g.mode, active: !!c, id: c?.scene.id ?? null, t: c?.st.t ?? null, done: c?.st.done ?? null, cam: cam ? { x: cam.position.x, y: cam.position.y, z: cam.position.z, yaw: cam.rotation.y, pitch: cam.rotation.x } : null, want,
        overlay: !el('cine').classList.contains('hidden'), bodyClass: document.body.classList.contains('in-cine'), who: el('cine-who').textContent, text: el('cine-text').textContent, fade: Number(el('cine-fade').style.opacity || 0),
        hudDisplay: hud ? getComputedStyle(hud).display : null, toastsDisplay: getComputedStyle(el('toasts')).display, seen, tick: g.world?.tick ?? null };
    },
    /** PT-037: open the Record as the pause menu or the title would, and what the page then shows */
    openRecord(from = 'pause') { app.openRecord(from); return window.__GAME_TEST__.recordProbe(); },
    closeRecord() { app.closeRecord(); return { screen: ui.screen }; },
    recordProbe() { const el = (id) => document.getElementById(id); return { screen: ui.screen, sub: el('record-sub').textContent, groups: el('record-list').querySelectorAll('h3').length, entries: el('record-list').querySelectorAll('.rec').length, docs: el('record-list').querySelectorAll('.rec.doc').length, current: el('record-list').querySelector('h3.cur')?.dataset.map ?? null, record: g.progress.record ?? null }; },                                                  // a screen with sample data, for the front-end stills (PT-021 step 4)
    setup_look(name) { g.view?.setPlace(lookOf({ look: name })); },                                  // try another place's light on the map in hand (PT-021 stills)
    setup_openDoors() { for (const d of g.world.doors) { d.open = 1; d.target = 1; } },
    /** hide the title card / queued transmissions / tips, so screenshots show what a player sees after the intro */
    clearOverlays() { ui.clearOverlays(); },
    /** wake every sleeping enemy (worst-case render/CPU sampling: everything animating and chasing) */
    setup_wakeAll() { for (const e of g.world.enemies) if (e.state === 'idle') { e.state = 'chase'; e.lastX = g.world.player.x; e.lastZ = g.world.player.z; e.lost = 0; } },
    /** PT-033: set the mirrors (ids -> rotation 0..3) and trace the beams again: the stills and the browser check put the Mirror Array in a chosen state */
    setup_mirrors(rots) { const w = g.world; if (!w.mirrors) return false; Object.assign(w.mirrors, rots); updateBeams(w, true); return true; },
    /** PT-033: what the sim says about the beams and what the view has drawn: lit receivers, the mirror rotations, the plates' drawn yaws, how many bars of light, each receiver's glow */
    beamProbe() {
      const w = g.world, v = g.view?.beamView; if (!w?.mirrors || !v) return null;
      return { lit: [...w.beams.lit], mirrors: { ...w.mirrors }, yaws: Object.fromEntries([...v.mirrors].map(([id, m]) => [id, m.yaw])), bars: v.lines.children.length, glow: Object.fromEntries([...v.receivers].map(([id, r]) => [id, r.lit])) };
    },
    /** PT-033: the Gate Warden: what the sim says (the sweep clock, the traced line) and what the view has drawn (the beam's meshes in view, the eye's lid and iris) */
    sweepProbe() {
      const w = g.world, e = w?.enemies.find((q) => q.kind === 'gatewarden'), v = g.view; if (!e || !v) return null;
      const rig = v.enemyViews.get(e.id), meshes = v.sweepView ? v.sweepView.group.children.filter((m) => m.visible).length : 0;
      return { state: e.state, sweepT: e.sweepT ?? -1, beam: !!e.sweepLine?.beam, linePts: e.sweepLine?.pts.length ?? 0, drawn: meshes, lid: rig?.J?.lid?.rotation.x ?? null, iris: rig?.J?.iris?.scale.x ?? null, aim: rig?.J?.eyeG?.rotation.y ?? null, seals: w.enemies.filter((q) => q.kind === 'seal' && q.state !== 'dead').length };
    },
    setup_clearEnemies() { for (const e of g.world.enemies) e.state = 'dead'; },
    setup_player(fields) { Object.assign(g.world.player, fields); },
    /** the weapon wheel (PT-013): is it open, what is selected, the clock scale; and push the pointer as the mouse would (the real mouse needs pointer lock, which the harness turns off) */
    /** the live GameView, for look-dev probes (dev only; compiled out of the production build) */
    view() { return g.view; },
    wheel() { return { open: g.wheel.open, sel: g.wheel.sel, timeScale: g.timeScale }; },
    setup_wheelFeed(dx, dy) { g.wheel.feed(dx, dy); },
    setup_progress(fields) { g.progress = sanitizeProgress({ ...g.progress, ...fields }); if (g.mode === 'complete') ui.locker(g.progress, ''); },                         // the campaign progress (salvage, upgrade tiers, records) before a level starts or on the intermission
    setup_postClassic(on) { g.view.post.uniforms.uClassic.value = on ? 1 : 0; },                                        // the whole picture on the original ink pass (outline guard in browser-check)
    setup_postDebug(on) { g.view.post.uniforms.uDebug.value = on ? 1 : 0; },                                            // the ink mask instead of the picture (tools/dev/shoot-outlines.mjs)
    // -- diagnostics --
    perf() { const t = [...g.frameTimes].sort((a, b) => a - b); const n = t.length; return { frames: n, avgMs: n ? t.reduce((a, b) => a + b, 0) / n : 0, p95Ms: t[Math.floor(n * 0.95)] ?? 0, worstMs: t[n - 1] ?? 0 }; },
    /** render ONE full frame (world + weapon + post) and report its true draw-call/triangle totals (info auto-reset is off for the duration) */
    measureFrame() { const i = app.renderer.info; i.autoReset = false; i.reset(); render(0.016); const r = { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0 }; i.autoReset = true; return r; },
    gl: () => ({ ...app.renderer.info.memory, calls: app.renderer.info.render.calls, triangles: app.renderer.info.render.triangles, programs: app.renderer.info.programs?.length ?? 0 }),
    saveSlot: (slot) => store.read(slot),
    // -- audio QA (browser only): render a recipe offline and return 16-bit PCM as base64 --
    async audioRender(id, seconds = 3) {
      const { renderSfx } = await import('../audio/synth.js'); const { rate, samples, duration } = await renderSfx(id, { seconds });
      return { rate, duration, ...pcm(samples) };
    },
    async audioMusic(seconds = 12, intensity = 0.8) { const { renderMusic } = await import('../audio/music.js'); const { rate, samples } = await renderMusic({ seconds, intensity }); return { rate, ...pcm(samples) }; },
    automap: async () => { const { automapModel } = await import('../engine/automap.js'); const m = automapModel(g.world); return { exploredCount: m.exploredCount, doors: m.doors.length, exits: m.exits.length, kinds: [...new Set(m.cells.map((c) => c.kind))] }; },
    mapOpen: () => g.mapOpen,
    audioUnlock: () => audio.unlock(), audioClock: () => audio.clock, audioLog: (n = 40) => audio.stats.log.slice(-n),
    sfxIds: async () => Object.keys((await import('../audio/synth.js')).SFX),
  };
}
