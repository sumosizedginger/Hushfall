// THE CREDITS (PT-071, R25). PURE: the lines of the roll and where the roll stands at a given moment; main.js and ui.js draw it. Nothing here invents a name:
// `PEOPLE` is the list the owner fills in (a role with no names is not shown, so the roll never prints a blank line or a placeholder), and what is always true
// (what the game is made with) is listed once. The roll is a plain scroll on the wall clock: the simulation is not involved.

/** [role, names]: the owner's own list. An empty `names` hides the role. */
export const PEOPLE = [
  ['Design and direction', []],
  ['Programming', []],
  ['Story and text', []],
  ['Painting, by code', []],
  ['Sound, by code', []],
  ['Testing', []],
  ['With thanks to', []],
];

/** what the game is made with: [name, what it does here]. three.js is the only outside software that ships inside the build (THIRD_PARTY_NOTICES.md). */
export const MADE_WITH = [
  ['three.js', 'draws the 3D world (MIT licence; the notice is in Credits and licences)'],
  ['p5.js and p5.brush', 'painted every picture at build time; they are not in the game'],
  ['Vite', 'builds the game'],
  ['Node.js', 'runs the tests and tools'],
];

export const ROLL = { speed: 44, lead: 1.5, tail: 2.5 };       // pixels a second, seconds of dark before the first line and after the last

const clean = (names) => [...new Set((names || []).map((n) => String(n ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean))];

/** the lines of the roll, in order: { kind: 'title' | 'role' | 'name' | 'text' | 'small' | 'gap', text } */
export function creditsLines(people = PEOPLE, madeWith = MADE_WITH, title = 'HUSHFALL') {
  const out = [{ kind: 'title', text: title }, { kind: 'small', text: 'An original game. Every picture painted by code, every sound made in the browser.' }, { kind: 'gap' }];
  for (const [role, names] of people) {
    const list = clean(names); if (!list.length) continue;
    out.push({ kind: 'role', text: role }); for (const n of list) out.push({ kind: 'name', text: n }); out.push({ kind: 'gap' });
  }
  out.push({ kind: 'role', text: 'Made with' });
  for (const [n, what] of madeWith) { out.push({ kind: 'name', text: n }); out.push({ kind: 'small', text: what }); }
  out.push({ kind: 'gap' }, { kind: 'small', text: 'Thank you for playing.' });
  return out;
}

const LINE_H = { title: 64, role: 34, name: 30, text: 26, small: 24, gap: 26 };
/** the height of one line in pixels (ui.js gives every line exactly this height, so the roll needs no measuring) */
export const lineHeightOf = (kind) => LINE_H[kind] ?? 26;
/** the height of the whole roll in pixels (lines in the same order as `creditsLines`) */
export function creditsHeight(lines) { return lines.reduce((h, l) => h + lineHeightOf(l.kind), 0); }

/** how far the roll has risen after `t` seconds in a window `viewH` high: 0 until `lead` has passed, then `speed` pixels a second; `done` once the last line has left */
export function creditsState(t, viewH, contentH) {
  const rise = Math.max(0, t - ROLL.lead) * ROLL.speed, total = viewH + contentH;
  return { offset: viewH - Math.min(rise, total), done: rise >= total + ROLL.tail * ROLL.speed };
}
