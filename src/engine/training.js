// What the training yard has seen you do: pure, lazy (`w.did`), and only a map that says `training` calls it. A door of the yard waits on the
// condition `did:<name>`.
const OF_EVENT = { parry: 'guard', block: 'guard', load_cycle: 'load', weapon_switch: 'switch' };

export function noteDone(w) {
  const did = (w.did ??= {});
  if (w.player.sprinting) did.sprint = true;
  for (const e of w.events) {
    if (OF_EVENT[e.type]) did[OF_EVENT[e.type]] = true;
    if (e.type === 'fire' && e.weapon === 'arc' && e.charge > 0) did.charged = true;
  }
}
