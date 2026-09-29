// HUSHFALL look demo. NOT the game: a small playable slice to judge the painted-3D look.
// Sim runs at a fixed 60 Hz step; rendering is decoupled (see loop()).
import * as THREE from 'three';
import { loadAll } from './textures.js';
import { parseMap, buildLevel, blocked, los, S, H } from './level.js';
import { makeTollbearer, makeFlareCannon } from './models.js';
import { PostPass } from './post.js';

const NEAR = 0.1, FAR = 90, DT = 1 / 60;
const canvas = document.getElementById('c'), hud = document.getElementById('hud'), msg = document.getElementById('msg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1); renderer.autoClear = false;

// deterministic RNG so screenshots repeat
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const tex = await loadAll();
const map = parseMap();
const world = new THREE.Scene();
world.fog = new THREE.FogExp2(0x2a2244, 0.028);
const cam = new THREE.PerspectiveCamera(70, 16 / 9, NEAR, FAR); cam.rotation.order = 'YXZ';

world.add(new THREE.HemisphereLight(0x9fb4d0, 0x3a2a40, 2.4));
const sun = new THREE.DirectionalLight(0xd8b0e0, 1.3); sun.position.set(-8, 14, -6); world.add(sun);
const lvl = buildLevel(map, tex); world.add(lvl.group);
const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex.sky_dusk, side: THREE.BackSide, fog: false, depthWrite: false }));
sky.renderOrder = -1; world.add(sky);

// weapon overlay (own scene/camera; depth cleared so it never clips into walls)
const wScene = new THREE.Scene(); const wCam = new THREE.PerspectiveCamera(58, 16 / 9, NEAR, FAR);
wScene.add(new THREE.HemisphereLight(0x9fb8d0, 0x3a2a30, 1.5));
const wKey = new THREE.DirectionalLight(0xffe0b0, 1.6); wKey.position.set(-1, 1.5, 1); wScene.add(wKey);
const wFlashLight = new THREE.PointLight(0xffa040, 0, 4, 2); wFlashLight.position.set(0.1, 0, -0.9); wScene.add(wFlashLight);
const cannon = makeFlareCannon(tex.flarecannon_atlas);
const WPOS = new THREE.Vector3(0.2, -0.2, -0.46);
cannon.group.scale.setScalar(0.62); cannon.group.position.copy(WPOS); cannon.group.rotation.y = 0.1; wScene.add(cannon.group);

// keep the weapon in the near depth range instead of clearing depth, so the world depth survives for the ink-outline pass
const nearDepth = '#include <project_vertex>\n gl_Position.z = gl_Position.z * 0.05 - gl_Position.w * 0.95;';
cannon.group.traverse((o) => {
  if (!o.isMesh) return;
  o.material.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', nearDepth); };
  o.material.customProgramCacheKey = () => 'weapon-depth';
});

const post = new PostPass(renderer, tex.paper_grain, NEAR, FAR);
let internalW = 480;
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  cam.aspect = wCam.aspect = w / h; cam.updateProjectionMatrix(); wCam.updateProjectionMatrix();
  post.resize(internalW, Math.max(90, Math.round(internalW * h / w)));
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ state
const player = { x: map.start.x, z: map.start.z, yaw: -Math.PI / 2, pitch: 0, vx: 0, vz: 0, bob: 0, kick: 0, damage: 0, cooldown: 0, recoil: 0, flashT: 0 };
let enemies = [], projectiles = [], booms = [], debris = [], time = 0, shots = 0, kills = 0;
const flareLight = new THREE.PointLight(0xff9040, 0, 16, 2); world.add(flareLight);
const boomLight = new THREE.PointLight(0xffb060, 0, 20, 2); world.add(boomLight);
const projGeo = new THREE.IcosahedronGeometry(0.13, 0), projMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
const debGeo = new THREE.TetrahedronGeometry(0.09), debMat = new THREE.MeshBasicMaterial({ color: 0xff8a30 });

function spawnEnemies() {
  for (const e of enemies) world.remove(e.m.root);
  enemies = map.enemies.map((s) => {
    const m = makeTollbearer(tex.tollbearer_atlas); world.add(m.root);
    const e = { m, x: s.x, z: s.z, yaw: Math.PI, hp: 45, dead: 0, isDead: false, walk: 0, phase: rnd() * 6, attackT: -1, cd: 1, flash: 0, struck: false, t0: rnd() * 10 };
    m.root.position.set(e.x, 0, e.z); return e;
  });
}
spawnEnemies();

// ------------------------------------------------------------------ input
const keys = new Set(); let locked = false, lockFailed = false, hudOn = true, dragging = false;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code.startsWith('Digit')) setView(['hall', 'enemy', 'closeup', 'quay', 'pod'][Number(e.code.slice(5)) - 1]);
  if (e.code === 'KeyO') post.uniforms.uOutline.value = 1 - post.uniforms.uOutline.value;
  if (e.code === 'KeyP') post.uniforms.uPaint.value = 1 - post.uniforms.uPaint.value;
  if (e.code === 'KeyR') { spawnEnemies(); projectiles.length = 0; }
  if (e.code === 'KeyH') hudOn = !hudOn;
  if (e.code === 'BracketLeft') { internalW = Math.max(240, internalW - 80); resize(); }
  if (e.code === 'BracketRight') { internalW = Math.min(960, internalW + 80); resize(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; msg.textContent = locked ? '' : 'click to capture mouse · click again to fire'; });
document.addEventListener('pointerlockerror', () => { lockFailed = true; msg.textContent = 'pointer lock unavailable: drag to look, click to fire'; });
canvas.addEventListener('mousedown', () => {
  if (!locked && !lockFailed) { try { canvas.requestPointerLock(); } catch { lockFailed = true; } return; }
  dragging = true; fire();
});
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => {
  if (!locked && !(lockFailed && dragging)) return;
  player.yaw -= e.movementX * 0.0022; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - e.movementY * 0.0022));
});

// ------------------------------------------------------------------ views
const VIEWS = {
  hall: { pos: [4.2, 1.6, 24.4], target: [15, 1.3, 8] },
  enemy: { pos: [6.5, 1.6, 15], target: [13, 1.2, 11] },
  closeup: { pos: [10.4, 1.55, 12.2], target: [13, 1.35, 11] },
  quay: { pos: [21, 1.65, 14], target: [40, 2.2, 13] },
  pod: { pos: [9, 1.6, 12], target: [17, 1.5, 7] },
};
function lookAt(x, y, z, tx, ty, tz) { player.x = x; player.z = z; player.yaw = Math.atan2(-(tx - x), -(tz - z)); player.pitch = Math.atan2(ty - y, Math.hypot(tx - x, tz - z)); }
function setView(name) { const v = VIEWS[name]; if (!v) return; lookAt(...v.pos, ...v.target); player.vx = player.vz = 0; }

// ------------------------------------------------------------------ sim
function tryMove(o, dx, dz, r) { if (!blocked(map, o.x + dx, o.z, r)) o.x += dx; if (!blocked(map, o.x, o.z + dz, r)) o.z += dz; }
function forward() { return new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch)); }

function fire() {
  if (player.cooldown > 0) return;
  player.cooldown = 0.9; player.recoil = 1; player.flashT = 0.07; player.kick = 0.06; shots++;
  const f = forward(), right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const p = new THREE.Vector3(player.x, 1.6, player.z).addScaledVector(f, 0.7).addScaledVector(right, 0.16); p.y -= 0.14;
  const mesh = new THREE.Mesh(projGeo, projMat); mesh.position.copy(p); world.add(mesh);
  projectiles.push({ mesh, p, v: f.clone().multiplyScalar(24), life: 4 });
}

function explode(pos) {
  booms.push({ t: 0 }); boomLight.position.copy(pos); boomLight.userData.t = 0;
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(debGeo, debMat); m.position.copy(pos); world.add(m);
    debris.push({ m, v: new THREE.Vector3(rnd() - 0.5, rnd() * 0.9 + 0.3, rnd() - 0.5).multiplyScalar(7), life: 0.5 + rnd() * 0.4 });
  }
  for (const e of enemies) {
    if (e.isDead) continue;
    const d = Math.hypot(pos.x - e.x, pos.y - 1.0, pos.z - e.z);
    if (d < 3.4) {
      e.hp -= 70 * (1 - d / 3.4) + 12; e.flash = 1;
      if (e.hp <= 0) { e.isDead = true; e.attackT = -1; kills++; }
      const k = 0.8 * (1 - d / 3.4), nx = (e.x - pos.x) / (d || 1), nz = (e.z - pos.z) / (d || 1); tryMove(e, nx * k, nz * k, 0.4);
    }
  }
  if (Math.hypot(pos.x - player.x, pos.z - player.z) < 2.2) player.damage = Math.max(player.damage, 0.35);
}

function step(dt) {
  time += dt;
  // player
  const sp = 5.6, wish = new THREE.Vector2(0, 0);
  if (keys.has('KeyW')) wish.y += 1; if (keys.has('KeyS')) wish.y -= 1; if (keys.has('KeyD')) wish.x += 1; if (keys.has('KeyA')) wish.x -= 1;
  if (keys.has('ArrowLeft')) player.yaw += 2.2 * dt; if (keys.has('ArrowRight')) player.yaw -= 2.2 * dt;
  if (keys.has('ArrowUp')) player.pitch = Math.min(1.3, player.pitch + 1.6 * dt); if (keys.has('ArrowDown')) player.pitch = Math.max(-1.3, player.pitch - 1.6 * dt);
  if (wish.lengthSq() > 0) wish.normalize();
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const tvx = (fx * wish.y + rx * wish.x) * sp, tvz = (fz * wish.y + rz * wish.x) * sp, a = Math.min(1, dt * 14);
  player.vx += (tvx - player.vx) * a; player.vz += (tvz - player.vz) * a;
  tryMove(player, player.vx * dt, player.vz * dt, 0.32);
  const speed = Math.hypot(player.vx, player.vz); player.bob += speed * dt * 1.9;
  player.cooldown = Math.max(0, player.cooldown - dt); player.recoil = Math.max(0, player.recoil - dt * 4.5);
  player.flashT = Math.max(0, player.flashT - dt); player.kick = Math.max(0, player.kick - dt * 0.4); player.damage = Math.max(0, player.damage - dt * 1.2);

  // enemies
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt * 4);
    if (e.isDead) { e.dead = Math.min(1, e.dead + dt / 0.9); e.walk *= 0.9; continue; }
    const dx = player.x - e.x, dz = player.z - e.z, d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz); let dy = want - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const sees = d < 22 && los(map, e.x, e.z, player.x, player.z);
    if (sees && e.attackT < 0) e.yaw += Math.max(-3 * dt, Math.min(3 * dt, dy));
    e.cd = Math.max(0, e.cd - dt);
    if (e.attackT >= 0) {
      e.attackT += dt; const a2 = e.attackT / 1.5;
      if (a2 > 0.64 && !e.struck) { e.struck = true; if (d < 2.6) player.damage = 0.7; }
      if (a2 >= 1) { e.attackT = -1; e.cd = 0.9; e.struck = false; }
      e.walk *= 0.85;
    } else if (sees && d > 1.7) {
      const v = 1.2; tryMove(e, Math.sin(e.yaw) * v * dt, Math.cos(e.yaw) * v * dt, 0.4); e.walk = Math.min(1, e.walk + dt * 3); e.phase += dt * 5.2;
    } else {
      e.walk = Math.max(0, e.walk - dt * 3);
      if (sees && d <= 1.9 && e.cd <= 0) { e.attackT = 0; e.struck = false; }
    }
  }

  // projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i]; pr.life -= dt; pr.v.y -= 2.2 * dt;
    const n = Math.ceil(pr.v.length() * dt / 0.25); let hit = pr.life <= 0;
    for (let k = 0; k < n && !hit; k++) {
      pr.p.addScaledVector(pr.v, dt / n);
      const cx = Math.floor(pr.p.x / S), cz = Math.floor(pr.p.z / S);
      if (pr.p.y < 0.05 || (map.interior(pr.p.x, pr.p.z) && pr.p.y > H) || map.solid(cx, cz)) hit = true;
      for (const c of map.colliders) if (Math.hypot(pr.p.x - c.x, pr.p.z - c.z) < c.r && pr.p.y < 1.3) hit = true;
      for (const e of enemies) if (!e.isDead && Math.hypot(pr.p.x - e.x, pr.p.z - e.z) < 0.5 && pr.p.y > 0 && pr.p.y < 1.95) hit = true;
    }
    pr.mesh.position.copy(pr.p);
    if (hit) { explode(pr.p.clone()); world.remove(pr.mesh); projectiles.splice(i, 1); }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i]; d.life -= dt; d.v.y -= 16 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += dt * 9; d.m.rotation.y += dt * 7;
    if (d.life <= 0 || d.m.position.y < 0) { world.remove(d.m); debris.splice(i, 1); }
  }
  for (let i = booms.length - 1; i >= 0; i--) { booms[i].t += dt; if (booms[i].t > 0.5) booms.splice(i, 1); }
  const bt = booms.length ? Math.min(...booms.map((b) => b.t)) : 9;
  boomLight.intensity = bt < 0.5 ? 140 * Math.pow(1 - bt / 0.5, 2) : 0;
  flareLight.intensity = projectiles.length ? 40 : 0; if (projectiles.length) flareLight.position.copy(projectiles[0].p);
  for (const l of lvl.lights) {
    const b = l.userData.base, f = l.userData.flicker;
    l.intensity = f === 'pod' ? b * (0.8 + 0.2 * Math.sin(time * 2 + l.position.x)) : b * (0.93 + 0.05 * Math.sin(time * 13 + l.position.z) + 0.03 * Math.sin(time * 31));
  }
}

// ------------------------------------------------------------------ render
function updateVisuals() {
  const speed = Math.hypot(player.vx, player.vz), bobY = Math.sin(player.bob * 2) * 0.035 * Math.min(1, speed / 5);
  cam.position.set(player.x, 1.6 + bobY, player.z); cam.rotation.set(player.pitch + player.kick, player.yaw, 0);
  wCam.position.set(0, 0, 0); wCam.rotation.set(0, 0, 0);
  sky.position.copy(cam.position);
  for (const e of enemies) {
    e.m.root.position.set(e.x, 0, e.z); e.m.root.rotation.y = e.yaw;
    e.m.pose({ t: time + e.t0, walk: e.walk, phase: e.phase, attack: e.attackT >= 0 ? e.attackT / 1.5 : 0, dead: e.dead, flash: e.flash });
  }
  const r = player.recoil, sway = Math.sin(player.bob) * 0.008 * Math.min(1, speed / 5);
  cannon.group.position.set(WPOS.x + sway, WPOS.y + Math.abs(sway) * 0.6 - r * 0.02, WPOS.z + r * 0.13);
  cannon.group.rotation.set(-r * 0.12, 0.1, 0);
  cannon.flash.visible = player.flashT > 0; if (cannon.flash.visible) cannon.flash.scale.setScalar(0.8 + rnd() * 0.6);
  wFlashLight.intensity = player.flashT > 0 ? 6 : 0;
  post.uniforms.uDamage.value = player.damage;
}
function renderFrame() {
  updateVisuals();
  post.render(() => { renderer.render(world, cam); renderer.render(wScene, wCam); });
}

let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0, fps = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
  while (acc >= DT) { step(DT); acc -= DT; }
  renderFrame();
  fpsT += dt; fpsN++; if (fpsT > 0.5) { fps = Math.round(fpsN / fpsT); fpsT = 0; fpsN = 0; }
  hud.style.display = hudOn ? 'block' : 'none';
  if (hudOn) hud.textContent = `HUSHFALL look demo · ${fps} fps · internal ${post.uniforms.uRes.value.x}x${post.uniforms.uRes.value.y}\nWASD move · mouse look · click fire (flare cannon)\n1-5 viewpoints · O ink outline ${post.uniforms.uOutline.value ? 'ON' : 'off'} · P paint pass ${post.uniforms.uPaint.value ? 'ON' : 'off'} · [ ] resolution · R reset · H hide`;
  requestAnimationFrame(loop);
}
msg.textContent = 'click to capture mouse · click again to fire';
setView('hall');

// test hook (dev only): drives the real sim and renderer
window.__LOOK__ = {
  ready: true,
  setView, fire, renderFrame, hud(v) { hudOn = v; },
  aimAt(i) { const e = enemies[i]; lookAt(player.x, 1.6, player.z, e.x, 1.0, e.z); },
  advance(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n; i++) step(DT); renderFrame(); },
  state: () => ({ time, shots, kills, booms: booms.length, enemies: enemies.map((e) => ({ x: e.x, z: e.z, hp: e.hp, dead: e.isDead })), player: { x: player.x, z: player.z } }),
  set(k, v) { post.uniforms[k].value = v; },
};
requestAnimationFrame(loop);
