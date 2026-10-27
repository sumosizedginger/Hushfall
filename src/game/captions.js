// SOUND CAPTIONS (PT-071, R20 accessibility): the sounds that matter, as words on the screen, with where they came from. Off by default (settings.captions). Pure: no DOM, no sim; it reads drained events, the way the audio layer does.
// Every event the audio layer handles (src/audio/events.js) is either captioned here or listed in NO_CAPTION with the reason, so a new event cannot slip by (tests/captions.test.js reads events.js and checks).
import { ENEMIES } from '../engine/defs.js';

const name = (k) => ENEMIES[k]?.name ?? 'Something';
const T = (text, o = {}) => ({ text, ...o });

/** event type -> { text (string or (e) => string), danger (a threat to the player: kept longest and never dropped), where (add a direction) } */
export const CAPTIONS = {
  // threats
  enemy_windup: T((e) => `${name(e.kind)} winds up`, { danger: true, where: true }),
  enemy_lunge: T((e) => `${name(e.kind)} lunges`, { danger: true, where: true }),
  enemy_lurch: T((e) => `${name(e.kind)} groans and surges`, { danger: true, where: true }),          // PT-076 (brain.js)
  enemy_call_windup: T((e) => `${name(e.kind)} lifts its bell`, { danger: true, where: true }),
  enemy_call: T((e) => `${name(e.kind)} rings for help`, { where: true }),
  enemy_dodge: T((e) => `${name(e.kind)} dodges`, { where: true }),
  enemy_cower: T((e) => `${name(e.kind)} cries out and runs`, { where: true }),
  enemy_strike: T((e) => `${name(e.kind)} strikes`, { danger: true, where: true }),
  enemy_shot: T((e) => `${name(e.kind)} fires`, { danger: true, where: true }),
  suppress: T('A round goes past you', { danger: true, where: true }),
  snipe_tell: T('A line of light finds you: move when it stops', { danger: true, where: true }),
  snipe_shot: T('The Marksman fires', { danger: true, where: true }),
  tear_windup: T('The Weeping Mother lobs a tear', { danger: true, where: true }),
  tear_land: T('A tear lands: a pool spreads', { where: true }),
  pulse: T('A ring of sound goes out: take cover', { danger: true, where: true }),
  pulse_back: T('The ring comes back off the wall', { danger: true }),
  resonant_ring: T('A Resonant sends out a ring', { danger: true, where: true }),
  resonator_ring: T('A fork rings: sleepers wake', { where: true }),
  spike_warn: T('Spikes are about to rise', { danger: true, where: true }),
  spike_strike: T('Spikes strike', { where: true }),
  bell_strike: T('The clapper strikes: a ring crosses the floor', { danger: true }),
  bell_slam: T('The clapper slams the floor', { danger: true }),
  bell_crush: T('The clapper crushes: move out from under it', { danger: true }),
  bell_fall: T('The chain gives way: the clapper falls'),
  bell_last: T('The Last Note: the floor rolls', { danger: true }),
  load_warn: T('Freight is about to fall (orange light)', { danger: true, where: true }),
  load_land: T('Freight lands', { where: true }),
  sweep_tell: T('The Gate Warden\'s eye opens: a beam follows', { danger: true, where: true }),
  sweep_hit: T('The beam burns you', { danger: true }),
  spore_warn: T('A spore bed is about to bloom', { danger: true, where: true }),
  spore_bloom: T('A spore bed blooms', { where: true }),
  sexton_channel: T('A Sexton raises the dead', { danger: true, where: true }),
  enemy_revived: T('Something gets up again', { where: true }),
  vat_swell: T('A vat swells: it is about to hatch something', { where: true }),
  vat_birth: T('A vat drops a creature', { where: true }),
  brood_swell: T('A sac swells', { where: true }),
  brood_birth: T('A creature drops from a sac', { where: true }),
  warden_crash: T('The Warden-Graft crashes into stone: it is stunned', { where: true }),
  explode: T('An explosion', { where: true }),
  tremor: T('The ground shakes'),
  vacuum_enter: T('The air is leaving', { danger: true }),
  vacuum_leave: T('Air again'),
  // alerts and the world
  enemy_alert: T((e) => `${name(e.kind)} has noticed you`, { where: true }),
  alarm: T('An alarm bell rings: everything is awake', { danger: true }),
  mender_start: T('A Mender begins to mend', { where: true }),
  node_severed: T('A node breaks', { where: true }),
  seal_shatter: T('A seal shatters', { where: true }),
  door_cycling: T('The lock is cycling'),
  door_listen: T('The door is listening: stay quiet', { where: true }),
  door_remote: T('Something opens somewhere'),
  door_open: T((e) => (e.breath ? 'A breathing gate opens' : 'A door opens'), { where: true }),
  door_close: T((e) => (e.breath ? 'A breathing gate shuts' : 'A door shuts'), { where: true }),
  exit_unlock: T('The exit is open'),
  secret: T('A secret panel opens'),
  switch: T('A lever clicks'),
  sector_start: T('Something starts to move', { where: true }),
  sector_stop: T('It stops moving', { where: true }),
  car_depart: T('A car pulls out', { where: true }),
  car_arrive: T('A car pulls in', { where: true }),
  receiver_lit: T('A receiver lights', { where: true }),
  receiver_dark: T('A receiver goes dark', { where: true }),
  chime_play: T('The tree plays a phrase: answer it on the chimes'),
  chime_note: T('A chime sounds', { where: true }),
  chime_seq: T('The phrase is answered'),
  lights: T('The lights change'),
  lamp_dry: T('The lantern is out of oil'),
};

/** every other event the audio layer knows, and why it has no caption */
export const NO_CAPTION = {
  'the player\'s own action or feedback (the screen, the gun and the HUD already show it)': ['fire', 'charge_start', 'charge_full', 'swing', 'melee_hit', 'parry', 'guard_up', 'block', 'guard_break', 'headshot', 'dry', 'dry_feed', 'load_cycle', 'load_empty', 'load_hit', 'load_none', 'saw_hit', 'saw_kick', 'saw_restart', 'saw_stall', 'saw_start', 'saw_stop', 'grav_catch', 'grav_drop', 'grav_grab', 'grav_punt', 'grav_punt_prop', 'grav_throw', 'lamp', 'lamp_out', 'mirror_turn', 'weapon_switch', 'weapon_pickup', 'pickup', 'pin', 'wade', 'air_land', 'void_fall', 'vent_launch'],
  'shown by the HUD or a toast already': ['hurt', 'armor_hit', 'burn', 'door_locked', 'exit_locked', 'switch_need', 'innocent', 'player_died', 'level_complete', 'folk_fear'],
  'a hit the player causes or sees (the creature shows it)': ['enemy_hit', 'enemy_died', 'enemy_spawn', 'shield_hit', 'ward_hit', 'shot_impact', 'shot_reflect', 'impact', 'pulse_hit', 'phys_break', 'phys_hit', 'shove_impact', 'switch_dead', 'door_breath'],
  'shell or story cue (the scene carries its own subtitle)': ['cue', 'graft'],
  'covered by the caption of the tell before it': ['tear_lob'],
};

/** where a sound came from, for a listener at (px, pz) facing yaw: 'close' under 2.5 m, else one of eight directions */
export function dirLabel(px, pz, yaw, x, z) {
  const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
  if (!(d >= 2.5)) return 'close';
  const side = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / d, fwd = (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d;
  const a = Math.atan2(side, fwd), bin = Math.round(a / (Math.PI / 4));                       // 0 ahead, 2 right, 4 behind, -2 left
  return ['ahead', 'ahead right', 'right', 'behind right', 'behind', 'behind left', 'left', 'ahead left'][((bin % 8) + 8) % 8];
}

/** one event -> { text, danger } or null (an event with no caption, or one that is too far to matter) */
export function captionFor(e, player) {
  const c = CAPTIONS[e?.type]; if (!c) return null;
  if (e.type === 'door_open' || e.type === 'door_close') { if (!e.breath) return null; }       // an ordinary door is shown by the door
  let text = typeof c.text === 'function' ? c.text(e) : c.text;
  if (c.where && player && Number.isFinite(e.x) && Number.isFinite(e.z)) {
    const d = Math.hypot(e.x - player.x, e.z - player.z); if (d > 60 && !c.danger) return null;
    text += `, ${dirLabel(player.x, player.z, player.yaw ?? 0, e.x, e.z)}`;
  }
  return { text, danger: !!c.danger };
}

/** the lines on the screen: at most three, each for 3.4 s (5 s for a threat); the same words inside 1.2 s are one line, kept fresh; a threat is never pushed out by something that is only news */
export class CaptionFeed {
  constructor() { this.items = []; }
  push(cap, now) {
    if (!cap) return;
    const same = this.items.find((i) => i.text === cap.text && now - i.at < 1.2); if (same) { same.at = now; return; }
    this.items.push({ ...cap, at: now });
    while (this.items.length > 3) { const k = this.items.findIndex((i) => !i.danger); this.items.splice(k >= 0 ? k : 0, 1); }
  }
  lines(now) { this.items = this.items.filter((i) => now - i.at < (i.danger ? 5 : 3.4)); return this.items.map((i) => ({ text: i.text, danger: i.danger })); }
  clear() { this.items = []; }
}
