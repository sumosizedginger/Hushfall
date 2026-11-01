// THE STATS PAGES (PT-077): the rundown (report.js) as HTML for the stats screen, the line on the death screen and the card after a level. Pure: data in, text out, every text escaped; ui.js puts it in the page.
// Every table here is one query of report.js, and every thing the recorder writes appears on one of them (design/STATS_DATABASE.md "what the screen shows"): so a player who starts a new game can check each number.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const clockOf = (s) => { s = Math.max(0, Math.round(Number(s) || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const pct = (v) => (v == null ? '–' : v + '%');
const n = (v) => String(Math.round(Number(v) || 0));
const TYPE = { creature: 'Creatures', environment: 'The place itself', self: 'Yourself', unknown: 'Unknown' };
const chapter = (c, e) => (c === 1 ? `Campaign 1, Episode ${e}` : `Campaign 2, Act ${'ABCD'[e - 1] ?? e}`);

/** a table: `cols` = [[heading, key or fn, 'num'?]], `rows` = objects; `none` = the line shown when there is nothing yet */
function table(cols, rows, none) {
  if (!rows.length) return `<p class="st-none">${esc(none)}</p>`;
  const cell = (c, r) => esc(typeof c[1] === 'function' ? c[1](r) : r[c[1]]);
  return `<div class="st-wrap"><table class="st"><thead><tr>${cols.map((c) => `<th${c[2] ? ' class="num"' : ''}>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td${c[2] ? ' class="num"' : ''}>${cell(c, r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const section = (id, title, help, body) => `<section class="st-sec" id="st-${id}"><h3>${esc(title)}</h3>${help ? `<p class="st-help">${esc(help)}</p>` : ''}${body}</section>`;

/** PT-080, THE DEATH MAP: a level's plan (its open ground, row by row) with a red dot where each death happened. `map` is the parsed level, `spots` [{ x, z }] in metres. An SVG string. */
export function deathMapSvg(map, spots) {
  const W = map.w, H = map.h, open = (x, z) => { const k = map.kind(x, z); return k !== 'wall' && k !== 'void'; }, rows = [];
  for (let z = 0; z < H; z++) { let x = 0; while (x < W) { const o = open(x, z); let e = x + 1; while (e < W && open(e, z) === o) e++; if (o) rows.push(`<rect x="${x}" y="${z}" width="${e - x}" height="1"/>`); x = e; } }
  const r = Math.max(0.9, Math.max(W, H) / 70), dots = spots.map((s) => `<circle cx="${(s.x / map.cell).toFixed(2)}" cy="${(s.z / map.cell).toFixed(2)}" r="${r.toFixed(2)}"/>`).join('');
  return `<svg class="st-map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${spots.length} deaths"><g fill="#33434a">${rows.join('')}</g><g fill="#e8503c" stroke="#1a0808" stroke-width="${(r * 0.35).toFixed(2)}">${dots}</g></svg>`;
}

/** the whole stats page for one scope. `m` = report.js rundown, `story` = report.js story(m), `where(levelId, x, z)` = a place in words (journal.js placeOf), `lifetime` = which scope this is */
export function statsHtml(m, story, { where = () => '', lifetime = false, mapOf = () => null } = {}) {
  const o = m.overview ?? {};
  if (!o.attempts) return `<p class="st-none">${lifetime ? 'Nothing recorded yet. Play a level: every attempt is counted from the moment it starts.' : 'Nothing recorded in this playthrough yet. Play a level: every attempt is counted from the moment it starts.'}</p>`;
  const tiles = [['Levels finished', n(o.finished)], ['Attempts', n(o.attempts)], ['Time played', clockOf(o.seconds)], ['Deaths', n(o.deaths)], ['Kills', n(o.kills)], ['Damage taken', n(o.damage_taken)],
    ...(o.innocents > 0 ? [['Quiet folk killed', n(o.innocents)]] : []), ...(lifetime ? [['Playthroughs', n(o.playthroughs)]] : [])];
  const out = [`<div class="st-tiles">${tiles.map(([k, v]) => `<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}</div>`,
    `<div class="st-story">${story.map((l) => `<p>${esc(l)}</p>`).join('')}</div>`];
  out.push(section('guns', 'Your weapons', 'An attack is one shot or one swing. It connects when it damages at least one creature; creatures hit counts each creature once per attack (a spread of pellets into three creatures is one attack, one connection, three creatures hit). The chainsaw\'s cut and the tuning-fork\'s throws are not counted as attacks, only their damage and kills.',
    table([['Weapon', 'name'], ['Attacks', 'attacks', 1], ['Connected', (r) => pct(r.accuracy), 1], ['Creatures hit', 'targets', 1], ['Damage', (r) => n(r.damage), 1], ['Kills', 'kills', 1]], m.guns, 'No attacks yet.')));
  const types = m.hurtTypes.map((t) => `${TYPE[t.type] ?? t.type} ${n(t.damage)}`).join(' · ');
  out.push(section('hurt', 'What hurt you', types ? 'By kind: ' + types : '', table([['Source', 'name'], ['Damage', (r) => n(r.damage), 1], ['Hits', 'hits', 1]], m.hurt, 'Nothing has hurt you yet.')));
  out.push(section('deaths', 'Deaths', '',
    table([['Level', 'name'], ['Deaths', 'deaths', 1], ['Attempts', 'attempts', 1]], m.deathsByLevel, 'You have not died.')
    + (m.killers.length ? `<h4>Killed by</h4>` + table([['', 'name'], ['Deaths', 'deaths', 1]], m.killers, '') : '')
    + (() => {                                                                                                                                   // PT-080: the three levels you died on most, each a plan with a dot where you fell
      const by = new Map(); for (const s of m.deathSpots ?? []) { if (!by.has(s.level_id)) by.set(s.level_id, []); by.get(s.level_id).push(s); }
      const top = [...by.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([id, spots]) => [mapOf(id), spots]).filter(([mp]) => mp);
      return top.length ? `<h4>Where you fell</h4><div class="st-maps">${top.map(([mp, spots]) => `<figure>${deathMapSvg(mp, spots)}<figcaption>${esc(mp.name ?? mp.id)}: ${spots.length} ${spots.length === 1 ? 'death' : 'deaths'}</figcaption></figure>`).join('')}</div>` : '';
    })()
    + (m.recentDeaths.length ? `<h4>The last deaths</h4>` + table([['Level', 'level'], ['Killed by', 'killer'], ['Where', (r) => where(r.level_id, r.x, r.z) || '–'], ['Into the level', (r) => clockOf(r.at_second), 1]], m.recentDeaths, '') : '')));
  out.push(section('kills', 'What you killed', 'A creature raised from the dead and killed again counts twice here: you killed it twice. (The tally at the end of a level counts the bodies still down.)', table([['Creature', (r) => r.name + (r.is_boss ? ' (boss)' : '')], ['Kills', 'kills', 1]], m.killsByCreature, 'No kills yet.')));
  const R = m.records, rec = [
    ['Closest call', R.closest ? `${R.closest.hp} health left on ${R.closest.level}, and you finished it` : null],
    ['Longest run of levels without dying', R.streak ? `${R.streak}` : null],
    ['Longest level', R.longest ? `${R.longest.name}, ${clockOf(R.longest.seconds)}` : null],
    ['Fastest against par', R.bestPar ? `${R.bestPar.name}, ${clockOf(R.bestPar.seconds)} (par ${clockOf(R.bestPar.par)})` : null],
  ].filter((r) => r[1]);
  out.push(section('records', 'Records', '', rec.length ? `<div class="rows">${rec.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>` : '<p class="st-none">Finish a level to set one.</p>'));
  out.push(section('chapters', 'Chapter by chapter', 'Your average time on the levels you finished, against the average par, and the weapon you attacked with most.',
    table([['Chapter', (r) => chapter(r.campaign, r.episode)], ['Finished', 'levels', 1], ['Your average', (r) => clockOf(r.mine), 1], ['Par', (r) => (r.par ? clockOf(r.par) : '–'), 1], ['Favourite weapon', (r) => m.favourites.filter((f) => f.campaign === r.campaign && f.episode === r.episode).map((f) => f.name).join(', ') || '–']], m.parByChapter, 'Finish a level to see it here.')));
  return out.join('');
}

/** the card after a level (ui.js puts it on the intermission) and the line on the death screen; `c` = report.js runCard */
export function runCardHtml(c) {
  if (!c) return '';
  const rows = [['This attempt', clockOf(c.seconds) + (c.par ? ` (par ${clockOf(c.par)})` : '')], ['Kills', n(c.kills)],
    ...(c.gun ? [['Most used', `${c.gun.name}: ${c.gun.attacks} attacks${c.gun.accuracy != null ? ', ' + c.gun.accuracy + '% connected' : ''}`]] : []),
    ...(c.hurt ? [['Hurt you most', `${c.hurt.name}, ${n(c.hurt.damage)}`]] : []), ...(c.lowest != null ? [['Lowest health', n(c.lowest)]] : []),
    ['Attempts at this level', `${c.attempts}${c.deaths ? `, ${c.deaths} ${c.deaths === 1 ? 'death' : 'deaths'}` : ''}`]];
  return `<h3>THIS LEVEL, FROM YOUR STATS</h3><div class="rows">${rows.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>`;
}
export function deathLine(c) {
  if (!c) return '';
  return `${c.killer ? `Killed by ${c.killer}` : 'Killed'} after ${clockOf(c.seconds)}. ${c.deaths === 1 ? 'Your first death on this level' : `Death ${c.deaths} on this level`} (attempt ${c.attempts}).`;
}
