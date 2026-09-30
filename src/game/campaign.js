// Campaign flow: which map follows a completed one. Pure data in, id out, so it is testable without a browser.
// The manifest says what follows each map; only maps that actually exist (built) can be entered.
/** dest: 'next' (the normal exit) or 'secret' (a secret exit). A secret map's normal exit returns to `returnsTo`. */
export function nextMapId(manifest, id, dest, exists) {
  const m = manifest.maps.find((x) => x.id === id); if (!m) return null;
  const target = dest === 'secret' ? m.secretExit : m.kind === 'secret' ? m.returnsTo : m.next;
  return target && exists(target) ? target : null;
}
/** name of a map from the manifest (for the intermission button) */
export const mapName = (manifest, id) => manifest.maps.find((x) => x.id === id)?.name ?? id;
