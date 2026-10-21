// The end of a campaign (PT-036; the owner, 2026-10-11, after the Gate Warden: "we need a real ending beat for the campaign").
// Pure data in, data out, so a node test can hold it without a browser: which map is a campaign's finale, the epilogue's cards, the campaign tally from the player's records, and the card sequence
// (typing, holding, advancing, skipping) as a function of time. The shell (main.js) drives it with the wall clock and ui.js draws it; nothing here touches the simulation.
import { RANK_ORDER } from '../engine/progress.js';

/** the campaign number in a map id ("C1E4M08" -> 1, "C2M07" -> 2) */
export const campaignOf = (id) => { const m = /^C(\d+)/.exec(id ?? ''); return m ? Number(m[1]) : null; };

/** is this the LAST main map of its campaign (its normal exit leads out of the campaign, or nowhere)? A secret map never is. */
export function isFinale(manifest, id) {
  const m = manifest.maps.find((x) => x.id === id);
  return !!m && m.kind === 'main' && (!m.next || campaignOf(m.next) !== campaignOf(id));
}

/** the epilogue of each campaign. `cards`: who speaks (empty = the narrator) and what; `closing`: the title cards that end it. Original text. */
export const ENDINGS = {
  1: {
    title: 'THE GATE',
    kicker: 'End of Campaign One',
    name: 'The Hush',
    cards: [
      { who: '', text: 'Every bell on the coast rings once, together, and stops.' },
      { who: 'SIGNAL HOUSE', text: 'Calder. Everyone left on the coast is standing still, looking up. I can see them from the lighthouse.' },
      { who: 'INES', text: 'I cannot hear it. I never could. I only ever hear what it does to them.' },
      { who: 'SIGNAL HOUSE', text: 'It is open now, and nothing on this side can close it. If it is going to be shut, it will be shut from the other side.' },
      { who: 'INES', text: 'Then I will go down and find the end of it.' },
      { who: 'SIGNAL HOUSE', text: 'There will be no line down there. I will lose you.' },
      { who: 'INES', text: 'Stay on the air anyway. Somebody should be listening for me.' },
    ],
    next: { kicker: 'Campaign Two', name: 'The Long Descent', line: 'The Gate is open.' },
  },
  // PT-043: THE DRAFT of Campaign Two's epilogue (design/ACTD.md C2M30; written to be revised after the owner has played the descent). The facts it must carry, in order: the Bell has stopped; the Gate is a bell and a lit lamp holds it shut; someone has
  // to stay and keep it lit; she told her father she would (Campaign 1's first secret, C1E1S01: "Keep it lit, and it holds the tone back from the harbour." / "I will keep it lit."); someone is listening on the other side.
  2: {
    title: 'THE UNRUNG GATE',
    kicker: 'End of Campaign Two',
    name: 'The Lamp',
    cards: [
      { who: '', text: 'The stair ends at the door.' },
      { who: 'INES', text: 'There is a hook beside the door, the kind a lamp hangs from. My father told me what a lamp is for. I did not understand him.' },
      { who: 'INES', text: 'You keep it lit, and it holds the tone back from the harbour.' },
      { who: 'INES', text: 'A door is held from one side or the other. I am on this side of it.' },
      { who: '', text: 'She hangs the lamp on the hook and lights it. The bell on the door goes quiet, and stays quiet.' },
      { who: 'SIGNAL HOUSE', text: 'It is holding. Come back up, Ines. Somebody else can see to it.' },
      { who: 'INES', text: 'Anyone else who stood here would hear it ask. There is nobody else. I said I would keep it lit.' },
      { who: 'SIGNAL HOUSE', text: 'Then I will stay on the air. Somebody should be listening.' },
      { who: '', text: 'On the far side of the door, a long way down, something answers the light with one note. It is not the Hush.' },
    ],
    next: { kicker: 'Hushfall', name: 'The End', line: 'Someone is listening.' },
  },
};

/** PT-063 (R13, workstream L): THE COLD OPEN, shown before the first level of a new campaign (once; the Record replays it from the title). Four cards over the title picture, the last over the plate of the tower (`ui_cold_tower`). It plants what the ending pays:
 *  the harbour lamp and the fog-bell (the Campaign Two beach names its world after the bell, and the last scene hangs the lamp). `coldOpen: true` makes the shell go on to the level (or back to the title) instead of to a tally. Original text, LORE.md section 5. */
export const COLD_OPEN = {
  coldOpen: true, kicker: 'Port Marrow', title: 'HUSHFALL', name: '', art: 'title',
  cards: [
    { who: '', text: 'The harbour office of Port Marrow keeps a catalogue of lights and bearings.' },
    { who: '', text: 'The first entry is the lamp at the harbour mouth. The second is the fog-bell on the north pier, rung on the ninth stroke of the tide table.' },
    { who: '', text: 'Warden Calder kept both. His daughter keeps them now.' },
    { who: '', text: 'Tonight there is a third light, on the bell tower. It is teal, and nobody lit it.', art: 'tower' },
  ],
};

/** the epilogue to show after finishing `id` by its normal exit, or null (not a finale, a secret exit, or a campaign without one) */
export function endingFor(manifest, id, dest) {
  if (dest === 'secret' || !isFinale(manifest, id)) return null;
  const e = ENDINGS[campaignOf(id)];
  return e ? { campaign: campaignOf(id), ...e } : null;
}

/**
 * The campaign tally from the player's records (progress.records: the BEST of each map, so replaying never lowers it). One row per episode, one disc per main map (its rank, or null if never
 * finished), and the totals. `time` is the sum of each map's best time, not one sitting: the screen says so.
 */
export function tally(manifest, progress, campaign) {
  const rec = progress?.records ?? {}, all = manifest.maps.filter((m) => m.campaign === campaign);
  const eps = (manifest.campaigns.find((c) => c.id === campaign)?.episodes ?? []).map((e) => {
    const maps = all.filter((m) => m.episode === e.episode && m.kind === 'main').sort((a, b) => a.order - b.order).map((m) => ({ id: m.id, name: m.name, rank: rec[m.id]?.rank ?? null }));
    const secrets = all.filter((m) => m.episode === e.episode && m.kind === 'secret');
    return { episode: e.episode, title: e.title, maps, secretMaps: secrets.length, secretMapsFound: secrets.filter((m) => rec[m.id]).length };
  });
  const mains = all.filter((m) => m.kind === 'main'), secretMaps = all.filter((m) => m.kind === 'secret');
  const sum = (key) => all.reduce((n, m) => n + (rec[m.id]?.[key] ?? 0), 0);
  const ranks = Object.fromEntries(RANK_ORDER.map((r) => [r, mains.filter((m) => rec[m.id]?.rank === r).length]));
  return {
    episodes: eps, ranks,
    cleared: mains.filter((m) => rec[m.id]).length, total: mains.length,
    secretMaps: secretMaps.length, secretMapsFound: secretMaps.filter((m) => rec[m.id]).length,
    kills: sum('kills'), secrets: sum('secrets'), time: sum('time'),
    salvage: progress?.salvage ?? 0, upgrades: { ...(progress?.upgrades ?? {}) },
  };
}

// ---- the card sequence ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
export const TYPING = { cps: 42, lead: 0.9, hold: (text) => Math.max(3.2, 1.6 + text.length * 0.045) };      // characters typed per second, the pause before a card starts, and how long a typed card is held before the next comes by itself

/** the state at the start: card 0, nothing typed. `phase` is 'cards' until the last card has been read, then 'tally'. */
export const startSequence = () => ({ i: 0, t: 0, phase: 'cards' });
const typeTime = (card) => card.text.length / TYPING.cps;
const lastIndex = (cards) => cards.length - 1;

/** advance by dt seconds. Returns a NEW state (the input is not changed). */
export function stepSequence(s, cards, dt) {
  if (s.phase !== 'cards') return s;
  let { i, t } = s; t += dt;
  for (;;) {
    const c = cards[i], span = TYPING.lead + typeTime(c) + TYPING.hold(c.text);
    if (t < span) return { i, t, phase: 'cards' };
    if (i >= lastIndex(cards)) return { i, t: span, phase: 'tally' };
    t -= span; i++;
  }
}

/** a press (Enter, Space, a click, the pad's A): finish typing the card, or move to the next one, or leave the cards for the tally. */
export function pressSequence(s, cards) {
  if (s.phase !== 'cards') return s;
  const c = cards[s.i], typed = TYPING.lead + typeTime(c);
  if (s.t < typed) return { ...s, t: typed };
  if (s.i >= lastIndex(cards)) return { ...s, phase: 'tally' };
  return { i: s.i + 1, t: 0, phase: 'cards' };
}

/** the whole epilogue at once (Esc) */
export const skipSequence = (s, cards) => ({ i: lastIndex(cards), t: 0, phase: 'tally' });

/** what to draw: the card's speaker, the part of its text typed so far, and whether it is fully typed. In the tally phase the last card is shown whole. */
export function viewSequence(s, cards) {
  const c = cards[s.i], typed = Math.max(0, s.t - TYPING.lead) * TYPING.cps;
  const n = s.phase === 'tally' ? c.text.length : Math.min(c.text.length, Math.floor(typed));
  return { index: s.i, count: cards.length, who: c.who, text: c.text.slice(0, n), full: n >= c.text.length, tally: s.phase === 'tally' };
}
