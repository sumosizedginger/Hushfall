// LOOK POLISH 2 to 9 (2026-10-26): what the world pass promises, held in node. The surface treatment (surface.js), the architecture the grid never drew (trims.js), the creature ink and rim
// (entityflag.js + post.js), the place's light and colour (view.js POLISH_LIGHT, post.js GRADE_K), the materials and plates (tools/baker/recipes_polish2.js, recipes_plates.js). How it LOOKS is judged on
// real-game stills (tools/dev/polish-shots.mjs); these hold the contracts: drawn only, never more than a hand's width proud of a wall, never in front of a door, a lever, a secret or an exit.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { SURFACE, surfaceGLSL, patchSurface } from '../src/render/surface.js';
import { TRIMS, buildTrims } from '../src/render/trims.js';
import { markEntity, patchEntityFragment, PEACE_ALPHA, RIM } from '../src/render/entityflag.js';
import { buildLevel } from '../src/render/levelmesh.js';
import { loadMapFile } from '../src/engine/harness.js';
import { ROOT } from './helpers.js';

const texProxy = () => new Proxy({}, { get: (o, k) => (o[k] ??= new THREE.Texture()) });
const MAPS = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

test('surface: the shader reads the numbers of SURFACE, in world space, with a foot only on walls and trims; a material keeps its own patch and gets its own program', () => {
  const wall = surfaceGLSL('wall', 2), floor = surfaceGLSL('floor', 2);
  assert.match(wall, /vec2\(sw\.x \+ sw\.z, sw\.y\)/); assert.match(floor, /sp = sw\.xz/);
  assert.ok(wall.includes(String(SURFACE.macro[0])) && wall.includes(String(SURFACE.macro[1])), 'the macro range');
  assert.ok(wall.includes('vMapUv.y * 2.0') && !floor.includes('vMapUv'), 'the foot is counted from a wall\'s own floor, and only on walls');
  const m = new THREE.MeshLambertMaterial(); let prev = 0; m.onBeforeCompile = () => { prev++; }; m.customProgramCacheKey = () => 'mine';
  patchSurface(m, 'ceil', 2);
  const sh = { vertexShader: '#include <common>\n#include <project_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>' }; m.onBeforeCompile(sh, null);
  assert.equal(prev, 1, 'the earlier patch still runs'); assert.match(sh.vertexShader, /vSurfW = \(modelMatrix/); assert.match(sh.fragmentShader, /float sNoise/); assert.equal(m.customProgramCacheKey(), 'mine|surface-ceil-2');
  assert.throws(() => patchSurface(new THREE.MeshLambertMaterial(), 'sky'));
});

test('trims: on every shipped map they build, every piece stands within a hand\'s width of something solid, and every map with roofed rooms gets its skirting and cornices', () => {
  const maxProud = Math.max(TRIMS.skirt.d, TRIMS.cornice.d, TRIMS.plinth.d, TRIMS.coping.d, TRIMS.pilaster.d, TRIMS.pilaster.base.d, TRIMS.pilaster.cap.d, TRIMS.jamb.d, TRIMS.doorLamp.d + TRIMS.jamb.d * 0.5);
  assert.ok(maxProud <= 0.25, 'nothing stands more than 25 cm proud (a body keeps further than that from a wall)');
  let roofedMaps = 0;
  for (const id of MAPS) {
    const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')), S = map.cell, tex = texProxy(), { meshes, stats } = buildTrims(map, { tex: (n) => tex[n], wallTex: () => tex.w });
    const solid = (cx, cz) => { const k = map.kind(cx, cz); return k === 'wall' || k === 'door' || k === 'secret' || map.secrets.some((s) => s.panel[0] === cx && s.panel[1] === cz); };
    const distSolid = (x, z) => { let best = Infinity; const cx = Math.floor(x / S), cz = Math.floor(z / S); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, nz = cz + dz; if (!solid(nx, nz)) continue; const ex = Math.max(nx * S - x, 0, x - (nx + 1) * S), ez = Math.max(nz * S - z, 0, z - (nz + 1) * S); best = Math.min(best, Math.hypot(ex, ez)); } return best; };
    for (const m of meshes) {
      const p = m.geometry.attributes.position.array; for (const v of p) assert.ok(Number.isFinite(v), id + ': a finite trim');
      if (m.userData.trimGlow) continue;
      for (let i = 0; i < p.length; i += 3) assert.ok(distSolid(p[i], p[i + 2]) <= maxProud + 1e-4, `${id}: a ${m.userData.trim} vertex at ${p[i].toFixed(2)}, ${p[i + 2].toFixed(2)} stands ${distSolid(p[i], p[i + 2]).toFixed(2)} m from anything solid`);
    }
    if (stats.skirt > 0) { roofedMaps++; assert.ok(stats.cornice > 0, id + ': a roofed map has cornices'); }
  }
  assert.ok(roofedMaps >= 50, roofedMaps + ' maps have roofed rooms with skirting');
});

test('trims: pilasters keep clear of doors, levers, secret panels and exits; every door gets its frame and lamp on each open side; a locked door\'s lamp is its key\'s colour', () => {
  for (const id of ['C1E1M02', 'C1E1M04', 'C1E1M07', 'C2M17']) {
    const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')), S = map.cell, tex = texProxy(), { meshes, stats } = buildTrims(map, { tex: (n) => tex[n], wallTex: () => tex.w });
    const busy = [...[...map.doors.values()].map((d) => [(d.cx + 0.5) * S, (d.cz + 0.5) * S]), ...map.secrets.map((s) => [(s.panel[0] + 0.5) * S, (s.panel[1] + 0.5) * S]), ...map.switches.map((s) => [s.px, s.pz]), ...map.exits.map((e) => [e.x, e.z])];
    for (const m of meshes.filter((q) => q.userData.trim === 'pilaster')) { const p = m.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 3) for (const [bx, bz] of busy) assert.ok(Math.hypot(p[i] - bx, p[i + 2] - bz) > TRIMS.pilaster.clear, `${id}: a pilaster ${Math.hypot(p[i] - bx, p[i + 2] - bz).toFixed(2)} m from a door, lever, secret or exit`); }
    const doors = [...map.doors.values()].filter((d) => !d.closet); if (doors.length) assert.ok(stats.doors >= doors.length, `${id}: ${stats.doors} framed sides for ${doors.length} doors`);
    if (doors.some((d) => d.key)) assert.ok(meshes.some((m) => m.userData.trim === 'lamp' && m.material.color.getHex() !== new THREE.Color(TRIMS.doorLamp.open).multiplyScalar(TRIMS.doorLamp.k).getHex()), id + ': a keyed door has a lamp of another colour');
    assert.ok(stats.pilasters > 0 || id === 'C1E1M07', id + ' has pilasters');
  }
});

test('the level: every surface material has the treatment, ceilings wear their own boards when baked, the trims are in the level group and the sim\'s map is untouched', () => {
  const file = path.join(ROOT, 'maps', 'C1E1M02.json'), before = fs.readFileSync(file, 'utf8'), map = loadMapFile(file), tex = texProxy(), lvl = buildLevel(map, tex);
  const kinds = new Set(); let trims = 0; lvl.group.traverse((o) => { if (o.isMesh && o.material.userData?.surface) kinds.add(o.material.userData.surface); if (o.userData.trim) trims++; });
  for (const k of ['wall', 'floor', 'ceil', 'riser', 'trim']) assert.ok(kinds.has(k), 'a ' + k + ' surface');
  assert.ok(trims >= 3, trims + ' trim meshes'); assert.ok(lvl.trims.skirt > 0 && lvl.trims.cornice > 0);
  let ceil = null; lvl.group.traverse((o) => { if (o.isMesh && o.material.userData?.surface === 'ceil') ceil = o.material; }); assert.equal(ceil.map, tex.ceiling_a, 'ceilings wear ceiling_a');
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('creatures: hostile ones write alpha 0, peaceful ones PEACE_ALPHA; a lit material gets the shared rim; post.js inks a hostile outline red and keeps a peaceful one black', () => {
  const g = new THREE.Group(), a = new THREE.MeshLambertMaterial(), b = new THREE.MeshLambertMaterial(); g.add(new THREE.Mesh(new THREE.BoxGeometry(), a)); const h = new THREE.Group(); h.add(new THREE.Mesh(new THREE.BoxGeometry(), b));
  markEntity(g); markEntity(h, { hostile: false });
  const lam = () => ({ uniforms: {}, fragmentShader: '#include <common>\nvarying vec3 vViewPosition;\n#include <normal_fragment_begin>\n#include <opaque_fragment>' });
  const sa = lam(), sb = lam(); a.onBeforeCompile(sa, null); b.onBeforeCompile(sb, null);
  assert.match(sa.fragmentShader, /gl_FragColor\.a = 0\.0;/); assert.match(sb.fragmentShader, new RegExp('gl_FragColor\\.a = ' + PEACE_ALPHA.toFixed(2)));
  assert.ok(sa.fragmentShader.includes('ENTITY_RIM') && sa.uniforms.uRimColor === RIM.color && sa.uniforms.uRimK === RIM.k, 'the rim and its shared uniforms');
  const basic = { uniforms: {}, fragmentShader: '#include <common>\n#include <opaque_fragment>' }; patchEntityFragment(basic, { rim: true }); assert.ok(!basic.fragmentShader.includes('ENTITY_RIM'), 'an unlit (basic) material gets no rim');
  const post = fs.readFileSync(path.join(ROOT, 'src/render/post.js'), 'utf8');
  assert.match(post, /float hostile = \(1\.0 - step\(0\.15, aMin\)\)/); assert.ok(PEACE_ALPHA > 0.15 && PEACE_ALPHA < 0.5, 'peaceful pixels are entities (under 0.5) but not hostile (over 0.15)');
  assert.match(post, /mix\(vec3\(0\.035, 0\.04, 0\.06\), vec3\(0\.22, 0\.025, 0\.03\), hostile\)/);
});

test('light and colour: the view scales the place\'s general light down and its lamps up, lights the room with the shot, and the grade pushes the place\'s tints', async () => {
  const view = fs.readFileSync(path.join(ROOT, 'src/render/view.js'), 'utf8'), { GRADE_K } = await import('../src/render/post.js');
  const L = (await import('../src/render/view.js')).POLISH_LIGHT;
  assert.ok(L.hemi < 1 && L.sun < 1 && L.lamp > 1, 'pools brighter, the spaces between darker');
  assert.match(view, /this\.look\.hemi\[2\] \* this\.ambient \* POLISH_LIGHT\.hemi/); assert.match(view, /look\.hemi\[2\] \* this\.ambient \* POLISH_LIGHT\.hemi/); assert.match(view, /this\.look\.lamp \* POLISH_LIGHT\.lamp/);
  assert.match(view, /this\.fireLight = new THREE\.PointLight/); assert.match(view, /e\.type === 'enemy_hit'\) this\.addPop\(e\)/);
  assert.ok(GRADE_K > 1 && GRADE_K <= 2);
});

test('the paint: the polish recipes supersede the old ones of the same id, every world tile is a 256 square, the plates are 1280 x 720 and are shown smoothed', async () => {
  const { recipes } = await import('../tools/baker/all.js'), { recipesPolish2 } = await import('../tools/baker/recipes_polish2.js'), { recipesPlates } = await import('../tools/baker/recipes_plates.js'), { recipesEndplates } = await import('../tools/baker/recipes_endplates.js');
  for (const [id, r] of Object.entries(recipesPolish2)) { assert.equal(recipes[id], r, id + ' is the polish recipe'); assert.equal(r.width, 256); assert.equal(r.height, 256); }
  for (const [id, r] of Object.entries({ ...recipesPlates, ...recipesEndplates })) { assert.equal(recipes[id], r); assert.equal(r.width, 1280); assert.equal(r.height, 720); }
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/baked/manifest.json'), 'utf8')), entry = (id) => (Array.isArray(man.assets) ? man.assets.find((x) => x.id === id) : (man.assets ?? man)[id]);
  for (const id of [...Object.keys(recipesPolish2), ...Object.keys(recipesPlates), ...Object.keys(recipesEndplates)]) { const e = entry(id); assert.ok(e, id + ' is baked'); assert.equal(e.seed, recipes[id].seed, id + ' was baked from the polish recipe'); }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), main = fs.readFileSync(path.join(ROOT, 'src/game/main.js'), 'utf8');
  assert.match(html, /#title-art\.hires,#ending-art\.hires\{image-rendering:auto\}/); assert.match(main, /classList\.toggle\('hires', im\.naturalWidth >= 640\)/);
});
