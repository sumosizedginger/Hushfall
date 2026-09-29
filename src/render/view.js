// GameView: read-only projection of sim state into a Three.js scene (+ weapon overlay + painterly post pass).
// It never mutates the world. Effects (explosions, muzzle flash) are driven by drained sim events.
import * as THREE from 'three';
import { makeTollbearer, makeGaunt, makeFlareCannon, makeScattergun, makePickup } from './models.js';
import { buildLevel } from './levelmesh.js';
import { PostPass } from './post.js';
import { PLAYER, ENEMIES, WEAPONS, TICK, VIEW } from '../engine/defs.js';

const ENEMY_MODELS = { tollbearer: (t) => makeTollbearer(t.tollbearer_atlas), gaunt: (t) => makeGaunt(t.tollbearer_atlas) };

const NEAR = 0.1, FAR = 90, LIGHT_BUDGET = 6;
const ADS_POSE = { x: 0, y: -0.067, z: -0.6 };                                  // sights on the crosshair axis
const SPRINT_POSE = { x: 0.13, y: -0.235, z: -0.42, rx: -0.3, ry: 0.65, rz: -0.28 };   // gun carried low and across the body
const lerp = (a, b, t) => a + (b - a) * t;

export class GameView {
  constructor(renderer, tex, map, world) {
    this.renderer = renderer; this.tex = tex; this.map = map; this.time = 0; this.deadT = 0; this.recoil = 0; this.flashT = 0; this.boomT = 9;
    const scene = this.scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x2a2244, 0.028);
    scene.add(new THREE.HemisphereLight(0x9fb4d0, 0x3a2a40, 2.4));
    const sun = new THREE.DirectionalLight(0xd8b0e0, 1.3); sun.position.set(-8, 14, -6); scene.add(sun);
    const lvl = this.lvl = buildLevel(map, tex); scene.add(lvl.group);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex.sky_dusk, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1; scene.add(this.sky);
    this.cam = new THREE.PerspectiveCamera(70, 16 / 9, NEAR, FAR); this.cam.rotation.order = 'YXZ';
    this.flareLight = new THREE.PointLight(0xff9040, 0, 16, 2); this.boomLight = new THREE.PointLight(0xffb060, 0, 20, 2); scene.add(this.flareLight, this.boomLight);
    // weapon overlay
    const ws = this.weaponScene = new THREE.Scene(); this.weaponCam = new THREE.PerspectiveCamera(58, 16 / 9, NEAR, FAR);
    ws.add(new THREE.HemisphereLight(0x9fb8d0, 0x3a2a30, 1.5)); const key = new THREE.DirectionalLight(0xffe0b0, 1.6); key.position.set(-1, 1.5, 1); ws.add(key);
    this.muzzleLight = new THREE.PointLight(0xffa040, 0, 4, 2); this.muzzleLight.position.set(0.1, 0, -0.9); ws.add(this.muzzleLight);
    this.WPOS = new THREE.Vector3(0.2, -0.2, -0.46);
    this.rigs = { flare: makeFlareCannon(tex.flarecannon_atlas), scattergun: makeScattergun(tex.flarecannon_atlas) };
    for (const rig of Object.values(this.rigs)) { rig.group.scale.setScalar(0.62); rig.group.position.copy(this.WPOS); rig.group.visible = false; ws.add(rig.group); }
    this.targetWeapon = world.player.weapon; this.prevWeapon = world.player.weapon; this.pumpT = 0;
    const nearDepth = '#include <project_vertex>\n gl_Position.z = gl_Position.z * 0.05 - gl_Position.w * 0.95;';   // weapon stays in the near depth range so world depth survives for the outline pass
    for (const rig of Object.values(this.rigs)) rig.group.traverse((o) => { if (!o.isMesh) return; o.material.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', nearDepth); }; o.material.customProgramCacheKey = () => 'weapon-depth'; });
    this.post = new PostPass(renderer, tex.paper_grain, NEAR, FAR);
    this.enemyViews = new Map(); this.pickupViews = new Map(); this.projViews = new Map(); this.debris = [];
    this.prev = { player: { x: 0, z: 0, yaw: 0, pitch: 0 }, enemies: new Map() };
    this.seed = 99; this.debGeo = new THREE.TetrahedronGeometry(0.09); this.debMat = new THREE.MeshBasicMaterial({ color: 0xff8a30 }); this.dustMat = new THREE.MeshBasicMaterial({ color: 0x9a8a72 });
    this.projGeo = new THREE.IcosahedronGeometry(0.13, 0); this.projMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    this.beforeStep(world);
  }
  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  setSize(w, h, internalW) { this.renderer.setSize(w, h, false); this.cam.aspect = this.weaponCam.aspect = w / h; this.cam.updateProjectionMatrix(); this.weaponCam.updateProjectionMatrix(); this.post.resize(internalW, Math.max(90, Math.round(internalW * h / w))); }
  setLook({ outline, paint }) { this.post.uniforms.uOutline.value = outline ? 1 : 0; this.post.uniforms.uPaint.value = paint ? 1 : 0; }

  /** call before each sim step so render can interpolate */
  beforeStep(w) {
    const p = w.player; Object.assign(this.prev.player, { x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch });
    for (const e of w.enemies) { let s = this.prev.enemies.get(e.id); if (!s) this.prev.enemies.set(e.id, s = {}); s.x = e.x; s.z = e.z; s.yaw = e.yaw; }
  }
  handleEvents(events) {
    for (const e of events) {
      if (e.type === 'fire') { const sg = e.weapon === 'scattergun'; this.recoil = sg ? 1.6 : 1; this.flashT = sg ? 0.09 : 0.07; if (sg) this.pumpT = 0.9; }
      else if (e.type === 'impact') {
        for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(this.debGeo, this.dustMat); m.scale.setScalar(0.6); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.6 + 0.2, this.rnd() - 0.5).multiplyScalar(2.6), life: 0.3 + this.rnd() * 0.2 }); }
      }
      else if (e.type === 'explode') {
        this.boomT = 0; this.boomLight.position.set(e.x, e.y, e.z);
        for (let i = 0; i < 14; i++) {
          const m = new THREE.Mesh(this.debGeo, this.debMat); m.position.set(e.x, e.y, e.z); this.scene.add(m);
          this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.9 + 0.3, this.rnd() - 0.5).multiplyScalar(7), life: 0.5 + this.rnd() * 0.4 });
        }
      }
    }
  }

  render(w, alpha, dt) {
    this.time += dt; const p = w.player, pp = this.prev.player;
    // camera (interpolated)
    const speed = Math.hypot(p.vx, p.vz), bob = Math.sin(p.bob * 2) * 0.035 * Math.min(1, speed / PLAYER.speed);
    let eye = PLAYER.eye + bob, roll = 0;
    if (w.status === 'dead') { this.deadT = Math.min(1, this.deadT + dt / 0.8); eye = lerp(PLAYER.eye, 0.35, this.deadT); roll = this.deadT * 0.5; } else this.deadT = 0;
    this.cam.position.set(lerp(pp.x, p.x, alpha), eye, lerp(pp.z, p.z, alpha));
    this.cam.rotation.set(lerp(pp.pitch, p.pitch, alpha) + p.kick, lerp(pp.yaw, p.yaw, alpha), roll);
    const fov = lerp(VIEW.fov, VIEW.adsFov, p.ads) + VIEW.sprintFovKick * p.sprint;       // zoom for the sights, a little stretch for sprint
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
    this.sky.position.copy(this.cam.position);
    // enemies
    const seen = new Set();
    for (const e of w.enemies) {
      seen.add(e.id); let v = this.enemyViews.get(e.id);
      if (!v) { v = ENEMY_MODELS[e.kind](this.tex); this.scene.add(v.root); this.enemyViews.set(e.id, v); }
      const s = this.prev.enemies.get(e.id) || e;
      v.root.position.set(lerp(s.x, e.x, alpha), 0, lerp(s.z, e.z, alpha)); v.root.rotation.y = lerp(s.yaw, e.yaw, alpha);
      const def = ENEMIES[e.kind], t = w.time + alpha * TICK + e.id * 1.7;
      const L = def.lunge, lunge = L && (e.lungeT ?? -1) >= 0 ? (e.lungeT < L.windup ? -(e.lungeT / L.windup) : 1) : 0;      // -1..0 crouch, 1 dash
      v.pose({ t, walk: e.walk, phase: e.phase, attack: e.attackT >= 0 ? e.attackT / def.attack.duration : 0, lunge, dead: e.dead, flash: e.flash });
    }
    for (const [id, v] of this.enemyViews) if (!seen.has(id)) { this.scene.remove(v.root); this.enemyViews.delete(id); }
    // pickups
    seen.clear();
    for (const it of w.pickups) {
      seen.add(it.id); let v = this.pickupViews.get(it.id);
      if (!v) { v = makePickup(it.kind, this.tex.props_atlas, this.tex.flarecannon_atlas); this.scene.add(v); this.pickupViews.set(it.id, v); }
      v.position.set(it.x, 0.18 + Math.sin(this.time * 2.2 + it.id) * 0.05 + (it.kind.startsWith('key') ? 0.25 : 0), it.z); v.rotation.y = this.time * 0.9 + it.id;
    }
    for (const [id, v] of this.pickupViews) if (!seen.has(id)) { this.scene.remove(v); this.pickupViews.delete(id); }
    // projectiles
    seen.clear(); let lead = null;
    for (const q of w.projectiles) {
      seen.add(q.id); let m = this.projViews.get(q.id); if (!m) { m = new THREE.Mesh(this.projGeo, this.projMat); this.scene.add(m); this.projViews.set(q.id, m); }
      m.position.set(q.x + q.vx * alpha * TICK, q.y + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK); lead = lead || m;
    }
    for (const [id, m] of this.projViews) if (!seen.has(id)) { this.scene.remove(m); this.projViews.delete(id); }
    this.flareLight.intensity = lead ? 40 : 0; if (lead) this.flareLight.position.copy(lead.position);
    // doors
    for (const d of w.doors) { const v = this.lvl.doorViews.get(d.cx + ',' + d.cz); if (v) v.position.y = d.open * (this.map.ceiling - 0.05); }
    // debris + explosion light
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += dt * 9; d.m.rotation.y += dt * 7;
      if (d.life <= 0 || d.m.position.y < 0) { this.scene.remove(d.m); this.debris.splice(i, 1); }
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
    const px = lerp(lerp(W.x, ADS_POSE.x, a), SPRINT_POSE.x, sp), py = lerp(lerp(W.y, rig.adsY, a), SPRINT_POSE.y, sp), pz = lerp(lerp(W.z, ADS_POSE.z, a), SPRINT_POSE.z, sp);
    rig.group.position.set(px + sway, py + Math.abs(sway) * 0.6 - r * 0.02 - this.deadT * 0.6 + dip, pz + r * 0.13);
    rig.group.rotation.set(-r * 0.12 + SPRINT_POSE.rx * sp, lerp(lerp(0.1, 0, a), SPRINT_POSE.ry, sp), SPRINT_POSE.rz * sp);
    rig.flash.visible = this.flashT > 0; if (rig.flash.visible) rig.flash.scale.setScalar(((shown === 'scattergun' ? 1.1 : 0.8) + this.rnd() * 0.6) * (1 - 0.55 * a));      // small in the sights: it must not hide the target
    if (rig.pump) { const ph = 0.9 - this.pumpT; rig.pump.position.z = ph > 0.3 && ph < 0.7 ? Math.sin(Math.PI * (ph - 0.3) / 0.4) * 0.09 : 0; }      // fore-end slides back and forward after a shot
    this.pumpT = Math.max(0, this.pumpT - dt);
    this.muzzleLight.intensity = this.flashT > 0 ? 6 : 0;
    this.post.uniforms.uDamage.value = p.hurt;
    this.post.render(() => { this.renderer.render(this.scene, this.cam); this.renderer.render(this.weaponScene, this.weaponCam); });
  }

  /** Release GPU resources owned by this view (textures are shared and owned by the app). */
  dispose() {
    for (const s of [this.scene, this.weaponScene]) s.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose()); } });
    this.debGeo.dispose(); this.debMat.dispose(); this.dustMat.dispose(); this.projGeo.dispose(); this.projMat.dispose();
    this.post.dispose();
    this.scene.clear(); this.weaponScene.clear();
  }
}
