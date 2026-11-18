// THE EVENT CATALOGUE (item C2 of design/ASSESSMENT_2026-11-10.md, in its test-only form; Session 1 of design/OPUS_HANDOFF.md).
// Every event name the simulation can emit is written down here, so a new one is added on purpose, and for each one the test asks the
// consumers: the audio layer must sound it or declare it silent (SILENT_EVENTS), and a sounded event must have a caption or a line in
// NO_CAPTION. A gap found in the code as it stands is listed in KNOWN_GAPS (with why) instead of being fixed here: src is not edited by a test.
// The test also reports the other way round: names the audio layer or the captions handle that the simulation never emits.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, flatSource } from './helpers.js';
import { soundsForEvent, SILENT_EVENTS } from '../src/audio/events.js';
import { CAPTIONS, NO_CAPTION } from '../src/game/captions.js';

/** every string literal in the type slot of emit(w, <expr>, ...) in src/engine (for a ternary only the result branches count) */
export function emittedEvents() {
  const files = fs.readdirSync(path.join(ROOT, 'src/engine')).filter((f) => f.endsWith('.js'));
  const names = new Set(),
    nonLiteral = [];
  for (const f of files) {
    const src = flatSource('src/engine/' + f);
    for (const m of src.matchAll(/emit\(w, ?([^,)]+)[,)]/g)) {
      const slot = m[1].includes('?') ? m[1].slice(m[1].indexOf('?')) : m[1],
        lits = [...slot.matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]);
      if (!lits.length) nonLiteral.push(f + ': ' + m[0]);
      lits.forEach((l) => names.add(l));
    }
  }
  return { names: [...names].sort(), nonLiteral };
}

// the frozen list: a new event in src/engine fails the first test until it is added here (and its sound and caption are decided)
const CATALOGUE = `
air_land alarm arc armor_hit beat_off bell_crush bell_fall bell_last bell_slam bell_strike block bolt brood_birth brood_swell burn
car_arrive car_depart charge_full charge_start chime_note chime_play chime_played chime_seq choice cinematic cue dmg door_breath door_close
door_cycling door_listen door_locked door_open door_remote drop dry dry_feed enemy_alert enemy_call enemy_call_windup enemy_cower enemy_died
enemy_dodge enemy_hit enemy_lunge enemy_lurch enemy_revived enemy_shot enemy_spawn enemy_strike enemy_windup exit_lock exit_locked
exit_unlock explode fire folk_fear fork_struck graft grav_catch grav_drop grav_grab grav_punt grav_punt_prop grav_throw guard_break guard_up headshot
hurt impact innocent lamp lamp_dry lamp_out level_complete lights load_cycle load_empty load_hit load_land load_none load_warn melee_hit
mender_start mender_stop message mirror_turn node_severed objective open_hit parry phys_break phys_hit phys_respawn pickup pin player_died pool_dry
pulse pulse_back pulse_hit receiver_dark receiver_lit resonant_ring resonator_ring saw_hit saw_kick saw_restart saw_rev saw_stall saw_start
saw_stop seal_shatter secret sector_start sector_stop sexton_channel shake shield_hit shot_impact shot_reflect shove_impact silence
snipe_shot snipe_tell song_broken spike_strike spike_warn spore_bloom spore_fade spore_warn suppress sweep_end sweep_hit sweep_tell swing switch
switch_dead switch_need tear_land tear_lob tear_windup tremor trigger vacuum_enter vacuum_leave vat_birth vat_swell vent_launch void_fall
wade ward_hit warden_crash weapon_pickup weapon_switch
`
  .trim()
  .split(/\s+/);

// gaps in the code as it stands, found by this test on 2026-11-10; each is a finding for the owner, not something a test may fix
const KNOWN_GAPS = {
  silent: {},
  uncaptioned: {},
};

const audible = (type) => soundsForEvent({ type, kind: 'tollbearer', weapon: 'flare', x: 1, z: 2 }).length > 0;
const captioned = Object.values(NO_CAPTION).flat();

test('every event the simulation emits is in the catalogue, and the catalogue holds nothing it no longer emits', () => {
  const { names, nonLiteral } = emittedEvents();
  assert.deepEqual(nonLiteral, [], 'an emit with a type the test cannot read');
  assert.ok(names.length > 100, 'found the emit sites: ' + names.length);
  assert.deepEqual(
    names.filter((n) => !CATALOGUE.includes(n)),
    [],
    'a new event: add it to CATALOGUE in tests/event-catalogue.test.js and decide its sound and caption',
  );
  assert.deepEqual(
    CATALOGUE.filter((n) => !names.includes(n)),
    [],
    'the catalogue names an event nothing emits any more: take it out',
  );
  assert.equal(new Set(CATALOGUE).size, CATALOGUE.length, 'an event is listed twice');
});

test('every catalogued event is heard or declared silent', () => {
  const gaps = CATALOGUE.filter((t) => !audible(t) && !(t in SILENT_EVENTS) && !(t in KNOWN_GAPS.silent));
  assert.deepEqual(gaps, [], 'an event makes no sound and is not in SILENT_EVENTS (src/audio/events.js)');
  for (const t of Object.keys(KNOWN_GAPS.silent)) assert.ok(!audible(t) && !(t in SILENT_EVENTS), `${t} is no longer a gap: take it out of KNOWN_GAPS`);
});

test('every catalogued event that makes a sound has a caption or a line in NO_CAPTION', () => {
  const gaps = CATALOGUE.filter((t) => audible(t) && !CAPTIONS[t] && !captioned.includes(t) && !(t in KNOWN_GAPS.uncaptioned));
  assert.deepEqual(gaps, [], 'a sounded event has no caption and no NO_CAPTION line (src/game/captions.js)');
  for (const t of Object.keys(KNOWN_GAPS.uncaptioned)) assert.ok(audible(t) && !CAPTIONS[t] && !captioned.includes(t), `${t} is no longer a gap: take it out of KNOWN_GAPS`);
});

test('report: names the consumers handle that the simulation never emits (shell events and dead handlers)', () => {
  const handled = [...Object.keys(SILENT_EVENTS), ...Object.keys(CAPTIONS), ...captioned];
  const unemitted = [...new Set(handled)].filter((n) => !CATALOGUE.includes(n)).sort();
  if (process.env.EVENT_REPORT) console.log('handled but not emitted by src/engine:', unemitted.join(' '));
  assert.ok(Array.isArray(unemitted));
});
