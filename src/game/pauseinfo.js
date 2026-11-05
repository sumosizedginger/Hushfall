// The pause screen's information (the owner, 2026-11-04: "we need to put what level they are on ... it needs to be as indepth as all other menus"). PURE: the world and the
// records in, plain data out (`pauseInfo`), and HTML from the plain data (`pauseWhereHtml`, `pauseInfoHtml`). It only reads the world; nothing here changes the game.
import { AMMO_LOADS, DIFFICULTY, MODS, PLAYER } from '../engine/defs.js';
import { rankFor } from '../engine/progress.js';
import { tally } from './ending.js';
import { clock, itemsPage, journalLog } from './journal.js';
import { CHALLENGES, DIFFS } from './profile.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (v) => `${Math.round(v * 100)}%`;
const RECENT = 3;

/** where a map sits in the campaign, in words: { campaign, part, place } (a dev map has no slot, and says so) */
export function placeInCampaign(manifest, mapId) {
  const slot = manifest?.maps?.find((m) => m.id === mapId),
    camp = slot && manifest.campaigns?.find((c) => c.id === slot.campaign);
  if (!slot || !camp) return { campaign: 'Not part of the campaign', part: '', place: '' };
  const mains = manifest.maps.filter((m) => m.campaign === slot.campaign && m.kind === 'main' && m.episode === slot.episode);
  const place = slot.kind === 'secret' ? 'Secret map' : `Map ${slot.order} of ${mains.length}`;
  const episode = camp.episodes?.find((e) => e.episode === slot.episode);
  if (episode) return { campaign: `Campaign ${camp.id}: ${camp.name}`, part: `Episode ${episode.episode}: ${episode.title}`, place };
  // Campaign Two's acts are named by the range of maps they hold: "A: Threshold (1-8)". A secret map has no number of its own: its act is left unsaid
  const act = (camp.acts ?? [])
    .map((a) => /^(\w+): (.+) \((\d+)-(\d+)\)$/.exec(a))
    .find((m) => m && slot.kind === 'main' && slot.order >= Number(m[3]) && slot.order <= Number(m[4]));
  return { campaign: `Campaign ${camp.id}: ${camp.name}`, part: act ? `Act ${act[1]}: ${act[2]}` : '', place };
}

/** everything the pause screen says. `world` is read, never written */
export function pauseInfo({ world: w, map, manifest, mapId, profile = null, progress = null, unread = null, upgrades = null }) {
  const p = w.player,
    s = w.stats,
    t = s.total ?? {},
    par = map?.par?.time ?? 0,
    diff = DIFFICULTY[w.difficulty] ?? DIFFICULTY.normal;
  const items = itemsPage({ player: p, upgrades: upgrades ?? w.upgrades ?? progress?.upgrades, found: progress?.found?.[mapId] ?? [], map });
  const end = { kills: s.kills, secrets: s.secrets, time: w.time, total: t, innocents: s.innocents ?? 0 };
  const slot = manifest?.maps?.find((m) => m.id === mapId);
  const camp = slot && manifest ? tally(manifest, progress, slot.campaign) : null;
  const log = journalLog({ maps: { [mapId]: map }, progress, mapId, unread: unread ?? new Set(), seen: w.messagesSeen ?? [] });
  const mine = profile?.maps?.[mapId];
  const best = mine?.byDiff?.[w.difficulty] ?? null;
  const loads = [];
  for (const [gun, held] of Object.entries(p.loads ?? {}))
    for (const [id, n] of Object.entries(held ?? {})) if (n > 0) loads.push({ gun, name: AMMO_LOADS[id]?.name ?? id, n: Math.floor(n) });
  return {
    id: mapId,
    name: map?.name ?? mapId,
    ...placeInCampaign(manifest, mapId),
    lines: map?.intro?.lines ?? [],
    difficulty: {
      name: diff.name,
      detail: `Their blows ${pct(diff.enemyDamage)}, their health ${pct(diff.enemyHp)}, ammunition you find ${pct(diff.ammoPickup)}`,
    },
    objective: w.objective || '',
    run: {
      time: clock(w.time),
      par: par ? clock(par) : null,
      underPar: par ? w.time <= par : false,
      kills: { have: s.kills, of: t.enemies ?? 0 },
      items: { have: s.items, of: t.items ?? 0 },
      secrets: { have: s.secrets, of: t.secrets ?? 0 },
      damage: Math.round(s.damageTaken ?? 0),
      shots: s.shots ?? 0,
      innocents: s.innocents ?? 0,
      rank: rankFor(end, par).rank,
    },
    best: {
      finished: !!best,
      rank: best?.rank ?? null,
      time: best ? clock(best.time) : null,
      challenges: Object.entries(CHALLENGES).map(([k, label]) => ({ label, done: !!best?.done?.[k] })),
      others: DIFFS.filter((d) => d !== w.difficulty && mine?.byDiff?.[d]).map((d) => ({ name: DIFFICULTY[d].name, rank: mine.byDiff[d].rank })),
    },
    you: {
      hp: Math.max(0, Math.ceil(p.hp)),
      hpMax: PLAYER.maxHp,
      armor: items.armor,
      keys: items.keys.map((k) => ({ name: k.name, color: k.color })),
      lamp: items.lamp,
      loads,
      mods: Object.entries(p.mods ?? {}).map(([id, tier]) => ({ name: MODS[id]?.name ?? id, tier })),
      upgrades: items.upgrades.filter((u) => u.tier > 0),
    },
    arms: items.weapons.map((a) => ({ name: a.name, key: a.key, ammo: a.ammo, inHand: p.weapon === a.id })),
    heard: log.entries.slice(0, RECENT).map((e) => ({ speaker: e.speaker || 'Unsigned', text: e.text, when: e.when ?? '', isNew: !!e.isNew })),
    heardMore: Math.max(0, log.entries.length - RECENT),
    unread: log.newCount,
    campaignRun: camp
      ? {
          cleared: camp.cleared,
          total: camp.total,
          secretMapsFound: camp.secretMapsFound,
          secretMaps: camp.secretMaps,
          kills: camp.kills,
          secrets: camp.secrets,
          time: clock(camp.time),
          salvage: camp.salvage,
        }
      : null,
  };
}

export const row = (label, value, cls = '') => `<div${cls ? ` class="${cls}"` : ''}><b>${esc(label)}</b><span>${value}</span></div>`;
const count = (c) => (c.of ? `${c.have} / ${c.of}` : `${c.have}`);
const bar = (have, of) => (of > 0 ? `<i class="pi-bar"><u style="width:${Math.min(100, Math.round((have / of) * 100))}%"></u></i>` : '');
export const section = (title, body) => `<section><h3>${esc(title)}</h3>${body}</section>`;

/** the heading in the menu itself: it stays on screen at every window size */
export function pauseWhereHtml(i) {
  return (
    `<div class="pw-name">${esc(i.name)}</div>` +
    `<div class="pw-line">${[i.part, i.place].filter(Boolean).map(esc).join(' &middot; ') || esc(i.campaign)}</div>` +
    `<div class="pw-line">${esc(i.difficulty.name)} &middot; ${esc(i.run.time)} on this map &middot; ${esc(count(i.run.kills))} creatures</div>`
  );
}

/** what the player holds; the save screen calls it what you carry, and a key never carries into the next map */
export function youHtml(i, { title = 'You', keys = true } = {}) {
  const y = i.you;
  return section(
    title,
    `<div class="rows">` +
      row('Health', `${esc(y.hp)} / ${esc(y.hpMax)}${bar(y.hp, y.hpMax)}`) +
      row('Armour', `${esc(y.armor.value)} / ${esc(y.armor.cap)}${bar(y.armor.value, y.armor.cap)}`) +
      (keys ? row('Keys', y.keys.length ? y.keys.map((k) => `<em style="color:${esc(k.color)}">${esc(k.name)}</em>`).join(', ') : 'none') : '') +
      (y.lamp ? row('Lamp oil', `${esc(y.lamp.oil)} / ${esc(y.lamp.max)}`) : '') +
      (y.loads.length ? row('Loads', y.loads.map((l) => `${esc(l.name)} ${esc(l.n)}`).join(', ')) : '') +
      (y.mods.length ? row('Mods', y.mods.map((m) => `${esc(m.name)}${m.tier > 1 ? ' II' : ''}`).join(', ')) : '') +
      (y.upgrades.length ? row('Upgrades', y.upgrades.map((u) => `${esc(u.name)} ${esc(u.tier)}/${esc(u.max)}`).join(', ')) : '') +
      `</div>`,
  );
}

export const armsHtml = (i) =>
  section(
    'Arms',
    `<div class="rows pi-arms">` +
      i.arms
        .map((a) =>
          row(
            `${a.key ? a.key + '  ' : ''}${a.name}${a.inHand ? ' (in hand)' : ''}`,
            a.ammo ? `${esc(a.ammo.have)} / ${esc(a.ammo.cap)}` : '&mdash;',
            a.inHand ? 'on' : '',
          ),
        )
        .join('') +
      `</div>`,
  );

export function campaignHtml(i) {
  const c = i.campaignRun;
  return c
    ? section(
        'The campaign so far',
        `<div class="rows">` +
          row('Maps cleared', `${esc(c.cleared)} / ${esc(c.total)}${bar(c.cleared, c.total)}`) +
          row('Secret maps found', `${esc(c.secretMapsFound)} / ${esc(c.secretMaps)}`) +
          row('Creatures killed', esc(c.kills)) +
          row('Secrets found', esc(c.secrets)) +
          row('Time played', esc(c.time)) +
          row('Salvage', esc(c.salvage)) +
          `</div>`,
      )
    : '';
}

/** the page beside the menu */
export function pauseInfoHtml(i) {
  const r = i.run;
  const where = section(
    'Where you are',
    `<div class="pi-title">${esc(i.name)}</div><div class="pi-sub">${esc(i.campaign)}</div>` +
      `<div class="pi-sub">${[i.part, i.place].filter(Boolean).map(esc).join(' &middot; ')}</div>` +
      i.lines.map((l) => `<p class="pi-line">${esc(l)}</p>`).join('') +
      `<div class="rows">${row('Difficulty', esc(i.difficulty.name))}</div><div class="pi-sub">${esc(i.difficulty.detail)}</div>`,
  );
  const objective = section('Objective', `<p class="pi-goal">${esc(i.objective || 'Nothing to report yet: go on, and find the way out.')}</p>`);
  const run = section(
    'This run',
    `<div class="rows">` +
      row('Time', `${esc(r.time)}${r.par ? ` <em>par ${esc(r.par)}</em>` : ''}`) +
      row('Creatures', `${esc(count(r.kills))}${bar(r.kills.have, r.kills.of)}`) +
      row('Items', `${esc(count(r.items))}${bar(r.items.have, r.items.of)}`) +
      row('Secrets', `${esc(count(r.secrets))}${bar(r.secrets.have, r.secrets.of)}`) +
      row('Damage taken', esc(r.damage)) +
      row('Shots fired', esc(r.shots)) +
      (r.innocents ? row('Innocents harmed', esc(r.innocents)) : '') +
      row('Rank if you left now', `<strong>${esc(r.rank)}</strong>`) +
      `</div>`,
  );
  const best = section(
    `Your best here on ${i.difficulty.name}`,
    `<div class="rows">` +
      (i.best.finished ? row('Rank', `<strong>${esc(i.best.rank)}</strong>`) + row('Time', esc(i.best.time)) : row('Not finished yet', '&mdash;')) +
      i.best.others.map((o) => row(`On ${o.name}`, esc(o.rank))).join('') +
      `</div><ul class="pi-checks">${i.best.challenges.map((c) => `<li class="${c.done ? 'done' : ''}">${esc(c.label)}</li>`).join('')}</ul>`,
  );
  const heard = section(
    i.unread ? `Last heard (${i.unread} unread)` : 'Last heard',
    i.heard.length
      ? i.heard
          .map(
            (h) =>
              `<div class="pi-heard${h.isNew ? ' new' : ''}"><b>${esc(h.speaker)}${h.when ? ` <em>${esc(h.when)}</em>` : ''}</b><p>${esc(h.text)}</p></div>`,
          )
          .join('') + (i.heardMore ? `<div class="pi-sub">${esc(i.heardMore)} more in the Journal</div>` : '')
      : `<p class="pi-sub">Nothing yet.</p>`,
  );
  return where + objective + run + youHtml(i) + armsHtml(i) + best + heard + campaignHtml(i);
}
