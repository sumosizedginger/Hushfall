// The post pass inks the LEVEL with corner lines (a floor meeting a wall, stair treads, a crate's foot) but must leave enemies and the weapon with the ink they always had
// (owner, PT-006: the corner ink traced every box edge of a rig and read as a wireframe). A depth buffer cannot tell an enemy from a wall, so entity materials write ALPHA 0 into the
// colour buffer (everything else writes 1) and post.js reads it: a pixel that is, or touches, an entity gets the classic ink only.
export const ENTITY_ALPHA = '#include <opaque_fragment>\n  gl_FragColor.a = 0.0;';

/** patch one compiled fragment shader (MeshLambert / MeshBasic) so it writes alpha 0 */
export function patchEntityFragment(shader) { shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', ENTITY_ALPHA); }

/** flag every opaque material under `root` as an entity (blended effects such as shields and sleeves are left alone: their alpha is a real alpha) */
export function markEntity(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m || m.transparent || m.userData.entity) continue;
      const prev = m.onBeforeCompile;
      m.userData.entity = true;
      m.onBeforeCompile = (shader, renderer) => { prev?.call(m, shader, renderer); patchEntityFragment(shader); };
      m.customProgramCacheKey = () => 'entity';
      m.needsUpdate = true;
    }
  });
  return root;
}
