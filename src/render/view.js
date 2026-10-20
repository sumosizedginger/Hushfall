// GameView: read-only projection of sim state into a Three.js scene (+ weapon overlay + painterly post pass).
// It never mutates the world. Effects (explosions, muzzle flash) are driven by drained sim events.
import * as THREE from 'three';
import { makeHandLantern, makePickupOil } from './models_c2.js';
import { makeFlareCannon, makeScattergun, makePickup, makeCrate, makeBarrel } from './models.js';
import { makeSack } from './models_g2.js';
import { makeCarbine, makePickupCarbine } from './models_carbine.js';
import { makeLineThrower, makePickupRocket, makeRocketMesh } from './models_rocket.js';
import { makeFork, makePickupFork } from './models_fork.js';
import { makeMortar, makePickupMortar, makeBombMesh } from './models_mortar.js';
import { designate } from '../engine/mortar.js';
import { makeRivetDriver, makePickupRivet } from './models_rivet.js';
import { makeHarpoonRifle, makePickupHarpoon } from './models_harpoon.js';
import { makeArcLamp, makePickupArc } from './models_arc.js';
import { MELEE_MAKERS, makePickupMelee } from './models_melee.js';
import { weaponPose, meleePose, swingPhase, swingCamera, SwingClock, HIP_SCALE } from './weapon-pose.js';
import { FACTORIES as CHOIR } from './models_choir.js';
import { choirAtlasName } from './choir_cells.js';
import { markEntity, patchEntityFragment } from './entityflag.js';
import { buildLevel } from './levelmesh.js';
import { mergeStatic } from './merge.js';
import { debrisFloor, spawnGround } from './debris.js';
import { PostPass } from './post.js';
import { lightWeights } from './lightbudget.js';
import { beatGlow, zoneBeat } from '../engine/hive.js';
import { eyeColor } from './eyes.js';                                                                                    // PT-061 V8: eyes as state
import { makeCreatureFx } from './creaturefx.js';                                                                  // PT-060: the Marksman's line of light and the Mender's tether
import { makeHiveView } from './hivefx.js';                                                                       // PT-043: the Hive Cantor's threads, the Root Bell's chain and shadow, the spikes
import { DecalLayer } from './decals.js';
import { makeShield } from './shield.js';
import { graftStage } from './graftstage.js';
import { makeShadows } from './shadows.js';
import { HurtFlash } from './hurtflash.js';
import { decalsForEvent, decalsAtLoad } from './decalplace.js';
import { floorMarks, FLOORMARKS } from './floorscatter.js';
import { PLAYER, ENEMIES, WEAPONS, PHYS, TICK, VIEW, FLOW, VARIANTS, HIVE, LOOKS, lookOf } from '../engine/defs.js';
import { floorAt } from '../engine/terrain.js';
import { sporeState } from '../engine/breath.js';
import { makeVentView, updateVentView, makeLoadView, updateLoadView } from './airfx.js';
import { makeBeamView, makeSweepView } from './beamfx.js';
import { makeCarView } from './carfx.js';                                                                         // PT-045 (E8b): cars
import { makeTideView } from './tidefx.js';                                                                       // PT-045 (E12): the tide
import { makeBeltView } from './beltfx.js';                                                                       // PT-045 (E8a): clocked conveyors
import { makeChimeView } from './chimefx.js';
import { inVacuum } from '../engine/airlock.js';

// The ten creatures (look redesign L1, design/LOOK_BIBLE.md): models_choir.js, each in its own baked atlas `choir_<kind>`. The Tollbearer's graft GROWS with the episode: an early graft (a small bell) in Episode 1, the great bell from Episode 2 on (render only; the hit volume is the same at both stages, tests/hit-volume-fair.test.js checks both).
const ENEMY_MODELS = Object.fromEntries(Object.keys(CHOIR).map((kind) => [kind, (tex, map) => CHOIR[kind](tex[choirAtlasName(kind)], { stage: graftStage(map) })]));

const NEAR = 0.1, FAR = 170, LIGHT_BUDGET = 8, LIGHT_FADE = 3;      // the nearest LIGHT_BUDGET lamps are lit (a constant light count means no shader recompiles); the last one fades with how much nearer it is than the first one left out (LIGHT_FADE m), so a lamp never switches on or off in one frame
const lerp = (a, b, t) => a + (b - a) * t;
const freeRig = (root) => root.traverse((o) => { if (o.isMesh) o.geometry?.dispose(); });         // (geometry only: a rig's materials are cached and shared by its kind)
/** which builder draws a pickup (PT-022 added the carbine, the rocket line-thrower, the tuning-fork and the chainsaw) */
/** the Root Bell's clapper hangs on a pendulum: its lean in the rig's own axes (the top of the bell tilts toward the pivot, away from the side it is displaced to), and whether the Last Note has opened its heart */
const bellPose = (e, yaw) => {
  const rb = e.rb, hung = rb.mode === 'hung' && rb.t0 != null, phi = hung ? rb.phi ?? 0 : 0, dx = Math.cos(rb.theta ?? 0), dz = Math.sin(rb.theta ?? 0), c = Math.cos(yaw), s = Math.sin(yaw);
  return { tiltX: (c * dx - s * dz) * phi, tiltZ: (s * dx + c * dz) * phi, last: rb.last ? 1 : 0 };
};
const pickupMaker = (kind) => (kind === 'oil' ? () => makePickupOil() : /^weapon_(boathook|marlinspike|mallet|axe|chainsaw)$/.test(kind) ? (k, pt, wt) => makePickupMelee(k, wt) : kind === 'ammo_rivet' || kind === 'weapon_rivet' ? makePickupRivet : kind === 'ammo_bolt' || kind === 'weapon_harpoon' ? makePickupHarpoon : kind === 'ammo_cell' || kind === 'weapon_arc' ? makePickupArc
  : kind === 'ammo_round' || kind === 'weapon_carbine' ? makePickupCarbine : kind === 'ammo_rocket' || kind === 'weapon_linethrower' ? makePickupRocket : kind === 'weapon_fork' ? makePickupFork : kind === 'weapon_mortar' ? makePickupMortar : makePickup);

export class GameView {
  constructor(renderer, tex, map, world) {
    this.renderer = renderer; this.tex = tex; this.map = map; this.time = 0; this.deadT = 0; this.recoil = 0; this.flashT = 0; this.boomT = 9; this.hurtFlash = new HurtFlash();
    const scene = this.scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(new THREE.Color(map.atmosphere.fog), map.atmosphere.fogDensity);
    const hemi = this.hemi = new THREE.HemisphereLight(0x9fb4d0, 0x3a2a40, 2.4); scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xd8b0e0, 1.3); sun.position.set(-8, 14, -6); scene.add(sun);
    this.ambient = map.atmosphere.ambient ?? 1;       // dark levels (Signal House) dim the general light: the lamps carry the scene
    this.post = new PostPass(renderer, tex.paper_grain, NEAR, FAR); this.setPlace(lookOf(map.atmosphere));       // the place's light and grade (PT-021)
    const lvl = this.lvl = buildLevel(map, tex); scene.add(lvl.group);
    this.creatureFx = map.entities.some((q) => q.type === 'enemy' && (ENEMIES[q.kind]?.snipe || ENEMIES[q.kind]?.heal || ENEMIES[q.kind]?.node || ENEMIES[q.kind]?.boss)) ? makeCreatureFx(scene) : null;          // PT-060
    this.hiveView = map.entities.some((q) => q.type === 'enemy' && (ENEMIES[q.kind]?.unison || q.kind === 'rootbell')) ? makeHiveView(scene) : null;       // PT-043: made with the view when the map has a conductor or a clapper (the clapper's light must not change the scene's light count in a fight)
    this.world = world; this.decals = new DecalLayer(tex.decals_atlas); scene.add(this.decals.mesh);       // marks that stay (PT-021): what the map started with, then what the events leave
    if (tex.decals_floor_atlas && !map.noFloorMarks) { this.floorMarks = new DecalLayer(tex.decals_floor_atlas, { rings: { [FLOORMARKS.ring]: FLOORMARKS.cap }, emissive: 0x141414, order: 0.5 }); this.floorMarks.addAll(floorMarks(map)); scene.add(this.floorMarks.mesh); }          // PT-063 (V6b, "floors are flat"): what a floor is made of decides the marks it carries (floorscatter.js), under the blood
    { let s = 12345; this.decals.addAll(decalsAtLoad(map, () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; })); }
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex['sky_' + (map.atmosphere.sky ?? 'dusk')] ?? tex.sky_dusk, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1; scene.add(this.sky);
    { const below = tex['sky_' + (map.atmosphere.sky ?? 'dusk') + '_below'];                                          // PT-032: a map with open sky has a lower dome too: the world beneath the feet
      if (map.hasVoid && below) { this.skyBelow = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ map: below, side: THREE.BackSide, fog: false, depthWrite: false })); this.skyBelow.renderOrder = -1; scene.add(this.skyBelow); }
      this.ventViews = map.vents.map((v) => { const vv = makeVentView(map, v, map.floor(v.at[0], v.at[1])); scene.add(vv.group); return vv; });        // the launch plates
      this.loadViews = map.loads.map((L) => { const lv = makeLoadView(map, L, map.floor(L.rect[0], L.rect[1])); scene.add(lv.group); return lv; });      // the falling loads
      this.carView = map.cars.length ? makeCarView(map) : null; if (this.carView) scene.add(this.carView.group);          // PT-045 (E8b): the cars that ride the loop
      this.tideView = map.tide ? makeTideView(map, tex) : null; if (this.tideView) scene.add(this.tideView.group);          // PT-045 (E12): the sea that rises and falls on the clock
      this.beltView = map.belts.length ? makeBeltView(map) : null; if (this.beltView) scene.add(this.beltView.group);          // PT-045 (E8a): the conveyors on a clock
      this.chimeView = map.props.some((q) => q.kind === 'chime' || q.kind === 'chimetree') ? makeChimeView(map) : null; if (this.chimeView) scene.add(this.chimeView.group);          // PT-038 (E6): the chimes and the tree
      this.beamView = map.emitters.length || map.mirrors.length ? makeBeamView(map, tex) : null; if (this.beamView) scene.add(this.beamView.group);
      this.sweepView = map.entities.some((q) => q.type === 'enemy' && ENEMIES[q.kind]?.sweep) ? makeSweepView() : null; if (this.sweepView) scene.add(this.sweepView.group);          // PT-033: the Gate Warden's beam              // PT-033: the Mirror Array's emitters, mirrors, receivers and the light between them
      this.airK = 0; }
    this.cam = new THREE.PerspectiveCamera(70, 16 / 9, NEAR, FAR); this.cam.rotation.order = 'YXZ';
    this.flareLight = new THREE.PointLight(0xff9040, 0, 16, 2); this.boomLight = new THREE.PointLight(0xffb060, 0, 20, 2); scene.add(this.flareLight, this.boomLight);
    // weapon overlay
    const ws = this.weaponScene = new THREE.Scene(); this.weaponCam = new THREE.PerspectiveCamera(58, 16 / 9, NEAR, FAR);
    const wHemi = this.weaponHemi = new THREE.HemisphereLight(0x9fb8d0, 0x3a2a30, 1.5); ws.add(wHemi); const key = this.weaponKey = new THREE.DirectionalLight(0xffe0b0, 1.6); key.position.set(-1, 1.5, 1); ws.add(key);          // PT-061 V3: the held gun wears the PLACE's light (setPlace scales these two, with a floor so it is never lost)
    this.setPlace(this.look);
    this.muzzleLight = new THREE.PointLight(0xffa040, 0, 4, 2); this.muzzleLight.position.set(0.1, 0, -0.9); ws.add(this.muzzleLight);
    if (map.lantern) { this.handLamp = new THREE.PointLight(0xffc070, 0, 22, 1.5); scene.add(this.handLamp); this.lampK = 0; this.lampModel = makeHandLantern(); this.lampModel.scale.setScalar(0.72); this.lampModel.position.set(-0.4, -0.3, -0.62); ws.add(this.lampModel); }          // PT-038 (E5): the hand lantern: one warm light that rides with the eye (it is in the scene for the whole level, at strength 0 when out: a constant light count means no shader recompile) and a brass lantern held low at the left of the weapon view
    this.WPOS = new THREE.Vector3(0.2, -0.2, -0.46);
    const gt = tex.guns_atlas; this.rigs = { flare: makeFlareCannon(tex.flarecannon_atlas, gt), scattergun: makeScattergun(tex.flarecannon_atlas, gt), rivet: makeRivetDriver(tex.flarecannon_atlas, gt), harpoon: makeHarpoonRifle(tex.flarecannon_atlas, gt), arc: makeArcLamp(tex.flarecannon_atlas, gt), carbine: makeCarbine(tex.flarecannon_atlas, gt), linethrower: makeLineThrower(tex.flarecannon_atlas, gt), fork: makeFork(tex.flarecannon_atlas, gt), mortar: makeMortar(tex.flarecannon_atlas, gt), ...Object.fromEntries(Object.entries(MELEE_MAKERS).map(([id, make]) => [id, make(tex.flarecannon_atlas)])) };      // + fists and the found melee weapons (models_melee.js)
    this.cine = null;                                                                                                   // PT-063 (R13): a story scene's camera pose { x, y, z, yaw, pitch, fov } while one plays (setCinematic); render only
    this.swingAlt = false; this.hitKick = 0; this.parryT = 9; this.motes = []; this.lastCharge = 0;
    this.vm = new SwingClock(); this.lag = { x: 0, y: 0 }; this.lastLook = null;      // PT-020: the swing's own clock (a freeze on contact: view only), the view model trailing a turning view
    for (const rig of Object.values(this.rigs)) { rig.group.scale.setScalar(HIP_SCALE); rig.group.position.copy(this.WPOS); rig.group.visible = false; ws.add(rig.group); }
    this.targetWeapon = world.player.weapon; this.prevWeapon = world.player.weapon; this.pumpT = 0;
    const nearDepth = '#include <project_vertex>\n gl_Position.z = gl_Position.z * 0.05 - gl_Position.w * 0.95;';   // weapon stays in the near depth range so world depth survives for the outline pass
    for (const rig of Object.values(this.rigs)) rig.group.traverse((o) => { if (!o.isMesh) return; const m = o.material; m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', nearDepth); if (!m.transparent) patchEntityFragment(s); }; m.customProgramCacheKey = () => 'weapon-depth'; });       // the weapon keeps the classic ink too (entityflag.js)
    this.enemyViews = new Map(); this.pickupViews = new Map(); this.projViews = new Map(); this.debris = [];
    this.prev = { player: { x: 0, z: 0, yaw: 0, pitch: 0 }, enemies: new Map() };
    this.seed = 99; this.debGeo = new THREE.TetrahedronGeometry(0.09); this.debMat = new THREE.MeshBasicMaterial({ color: 0xff8a30 }); this.dustMat = new THREE.MeshBasicMaterial({ color: 0x9a8a72 });
    this.projGeo = new THREE.IcosahedronGeometry(0.13, 0); this.projMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    this.shotGeo = new THREE.IcosahedronGeometry(0.17, 1); this.shotRing = new THREE.TorusGeometry(0.3, 0.025, 4, 14); this.shotMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0 }); this.shotViews = new Map();      // Bellhand toll-shots: teal, slow, readable
    // Gate 2 effects: channel beams and node links (thin teal cylinders), the Cantor's shield, expanding tone-pulse rings
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); this.beamMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.55, depthWrite: false }); this.beams = new Map();
    this.ringGeo = new THREE.RingGeometry(0.94, 1.0, 72); this.pulseViews = new Map();
    this.tearGeo = new THREE.IcosahedronGeometry(0.36, 1); this.tearMat = new THREE.MeshBasicMaterial({ color: 0xffd468 }); this.tearCoreGeo = new THREE.IcosahedronGeometry(0.17, 0); this.tearCoreMat = new THREE.MeshBasicMaterial({ color: 0xfffbe6 }); this.tearViews = new Map(); this.poolGeo = new THREE.CircleGeometry(1, 28); this.poolViews = new Map();
    this.wardViews = new Map(); this.wardRingMat = new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }); this.wardDiscMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });      // PT-029: the floor ring of an awake Acolyte's ward       // PT-028: a Weeping Mother's tears in the air and the pools they leave
    this.streakMat = new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.85, depthWrite: false }); this.arcMat = new THREE.MeshBasicMaterial({ color: 0x3fffe0, transparent: true, opacity: 0.95, depthWrite: false }); this.arcs = []; this.arcLife = 0.09; this.lampLight = new THREE.PointLight(0x6ffff0, 0, 14, 2); scene.add(this.lampLight);       // the lamp's lightning (jagged teal segments, 0.09 s) and the glow it throws on the level (the light is always in the scene: a constant light count means no shader recompiles)
    this.stuckGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.0, 6); this.stuckMat = new THREE.MeshLambertMaterial({ color: 0xaab8bc, emissive: 0x1a3a38 }); this.bolts = [];      // the harpoon's streak (a thin teal line, 0.22 s) and the bolt it leaves standing in a wall (12 s, the newest 24)
    this.burnDisc = new THREE.CircleGeometry(1, 24); this.flameGeo = new THREE.ConeGeometry(0.2, 0.75, 6); this.burnViews = new Map(); this.burnLight = new THREE.PointLight(0xff8a30, 0, 14, 2); scene.add(this.burnLight);
    this.moteGeo = new THREE.IcosahedronGeometry(0.05, 0); this.moteMat = new THREE.MeshBasicMaterial({ color: 0x7ffff0 }); this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0 }); this.emberMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a }); this.frostMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff });          // PT-056: embers off a creature alight, frost off a chilled one       // the Vael's light going out of a body; the spark of a blow
    // PT-022: the rocket's light and smoke, the gravity tool's beam / shock rings / movable props, and what a boom's size does
    this.rocketLight = new THREE.PointLight(0xff9a40, 0, 16, 2); scene.add(this.rocketLight); this.puffGeo = new THREE.IcosahedronGeometry(0.16, 0); this.puffMat = new THREE.MeshBasicMaterial({ color: 0xa8a29a, transparent: true, opacity: 0.55, depthWrite: false }); this.puffs = [];
    this.woodMat = new THREE.MeshBasicMaterial({ color: 0x8a6a3a }); this.shocks = []; this.shockGeo = new THREE.TorusGeometry(1, 0.03, 4, 28); this.shockMat = new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    this.physViews = new Map(); this.tractor = null; this.puntT = 9; this.boomK = 1;
    this.shadows = makeShadows(); this.scene.add(this.shadows.mesh);                                // PT-035: a soft contact shadow under every live creature (shadows.js: one instanced mesh)
    this.shield = null; this.shieldFlash = 0; this.ripples = [];       // the boss's shield is bands of plates (shield.js), and a hit it absorbs sends a ring of sound out
    this.beforeStep(world);
  }
  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  setSize(w, h, internalW) { this.renderer.setSize(w, h, false); this.cam.aspect = this.weaponCam.aspect = w / h; this.cam.updateProjectionMatrix(); this.weaponCam.updateProjectionMatrix(); this.post.resize(internalW, Math.max(90, Math.round(internalW * h / w))); }
  setLook({ outline, paint, fov = VIEW.fov, brightness = 1 }) {
    this.post.uniforms.uOutline.value = outline ? 1 : 0; this.post.uniforms.uPaint.value = paint ? 1 : 0; this.brightness = brightness; this.post.uniforms.uExposure.value = 2.2 * brightness * (this.exposureK ?? 1);       // the player's brightness setting times the place's exposure
    this.baseFov = fov; this.adsFov = fov * (VIEW.adsFov / VIEW.fov);                                                      // aiming keeps the same zoom ratio at any field of view
  }

  /** PT-043 (the Preview): a dev map may list `lookZones: [{ rect: [x0, z0, x1, z1], look, sky?, fog?, fogDensity? }]` (cells): the room the player stands in is lit and graded by that look and wears its sky and fog; elsewhere the map's own */
  applyZone(zones, p) {
    const cx = Math.floor(p.x / this.map.cell), cz = Math.floor(p.z / this.map.cell); let z = null;
    for (const q of zones) if (cx >= q.rect[0] && cx <= q.rect[2] && cz >= q.rect[1] && cz <= q.rect[3]) { z = q; break; }
    const id = z ? z.look + '|' + (z.sky ?? '') : '';
    if (id === this.zoneId) return; this.zoneId = id;
    const look = LOOKS[z?.look ?? this.map.atmosphere.look] ?? LOOKS.harbour; this.setPlace(look);
    const fog = z?.fog ?? this.map.atmosphere.fog, dens = z?.fogDensity ?? this.map.atmosphere.fogDensity; this.scene.fog.color.set(fog); this.scene.fog.density = dens;
    const skyTex = this.tex['sky_' + (z?.sky ?? this.map.atmosphere.sky ?? 'dusk')] ?? this.tex.sky_dusk; if (this.sky.material.map !== skyTex) { this.sky.material.map = skyTex; this.sky.material.needsUpdate = true; }
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
    const dctx = { map: this.map, ex: this.cam.position.x, ez: this.cam.position.z, rnd: () => this.rnd(), kindAt: (x, z) => { let best = null, bd = 2.5; for (const en of this.world?.enemies ?? []) { const d = Math.hypot(en.x - x, en.z - z); if (d < bd) { bd = d; best = en.kind; } } return best; } };
    for (const e of events) {
      if (e.type === 'hurt') this.hurtFlash.hit(e.amount);                                                          // PT-047 V1: the screen flash follows the size of the hit (hurtflash.js); p.hurt stays sim state
      for (const spec of decalsForEvent(e, dctx)) this.decals.add(spec);                                          // a hit, a death, a blast, a bullet: the room keeps it
      if (e.type === 'fire') {
        const sg = e.weapon === 'scattergun', rv = e.weapon === 'rivet', hp = e.weapon === 'harpoon', ar = e.weapon === 'arc', cb = e.weapon === 'carbine', lt = e.weapon === 'linethrower' || e.weapon === 'mortar', ch = e.charge ?? 0; this.recoil = sg && e.mod === 'doublebarrel' ? 2.6 : sg ? 1.6 : rv ? 0.35 : hp ? 2.2 : cb ? 0.5 : lt ? 2.6 : ar ? 0.15 + 1.4 * ch : 1; this.flashT = sg ? 0.09 : rv ? 0.045 : cb ? 0.04 : lt ? 0.1 : ar ? 0.07 + 0.12 * ch : 0.07; if (sg || hp) this.pumpT = 0.9; if (rv || hp || lt) this.spinKick = 1;
        this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, sg ? 0.3 : hp ? 0.42 : rv ? 0.05 : cb ? 0.08 : lt ? 0.55 : ar ? 0.06 + 0.5 * ch : 0.2); this.shakeT = Math.max(this.shakeT || 0, sg || hp || lt ? 0.3 : ar && ch > 0 ? 0.35 : 0.14);                // the kick: heavy guns shake the view, the rivets barely
        this.muzzleLight.color.setHex(e.load === 'slag' ? 0xff7a2a : e.load === 'rime' ? 0x9fdcff : e.load === 'pen' ? 0xfff2c8 : sg ? 0xffc070 : rv ? 0xffe090 : cb ? 0xffd090 : lt ? 0xff9030 : hp ? 0xcffff0 : ar ? 0x6ffff0 : 0xff9040);                      // each gun lights the room its own colour (a load its own: PT-056)
      }
      else if (e.type === 'snipe_shot') this.creatureFx?.shot(e);                                                      // PT-060: the line that was fired stays bright for a tenth of a second
      else if (e.type === 'swing') { this.swingAlt = e.kind === 'jab' ? !this.swingAlt : this.swingAlt; this.vm.start(e.kind, e.tick * TICK); }
      else if (e.type === 'melee_hit') {
        this.vm.hit(e.kind, e.killed);                                                                                   // the weapon sticks in the body for a moment (the view model only)
        this.hitKick = e.kind === 'heavy' || e.kind === 'axe' || e.kind === 'mallet' ? 1.4 : 0.8; this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, this.hitKick * 0.45); this.shakeT = Math.max(this.shakeT || 0, 0.25);
        for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(this.debGeo, this.sparkMat); m.scale.setScalar(0.5); m.position.set(e.x, 1.1, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.7 + 0.2, this.rnd() - 0.5).multiplyScalar(4.5), life: 0.25 + this.rnd() * 0.2 }); }
      }
      else if (e.type === 'parry') { this.parryT = 0; this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.5); this.shakeT = Math.max(this.shakeT || 0, 0.3); for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(this.debGeo, this.sparkMat); m.scale.setScalar(0.6); m.position.set(e.x, 1.3, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.9 + 0.2, this.rnd() - 0.5).multiplyScalar(6), life: 0.3 + this.rnd() * 0.25 }); } }
      else if (e.type === 'block' || e.type === 'guard_break') { this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, e.type === 'block' ? 0.25 : 0.7); this.shakeT = Math.max(this.shakeT || 0, 0.25); }
      else if (e.type === 'enemy_died') { for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(this.moteGeo, this.moteMat); m.position.set(e.x + (this.rnd() - 0.5) * 0.5, 0.6 + this.rnd() * 1.0, e.z + (this.rnd() - 0.5) * 0.5); this.scene.add(m); this.motes.push({ m, v: new THREE.Vector3((this.rnd() - 0.5) * 0.6, 0.6 + this.rnd() * 0.9, (this.rnd() - 0.5) * 0.6), life: 0.9 + this.rnd() * 0.7, max: 1.6 }); } }
      else if (e.type === 'vent_launch') { this.flashT = 0.1; this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.3); this.shakeT = Math.max(this.shakeT || 0, 0.22); const vv = this.ventViews?.find((q) => Math.hypot(q.group.position.x - e.x, q.group.position.z - e.z) < 2.5); if (vv) vv.flash = 1; }
      else if (e.type === 'air_land') { const k = Math.min(1, (e.speed ?? 0) / 5); this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.12 + 0.3 * k); this.shakeT = Math.max(this.shakeT || 0, 0.22); }
      else if (e.type === 'void_fall') { this.flashT = 0.18; this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.5); this.shakeT = Math.max(this.shakeT || 0, 0.4); }
      else if (e.type === 'load_land') {
        const d = Math.hypot(this.cam.position.x - e.x, this.cam.position.z - e.z), k = Math.max(0, 1 - d / 40); this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.9 * k); this.shakeT = Math.max(this.shakeT || 0, 0.5 * k + 0.05);
        for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(this.debGeo, this.dustMat); m.scale.setScalar(2.2); m.position.set(e.x + (this.rnd() - 0.5) * 5, (e.y ?? 0) + 0.3, e.z + (this.rnd() - 0.5) * 5); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.5 + 0.1, this.rnd() - 0.5).multiplyScalar(5), life: 0.5 + this.rnd() * 0.5 }); }
      }
      else if (e.type === 'pin') { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(this.debGeo, this.dustMat); m.position.set(e.x, 1.2, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.6 + 0.1, this.rnd() - 0.5).multiplyScalar(3.4), life: 0.3 + this.rnd() * 0.2 }); } }
      else if (e.type === 'shield_hit') { this.shieldFlash = 1; const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(e.x, this.shield ? this.shield.group.position.y : 2.2, e.z); m.scale.setScalar(1.4); this.scene.add(m); this.ripples.push({ m, t: 0 }); }       // the hit was absorbed: the plates flare and a ring of sound goes out
      else if (e.type === 'headshot') { for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(this.debGeo, this.sparkMat); m.scale.setScalar(0.45); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.8 + 0.3, this.rnd() - 0.5).multiplyScalar(4), life: 0.22 + this.rnd() * 0.2 }); } }
      else if (e.type === 'grav_punt') { this.puntT = 0; this.flashT = 0.14; this.addShock(1.4); this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, e.hit ? 0.28 : 0.1); this.shakeT = Math.max(this.shakeT || 0, 0.18); this.muzzleLight.color.setHex(0x9ffff0); }
      else if (e.type === 'shot_reflect') { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(this.debGeo, this.moteMat); m.scale.setScalar(0.6); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() - 0.2, this.rnd() - 0.5).multiplyScalar(5), life: 0.25 + this.rnd() * 0.2 }); } }
      else if (e.type === 'phys_hit' || e.type === 'shove_impact') { for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(this.debGeo, e.type === 'phys_hit' ? this.woodMat : this.dustMat); m.scale.setScalar(0.7); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.7 + 0.2, this.rnd() - 0.5).multiplyScalar(4.5), life: 0.3 + this.rnd() * 0.25 }); } this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.25); this.shakeT = Math.max(this.shakeT || 0, 0.18); }
      else if (e.type === 'phys_break') { for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(this.debGeo, this.woodMat); m.scale.setScalar(1.1); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.9 + 0.3, this.rnd() - 0.5).multiplyScalar(6), life: 0.5 + this.rnd() * 0.4 }); } }
      else if (e.type === 'saw_hit' || e.type === 'saw_kick') { const k = e.type === 'saw_kick' ? 7 : 2; for (let i = 0; i < k; i++) { const m = new THREE.Mesh(this.debGeo, this.sparkMat); m.scale.setScalar(0.4); m.position.set(e.x, e.y ?? 1.1, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.6 + 0.1, this.rnd() - 0.5).multiplyScalar(4.5), life: 0.18 + this.rnd() * 0.15 }); } this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, e.type === 'saw_kick' ? 0.4 : 0.1); this.shakeT = Math.max(this.shakeT || 0, 0.12); }
      else if (e.type === 'bolt') this.addBolt(e);
      else if (e.type === 'arc') this.addArc(e);
      else if (e.type === 'impact') {
        for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(this.debGeo, this.dustMat); m.scale.setScalar(0.6); m.position.set(e.x, e.y, e.z); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.6 + 0.2, this.rnd() - 0.5).multiplyScalar(2.6), life: 0.3 + this.rnd() * 0.2 }); }
      }
      else if (e.type === 'shake') { this.shakeT = 0.5; this.shakeAmp = e.amount ?? 1; }
      else if (e.type === 'suppress') { this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, 0.22); this.shakeT = Math.max(this.shakeT || 0, 0.2); }          // a round went by close (PT-026): a little jolt
      else if (e.type === 'explode') {
        this.boomT = 0; this.boomK = (e.r ?? 3.4) / 3.4; this.boomLight.position.set(e.x, e.y, e.z); { const d = Math.hypot(e.x - this.cam.position.x, e.z - this.cam.position.z), amp = Math.max(0, 1 - d / (16 * this.boomK)) * 0.8 * Math.min(1.6, this.boomK); if (amp > 0.03) { this.shakeAmp = Math.max(this.shakeT > 0 ? this.shakeAmp : 0, amp); this.shakeT = Math.max(this.shakeT || 0, 0.4); } }
        for (let i = 0, n = Math.round(14 * this.boomK); i < n; i++) {
          const m = new THREE.Mesh(this.debGeo, this.debMat); m.position.set(e.x, e.y, e.z); this.scene.add(m);
          this.debris.push({ m, v: new THREE.Vector3(this.rnd() - 0.5, this.rnd() * 0.9 + 0.3, this.rnd() - 0.5).multiplyScalar(7), life: 0.5 + this.rnd() * 0.4 });
        }
      }
    }
  }

  /** the last node is gone: the shield's plates are thrown off and fall */
  shedShield() {
    const c = this.shield.group.position, R = this.shield.group.scale.x;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, m = new THREE.Mesh(this.debGeo, this.moteMat); m.scale.setScalar(2.2); m.position.set(c.x + Math.cos(a) * R, c.y + (this.rnd() - 0.5) * 1.4, c.z + Math.sin(a) * R); this.scene.add(m); this.debris.push({ m, v: new THREE.Vector3(Math.cos(a) * 3, 1.5 + this.rnd() * 2, Math.sin(a) * 3), life: 0.9 + this.rnd() * 0.5 }); }
  }

  /** the punt's shock: a teal ring a little ahead of the eye that opens out and fades (view only) */
  addShock(r0) {
    const m = new THREE.Mesh(this.shockGeo, this.shockMat.clone()), yaw = this.cam.rotation.y, pitch = this.cam.rotation.x, f = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
    m.position.set(this.cam.position.x + f[0] * 1.6, this.cam.position.y + f[1] * 1.6 - 0.1, this.cam.position.z + f[2] * 1.6); m.rotation.set(pitch, yaw, 0); m.scale.setScalar(r0 * 0.3); this.scene.add(m); this.shocks.push({ m, t: 0 });
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

  /** PT-027: while the mortar is in hand a ring on the ground says where the shell will land (the sim's own `designate`, so it cannot disagree): a broad ring the size of the blast and a small mark in the middle; amber, dimmer when the minimum range pushed it out */
  /** a variant of a creature (the Drowned, VARIANTS in defs.js) wears its kind's rig with every material multiplied by the variant's tint; the tinted copies are cached per material and variant (a crowd of fifty shares them) and disposed with the view */
  tintRig(root, variant) {
    const tint = new THREE.Color(VARIANTS[variant].tint), cache = (this.tintCache ??= new Map());
    const tinted = (m) => { if (!m?.color) return m; const k = variant + ':' + m.uuid; let n = cache.get(k); if (!n) { n = m.clone(); n.color.multiply(tint); cache.set(k, n); } return n; };
    root.traverse((o) => { if (o.material) o.material = Array.isArray(o.material) ? o.material.map(tinted) : tinted(o.material); });
  }
  updateMortarRing(w) {
    const p = w.player, on = p.weapon === 'mortar' && p.hp > 0 && w.status === 'playing';
    if (!on) { if (this.aimRing) this.aimRing.visible = false; return; }
    if (!this.aimRing) {
      const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
      const R = WEAPONS.mortar.splash, ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.12, R, 40), mat), mark = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 20), mat), cross = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.07, 8), mat);
      for (const m of [ring, mark, cross]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 6; g.add(m); } g.userData.mat = mat; this.aimRing = g; this.scene.add(g);
    }
    const s = designate(w, p, WEAPONS.mortar); this.aimRing.visible = true; this.aimRing.position.set(s.x, s.y + 0.06, s.z);
    this.aimRing.userData.mat.opacity = (s.clamped ? 0.3 : 0.55) + 0.12 * Math.sin(this.time * 6); this.aimRing.userData.mat.color.setHex(s.clamped ? 0xc86a3a : 0xffa040);
  }

  /** PT-063 (R13): a story scene's camera pose { x, y, z, yaw, pitch, fov? } (cinematics.js `cameraAt`), or null to give the eye back to the player. The held weapon is not drawn while it is set. Render only. */
  setCinematic(pose) { this.cine = pose ?? null; }

  render(w, alpha, dt) {
    this.time += dt; const p = w.player, pp = this.prev.player;
    // the swing's own clock: render time since the swing began, minus the time the view model was held at the contact (a view-only hit-stop; the simulation never sees it, and a pause or the wheel's slowed time hold it too)
    let ph = this.vm.sample(w.time + alpha * TICK), sk = this.vm.kind ?? p.swingKind;
    if (!ph) ph = (p.swingT ?? -1) >= 0 && p.swingKind ? swingPhase(p.swingKind, p.swingT + alpha * TICK) : { a: 0, b: 0, c: 0, h: 0, on: false };      // (a swing the view never saw begin, a loaded save: follow the simulation)
    const ck = swingCamera(sk, ph), lookYaw = lerp(pp.yaw, p.yaw, alpha), lookPitch = lerp(pp.pitch, p.pitch, alpha);
    if (this.lastLook && dt > 0) {                                                                                     // the view model trails a turning view
      let dy = lookYaw - this.lastLook[0]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const vy = Math.max(-5, Math.min(5, dy / dt)), vp = Math.max(-5, Math.min(5, (lookPitch - this.lastLook[1]) / dt)), k = Math.min(1, dt * 11);
      this.lag.x += (Math.max(-0.07, Math.min(0.07, vy * 0.016)) - this.lag.x) * k; this.lag.y += (Math.max(-0.05, Math.min(0.05, -vp * 0.012)) - this.lag.y) * k;
    }
    this.lastLook = [lookYaw, lookPitch];
    // camera (interpolated)
    const speed = Math.hypot(p.vx, p.vz), bob = Math.sin(p.bob * 2) * 0.035 * Math.min(1, speed / PLAYER.speed);
    let eye = PLAYER.eye + bob, roll = 0;
    if (w.status === 'dead') { this.deadT = Math.min(1, this.deadT + dt / 0.8); eye = lerp(PLAYER.eye, 0.35, this.deadT); roll = this.deadT * 0.5; } else this.deadT = 0;
    this.eyeBase += ((p.y ?? 0) - this.eyeBase) * Math.min(1, dt * 14);                                            // stairs and lifts glide the camera instead of popping it
    let sx = 0, sy = 0; if (this.shakeT > 0) { this.shakeT = Math.max(0, this.shakeT - dt); const k = this.shakeAmp * (this.shakeT / 0.5); sx = (this.rnd() - 0.5) * 0.12 * k; sy = (this.rnd() - 0.5) * 0.09 * k; }
    this.cam.position.set(lerp(pp.x, p.x, alpha) + sx, this.eyeBase + eye + sy, lerp(pp.z, p.z, alpha));
    if (this.cine) this.cam.position.set(this.cine.x + sx, this.cine.y + sy, this.cine.z);                               // a story scene owns the eye (the hand lantern's light below follows it)
    if (this.handLamp) {                                                                                                // PT-038: the lantern's light follows the eye, fades in and out in a fifth of a second, flickers, and sinks as the oil runs low
      const L = p.lamp, on = L?.on ? 1 : 0, low = L && !L.eternal && L.oil < 10 ? 0.45 + 0.055 * L.oil : 1; this.lampK += (on - this.lampK) * Math.min(1, dt * 9);
      const fl = 1 + 0.07 * Math.sin(this.time * 13.1) + 0.05 * Math.sin(this.time * 7.7 + 1) + 0.03 * Math.sin(this.time * 31);
      this.handLamp.intensity = 17 * this.lampK * fl * low; this.handLamp.position.set(this.cam.position.x, this.cam.position.y - 0.15, this.cam.position.z);
      const m = this.lampModel; m.userData.core.color.setScalar(0.35 + 0.65 * this.lampK * low); m.userData.flame.scale.setScalar(0.5 + 0.55 * this.lampK * fl); m.position.y = -0.3 + 0.012 * Math.sin(this.time * 1.9) - 0.05 * (1 - this.lampK); m.rotation.z = 0.05 * Math.sin(this.time * 1.3);
    }
    this.cam.rotation.set(lookPitch + p.kick + ck.pitch, lookYaw, roll + ck.roll); if (this.cine) this.cam.rotation.set(this.cine.pitch, this.cine.yaw, 0);                                      // (ck: the camera's own kick in a swing, see FEEL in weapon-pose.js)
    this.airK += ((w.player.air ? 1 : 0) - this.airK) * Math.min(1, dt * 6);                                                // PT-032: the view opens a little in the air
    const adsFov = (this.baseFov ?? VIEW.fov) * ((WEAPONS[p.weapon].adsFov ?? VIEW.adsFov) / VIEW.fov), fov = lerp(this.baseFov ?? VIEW.fov, adsFov, p.ads) + VIEW.sprintFovKick * p.sprint + 5 * this.airK - 4 * Math.max(0, 1 - this.parryT / 0.2) - 1.6 * this.hitKick;       // zoom for the sights (the harpoon rifle zooms in much further), a little stretch for sprint
    const fovNow = this.cine ? (this.cine.fov ?? this.baseFov ?? VIEW.fov) : fov; if (Math.abs(this.cam.fov - fovNow) > 0.01) { this.cam.fov = fovNow; this.cam.updateProjectionMatrix(); }
    this.sky.position.copy(this.cam.position); this.skyBelow?.position.copy(this.cam.position);
    if (this.map.lookZones) this.applyZone(this.map.lookZones, w.player);                                      // PT-043: a dev map's rooms are lit by their own look
    this.decals.update(dt);
    { const want = w.ambient ?? this.map.atmosphere.ambient ?? 1; this.ambient += (want - this.ambient) * Math.min(1, dt * 1.6); this.hemi.intensity = this.look.hemi[2] * this.ambient; this.sun.intensity = this.look.sun[1] * this.ambient; }
    this.tex.water_dusk.offset.x += dt * 0.0035; this.tex.water_dusk.offset.y += dt * 0.0022;                       // slow drift of the painted water
    if (this.lvl.towerGlow) this.lvl.towerGlow.scale.setScalar(1 + 0.18 * Math.sin(this.time * 1.7) + 0.08 * Math.sin(this.time * 4.1));   // the Bell breathes
    // enemies
    const seen = new Set(), beatK = zoneBeat(this.map, w.player.x, w.player.z, w) ? beatGlow(w.time + alpha * TICK) : 0;          // the Hive's light curve (hive.js): the creatures' rigs and the static lights swell on the beat (render only)
    for (const e of w.enemies) {
      seen.add(e.id); let v = this.enemyViews.get(e.id);
      if (!v) { v = ENEMY_MODELS[e.kind](this.tex, this.map); if (e.variant && VARIANTS[e.variant]) this.tintRig(v.root, e.variant); markEntity(v.root); this.scene.add(v.root); this.enemyViews.set(e.id, v); }          // markEntity: enemies keep the classic ink (entityflag.js, PT-006)
      // PT-054 (the owner: Glass Steppe stutters): a sleeper that is already frozen into its merged mesh needs nothing: no pose, no grounding (which walks every vertex of the rig), and its invisible rig is out of the scene graph (three.js recomputed the matrices of all fifty nodes of every sleeper on every frame)
      if (v.frozen && e.state === 'idle' && Math.abs((e.y ?? 0) - v.frozenY) <= 1e-3) continue;
      const s = this.prev.enemies.get(e.id) || e;
      // WORLD placement: the view owns v.root (x, z, yaw, and y = the sim's ground for this actor). v.pose() animates inside v.rig and must never write the root (ground-contract.js)
      v.root.position.set(lerp(s.x, e.x, alpha), lerp(s.y ?? e.y ?? 0, e.y ?? 0, alpha), lerp(s.z, e.z, alpha)); v.root.rotation.y = lerp(s.yaw, e.yaw, alpha);
      const def = ENEMIES[e.kind], t = w.time + alpha * TICK + e.id * 1.7;
      const L = def.lunge, lunge = L && (e.lungeT ?? -1) >= 0 ? (e.lungeT < L.windup ? -(e.lungeT / L.windup) : 1) : 0;      // -1..0 crouch, 1 dash
      // the attack pose comes from whichever windup is running: a swing, a Warden's shoulder-down charge, a Sexton's raised staff, the Cantor's arms up before a pulse
      let attack = e.attackT >= 0 ? e.attackT / def.attack.duration : 0;
      if (def.charge && (e.chargeT ?? -1) >= 0) attack = 0.55 * Math.min(1, e.chargeT / def.charge.windup); else if (def.support && (e.channelT ?? -1) >= 0) attack = 0.5; else if ((def.boss || def.ward) && (e.pulseT ?? -1) >= 0) attack = 0.55 * Math.min(1, e.pulseT / (def.pulse?.windup ?? def.hive?.windup ?? HIVE.beat));
      const swell = def.brood && (e.broodT ?? -1) >= 0 ? Math.min(1, e.broodT / def.brood.swell) : (def.spawner ?? def.feeds) && (e.vatT ?? -1) >= 0 ? Math.min(1, e.vatT / (def.spawner ?? def.feeds).swell) : 0, weep = def.brood && (e.pulseT ?? -1) >= 0 ? Math.min(1, e.pulseT / def.tears.windup) : 0;          // PT-028: the Weeping Mother's swelling sacs and the tear she draws up
      const sweep = def.sweep && (e.sweepT ?? -1) >= 0 ? (e.sweepT < def.sweep.tell ? e.sweepT / def.sweep.tell : 1 + Math.min(1, (e.sweepT - def.sweep.tell) / def.sweep.duration)) : 0, aim = sweep > 0 && e.sweepLine ? Math.atan2(Math.sin(e.sweepLine.ang - v.root.rotation.y), Math.cos(e.sweepLine.ang - v.root.rotation.y)) : 0;          // PT-033: the Gate Warden's eye follows its beam
      if (v.glow) v.glow.color.setHex(eyeColor(e, attack, lunge));                                                          // PT-061 V8: asleep dim, awake teal, hunting amber-white, striking white
      v.pose({ t, walk: e.walk, phase: e.phase, attack, lunge, dead: e.dead, flash: e.flash, awake: e.state !== 'idle', swell, weep, sweep, aim, afraid: e.state === 'flee', beat: beatK, ...((e.snipeT ?? -1) >= 0 ? { snipe: Math.min(1, e.snipeT / (ENEMIES[e.kind].snipe.track + ENEMIES[e.kind].snipe.lock)) } : {}), ...(e.healTarget != null ? { heal: 1 } : {}), ...(e.lift != null ? { lift: e.lift } : {}), ...(e.rb ? bellPose(e, v.root.rotation.y) : {}) });          // awake: 'idle' is asleep (a sleeper is frozen into one mesh below); the Bellhand's hand-bell rings only while awake
      // performance: an enemy that is still asleep stands perfectly still, so draw it as ONE merged mesh (~35 draw calls -> 1); swap the rig back in the moment it wakes or dies
      // A sleeper on a MOVING floor is not frozen: the merge bakes the world height, so a floor that keeps moving would leave it buried or hovering. It freezes once its ground is steady.
      const steady = Math.abs((e.y ?? 0) - (s.y ?? e.y ?? 0)) < 1e-4;
      if (e.state === 'idle' && !v.frozen && steady) {
        v.root.updateMatrixWorld(true); const f = v.root.clone(true); this.scene.add(f); f.updateMatrixWorld(true); mergeStatic(f, { disposeSources: false, cull: true }); f.position.set(0, 0, 0); f.rotation.set(0, 0, 0); f.updateMatrixWorld(true); f.traverse((o) => { o.matrixAutoUpdate = false; }); v.frozen = f; v.frozenY = e.y ?? 0; v.root.visible = false; this.scene.remove(v.root);
      } else if (v.frozen && (e.state !== 'idle' || Math.abs((e.y ?? 0) - v.frozenY) > 1e-3)) { this.scene.remove(v.frozen); v.frozen.traverse((o) => o.isMesh && o.geometry.dispose()); v.frozen = null; v.root.visible = true; this.scene.add(v.root); }
    }
    for (const [id, v] of this.enemyViews) if (!seen.has(id)) { this.scene.remove(v.root); if (v.frozen) this.scene.remove(v.frozen); this.enemyViews.delete(id); freeRig(v.root); if (v.frozen) freeRig(v.frozen); }          // PT-050 H-L4: a creature the sim dropped (born corpses beyond the cap) frees its rig's geometry and materials; textures are the shared atlas and stay
    { const discs = []; for (const e of w.enemies) { if (e.state === 'dead') continue; const v = this.enemyViews.get(e.id), def = ENEMIES[e.kind]; if (v) discs.push({ x: v.root.position.x, y: v.root.position.y, z: v.root.position.z, r: def.radius, fade: def.flying ? 0.55 : 1 }); } this.shadows.update(discs); }      // the floor under each creature, its collision radius; a flyer's disc is smaller (it is higher)
    // channel beams (Sexton -> corpse), node links (ring -> Cantor), the shield, tone pulses
    { const live = new Set(); let boss = null; const nodes = [];
      for (const e of w.enemies) {
        const def = ENEMIES[e.kind];
        if (def.support && (e.channelT ?? -1) >= 0) { const c = w.enemies.find((o) => o.id === e.channelTarget); if (c) { this.beam('ch' + e.id, e.x, (e.y ?? 0) + 1.7, e.z, c.x, (c.y ?? 0) + 0.3, c.z, 0.05 + 0.03 * Math.sin(this.time * 22)); live.add('ch' + e.id); } }
        if (def.node && e.state !== 'dead') nodes.push(e); if (def.boss && def.shield && e.state !== 'dead') boss = e;
      }
      if (boss && nodes.length) for (const n of nodes) { this.beam('nk' + n.id, n.x, (n.y ?? 0) + 3.2, n.z, boss.x, (boss.y ?? 0) + (boss.lift ?? 0) + 2.6, boss.z, 0.03 + 0.012 * Math.sin(this.time * 6 + n.id)); live.add('nk' + n.id); }
      for (const [k, m] of this.beams) if (!live.has(k)) { this.scene.remove(m); this.beams.delete(k); }
      this.shieldFlash = Math.max(0, this.shieldFlash - dt * 4);
      if (boss && nodes.length) {
        if (!this.shield) { this.shield = makeShield(); this.scene.add(this.shield.group); }
        const SH = ENEMIES[boss.kind].shield ?? {}; this.shield.group.visible = true; this.shield.group.position.set(boss.x, (boss.y ?? 0) + (boss.lift ?? 0) + (SH.y ?? 2.4), boss.z); this.shield.group.scale.setScalar((SH.r ?? 2.9) + 0.08 * Math.sin(this.time * 5)); this.shield.update(this.time, this.shieldFlash);
      } else if (this.shield?.group.visible) { this.shield.group.visible = false; this.shedShield(); }
      for (let i = this.ripples.length - 1; i >= 0; i--) { const r = this.ripples[i]; r.t += dt; if (r.t > 0.75) { this.scene.remove(r.m); r.m.material.dispose(); this.ripples.splice(i, 1); } else { r.m.scale.setScalar(1.4 + r.t * 8); r.m.material.opacity = 0.75 * (1 - r.t / 0.75); } }
      const pseen = new Set();
      for (const q of w.pulses || []) {
        pseen.add(q.id); let m = this.pulseViews.get(q.id);
        if (!m) { m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xbafff2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; this.scene.add(m); this.pulseViews.set(q.id, m); }
        m.position.set(q.x, (q.y ?? 0) + 0.16, q.z); m.scale.setScalar(Math.max(0.01, q.r + q.speed * alpha * TICK)); m.material.opacity = 0.9 * Math.max(0, 1 - q.r / q.maxR);
      }
      for (const [id, m] of this.pulseViews) if (!pseen.has(id)) { this.scene.remove(m); m.material.dispose(); this.pulseViews.delete(id); }
    }
    if (!this.hiveView && w.enemies.some((q) => ENEMIES[q.kind].unison || q.kind === 'rootbell')) this.hiveView = makeHiveView(this.scene);       // PT-043: the Hive Cantor's threads, the clapper's chain and shadow, the spikes
    this.hiveView?.update(w, this.enemyViews, this.time);
    if (!this.creatureFx && w.enemies.some((q) => ENEMIES[q.kind].snipe || ENEMIES[q.kind].heal || ENEMIES[q.kind].node || ENEMIES[q.kind].boss)) this.creatureFx = makeCreatureFx(this.scene);          // (a creature spawned by a trigger)
    this.creatureFx?.update(w, this.enemyViews, this.time, dt);
    // pickups
    seen.clear();
    for (const it of w.pickups) {
      seen.add(it.id); let v = this.pickupViews.get(it.id);
      if (!v) { v = pickupMaker(it.kind)(it.kind, this.tex.props_atlas, this.tex.flarecannon_atlas, this.tex.guns_atlas); this.scene.add(v); this.pickupViews.set(it.id, v); }
      v.position.set(it.x, (it.y ?? 0) + 0.18 + Math.sin(this.time * 2.2 + it.id) * 0.05 + (it.kind.startsWith('key') ? 0.25 : 0), it.z); v.rotation.y = this.time * 0.9 + it.id;
    }
    for (const [id, v] of this.pickupViews) if (!seen.has(id)) { this.scene.remove(v); this.pickupViews.delete(id); }
    // projectiles
    seen.clear(); let lead = null, rocketLead = null;
    for (const q of w.projectiles) {
      seen.add(q.id); let m = this.projViews.get(q.id), rocket = q.weapon === 'linethrower', bomb = q.weapon === 'mortar';
      if (!m) { if (bomb) { const b = makeBombMesh(); m = b.group; m.userData.spark = b.spark; m.userData.puffT = 0; } else if (rocket) { const r = makeRocketMesh(); m = r.group; m.userData.flame = r.flame; m.userData.puffT = 0; } else m = new THREE.Mesh(this.projGeo, this.projMat); this.scene.add(m); this.projViews.set(q.id, m); }
      m.position.set(q.x + q.vx * alpha * TICK, q.y + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK);
      if (rocket) {                                                                                                   // PT-022: the rocket points along its flight, its flame breathes, it leaves smoke and lights the place it passes
        const sp = Math.hypot(q.vx, q.vy, q.vz) || 1; m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(q.vx / sp, q.vy / sp, q.vz / sp)); m.userData.flame.scale.set(1, 1, 0.8 + 0.4 * Math.sin(this.time * 60));
        m.userData.puffT -= dt; if (m.userData.puffT <= 0) { m.userData.puffT = 0.03; const pf = new THREE.Mesh(this.puffGeo, this.puffMat); pf.position.copy(m.position).addScaledVector(new THREE.Vector3(q.vx / sp, q.vy / sp, q.vz / sp), -0.45); pf.position.x += (this.rnd() - 0.5) * 0.06; pf.position.y += (this.rnd() - 0.5) * 0.06; this.scene.add(pf); this.puffs.push({ m: pf, t: 0, max: 0.9 + this.rnd() * 0.5 }); }
        rocketLead = rocketLead || m;
      } else if (bomb) {                                                                                              // PT-027: the bomb tumbles along its arc and leaves a thin trail of smoke; its fuse spark flickers
        m.rotation.set(this.time * 3.1 + q.id, this.time * 2.3, 0); m.userData.spark.scale.setScalar(0.7 + 0.5 * Math.sin(this.time * 40 + q.id));
        m.userData.puffT -= dt; m.userData.age = (m.userData.age ?? 0) + dt; if (m.userData.puffT <= 0 && m.userData.age > 0.25) { m.userData.puffT = 0.07; const sp = Math.hypot(q.vx, q.vy, q.vz) || 1, pf = new THREE.Mesh(this.puffGeo, this.puffMat); pf.position.copy(m.position).addScaledVector(new THREE.Vector3(q.vx / sp, q.vy / sp, q.vz / sp), -0.4); pf.scale.setScalar(0.3); this.scene.add(pf); this.puffs.push({ m: pf, t: 0, max: 0.6 + this.rnd() * 0.3 }); }
      } else lead = lead || m;
    }
    for (const [id, m] of this.projViews) if (!seen.has(id)) { this.scene.remove(m); this.projViews.delete(id); }
    seen.clear();
    for (const q of w.enemyShots) {
      seen.add(q.id); let m = this.shotViews.get(q.id);
      if (!m) { m = new THREE.Mesh(this.shotGeo, this.shotMat); const ring = new THREE.Mesh(this.shotRing, this.shotMat); m.add(ring); m.userData.ring = ring; this.scene.add(m); this.shotViews.set(q.id, m); }
      m.position.set(q.x + q.vx * alpha * TICK, q.y + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK); m.userData.ring.rotation.set(this.time * 5, this.time * 3, 0); m.scale.setScalar(1 + 0.15 * Math.sin(this.time * 18));
    }
    for (const [id, m] of this.shotViews) if (!seen.has(id)) { this.scene.remove(m); this.shotViews.delete(id); }
    seen.clear();                                                                                                    // PT-028: the tears in flight (a warm bead with a trailing drop) and the pools they leave (the spore bed's own painted overlay, amber, fading as they dry)
    for (const q of w.tears ?? []) {
      seen.add(q.id); let m = this.tearViews.get(q.id);
      if (!m) { m = new THREE.Mesh(this.tearGeo, this.tearMat); m.add(new THREE.Mesh(this.tearCoreGeo, this.tearCoreMat)); this.scene.add(m); this.tearViews.set(q.id, m); }
      m.position.set(q.x + q.vx * alpha * TICK, q.y + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK); const st = 1 + 0.18 * Math.sin(this.time * 14 + q.id); m.scale.set(st, 1.3 / st, st);
    }
    for (const [id, m] of this.tearViews) if (!seen.has(id)) { this.scene.remove(m); this.tearViews.delete(id); }
    seen.clear();
    for (const q of w.patches ?? []) {
      seen.add(q.id); let m = this.poolViews.get(q.id);
      if (!m) { m = new THREE.Mesh(this.poolGeo, new THREE.MeshBasicMaterial({ map: this.tex.floor_spore_a, color: 0xf0c060, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; this.scene.add(m); this.poolViews.set(q.id, m); }
      const age = (w.time - q.t0), grow = Math.min(1, age / 0.25); m.position.set(q.x, floorAt(w, q.x, q.z) + 0.06, q.z); m.scale.setScalar(Math.max(0.05, q.r * (0.4 + 0.6 * grow))); m.rotation.z = this.time * 0.2; m.material.opacity = 0.8 * Math.min(1, q.life / 1.0) * (0.85 + 0.15 * Math.sin(this.time * 4 + q.id));
    }
    for (const [id, m] of this.poolViews) if (!seen.has(id)) { this.scene.remove(m); m.material.dispose(); this.poolViews.delete(id); }
    seen.clear();                                                                                                    // PT-029: the ward: a thin ring and a faint disc on the floor round every awake, unstaggered Acolyte, as wide as the ward reaches
    for (const e of w.enemies) {
      if (e.kind !== 'acolyte' || e.state === 'dead' || e.state === 'idle' || e.hold === 'inert' || (e.stunT || 0) > 0) continue;
      seen.add(e.id); let g = this.wardViews.get(e.id);
      if (!g) { g = new THREE.Group(); const ring = new THREE.Mesh(this.ringGeo, this.wardRingMat), disc = new THREE.Mesh(this.poolGeo, this.wardDiscMat); ring.rotation.x = disc.rotation.x = -Math.PI / 2; ring.renderOrder = disc.renderOrder = 2; g.add(disc, ring); this.scene.add(g); this.wardViews.set(e.id, g); }
      const s = this.prev.enemies.get(e.id) || e; g.position.set(lerp(s.x, e.x, alpha), lerp(s.y ?? e.y ?? 0, e.y ?? 0, alpha) + 0.1, lerp(s.z, e.z, alpha)); g.scale.setScalar(ENEMIES.acolyte.ward.r * (1 + 0.012 * Math.sin(this.time * 2.4 + e.id)));
    }
    for (const [id, g] of this.wardViews) if (!seen.has(id)) { this.scene.remove(g); this.wardViews.delete(id); }
    this.flareLight.intensity = lead ? 40 : 0; if (lead) this.flareLight.position.copy(lead.position);
    this.updateMortarRing(w);
    this.rocketLight.intensity = rocketLead ? 50 * (0.85 + 0.15 * Math.sin(this.time * 50)) : 0; if (rocketLead) this.rocketLight.position.copy(rocketLead.position);
    for (let i = this.puffs.length - 1; i >= 0; i--) { const pf = this.puffs[i]; pf.t += dt; const k = pf.t / pf.max; if (k >= 1) { this.scene.remove(pf.m); this.puffs.splice(i, 1); } else { pf.m.scale.setScalar(0.5 + 1.8 * k); pf.m.position.y += dt * 0.35; if (k > 0.55) pf.m.scale.multiplyScalar(1 - (k - 0.55) / 0.45); } }
    for (let i = this.shocks.length - 1; i >= 0; i--) { const sh = this.shocks[i]; sh.t += dt; const k = sh.t / 0.28; if (k >= 1) { this.scene.remove(sh.m); sh.m.material.dispose(); this.shocks.splice(i, 1); } else { sh.m.scale.setScalar(0.3 + 3.2 * k); sh.m.material.opacity = 0.8 * (1 - k); } }
    // PT-022: the movable props (drawn one by one: they move) and the tractor beam from the fork to what it holds or drags
    { const live = new Set();
      for (const q of w.phys || []) {
        if (q.gone) continue; live.add(q.id); let v = this.physViews.get(q.id);
        if (!v) { const g = new THREE.Group(), d = PHYS[q.kind], mesh = q.kind === 'crate' ? makeCrate(this.tex.crate_wood_a) : q.kind === 'barrel' ? makeBarrel(this.tex.crate_wood_a) : makeSack(); if (q.kind === 'sack') mesh.position.y = -d.h / 2; g.add(mesh); this.scene.add(g); v = { g, rx: 0, rz: 0, yaw: ((q.id.charCodeAt(1) * 37) % 100) / 16 }; this.physViews.set(q.id, v); }
        const d = PHYS[q.kind], sp = Math.hypot(q.vx, q.vy, q.vz);
        v.g.position.set(q.x + q.vx * alpha * TICK, q.y + d.h / 2 + q.vy * alpha * TICK, q.z + q.vz * alpha * TICK);
        if (!q.held && sp > 3) { v.rx += dt * sp * 0.45; v.rz += dt * sp * 0.3; } else { v.rx *= Math.max(0, 1 - dt * 9); v.rz *= Math.max(0, 1 - dt * 9); }
        if (q.held) v.rz = Math.sin(this.time * 2.3 + q.x) * 0.12; v.g.rotation.set(v.rx, v.yaw, v.rz);
      }
      for (const [id, v] of this.physViews) if (!live.has(id)) { this.scene.remove(v.g); this.physViews.delete(id); }
      const gv = p.grav, held = gv?.prop != null ? (w.phys || []).find((o) => o.id === gv.prop) : null, on = gv?.beam && (gv.beamT ?? -9) >= w.tick - 2 && p.weapon === 'fork' && w.status !== 'dead';
      if (on) {
        if (!this.tractor) { this.tractor = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0x6ffff0, transparent: true, opacity: 0.4, depthWrite: false })); this.scene.add(this.tractor); }
        const yaw = this.cam.rotation.y, pitch = this.cam.rotation.x, f = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)], r = [Math.cos(yaw), 0, -Math.sin(yaw)];
        const ax = this.cam.position.x + f[0] * 0.9 + r[0] * 0.2, ay = this.cam.position.y + f[1] * 0.9 - 0.2, az = this.cam.position.z + f[2] * 0.9 + r[2] * 0.2, [bx, by, bz] = gv.beam, dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz) || 1;
        this.tractor.visible = true; this.tractor.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); this.tractor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)); const th = (held ? 0.03 : 0.018) + 0.008 * Math.sin(this.time * 40); this.tractor.scale.set(th, len, th);
      } else if (this.tractor) this.tractor.visible = false;
    }
    // burning ground (the flare cannon's fire, sim state w.burns): a glowing patch, flickering flames, and one light on the nearest patch
    { const live = new Set(); let near = null, nd = 1e9;
      for (const b of w.burns || []) {
        live.add(b.id); let v = this.burnViews.get(b.id);
        if (!v) {
          const g = new THREE.Group(), dm = new THREE.MeshBasicMaterial({ color: b.frost ? 0x8fd0ff : 0xff6a1a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), fm = new THREE.MeshBasicMaterial({ color: b.frost ? 0xd8f2ff : 0xff9a2a, transparent: true, opacity: 0.9, depthWrite: false });
          const disc = new THREE.Mesh(this.burnDisc, dm); disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(b.r); g.add(disc);
          const flames = []; for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(this.flameGeo, fm), a = this.rnd() * Math.PI * 2, rr = Math.sqrt(this.rnd()) * b.r * 0.85; f.position.set(Math.cos(a) * rr, 0.3, Math.sin(a) * rr); f.userData.seed = this.rnd() * 10; g.add(f); flames.push(f); }
          g.position.set(b.x, b.y + 0.03, b.z); this.scene.add(g); v = { g, disc, flames, dm, fm }; this.burnViews.set(b.id, v);
        }
        const fade = Math.min(1, b.t / 0.7) * Math.min(1, (b.max - b.t) / 0.12 + 0.25);
        v.dm.opacity = (0.34 + 0.1 * Math.sin(this.time * 11 + b.x)) * fade;          // (b.id is a string: a number is needed here, an opacity of NaN draws BLACK: PT-013, seen in the first real-game stills) v.fm.opacity = 0.9 * fade;
        for (const f of v.flames) { const k = 0.55 + 0.6 * Math.abs(Math.sin(this.time * 8.5 + f.userData.seed * 3)); f.scale.set(1 - 0.25 * k, k * fade + 0.05, 1 - 0.25 * k); f.position.y = 0.28 * k * fade; f.rotation.y = this.time * 1.7 + f.userData.seed; }
        const d = Math.hypot(b.x - this.cam.position.x, b.z - this.cam.position.z); if (d < nd) { nd = d; near = { b, fade }; }
      }
      for (const [id, v] of this.burnViews) if (!live.has(id)) { this.scene.remove(v.g); v.dm.dispose(); v.fm.dispose(); this.burnViews.delete(id); }
      if (near) this.burnLight.color.setHex(near.b.frost ? 0x9fdcff : 0xff8a30); this.burnLight.intensity = near && nd < 18 ? 20 * (0.78 + 0.22 * Math.sin(this.time * 14) + 0.06 * Math.sin(this.time * 33)) * near.fade : 0; if (near) this.burnLight.position.set(near.b.x, near.b.y + 0.9, near.b.z);
    }
    if (w.loadFx) {                                                                                                    // PT-056: a creature alight throws embers, a chilled one breathes frost (render only: it reads e.ignT / e.chillT)
      this.loadMoteT = (this.loadMoteT ?? 0) - dt;
      if (this.loadMoteT <= 0) { this.loadMoteT = 0.09; for (const e of w.enemies) { if (e.state === 'dead') continue; const hot = (e.ignT || 0) > 0; if (!hot && !((e.chillT || 0) > 0)) continue; const m = new THREE.Mesh(this.moteGeo, hot ? this.emberMat : this.frostMat), top = (ENEMIES[e.kind].height ?? 1.8) * (hot ? 0.8 : 0.5); m.position.set(e.x + (this.rnd() - 0.5) * 0.5, (e.y ?? 0) + 0.3 + this.rnd() * top, e.z + (this.rnd() - 0.5) * 0.5); this.scene.add(m); this.motes.push({ m, v: new THREE.Vector3((this.rnd() - 0.5) * 0.4, hot ? 0.9 + this.rnd() * 0.8 : 0.15, (this.rnd() - 0.5) * 0.4), life: 0.5 + this.rnd() * 0.4, max: 0.9 }); } }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) { const m = this.motes[i]; m.life -= dt; m.m.position.addScaledVector(m.v, dt); m.v.y *= 1 - 0.8 * dt; m.m.scale.setScalar(Math.max(0.01, m.life / m.max)); if (m.life <= 0) { this.scene.remove(m.m); this.motes.splice(i, 1); } }
    // doors
    for (const d of w.doors) { const v = this.lvl.doorViews.get(d.cx + ',' + d.cz); if (v) v.position.y = (v.userData.base ?? 0) + d.open * (v.userData.span ?? this.map.ceiling - 0.05); }
    w.sectors.forEach((s, i) => { const v = this.lvl.sectorViews[i]; if (v) v.position.y = s.h; });                       // moving floors
this.beltView?.update(w, dt, this.time); this.tideView?.update(w, dt, this.time); this.carView?.update(w, alpha, this.time); this.chimeView?.update(w, this.time);     this.beamView?.update(w, dt, this.time); this.sweepView?.update(w, this.time);                                                                       // PT-033: the mirrors turn, the beams follow them
    this.ventViews?.forEach((vv) => updateVentView(vv, this.time, dt)); this.loadViews?.forEach((lv, i) => updateLoadView(lv, this.map.loads[i], w.time + alpha * TICK));      // PT-032: the plates breathe, the loads fall on the clock
    this.lvl.sporeViews?.forEach((v, i) => { const s = sporeState(this.map.pulses[i], w.time); v.bed.opacity = 0.16 + 0.78 * s.glow; v.bed.color.setScalar(0.55 + 0.45 * s.glow); if (v.tint) v.bed.color.multiply(v.tint); v.mist.opacity = s.on ? 0.42 + 0.08 * Math.sin(this.time * 3.1 + i) : 0.42 * Math.max(0, s.glow - 0.4) / 0.3; v.mist.visible = v.mist.opacity > 0.01; });          // PT-027: the beds swell before they bloom and the mist lingers
    for (const [c, f] of [['>', [1, 0]], ['<', [-1, 0]], ['^', [0, -1]], ['v', [0, 1]]]) { const m = this.lvl.fxMats[c], m2 = this.lvl.fxMats[c + '2']; if (m) m.map.offset.set(-f[0] * this.time * FLOW.push / 8, -f[1] * this.time * FLOW.push / 8); if (m2) m2.map.offset.set(-f[0] * this.time * FLOW.push * 1.7 / 8, -f[1] * this.time * FLOW.push * 1.7 / 8); }          // PT-037: a current's surface slides the way it pushes (8 m a texture tile)
    if (this.lvl.fxMats.x) this.lvl.fxMats.x.opacity = 0.55 + 0.12 * Math.sin(this.time * 2.4);                          // toxic residue breathes
    if (this.lvl.fxMats.h) this.lvl.fxMats.h.opacity = 0.84 + 0.08 * Math.sin(this.time * 3.1) + 0.04 * Math.sin(this.time * 7.7);                          // the ember bed flickers
    for (const sw of this.map.switches) { const r = this.lvl.switchViews.get(sw.id); if (!r) continue; const used = w.switchState?.[sw.id]?.used; r.lamp.material.color.setHex(used ? 0x4aff7a : 0xff4a3a); if (r.light) r.light.color.setHex(used ? 0x4aff7a : 0xff4a3a); r.lever.rotation.x = used ? -0.5 : 0.4; r.group.position.y = floorAt(w, sw.x, sw.z) + 1.35; }        // a panel on a moving floor rides with it
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
    this.boomT += dt; this.boomLight.intensity = this.boomT < 0.5 ? 140 * this.boomK * (1 - this.boomT / 0.5) ** 2 : 0;
    // static lights: flicker, and keep only the nearest few enabled (constant count => no shader recompiles)
    const cp = this.cam.position, wp = new THREE.Vector3();
    const lampK = this.look.lamp, hiveBeat = zoneBeat(this.map, w.player.x, w.player.z, w) ? beatGlow(w.time) : 0;
    for (const l of this.lvl.lights) {
      const b = l.userData.base * lampK, f = l.userData.flicker; l.getWorldPosition(wp);
      l.intensity = (f === 'pod' ? b * (0.8 + 0.2 * Math.sin(this.time * 2 + wp.x)) : b * (0.93 + 0.05 * Math.sin(this.time * 13 + wp.z) + 0.03 * Math.sin(this.time * 31))) * (1 + 0.45 * hiveBeat);
      l.userData.d = wp.distanceToSquared(cp);
    }
    const lw = lightWeights(this.lvl.lights.map((l) => l.userData.d), LIGHT_BUDGET, LIGHT_FADE);       // the nearest LIGHT_BUDGET are on; the last of them fades out as the first one left out comes level with it (lightbudget.js)
    this.lvl.lights.forEach((l, i) => { l.visible = lw.on[i]; l.intensity *= lw.w[i]; });
    // weapon overlay
    this.recoil = Math.max(0, this.recoil - dt * 4.5); this.flashT = Math.max(0, this.flashT - dt);
    // which weapon is on screen: during a switch the old one dips out for the first half, the new one rises for the second
    if (p.weapon !== this.targetWeapon) { this.prevWeapon = this.targetWeapon; this.targetWeapon = p.weapon; }
    const u = p.switchT > 0 ? 1 - p.switchT / WEAPONS[p.weapon].switchTime : 1, shown = (p.switchT > 0 && u < 0.5) ? this.prevWeapon : p.weapon, dip = p.switchT > 0 ? -0.45 * Math.sin(Math.PI * u) : 0;
    for (const [id, r] of Object.entries(this.rigs)) r.group.visible = id === shown;
    const rig = this.rigs[shown];
    // weapon pose = hip, blended toward the sights, then toward the lowered sprint carry
    const a = p.ads, sp = p.sprint, sway = Math.sin(p.bob) * 0.008 * Math.min(1, speed / PLAYER.speed) * (1 - 0.85 * a) + Math.sin(p.bob) * 0.02 * sp * Math.min(1, speed / PLAYER.speed);
    const chg = shown === 'arc' && (p.ammo.cell || 0) > 0 ? Math.min(1, Math.max(0, ((p.charge || 0) - WEAPONS.arc.charge.min) / (WEAPONS.arc.charge.max - WEAPONS.arc.charge.min))) : 0;
    this.hitKick = Math.max(0, this.hitKick - dt * 5); this.parryT += dt;
    let wpose;
    if (rig.melee) {                                                                                                  // fists and the found weapons: the rig animates itself from the swing phase, the guard and the charge (models_melee.js)
      const fc = WEAPONS.fists.charge; rig.anim({ ...ph, kind: sk, charge: shown === 'fists' ? Math.min(1, Math.max(0, ((p.charge || 0) - 0.12) / (fc.max - 0.12))) : 0, guard: p.guard || 0, alt: this.swingAlt ? 1 : 0, t: this.time, saw: shown === 'chainsaw' ? p.saw : null });
      wpose = meleePose(rig, { sprint: sp, sway, dead: this.deadT, dip, kick: this.hitKick, lagX: this.lag.x, lagY: this.lag.y });
    } else wpose = weaponPose(rig, { ads: a, sprint: sp, sway: sway + (chg > 0 ? (this.rnd() - 0.5) * 0.012 * chg : 0), recoil: this.recoil, dead: this.deadT, dip, bash: ph.on && sk === 'bash' ? ph : null });      // hip, the sight line (the eye on rear sight -> front blade, weapon-pose.js), the sprint carry, the quick bash; a charging lamp trembles
    if (rig.tick) rig.tick({ t: this.time, beam: this.tractor?.visible && !p.grav?.prop ? 1 : this.tractor?.visible ? 0.5 : 0, hold: p.grav?.prop != null ? 1 : 0, punt: Math.max(0, 1 - this.puntT / 0.3) });
    this.puntT += dt;
    rig.group.scale.setScalar(wpose.scale); const fade = Math.max(0, 1 - a / 0.6) ** 2; rig.sleeveMat.opacity = fade; rig.sleeveMat.visible = fade > 0.02;
    rig.group.position.set(wpose.pos[0], wpose.pos[1], wpose.pos[2]); rig.group.rotation.set(wpose.rot[0], wpose.rot[1], wpose.rot[2]);
    if (rig.flash) { rig.flash.visible = this.flashT > 0; if (rig.flash.visible) rig.flash.scale.setScalar(((shown === 'scattergun' ? 1.1 : shown === 'arc' ? 0.9 + this.lastCharge : 0.8) + this.rnd() * 0.6) * (1 - 0.55 * a)); }      // small in the sights: it must not hide the target
    if (rig.spin) { this.spinKick = Math.max(0, (this.spinKick || 0) - dt * 6); rig.spin.rotation[rig.spinAxis || 'z'] += dt * (rig.spinAxis ? 16 * this.spinKick : 6 + 40 * this.spinKick); }                    // the barrel cluster winds up while it fires
    if (rig.pump) { const ph = 0.9 - this.pumpT; rig.pump.position.z = ph > 0.3 && ph < 0.7 ? Math.sin(Math.PI * (ph - 0.3) / 0.4) * 0.09 : 0; }      // fore-end slides back and forward after a shot
    this.pumpT = Math.max(0, this.pumpT - dt);
    if (chg > 0) this.lastCharge = chg; else if (this.flashT <= 0) this.lastCharge = 0;
    if (rig.core) rig.core.scale.setScalar(1 + 0.12 * Math.sin(this.time * 9) + (this.flashT > 0 ? 0.4 + 0.5 * this.lastCharge : 0) + 0.45 * chg);                   // the bulb breathes and flares; held in a charge it swells
    { const lamp = shown === 'arc' && w.status !== 'dead'; this.lampLight.intensity = lamp ? (this.flashT > 0 ? 24 + this.rnd() * 10 + 30 * this.lastCharge : 6 + 0.8 * Math.sin(this.time * 7) + 22 * chg) : 0; if (lamp) { const fy = this.cam.rotation.y; this.lampLight.position.set(this.cam.position.x - Math.sin(fy) * 0.7, this.cam.position.y - 0.1, this.cam.position.z - Math.cos(fy) * 0.7); } }      // the lamp lights the dark around you
    if (rig.bolt) rig.bolt.visible = p.cooldown < 0.45 && p.ads < 0.4;                                                      // the harpoon leaves the muzzle; the next one seats as the action closes
    this.muzzleLight.intensity = this.flashT > 0 ? 6 : 0;
    if (w.map.vacuum.length) { this.frost = (this.frost ?? 0) + ((inVacuum(w, p.x, p.z) ? 1 : 0) - (this.frost ?? 0)) * Math.min(1, dt * 3); this.post.uniforms.uFrost.value = this.frost; }          // PT-033: the frost at the edges of the picture while in vacuum
    this.post.uniforms.uDamage.value = this.hurtFlash.step(dt);
    this.post.render(() => { this.renderer.render(this.scene, this.cam); if (!this.cine) this.renderer.render(this.weaponScene, this.weaponCam); });
  }

  /** Release GPU resources owned by this view (textures are shared and owned by the app). */
  /** the place's light and grade (LOOKS in defs.js): the hemisphere, the sun, the post tint; also what the dev hook uses to try another look on the same view */
  mixHex(a, b, t) { const ch = (x, i) => (x >> i) & 255, m = (i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t); return (m(16) << 16) | (m(8) << 8) | m(0); }
  setPlace(look) {
    this.look = look; const { hemi, sun } = this;
    hemi.color.setHex(look.hemi[0]); hemi.groundColor.setHex(look.hemi[1]); hemi.intensity = look.hemi[2] * this.ambient;
    sun.color.setHex(look.sun[0]); sun.position.set(...look.sun[2]); sun.intensity = look.sun[1] * this.ambient;
    if (this.weaponHemi) {                                                                                                        // PT-061 V3 (the audit: the gun was the same brightness, luma 109 to 116, in every map): the weapon scene's light follows the place's, from 0.35 of the old value in the darkest to the old value at the harbour's level and a little over in the brightest
      const k = Math.max(0, (look.hemi[2] * this.ambient) / 2.4), g = 0.35 + 0.65 * Math.min(1, k) + 0.12 * Math.min(1, Math.max(0, k - 1));
      this.weaponHemi.intensity = 1.5 * g; this.weaponHemi.color.setHex(this.mixHex(0x9fb8d0, look.hemi[0], 0.45)); this.weaponHemi.groundColor.setHex(this.mixHex(0x3a2a30, look.hemi[1], 0.45)); this.weaponKey.intensity = 1.6 * g; this.weaponKey.color.setHex(this.mixHex(0xffe0b0, look.sun[0], 0.35));
    }
    this.post.uniforms.uShoulder.value = look.post?.shoulder ?? 0.6;                                                              // PT-061 V4: the tone shoulder (a look may name its own)
    this.exposureK = look.exposure; this.post.setGrade(look.grade); this.post.uniforms.uExposure.value = 2.2 * look.exposure * (this.brightness ?? 1);
  }
  dispose() {
    const freeMeshes = (o) => { if (o.isMesh) { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose()); } };
    for (const s of [this.scene, this.weaponScene]) s.traverse(freeMeshes);
    for (const v of this.enemyViews.values()) if (!v.root.parent) v.root.traverse(freeMeshes);          // a sleeping creature's own rig is out of the scene (PT-054), its frozen copy is not: free both
    this.burnDisc.dispose(); this.flameGeo.dispose(); this.moteGeo.dispose(); this.moteMat.dispose(); this.emberMat.dispose(); this.frostMat.dispose(); this.sparkMat.dispose();
    this.wardRingMat.dispose(); this.wardDiscMat.dispose();
    this.tearGeo.dispose(); this.tearMat.dispose(); this.tearCoreGeo.dispose(); this.tearCoreMat.dispose(); this.poolGeo.dispose(); for (const m of this.poolViews.values()) m.material.dispose();
    this.puffGeo.dispose(); this.puffMat.dispose(); this.woodMat.dispose(); this.shockGeo.dispose(); this.shockMat.dispose(); this.tractor?.material.dispose();
    this.debGeo.dispose(); this.debMat.dispose(); this.dustMat.dispose(); this.projGeo.dispose(); this.projMat.dispose(); this.shotGeo.dispose(); this.shotRing.dispose(); this.shotMat.dispose(); this.beamGeo.dispose(); this.beamMat.dispose(); this.ringGeo.dispose(); for (const m of this.pulseViews.values()) m.material.dispose(); for (const r of this.ripples) r.m.material.dispose();
    for (const m of this.tintCache?.values() ?? []) m.dispose();
    this.post.dispose(); this.hiveView?.dispose(); this.creatureFx?.dispose();
    for (const v of [this.tideView, this.chimeView, this.beamView, this.sweepView]) v?.dispose?.();                // PT-050 H-L1..L3: the textures a view owns (the scene sweep above frees only geometry and materials)
    this.scene.clear(); this.weaponScene.clear();
  }
}
