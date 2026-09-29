// Sim event -> list of sounds. Pure data, no WebAudio, so Node tests can verify that every gameplay event is audible.
// pos = [x, z] in world metres for positional sounds; omitted = centred (player-local).
import { PICKUPS } from '../engine/defs.js';

/** Events the sim emits that are deliberately silent (with the reason), so a new event without a sound fails the coverage test. */
export const SILENT_EVENTS = { enemy_alert_idle: 'reserved' };

const WEAPON_FIRE = {
  flare: [{ id: 'flare_fire' }],
  scattergun: [{ id: 'scatter_fire' }, { id: 'pump', delay: 0.42 }],
};
const ENEMY_ALERT = { tollbearer: 'toll_alert', gaunt: 'gaunt_screech' };
const ENEMY_WINDUP = { tollbearer: 'wheeze_windup', gaunt: 'gaunt_lunge' };

const at = (e) => (Number.isFinite(e.x) && Number.isFinite(e.z) ? [e.x, e.z] : undefined);

export function soundsForEvent(e) {
  switch (e.type) {
    case 'fire': return (WEAPON_FIRE[e.weapon] || WEAPON_FIRE.flare).map((s) => ({ ...s }));
    case 'dry': return [{ id: 'dry_click' }];
    case 'weapon_switch': return [{ id: 'weapon_switch' }];
    case 'explode': return [{ id: 'flare_boom', pos: at(e) }];
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
    case 'enemy_hit': return [{ id: 'enemy_hit', pos: at(e) }];
    case 'enemy_died': return [{ id: 'enemy_die', pos: at(e) }];
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
