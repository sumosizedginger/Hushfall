// The post pass inks the LEVEL with corner lines (a floor meeting a wall, stair treads, a crate's foot) but must leave enemies and the weapon with the ink they always had
// (owner, PT-006: the corner ink traced every box edge of a rig and read as a wireframe). A depth buffer cannot tell an enemy from a wall, so entity materials write ALPHA 0 into the
// colour buffer (everything else writes 1) and post.js reads it: a pixel that is, or touches, an entity gets the classic ink only.
// LOOK POLISH 6 (2026-10-26): a HOSTILE creature writes 0 and a peaceful one (the Vael folk) PEACE_ALPHA, so post.js can ink the hostile ones' outline a dark blood red and leave the innocent ones black;
// and every lit creature material gets a RIM: a cold edge of the place's sky colour where its surface turns away from the eye (RIM is shared by every creature; GameView.setPlace sets it), so a body
// reads against a dark wall without being lit like a lamp.
import * as THREE from 'three';

export const PEACE_ALPHA = 0.3;
export const ENTITY_ALPHA = '#include <opaque_fragment>\n  gl_FragColor.a = 0.0;';
export const RIM = { color: { value: new THREE.Color(0xb8cce0) }, k: { value: 0.05 } };
const RIM_GLSL = `
  #ifdef ENTITY_RIM
  { float rimF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2); outgoingLight += uRimColor * rimF * uRimK; }
  #endif
  #include <opaque_fragment>`;

/** patch one compiled fragment shader (MeshLambert / MeshBasic) so it writes alpha 0 (or `alpha` for a peaceful creature); a lit (Lambert) shader also gets the rim when `rim` is set */
export function patchEntityFragment(shader, { alpha = 0, rim = false } = {}) {
  const lit = rim && shader.fragmentShader.includes('vViewPosition') && shader.fragmentShader.includes('#include <normal_fragment_begin>');
  if (lit) {
    shader.uniforms.uRimColor = RIM.color; shader.uniforms.uRimK = RIM.k;
    shader.fragmentShader = '#define ENTITY_RIM\n' + shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimK;').replace('#include <opaque_fragment>', RIM_GLSL);
  }
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.a = ' + (alpha === 0 ? '0.0' : alpha.toFixed(2)) + ';');
}

/** flag every opaque material under `root` as an entity (blended effects such as shields and sleeves are left alone: their alpha is a real alpha). `hostile` (default true) picks the alpha; creatures get the rim */
export function markEntity(root, { hostile = true, rim = true } = {}) {
  const alpha = hostile ? 0 : PEACE_ALPHA;
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || m.transparent || m.userData.entity) continue;
      const prev = m.onBeforeCompile;
      m.userData.entity = true;
      m.onBeforeCompile = (shader, renderer) => { prev?.call(m, shader, renderer); patchEntityFragment(shader, { alpha, rim }); };
      m.customProgramCacheKey = () => 'entity' + (hostile ? '' : '-peace') + (rim ? '-rim' : '');
      m.needsUpdate = true;
    }
  });
  return root;
}
