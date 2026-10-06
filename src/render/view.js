// GameView: read-only projection of sim state into a Three.js scene (+ weapon overlay + painterly post pass).
// It never mutates the world. Effects (explosions, muzzle flash) are driven by drained sim events.
import * as THREE from 'three';
import { makeTollbearer, makeGaunt, makeFlareCannon, makeScattergun, makePickup } from './models.js';
import { makeRivetDriver, makePickupRivet } from './models_rivet.js';
import { makeHarpoonRifle, makePickupHarpoon } from './models_harpoon.js';
import { makeArcLamp, makePickupArc } from './models_arc.js';
import { makeBellNodeEnemy } from './models_g2.js';
import { makeDroneGill, makeFeeder, makeGraftMother } from './models_e2.js';
import { markEntity, patchEntityFragment } from './entityflag.js';
import { buildLevel } from './levelmesh.js';
import { mergeStatic } from './merge.js';
import { debrisFloor, spawnGround } from './debris.js';
import { PostPass } from './post.js';
import { PLAYER, ENEMIES, WEAPONS, TICK, VIEW } from '../engine/defs.js';
import { floorAt } from '../engine/terrain.js';

const ENEMY_MODELS = { tollbearer: (t) => makeTollbearer(t.tollbearer_atlas), gaunt: (t) => makeGaunt(t.tollbearer_atlas), bellhand: (t) => makeTollbearer(t.tollbearer_atlas, 'bellhand'), sexton: (t) => makeTollbearer(t.tollbearer_atlas, 'sexton'), wardengraft: (t) => makeTollbearer(t.tollbearer_atlas, 'warden'), cantor: (t) => makeTollbearer(t.tollbearer_atlas, 'cantor'), bellnode: () => makeBellNodeEnemy(), gill: (t) => makeDroneGill(t.pod_organic_a), feeder: (t) => makeFeeder(t.pod_organic_a), graftmother: (t) => makeGraftMother(t.pod_organic_a) };

const NEAR = 0.1, FAR = 170, LIGHT_BUDGET = 6;
const ADS_POSE = { x: 0, y: -0.067, z: -0.6 };                                  // sights on the crosshair axis
const SPRINT_POSE = { x: 0.13, y: -0.235, z: -0.42, rx: -0.3, ry: 0.65, rz: -0.28 };   // gun carried low and across the body
const lerp = (a, b, t) => a + (b - a) * t;

export class GameView {
  constructor(renderer, tex, map, world) {
    this.renderer = renderer; this.tex = tex; this.map = map; this.time = 0; this.deadT = 0; this.recoil = 0; this.flashT = 0; this.boomT = 9;
    const scene = this.scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(new THREE.Color(map.atmosphere.fog), map.atmosphere.fogDensity);
    const hemi = this.hemi = new THREE.HemisphereLight(0x9fb4d0, 0x3a2a40, 2.4); scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xd8b0e0, 1.3); sun.position.set(-8, 14, -6); scene.add(sun);
    this.ambient = map.atmosphere.ambient ?? 1; hemi.intensity = 2.4 * this.ambient; sun.intensity = 1.3 * this.ambient;       // dark levels (Signal House) dim the general light: the lamps carry the scene
    const lvl = this.lvl = buildLevel(map, tex); scene.add(lvl.group);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex['sky_' + (map.atmosphere.sky ?? 'dusk')] ?? tex.sky_dusk, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1; scene.add(this.sky);
    this.cam = new THREE.PerspectiveCamera(70, 16 / 9, NEAR, FAR); this.cam.rotation.order = 'YXZ';
    this.flareLight = new THREE.PointLight(0xff9040, 0, 16, 2); this.boomLight = new THREE.PointLight(0xffb060, 0, 20, 2); scene.add(this.flareLight, this.boomLight);
    // weapon overlay
    const ws = this.weaponScene = new THREE.Scene(); this.weaponCam = new THREE.PerspectiveCamera(58, 16 / 9, NEAR, FAR);
    ws.add(new THREE.HemisphereLight(0x9fb8d0, 0x3a2a30, 1.5)); const key = new THREE.DirectionalLight(0xffe0b0, 1.6); key.position.set(-1, 1.5, 1); ws.add(key);
    this.muzzleLight = new THREE.PointLight(0xffa040, 0, 4, 2); this.muzzleLight.position.set(0.1, 0, -0.9); ws.add(this.muzzleLight);
    this.WPOS = new THREE.Vector3(0.2, -0.2, -0.46);
    this.rigs = { flare: makeFlareCannon(tex.flarecannon_atlas), scattergun: makeScattergun(tex.flarecannon_atlas), rivet: makeRivetDriver(tex.flarecannon_atlas), harpoon: makeHarpoonRifle(tex.flarecannon_atlas), arc: makeArcLamp(tex.flarecannon_atlas) };
    for (const rig of Object.values(this.rigs)) { rig.group.scale.setScalar(0.62); rig.group.position.copy(this.WPOS); rig.group.visible = false; ws.add(rig.group); }
    this.targetWeapon = world.player.weapon; this.prevWeapon = world.player.weapon; this.pumpT = 0;
    const nearDepth = '#include <project_vertex>\n gl_Position.z = gl_Position.z * 0.05 - gl_Position.w * 0.95;';   // weapon stays in the near depth range so world depth survives for the outline pass
    for (const rig of Object.values(this.rigs)) rig.group.traverse((o) => { if (!o.isMesh) return; const m = o.material; m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', nearDepth); if (!m.transparent) patchEntityFragment(s); }; m.customProgramCacheKey = () => 'weapon-depth'; });       // the weapon keeps the classic ink too (entityflag.js)
    this.post = new PostPass(renderer, tex.paper_grain, NEAR, FAR);
    this.enemyViews = new Map(); this.pickupViews = new Map(); this.projViews = new Map(); this.debris = [];
    this.prev = { player: { x: 0, z: 0, yaw: 0, pitch: 0 }, enemies: new Map() };
    this.seed = 99; this.debGeo = new THREE.TetrahedronGeometry(0.09); this.debMat = new THREE.MeshBasicMaterial({ color: 0xff8a30 }); this.dustMat = new THREE.MeshBasicMaterial({ color: 0x9a8a72 });
    this.projGeo = new THREE.IcosahedronGeometry(0.13, 0); this.projMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    this.shotGeo = new THREE.IcosahedronGeometry(0.17, 1); this.shotRing = new THREE.TorusGeometry(0.3, 0.025, 4, 14); this.shotMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0 }); this.shotViews = new Map();      // Bellhand toll-shots: teal, slow, readable
    // Gate 2 effects: channel beams and node links (thin teal cylinders), the Cantor's shield, expanding tone-pulse rings
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); this.beamMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.55, depthWrite: false }); this.beams = new Map();
    this.ringGeo = new THREE.RingGeometry(0.94, 1.0, 72); this.pulseViews = new Map();
    this.streakMat = new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.85, depthWrite: false }); this.arcMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.95, depthWrite: false }); this.arcs = []; this.arcLife = 0.09; this.lampLight = new THREE.PointLight(0x6ffff0, 0, 14, 2); scene.add(this.lampLight);       // the lamp's lightning (jagged teal segments, 0.09 s) and the glow it throws on the level (the light is always in the scene: a constant light count means no shader recompiles)
    this.stuckGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.0, 6); this.stuckMat = new THREE.MeshLambertMaterial({ color: 0xaab8bc, emissive: 0x1a3a38 }); this.bolts = [];      // the harpoon's streak (a thin teal line, 0.22 s) and the bolt it leaves standing in a wall (12 s, the newest 24)
    this.shieldGeo = new THREE.IcosahedronGeometry(1, 1); this.shieldMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.2, wireframe: true, depthWrite: false }); this.shield = null;
    this.beforeStep(world);
  }
  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  setSize(w, h, internalW) { this.renderer.setSize(w, h, false); this.cam.aspect = this.weaponCam.aspect = w / h; this.cam.updateProjectionMatrix(); this.weaponCam.updateProjectionMatrix(); this.post.resize(internalW, Math.max(90, Math.round(internalW * h / w))); }
  setLook({ outline, paint, fov = VIEW.fov, brightness = 1 }) {
    this.post.uniforms.uOutline.value = outline ? 1 : 0; this.post.uniforms.uPaint.value = paint ? 1 : 0; this.post.uniforms.uExposure.value = 2.2 * brightness;
    this.baseFov = fov; this.adsFov = fov * (VIEW.adsFov / VIEW.fov);                                                      // aiming keeps the same zoom ratio at any field of view
  }

  /** call before each sim step so render can interpolate */
  beforeStep(w) {
    const p = w.player; Object.assign(this.prev.player, { x: p.x, z: p.z, y: p.y ?? 0, yaw: p.yaw, pitch: p.pitch }); if (this.eyeBase == null) this.eyeBase = p.y ?? 0;
    for (const e of w.enemies) { let s = this.prev.enemies.get(e.id); if (!s) this.prev.enemies.set(e.id, s = {}); s.x = e.x; s.z = e.z; s.y = e.y ?? 0; s.yaw = e.yaw; }
  }
  /** a thin teal cylinder from a to b (created on first use, moved every frame) */
  beam(key, ax, ay, az, bx, by, bz, radius) {
    let m = this.beams.get(key); if (!m) { m = new THREE.Mesh(this.beamGeo, this.beamMat); this.scene.add(m); this.beams.set(key, m); }
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz) || 1;
    m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); m.scale.set(radius, len, radius); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    m.userData.a = [ax, ay, az]; m.userData.b = [bx, by, bz];
  }
  handleEvents(events) {
    for (const e of events) {
      if (e.type === 'fire') { const sg = e.weapon === 'scattergun', rv = e.weapon === 'rivet', hp = e.weapon === 'harpoon', ar = e.weapon === 'arc'; this.recoil = sg ? 1.6 : rv ? 0.35 : hp ? 2.2 : ar ? 0.15 : 1; this.flashT = sg ? 0.09 : rv ? 0.045 : 0.07; if (sg || hp) this.pumpT = 0.9; if (rv || hp) this.spinKick = 1; }
      else if (e.type === 'bolt') this.addBolt(e);
      else if (e.type === 'arc') this.addArc(e);
      else if (e.type === 'impact') {
        for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(this.debGeo, this.dustMat); m.scale.setScalar(0.6); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.6 + 0.2, this.rnd() - 0.5).multiplyScalar(2.6), life: 0.3 + this.rnd() * 0.2 }); }
      }
      else if (e.type === 'shake') { this.shakeT = 0.5; this.shakeAmp = e.amount ?? 1; }
      else if (e.type === 'explode') {
        this.boomT = 0; this.boomLight.position.set(e.x, e.y, e.z);
        for (let i = 0; i < 14; i++) {
          const m = new THREE.Mesh(this.debGeo, this.debMat); m.position.set(e.x, e.y, e.z); this.scene.add(m);
          this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.9 + 0.3, this.rnd() - 0.5).multiplyScalar(7), life: 0.5 + this.rnd() * 0.4 });
        }
      }
    }
  }

  /** the harpoon's line: a streak from the muzzle (low and to the right, as the gun is held) to where the bolt stopped, and, when it stopped in something solid, the bolt left standing there */
  addBolt(e) {
    const yaw = this.cam.rotation.y, r = [Math.cos(yaw), 0, -Math.sin(yaw)], f = [-Math.sin(yaw), 0, -Math.cos(yaw)];
    const ax = e.x0 + f[0] * 1.0 + r[0] * 0.2, ay = e.y0 - 0.17, az = e.z0 + f[2] * 1.0 + r[2] * 0.2, dx = e.x1 - ax, dy = e.y1 - ay, dz = e.z1 - az, len = Math.hypot(dx, dy, dz);
    if (len < 0.5) return;
    const m = new THREE.Mesh(this.beamGeo, this.streakMat); m.position.set((ax + e.x1) / 2, (ay + e.y1) / 2, (az + e.z1) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)); m.scale.set(0.035, len, 0.035); this.scene.add(m);
    this.bolts.push({ m, life: 0.22, max: 0.22, streak: true });
    if (e.stuck) {
      const s = new THREE.Mesh(this.stuckGeo, this.stuckMat), n = [dx / len, dy / len, dz / len]; s.position.set(e.x1 - n[0] * 0.3, e.y1 - n[1] * 0.3, e.z1 - n[2] * 0.3); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(n[0], n[1], n[2])); this.scene.add(s);
      this.bolts.push({ m: s, life: 12, max: 12, streak: false }); const stuck = this.bolts.filter((b) => !b.streak); if (stuck.length > 24) { const old = stuck[0]; this.scene.remove(old.m); this.bolts.splice(this.bolts.indexOf(old), 1); }
    }
  }

  /** the lamp's lightning: from the muzzle through every body the arc struck (or out to where it died against a wall), each hop broken into jagged teal segments that live for under a tenth of a second */
  addArc(e) {
    const yaw = this.cam.rotation.y, r = [Math.cos(yaw), 0, -Math.sin(yaw)], f = [-Math.sin(yaw), 0, -Math.cos(yaw)];
    const path = [[e.x0 + f[0] * 0.8 + r[0] * 0.14, e.y0 - 0.16, e.z0 + f[2] * 0.8 + r[2] * 0.14], ...(e.pts.length ? e.pts : [e.end])];
    const up = new THREE.Vector3(0, 1, 0);
    for (let s = 0; s + 1 < path.length; s++) {
      const a = path[s], b = path[s + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(3, Math.min(10, Math.round(len / 0.5))), jit = Math.min(0.45, 0.08 * len);
      let prev = a;
      for (let k = 1; k <= n; k++) {
        const t = k / n, last = k === n, q = last ? b : [a[0] + (b[0] - a[0]) * t + (this.rnd() - 0.5) * jit, a[1] + (b[1] - a[1]) * t + (this.rnd() - 0.5) * jit, a[2] + (b[2] - a[2]) * t + (this.rnd() - 0.5) * jit];
        const dx = q[0] - prev[0], dy = q[1] - prev[1], dz = q[2] - prev[2], l = Math.hypot(dx, dy, dz) || 1, m = new THREE.Mesh(this.beamGeo, this.arcMat);
        m.position.set((prev[0] + q[0]) / 2, (prev[1] + q[1]) / 2, (prev[2] + q[2]) / 2); m.quaternion.setFromUnitVectors(up, new THREE.Vector3(dx / l, dy / l, dz / l)); m.scale.set(0.009, l, 0.009); this.scene.add(m);
        this.arcs.push({ m, life: this.arcLife }); prev = q;
      }
    }
    while (this.arcs.length > 90) this.scene.remove(this.arcs.shift().m);
  }

  render(w, alpha, dt) {
    this.time += dt; const p = w.player, pp = this.prev.player;
    // camera (interpolated)
    const speed = Math.hypot(p.vx, p.vz), bob = Math.sin(p.bob * 2) * 0.035 * Math.min(1, speed / PLAYER.speed);
    let eye = PLAYER.eye + bob, roll = 0;
    if (w.status === 'dead') { this.deadT = Math.min(1, this.deadT + dt / 0.8); eye = lerp(PLAYER.eye, 0.35, this.deadT); roll = this.deadT * 0.5; } else this.deadT = 0;
    this.eyeBase += ((p.y ?? 0) - this.eyeBase) * Math.min(1, dt * 14);                                            // stairs and lifts glide the camera instead of popping it
    let sx = 0, sy = 0; if (this.shakeT > 0) { this.shakeT = Math.max(0, this.shakeT - dt); const k = this.shakeAmp * (this.shakeT / 0.5); sx = (this.rnd() - 0.5) * 0.12 * k; sy = (this.rnd() - 0.5) * 0.09 * k; }
    this.cam.position.set(lerp(pp.x, p.x, alpha) + sx, this.eyeBase + eye + sy, lerp(pp.z, p.z, alpha));
    this.cam.rotation.set(lerp(pp.pitch, p.pitch, alpha) + p.kick, lerp(pp.yaw, p.yaw, alpha), roll);
    const adsFov = (this.baseFov ?? VIEW.fov) * ((WEAPONS[p.weapon].adsFov ?? VIEW.adsFov) / VIEW.fov), fov = lerp(this.baseFov ?? VIEW.fov, adsFov, p.ads) + VIEW.sprintFovKick * p.sprint;       // zoom for the sights (the harpoon rifle zooms in much further), a little stretch for sprint
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
    this.sky.position.copy(this.cam.position);
    { const want = w.ambient ?? this.map.atmosphere.ambient ?? 1; this.ambient += (want - this.ambient) * Math.min(1, dt * 1.6); this.hemi.intensity = 2.4 * this.ambient; this.sun.intensity = 1.3 * this.ambient; }
    this.tex.water_dusk.offset.x += dt * 0.0035; this.tex.water_dusk.offset.y += dt * 0.0022;                       // slow drift of the painted water
    if (this.lvl.towerGlow) this.lvl.towerGlow.scale.setScalar(1 + 0.18 * Math.sin(this.time * 1.7) + 0.08 * Math.sin(this.time * 4.1));   // the Bell breathes
    // enemies
    const seen = new Set();
    for (const e of w.enemies) {
      seen.add(e.id); let v = this.enemyViews.get(e.id);
      if (!v) { v = ENEMY_MODELS[e.kind](this.tex); markEntity(v.root); this.scene.add(v.root); this.enemyViews.set(e.id, v); }          // markEntity: enemies keep the classic ink (entityflag.js, PT-006)
      const s = this.prev.enemies.get(e.id) || e;
      // WORLD placement: the view owns v.root (x, z, yaw, and y = the sim's ground for this actor). v.pose() animates inside v.rig and must never write the root (ground-contract.js)
      v.root.position.set(lerp(s.x, e.x, alpha), lerp(s.y ?? e.y ?? 0, e.y ?? 0, alpha), lerp(s.z, e.z, alpha)); v.root.rotation.y = lerp(s.yaw, e.yaw, alpha);
      const def = ENEMIES[e.kind], t = w.time + alpha * TICK + e.id * 1.7;
      const L = def.lunge, lunge = L && (e.lungeT ?? -1) >= 0 ? (e.lungeT < L.windup ? -(e.lungeT / L.windup) : 1) : 0;      // -1..0 crouch, 1 dash
      // the attack pose comes from whichever windup is running: a swing, a Warden's shoulder-down charge, a Sexton's raised staff, the Cantor's arms up before a pulse
      let attack = e.attackT >= 0 ? e.attackT / def.attack.duration : 0;
      if (def.charge && (e.chargeT ?? -1) >= 0) attack = 0.55 * Math.min(1, e.chargeT / def.charge.windup); else if (def.support && (e.channelT ?? -1) >= 0) attack = 0.5; else if (def.boss && (e.pulseT ?? -1) >= 0) attack = 0.55 * Math.min(1, e.pulseT / def.pulse.windup);
      v.pose({ t, walk: e.walk, phase: e.phase, attack, lunge, dead: e.dead, flash: e.flash });
      // performance: an enemy that is still asleep stands perfectly still, so draw it as ONE merged mesh (~35 draw calls -> 1); swap the rig back in the moment it wakes or dies
      // A sleeper on a MOVING floor is not frozen: the merge bakes the world height, so a floor that keeps moving would leave it buried or hovering. It freezes once its ground is steady.
      const steady = Math.abs((e.y ?? 0) - (s.y ?? e.y ?? 0)) < 1e-4;
      if (e.state === 'idle' && !v.frozen && steady) {
        v.root.updateMatrixWorld(true); const f = v.root.clone(true); this.scene.add(f); f.updateMatrixWorld(true); mergeStatic(f, { disposeSources: false, cull: true }); f.position.set(0, 0, 0); f.rotation.set(0, 0, 0); f.updateMatrixWorld(true); v.frozen = f; v.frozenY = e.y ?? 0; v.root.visible = false;
      } else if (v.frozen && (e.state !== 'idle' || Math.abs((e.y ?? 0) - v.frozenY) > 1e-3)) { this.scene.remove(v.frozen); v.frozen.traverse((o) => o.isMesh && o.geometry.dispose()); v.frozen = null; v.root.visible = true; }
    }
    for (const [id, v] of this.enemyViews) if (!seen.has(id)) { this.scene.remove(v.root); if (v.frozen) this.scene.remove(v.frozen); this.enemyViews.delete(id); }
    // channel beams (Sexton -> corpse), node links (ring -> Cantor), the shield, tone pulses
    { const live = new Set(); let boss = null; const nodes = [];
      for (const e of w.enemies) {
        const def = ENEMIES[e.kind];
        if (def.support && (e.channelT ?? -1) >= 0) { const c = w.enemies.find((o) => o.id === e.channelTarget); if (c) { this.beam('ch' + e.id, e.x, (e.y ?? 0) + 1.7, e.z, c.x, (c.y ?? 0) + 0.3, c.z, 0.05 + 0.03 * Math.sin(this.time * 22)); live.add('ch' + e.id); } }
        if (def.node && e.state !== 'dead') nodes.push(e); if (def.boss && e.state !== 'dead') boss = e;
      }
      if (boss && nodes.length) for (const n of nodes) { this.beam('nk' + n.id, n.x, (n.y ?? 0) + 1.7, n.z, boss.x, (boss.y ?? 0) + 2.6, boss.z, 0.03 + 0.012 * Math.sin(this.time * 6 + n.id)); live.add('nk' + n.id); }
      for (const [k, m] of this.beams) if (!live.has(k)) { this.scene.remove(m); this.beams.delete(k); }
      if (boss && nodes.length) { if (!this.shield) { this.shield = new THREE.Mesh(this.shieldGeo, this.shieldMat); this.scene.add(this.shield); } this.shield.visible = true; const SH = ENEMIES[boss.kind].shield ?? {}; this.shield.position.set(boss.x, (boss.y ?? 0) + (SH.y ?? 2.4), boss.z); this.shield.scale.setScalar((SH.r ?? 2.9) + 0.08 * Math.sin(this.time * 5)); this.shield.rotation.y = this.time * 0.6; } else if (this.shield) this.shield.visible = false;
      const pseen = new Set();
      for (const q of w.pulses || []) {
        pseen.add(q.id); let m = this.pulseViews.get(q.id);
        if (!m) { m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; this.scene.add(m); this.pulseViews.set(q.id, m); }
        m.position.set(q.x, (q.y ?? 0) + 0.16, q.z); m.scale.setScalar(Math.max(0.01, q.r + q.speed * alpha * TICK)); m.material.opacity = 0.9 * Math.max(0, 1 - q.r / q.maxR);
      }
      for (const [id, m] of this.pulseViews) if (!pseen.has(id)) { this.scene.remove(m); m.material.dispose(); this.pulseViews.delete(id); }
    }
    // pickups
    seen.clear();
    for (const it of w.pickups) {
      seen.add(it.id); let v = this.pickupViews.get(it.id);
      if (!v) { v = (it.kind === 'ammo_rivet' || it.kind === 'weapon_rivet' ? makePickupRivet : it.kind === 'ammo_bolt' || it.kind === 'weapon_harpoon' ? makePickupHarpoon : it.kind === 'ammo_cell' || it.kind === 'weapon_arc' ? makePickupArc : makePickup)(it.kind, this.tex.props_atlas, this.tex.flarecannon_atlas); this.scene.add(v); this.pickupViews.set(it.id, v); }
      v.position.set(it.x, (it.y ?? 0) + 0.18 + Math.sin(this.time * 2.2 + it.id) * 0.05 + (it.kind.startsWith('key') ? 0.25 : 0), it.z); v.rotation.y = this.time * 0.9 + it.id;
    }
    for (const [id, v] of this.pickupViews) if (!seen.has(id)) { this.scene.remove(v); this.pickupViews.delete(id); }
    // projectiles
    seen.clear(); let lead = null;
    for (const q of w.projectiles) {
      seen.add(q.id); let m = this.projViews.get(q.id); if (!m) { m = new THREE.Mesh(this.projGeo, this.projMat); this.scene.add(m); this.projViews.set(q.id, m); }
      m.position.set(q.x + q.vx * alpha * TICK, q.y + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK); lead = lead || m;
    }
    for (const [id, m] of this.projViews) if (!seen.has(id)) { this.scene.remove(m); this.projViews.delete(id); }
    seen.clear();
    for (const q of w.enemyShots) {
      seen.add(q.id); let m = this.shotViews.get(q.id);
      if (!m) { m = new THREE.Mesh(this.shotGeo, this.shotMat); const ring = new THREE.Mesh(this.shotRing, this.shotMat); m.add(ring); m.userData.ring = ring; this.scene.add(m); this.shotViews.set(q.id, m); }
      m.position.set(q.x + q.vx * alpha * TICK, q.y + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK); m.userData.ring.rotation.set(this.time * 5, this.time * 3, 0); m.scale.setScalar(1 + 0.15 * Math.sin(this.time * 18));
    }
    for (const [id, m] of this.shotViews) if (!seen.has(id)) { this.scene.remove(m); this.shotViews.delete(id); }
    this.flareLight.intensity = lead ? 40 : 0; if (lead) this.flareLight.position.copy(lead.position);
    // doors
    for (const d of w.doors) { const v = this.lvl.doorViews.get(d.cx + ',' + d.cz); if (v) v.position.y = (v.userData.base ?? 0) + d.open * (v.userData.span ?? this.map.ceiling - 0.05); }
    w.sectors.forEach((s, i) => { const v = this.lvl.sectorViews[i]; if (v) v.position.y = s.h; });                       // moving floors
    if (this.lvl.fxMats.x) this.lvl.fxMats.x.opacity = 0.55 + 0.12 * Math.sin(this.time * 2.4);                          // toxic residue breathes
    if (this.lvl.fxMats.h) this.lvl.fxMats.h.opacity = 0.84 + 0.08 * Math.sin(this.time * 3.1) + 0.04 * Math.sin(this.time * 7.7);                          // the ember bed flickers
    for (const sw of this.map.switches) { const r = this.lvl.switchViews.get(sw.id); if (!r) continue; const used = w.switchState?.[sw.id]?.used; r.lamp.material.color.setHex(used ? 0x4aff7a : 0xff4a3a); r.lever.rotation.x = used ? -0.5 : 0.4; r.group.position.y = floorAt(w, sw.x, sw.z) + 1.35; }        // a panel on a moving floor rides with it
    for (const [id, r] of this.lvl.exitViews) r.group.children[0].material.color.setHex(w.exitLocked?.[id] ? 0x7a2a22 : 0xffc070);      // a sealed gate glows dull red
    for (let i = this.arcs.length - 1; i >= 0; i--) { const a = this.arcs[i]; a.life -= dt; if (a.life <= 0) { this.scene.remove(a.m); this.arcs.splice(i, 1); } }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.life -= dt; if (b.streak) { const k = Math.max(0, b.life / b.max); b.m.scale.x = b.m.scale.z = 0.035 * k; }
      if (b.life <= 0) { this.scene.remove(b.m); this.bolts.splice(i, 1); }
    }
    // debris + explosion light
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += dt * 9; d.m.rotation.y += dt * 7;
      if (d.ground == null) d.ground = spawnGround(w, d.m.position.x, d.m.position.z);
      if (d.life <= 0 || d.m.position.y < debrisFloor(w, d.m.position.x, d.m.position.z, d.ground)) { this.scene.remove(d.m); this.debris.splice(i, 1); }       // lands on the terrain under it, not on world y = 0
    }
    this.boomT += dt; this.boomLight.intensity = this.boomT < 0.5 ? 140 * (1 - this.boomT / 0.5) ** 2 : 0;
    // static lights: flicker, and keep only the nearest few enabled (constant count => no shader recompiles)
    const cp = this.cam.position, wp = new THREE.Vector3();
    for (const l of this.lvl.lights) {
      const b = l.userData.base, f = l.userData.flicker; l.getWorldPosition(wp);
      l.intensity = f === 'pod' ? b * (0.8 + 0.2 * Math.sin(this.time * 2 + wp.x)) : b * (0.93 + 0.05 * Math.sin(this.time * 13 + wp.z) + 0.03 * Math.sin(this.time * 31));
      l.userData.d = wp.distanceToSquared(cp);
    }
    [...this.lvl.lights].sort((a, b) => a.userData.d - b.userData.d).forEach((l, i) => { l.visible = i < LIGHT_BUDGET; });
    // weapon overlay
    this.recoil = Math.max(0, this.recoil - dt * 4.5); this.flashT = Math.max(0, this.flashT - dt);
    // which weapon is on screen: during a switch the old one dips out for the first half, the new one rises for the second
    if (p.weapon !== this.targetWeapon) { this.prevWeapon = this.targetWeapon; this.targetWeapon = p.weapon; }
    const u = p.switchT > 0 ? 1 - p.switchT / WEAPONS[p.weapon].switchTime : 1, shown = (p.switchT > 0 && u < 0.5) ? this.prevWeapon : p.weapon, dip = p.switchT > 0 ? -0.45 * Math.sin(Math.PI * u) : 0;
    for (const [id, r] of Object.entries(this.rigs)) r.group.visible = id === shown;
    const rig = this.rigs[shown];
    // weapon pose = hip, blended toward the sights, then toward the lowered sprint carry
    const a = p.ads, sp = p.sprint, sway = Math.sin(p.bob) * 0.008 * Math.min(1, speed / PLAYER.speed) * (1 - 0.85 * a) + Math.sin(p.bob) * 0.02 * sp * Math.min(1, speed / PLAYER.speed), r = this.recoil * (1 - 0.5 * a), W = this.WPOS;
    const gs = lerp(0.62, 0.56, a);                                                     // a slightly smaller gun in the sights: less slab under the crosshair
    rig.group.scale.setScalar(gs); const fade = Math.max(0, 1 - a / 0.6) ** 2; rig.sleeveMat.opacity = fade; rig.sleeveMat.visible = fade > 0.02;
    const px = lerp(lerp(W.x, ADS_POSE.x, a), SPRINT_POSE.x, sp), py = lerp(lerp(W.y, rig.adsY * gs / 0.62, a), SPRINT_POSE.y, sp), pz = lerp(lerp(W.z, ADS_POSE.z, a), SPRINT_POSE.z, sp);
    rig.group.position.set(px + sway, py + Math.abs(sway) * 0.6 - r * 0.02 - this.deadT * 0.6 + dip, pz + r * 0.13);
    rig.group.rotation.set(-r * 0.12 + SPRINT_POSE.rx * sp, lerp(lerp(0.1, 0, a), SPRINT_POSE.ry, sp), SPRINT_POSE.rz * sp);
    rig.flash.visible = this.flashT > 0; if (rig.flash.visible) rig.flash.scale.setScalar(((shown === 'scattergun' ? 1.1 : 0.8) + this.rnd() * 0.6) * (1 - 0.55 * a));      // small in the sights: it must not hide the target
    if (rig.spin) { this.spinKick = Math.max(0, (this.spinKick || 0) - dt * 6); rig.spin.rotation[rig.spinAxis || 'z'] += dt * (rig.spinAxis ? 16 * this.spinKick : 6 + 40 * this.spinKick); }                    // the barrel cluster winds up while it fires
    if (rig.pump) { const ph = 0.9 - this.pumpT; rig.pump.position.z = ph > 0.3 && ph < 0.7 ? Math.sin(Math.PI * (ph - 0.3) / 0.4) * 0.09 : 0; }      // fore-end slides back and forward after a shot
    this.pumpT = Math.max(0, this.pumpT - dt);
    if (rig.core) rig.core.scale.setScalar(1 + 0.12 * Math.sin(this.time * 9) + (this.flashT > 0 ? 0.4 : 0));                   // the bulb breathes and flares
    { const lamp = shown === 'arc' && w.status !== 'dead'; this.lampLight.intensity = lamp ? (this.flashT > 0 ? 24 + this.rnd() * 10 : 6 + 0.8 * Math.sin(this.time * 7)) : 0; if (lamp) { const fy = this.cam.rotation.y; this.lampLight.position.set(this.cam.position.x - Math.sin(fy) * 0.7, this.cam.position.y - 0.1, this.cam.position.z - Math.cos(fy) * 0.7); } }      // the lamp lights the dark around you
    if (rig.bolt) rig.bolt.visible = p.cooldown < 0.45 && p.ads < 0.4;                                                      // the harpoon leaves the muzzle; the next one seats as the action closes
    this.muzzleLight.intensity = this.flashT > 0 ? 6 : 0;
    this.post.uniforms.uDamage.value = p.hurt;
    this.post.render(() => { this.renderer.render(this.scene, this.cam); this.renderer.render(this.weaponScene, this.weaponCam); });
  }

  /** Release GPU resources owned by this view (textures are shared and owned by the app). */
  dispose() {
    for (const s of [this.scene, this.weaponScene]) s.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose()); } });
    this.debGeo.dispose(); this.debMat.dispose(); this.dustMat.dispose(); this.projGeo.dispose(); this.projMat.dispose(); this.shotGeo.dispose(); this.shotRing.dispose(); this.shotMat.dispose(); this.beamGeo.dispose(); this.beamMat.dispose(); this.ringGeo.dispose(); this.shieldGeo.dispose(); this.shieldMat.dispose(); for (const m of this.pulseViews.values()) m.material.dispose();
    this.post.dispose();
    this.scene.clear(); this.weaponScene.clear();
  }
}
