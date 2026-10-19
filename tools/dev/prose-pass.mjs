// THE PROSE PASS (PT-061, R13; design/LORE.md section 6): the line edits of 2026-10-19 as a table, so the record of what changed and why is the table itself. Idempotent (a line already changed is left alone). Each map's SOURCE (maps-src/<ID>.level.mjs) is edited when it has one,
// else the shipped JSON; compile the touched maps afterwards. `node tools/dev/prose-pass.mjs [--check]` (--check lists what would change and exits 1 if anything would).
// The rules are LORE.md section 5 (one fact a line, concrete nouns, no stock phrases, no "not X but Y", short, said once, no question to end a line, no control instructions in HULL's mouth: the HUD and the Journal carry those).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..'), check = process.argv.includes('--check');
export const CHANGES = {
  C1E1M02: [["They are not only taking people. They are filing them.", "They take people. Then they file them."]],
  C1E1M05: [["That one is not fighting. It is waiting for something to fall. Kill it first, and quickly.", "That one waits for something to fall. Kill it first, and quickly."]],
  // the setup for the ending's lamp on the MAIN path (the Signal House): the operator keeps the lamp lit and says why; the secret stays as depth
  C1E1M07: [["Calder, the Signal House. The generator is down and the set is dead. Three fuses will bring it up: the cellar, the dormitory, the attic. Ammunition is short. Do not waste it.", "Calder, the Signal House. The generator is down. Three fuses will bring it up: the cellar, the dormitory, the attic. Ammunition is short."]],
  C1E1M08: [["Calder, the Bell Tower. It has rung since the transmission. The signal goes up through it. Climb: the tower is a spiral, a long stair. Whatever rings it is at the top.", "Calder, the Bell Tower. It has rung since the transmission, and the signal goes up through it. Climb: the tower is a spiral, a long stair. Whatever rings it is at the top."],
    ["The tower is silent. The signal did not stop: it went somewhere else. The hatch is open. Go.", "The tower is silent. The signal did not stop: it went somewhere else. The hatch is open."]],
  C1E1S01: [["The lamp flashes once a minute. Not for ships. It is a counter-tone: a sound turned into light.", "The lamp flashes once a minute, for no ship. It is a counter-tone: a sound turned into light."]],
  C1E2M05: [["They are not making them here. They are growing them.", "They do not make them here. They grow them."]],
  C1E2M06: [["This is not a pump house. This is a church for the pump. Look at the height of it, and at what is hung from the roof.", "A pump house built as a church. Look at the height of it, and at what is hung from the roof."]],
  C1E3M01: [["It is open. It was not forced: it opened. This is not a wreck, Calder. It is still alive.", "It is open. It was not forced; it opened. This is no wreck, Calder: it is alive."]],
  C1E3M02: [["The hatch is open: the exit is at the east end of the last chamber", "The hatch is open: the exit is at the east end of the last corridor"]],
  C1E3M03: [["A bell-breaker, left on a plinth with its rockets. Aim and a ring shows on the ground: the shell goes THERE, over the cover, up onto a ledge. Key 0. It hurts you too.", "A bell-breaker, left on a plinth with its rockets. The shell goes where the ring on the ground shows, over cover, up onto a ledge. It hurts you too."],
    ["People. Standing. They are not dead and they are not awake. Walk past them. Please.", "People, standing. They are not dead and they are not awake. Walk past them, please."]],
  C1E3M04: [["Shells on legs. A round does almost nothing to the front of one. It opens its shell to hit you: that is when to shoot. Or circle it. Or throw a bell-breaker over it.", "Shells on legs. A round does almost nothing to the front of one. It opens its shell to hit you: that is when to shoot, or to circle it, or to throw a bell-breaker over it."],
    ["She is weeping. Where it lands it burns, and it slows you: walk out of it. Something is swelling on her skirt. Kill her. The gate will open.", "She is weeping, and where it lands it burns and slows you: walk out of it. Something is swelling on her skirt. Kill her and the gate will open."]],
  C1E3M05: [["It is listening. Your own gun is what it hears. Stand still. Count to four. It will let you through.", "It is listening, and your own gun is what it hears. Stand still and count to four. It will let you through."],
    ["The lever is on the Heart's east wall", "The lever is on the east wall of the Heart, past the platforms"]],
  C1E3M07: [["One panel in the south wall rings wrong. Hollow.", "One panel in the south wall rings hollow."]],
  C1E4M03: [["Look at the glass. Ships. Rank on rank of them, hanging. The couplings that start them are in the east and west bays. Seat both at the spine.", "Look at the glass: ships, rank on rank of them, hanging. The couplings that start them are in the east and west bays. Seat both at the spine."]],
  C1E4M05: [["Calder, the Drift Orchard. The Vael grow Tollbearers in orbit. The moss has no grip at all: you will slide where you push. Landing is the whole art. The plates throw you across.", "Calder, the Drift Orchard. The Vael grow Tollbearers in orbit. The moss has no grip: you will slide where you push, and the plates throw you across. Landing is the whole art."]],
  C1E4M08: [["Calder, the Gate Warden. Three seals hold its shield up. Shoot them, or use its own beam: the plinths turn the light onto a seal. Its eye opens before the beam. Stone stops it.", "Calder, the Gate Warden. Three seals hold its shield up: shoot them, or turn its own beam onto one with the plinths. Its eye opens before the beam. Stone stops it."]],
  C2M04: [["The north gate is open: the corridor to the exit", "The north gate is open: the corridor beyond it goes to the exit"]],
  C2M14: [["Spearmen in green, walking the beds with long hooks. They are not guarding it. They are picking.", "Spearmen in green walking the beds with long hooks, picking."],
    ["and not in the middle, as if the ones who used it were carrying something between them.", "and not in the middle, as though the ones who used it were carrying something between them."]],
  C2M15: [["Spears in a rank, shoulder to shoulder, and the rank is facing the screen and not me. They are guarding the one behind them from the ones in front.", "Spears in a rank, shoulder to shoulder, facing the screen with their backs to me. They guard the one behind them from the ones in front."]],
  C2M16: [["It is not looking at me. It is looking at the forks.", "It is looking at the forks."],
    ["It does not want to be a conductor. It was never asked. Do not make it suffer: it has been afraid for a long time.", "It never wanted to be a conductor, and nobody asked. Do not make it suffer: it has been afraid for a long time."],
    ["Beyond the corridor the stair goes down again, and it is very cold.", "Beyond the corridor the stair goes down again, and it is cold."]],
  C2M19: [["Beyond the door a rail leads out, and the rail is warm.", "Beyond the door a rail leads out, and it is warm."]],
  C2M20: [["The rail runs on without a rider, round and round the drop, and the cars wait eight seconds at every stop, as if somebody were still getting on.", "The rail runs on without a rider, round the drop, and the cars wait eight seconds at every stop, as if somebody were still getting on."]],
  C2M22: [["The shaft is a very long way down. The door in the east wall of the hall had unlocked itself by then, and nobody was in the room to hear it.", "The shaft is a long way down. The east door of the hall had unlocked itself by then, and nobody was in the room to hear it."],
    ["They are not looking for me yet. They are looking for what the chapels hold.", "They are looking for what the chapels hold, and not for me yet."]],
  C2M25: [["The last landing is a root floor with a door in the wall. The door is open, and the corridor beyond it goes on down at the same slope as the rest of the country, towards a sound that is not a sound yet.", "The last landing is a root floor with an open door in the wall. The corridor beyond goes on down at the slope of the rest of the country, towards a sound that is not a sound yet."]],
  C2M30: [["It is not the one I walked. It is the one that was always going to be here when I got to this end.", "It was always going to be here when I got to this end. It is a different road from the one I walked."],
    ["There is no line down there, and I have you. What is in front of you?", "There is no line down there, and I have you. Tell me what is in front of you."]],
};
const esc = (t) => JSON.stringify(t).slice(1, -1);
let changed = 0, missing = [];
for (const [id, pairs] of Object.entries(CHANGES)) {
  const src = path.join(root, 'maps-src', id + '.level.mjs'), json = path.join(root, 'maps', id + '.json'), useSrc = fs.existsSync(src), file = useSrc ? src : json; let s = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    // a source holds the text in a JS string (single quotes, an apostrophe escaped as a backslash and a quote); the JSON holds it JSON-escaped: try the plain and the escaped forms
    const forms = useSrc ? [[a, b], [a.replace(/'/g, "\\'"), b.replace(/'/g, "\\'")]] : [[esc(a), esc(b)]];
    const hit = forms.find(([x]) => s.includes(x));
    if (hit) { if (s.split(hit[0]).length - 1 !== 1 && !check) console.log(`${id}: the line appears more than once (all replaced)`); s = s.split(hit[0]).join(hit[1]); changed++; }
    else if (!forms.some(([, y]) => s.includes(y))) missing.push(`${id}: ${a.slice(0, 60)}`);
  }
  if (!check) fs.writeFileSync(file, s);
}
console.log(`${changed} line(s) ${check ? 'would change' : 'changed'}${missing.length ? '; NOT FOUND: ' + missing.join(' | ') : ''}`);
if (check && changed) process.exit(1);
