// Sim event -> list of sounds. Pure data, no WebAudio, so Node tests can verify that every gameplay event is audible.
// pos = [x, z] in world metres for positional sounds; omitted = centred (player-local).
import { PICKUPS } from '../engine/defs.js';

/** Events the sim emits that are deliberately silent (with the reason), so a new event without a sound fails the coverage test. */
export const SILENT_EVENTS = {
  enemy_alert_idle: 'reserved',
  message: 'the UI plays RADIO_SOUND when the (queued) message is actually shown, not when the sim fires it',
  shot_impact_silent: 'reserved',
  shake: 'view-only effect (camera shake): the view reads it',
  arc: 'view-only: the lamp\'s lightning between the bodies it struck; the fire event carries the sound, enemy_hit the strike',
  bolt: 'view-only: the harpoon\'s streak and the bolt left in the wall; the fire event carries the sound, the impact event the strike',
  objective: 'shown as HUD text',
  trigger: 'bookkeeping: what a trigger DOES makes the sound',
  exit_lock: 'bookkeeping',
  phys_respawn: 'the dev Range only: a broken prop comes back, the view just puts it there',
  drop: 'a box a creature dropped appears (PT-025): the view shows it, taking it plays the ordinary pickup sound',
};
export const RADIO_SOUND = 'radio';

const WEAPON_FIRE = {
  flare: [{ id: 'flare_fire' }],
  rivet: [{ id: 'rivet_fire', gain: 0.8 }],
  scattergun: [{ id: 'scatter_fire' }, { id: 'pump', delay: 0.42 }],
  harpoon: [{ id: 'harpoon_fire' }, { id: 'harpoon_cycle', delay: 0.62 }],
  arc: [{ id: 'arc_fire', gain: 0.9 }],
  carbine: [{ id: 'carbine_fire', gain: 0.85 }],
  linethrower: [{ id: 'rocket_fire' }],
};
/** melee moves that land like a hammer (the others land like a fist) */
const HEAVY_SWING = new Set(['mallet', 'axe', 'boathook']);
const ENEMY_ALERT = { tollbearer: 'toll_alert', gaunt: 'gaunt_screech', bellhand: 'bell_alert', sexton: 'bell_alert', wardengraft: 'warden_roar', cantor: 'cantor_call', gill: 'gill_chirp', chorister: 'chorister_alert', graftmother: 'mother_roar' };
const ENEMY_WINDUP = { tollbearer: 'wheeze_windup', gaunt: 'gaunt_lunge', bellhand: 'bell_charge', sexton: 'wheeze_windup', wardengraft: 'warden_roar', cantor: 'cantor_call', gill: 'gill_spit', chorister: 'chorister_draw', graftmother: 'mother_roar' };

const at = (e) => (Number.isFinite(e.x) && Number.isFinite(e.z) ? [e.x, e.z] : undefined);

export function soundsForEvent(e) {
  switch (e.type) {
    case 'fire': return e.weapon === 'arc' && e.charge > 0.04 ? [{ id: 'arc_bolt', gain: 0.7 + 0.3 * e.charge }] : (WEAPON_FIRE[e.weapon] || WEAPON_FIRE.flare).map((s) => ({ ...s }));      // a charged lamp is a different, bigger sound
    case 'charge_start': return [{ id: e.weapon === 'arc' ? 'arc_charge' : 'fist_charge' }];
    case 'charge_full': return [{ id: e.weapon === 'arc' ? 'charge_full' : 'fist_charge', gain: e.weapon === 'arc' ? 1 : 0.6 }];
    case 'swing': return [{ id: e.heavy || HEAVY_SWING.has(e.kind) ? 'swing_heavy' : 'swing', gain: e.kind === 'bash' ? 0.8 : 1 }];
    case 'melee_hit': return [{ id: e.kind === 'heavy' || HEAVY_SWING.has(e.kind) ? 'melee_hit_heavy' : 'melee_hit', pos: at(e) }, ...(e.riposte ? [{ id: 'parry', gain: 0.6, delay: 0.02 }] : [])];
    case 'parry': return [{ id: 'parry' }];
    case 'guard_up': return [{ id: 'guard_up' }];
    case 'block': return [{ id: 'block' }];
    case 'guard_break': return [{ id: 'guard_break' }];
    case 'burn': return [{ id: 'burn_start', pos: at(e) }];
    case 'pin': return [{ id: 'pin_thunk', pos: at(e) }];
    case 'dry': return [{ id: 'dry_click' }];
    case 'weapon_switch': return [{ id: 'weapon_switch' }];
    case 'explode': return [{ id: (e.r ?? 0) > 4 ? 'rocket_boom' : 'flare_boom', pos: at(e) }];
    case 'headshot': return [{ id: 'head_tick', pos: at(e) }];
    case 'grav_grab': return [{ id: 'grav_grab' }];
    case 'grav_drop': return [{ id: 'grav_drop', gain: 0.8 }];
    case 'grav_throw': return [{ id: 'grav_throw' }];
    case 'grav_punt': return [{ id: 'grav_punt', gain: e.hit ? 1 : 0.55 }];
    case 'grav_punt_prop': return [{ id: 'grav_throw', gain: 0.6, pos: at(e) }];
    case 'grav_catch': return [{ id: 'grav_catch', pos: at(e) }];
    case 'shot_reflect': return [{ id: 'shot_reflect', pos: at(e) }];
    case 'shove_impact': return [{ id: 'shove_impact', pos: at(e) }];
    case 'phys_hit': return [{ id: 'phys_hit', pos: at(e) }];
    case 'phys_break': return [{ id: 'phys_break', pos: at(e) }];
    case 'saw_start': return [{ id: 'saw_start' }];
    case 'saw_rev': return [{ id: 'saw_rev', gain: 0.8 }];
    case 'saw_stop': return [{ id: 'saw_stop' }];
    case 'saw_hit': return [{ id: 'saw_hit', pos: at(e), gain: 0.7 }];
    case 'saw_kick': return [{ id: 'saw_kick', pos: at(e) }];
    case 'saw_stall': return [{ id: 'saw_stall' }];
    case 'saw_restart': return [{ id: 'saw_restart' }];
    case 'impact': return [{ id: 'impact', pos: at(e), gain: 0.6 }];
    case 'hurt': return [{ id: 'hurt', gain: Math.min(1, 0.5 + (e.amount || 10) / 30) }];
    case 'player_died': return [{ id: 'player_die' }];
    case 'pickup': {
      const t = PICKUPS[e.kind]?.type;
      return [{ id: t === 'health' ? 'pickup_health' : t === 'ammo' ? 'pickup_ammo' : t === 'armor' ? 'pickup_armor' : t === 'key' ? 'pickup_key' : 'pickup_ammo' }];
    }
    case 'weapon_pickup': return [{ id: 'pickup_ammo' }, { id: 'pump', delay: 0.15 }];
    case 'door_open': return [{ id: 'door_open', pos: at(e) }];
    case 'door_close': return [{ id: 'door_close', pos: at(e) }];
    case 'door_locked': return [{ id: 'door_locked', pos: at(e) }];
    case 'secret': return [{ id: 'secret' }];
    case 'enemy_alert': return [{ id: ENEMY_ALERT[e.kind] || 'toll_alert', pos: at(e) }];
    case 'enemy_windup': return [{ id: ENEMY_WINDUP[e.kind] || 'wheeze_windup', pos: at(e) }];
    case 'enemy_lunge': return [{ id: 'gaunt_lunge', pos: at(e) }];
    case 'enemy_strike': return [{ id: 'strike', pos: at(e) }];
    case 'armor_hit': return [{ id: 'armor_ping', pos: at(e), gain: 0.7 }];
    case 'shield_hit': return [{ id: 'shield_ping', pos: at(e), gain: 0.6 }];
    case 'node_severed': return [{ id: 'node_sever', pos: at(e) }];
    case 'warden_crash': return [{ id: 'warden_crash', pos: at(e) }];
    case 'sexton_channel': return [{ id: 'sexton_channel', pos: at(e) }];
    case 'enemy_revived': return [{ id: 'revive', pos: at(e) }];
    case 'pulse': return [{ id: 'tone_pulse', pos: at(e) }];
    case 'pulse_hit': return [{ id: 'pulse_hit' }];
    case 'switch': return [{ id: 'switch_click', pos: at(e) }];
    case 'switch_dead': return [{ id: 'switch_dead', pos: at(e) }];
    case 'dry_feed': return [{ id: 'switch_click', gain: 0.8 }];
    case 'switch_need': return [{ id: 'switch_dead', pos: at(e) }];
    case 'lights': return [{ id: 'lift_thunk', gain: 0.9 }, { id: 'gate_unlock', delay: 0.15 }];
    case 'door_remote': return [{ id: 'door_locked', pos: at(e), gain: 0.7 }];
    case 'sector_start': return [{ id: 'lift_rumble', pos: at(e) }];
    case 'sector_stop': return [{ id: 'lift_thunk', pos: at(e) }];
    case 'wade': return [{ id: 'splash' }];
    case 'alarm': return [{ id: 'alarm_bell' }];
    case 'enemy_spawn': return [{ id: e.kind === 'gill' ? 'mother_hatch' : ENEMY_ALERT[e.kind] || 'toll_alert', pos: at(e), gain: 0.8 }];
    case 'exit_unlock': return [{ id: 'gate_unlock' }];
    case 'exit_locked': return [{ id: 'door_locked', pos: at(e), gain: 0.8 }];
    case 'enemy_shot': return [{ id: e.kind === 'gill' ? 'gill_spit' : e.kind === 'chorister' ? 'chorister_note' : e.kind === 'graftmother' ? 'mother_spit' : 'toll_shot', pos: at(e) }];
    case 'suppress': return [{ id: 'shot_whiz', pos: at(e), gain: 0.8 }];
    case 'shot_impact': return [{ id: 'shot_impact', pos: at(e), gain: 0.7 }];
    case 'enemy_hit': return [{ id: 'enemy_hit', pos: at(e) }];
    case 'enemy_died': return [{ id: e.kind === 'gill' ? 'gill_die' : e.kind === 'chorister' ? 'chorister_die' : e.kind === 'graftmother' ? 'mother_die' : 'enemy_die', pos: at(e) }];
    case 'level_complete': return [{ id: 'level_complete' }];
    default: return [];
  }
}

/** stereo placement helper (also used by tests): -1 = hard left, +1 = hard right, for a listener at (lx, lz) facing yaw */
export function panFor(lx, lz, yaw, x, z) {
  const dx = x - lx, dz = z - lz, d = Math.hypot(dx, dz) || 1;
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);          // listener's right vector (matches the sim's convention)
  return (dx * rx + dz * rz) / d;
}
