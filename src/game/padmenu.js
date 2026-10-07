// Moving around the menus with a controller (PT-013). Pure: items with rectangles in, the next item out, so node tests cover it without a DOM; main.js turns the DOM into items and the answer back into a focus.

/** the item to move to from `cur` (an id) in direction `dir` ('up' | 'down' | 'left' | 'right'); items: [{ id, x, y, w, h }]. Stays put when nothing lies that way. */
export function pickNext(items, cur, dir) {
  if (!items.length) return null;
  const c = items.find((i) => i.id === cur); if (!c) return items[0].id;
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = null, bs = Infinity;
  for (const it of items) {
    if (it.id === cur) continue;
    const dx = it.x + it.w / 2 - cx, dy = it.y + it.h / 2 - cy, along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
    if (along <= 1) continue;                                                              // not that way
    const across = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy), score = along + across * 2.2;      // straight ahead beats nearby-but-sideways
    if (score < bs) { bs = score; best = it.id; }
  }
  return best ?? cur;
}

/** the direction a pad is pointing in a menu: the D-pad (held codes) first, then the left stick (x right, forward up) once it is pushed firmly */
export function navDir(held, move, thresh = 0.6) {
  if (held.has('Pad12')) return 'up'; if (held.has('Pad13')) return 'down'; if (held.has('Pad14')) return 'left'; if (held.has('Pad15')) return 'right';
  const [x, f] = move; if (Math.max(Math.abs(x), Math.abs(f)) < thresh) return null;
  return Math.abs(f) >= Math.abs(x) ? (f > 0 ? 'up' : 'down') : (x > 0 ? 'right' : 'left');
}

/** key-repeat for a held direction: fires at once, waits `first` s, then every `every` s; releasing re-arms it */
export class NavRepeat {
  constructor(first = 0.38, every = 0.12) { this.first = first; this.every = every; this.dir = null; this.t = 0; this.next = 0; }
  /** returns the direction to act on this frame, or null */
  update(dir, dt) {
    if (!dir) { this.dir = null; return null; }
    if (dir !== this.dir) { this.dir = dir; this.t = 0; this.next = this.first; return dir; }
    this.t += dt; if (this.t >= this.next) { this.next = this.t + this.every; return dir; }
    return null;
  }
}
