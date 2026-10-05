// PT-006: enemies and the weapon keep the original ink; only the level gets the corner ink. They are told apart by alpha 0 written into the colour buffer (src/render/entityflag.js),
// which post.js reads. The real effect (ink inside an enemy's body) is measured in the real game by the browser check; this proves the flagging itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { markEntity, patchEntityFragment, ENTITY_ALPHA } from '../src/render/entityflag.js';
import { makeTollbearer, makeGaunt } from '../src/render/models.js';
import { makeBellNodeEnemy } from '../src/render/models_g2.js';

const materials = (root) => { const s = new Set(); root.traverse((o) => { if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) s.add(m); }); return [...s]; };

test('markEntity flags every opaque material of every enemy rig and patches its fragment shader to write alpha 0', () => {
  const rigs = { tollbearer: makeTollbearer(null), bellhand: makeTollbearer(null, 'bellhand'), sexton: makeTollbearer(null, 'sexton'), wardengraft: makeTollbearer(null, 'warden'), cantor: makeTollbearer(null, 'cantor'), gaunt: makeGaunt(null), bellnode: makeBellNodeEnemy() };
  for (const [kind, v] of Object.entries(rigs)) {
    markEntity(v.root); const ms = materials(v.root).filter((m) => !m.transparent);
    assert.ok(ms.length > 0, kind + ' has opaque materials');
    for (const m of ms) {
      assert.equal(m.userData.entity, true, `${kind}: a material is not flagged`);
      const shader = { fragmentShader: 'void main() {\n#include <opaque_fragment>\n}' }; m.onBeforeCompile(shader, null);
      assert.ok(shader.fragmentShader.includes('gl_FragColor.a = 0.0'), `${kind}: the fragment shader does not write alpha 0`);
      assert.equal(m.customProgramCacheKey(), 'entity', `${kind}: flagged materials need their own program`);
    }
  }
});

test('blended effects keep their real alpha; a clone (the frozen sleeper) shares the flagged materials; flagging twice does not stack patches', () => {
  const g = new THREE.Group(), glass = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4 }), solid = new THREE.MeshLambertMaterial();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glass), new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), solid));
  markEntity(g); markEntity(g);
  assert.ok(!glass.userData.entity, 'a transparent material (a shield, a sleeve) is not an entity pixel');
  assert.ok(solid.userData.entity);
  const shader = { fragmentShader: '#include <opaque_fragment>' }; solid.onBeforeCompile(shader, null);
  assert.equal(shader.fragmentShader.split('gl_FragColor.a = 0.0').length - 1, 1, 'one patch, however often it was marked');
  const clone = g.clone(true); assert.ok(materials(clone).includes(solid), 'the merged sleeper reuses the flagged material');
});

test('patchEntityFragment only touches the opaque_fragment chunk', () => {
  const s = { fragmentShader: 'a\n#include <opaque_fragment>\nb' }; patchEntityFragment(s);
  assert.equal(s.fragmentShader, 'a\n' + ENTITY_ALPHA + '\nb');
  const t = { fragmentShader: 'no chunk here' }; patchEntityFragment(t); assert.equal(t.fragmentShader, 'no chunk here');
});
