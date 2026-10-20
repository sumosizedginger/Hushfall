// THE STORY COHERENCE PASS (PT-070, R17 of the road): the edits that came out of reading the whole Record in play order (design/story/RECORD.md, design/story/NOTES_PASS1.md). A table, so the record of what changed and why
// is the table itself. Idempotent (a line already changed is left alone). Three kinds of edit:
//   CHANGES  [old, new]            a line rewritten (any string in a map source: a message, an intro line, an outro, an objective); Marrow Quay has no source, so its JSON is edited
//   DELETE   [text]                the message whose text is exactly this is removed (its line leaves the source)
//   UNLESS   [id, condition]       the message with this id gets `unless` (a message that reminds of a locked gate must be silent once it is open); a condition is a string or a list (ANY holds), a list inside the list is an AND
// then the touched maps are compiled. The rules: design/LORE.md section 5. `node tools/dev/story-pass-2.mjs [--check]`
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..'), check = process.argv.includes('--check');

export const CHANGES = {
  // ---------------------------------------------------------------- Campaign One, Episode 1
  C1E1M01: [
    ["Ferry's dead in the water. Take Customs Hall up to Signal House. I'll keep the lamp lit.", "Ferry's dead in the water. Come up through Customs Hall to the Signal House: its mains are down and I am on the battery set at the lighthouse. I keep the lamp lit."],
  ],
  C1E1M02: [
    ["Calder, the hall's lamps are lit. Nobody lit them. Get inside, find the keys, and come up through the registry.", "Calder, I have the hall's plan sheet. Keys upstairs, registry on the way out. I can tell you where things are. I cannot tell you what is standing in them."],
    ["Riveters for the dock crews, sealed until the Tide Board signs. Nobody signed. Take them; hold the trigger and let them run.", "Riveters for the dock crews, sealed until the Tide Board signs. Nobody signed."],
  ],
  C1E1M03: [
    ["Calder, the market road. Everyone who ran ended up here. Keep to cover; the Bellhands will pick at you along the boardwalk.", "Calder, the boardwalk will have Bellhands on it. Keep to cover."],
    ["Scales set, stalls open, nobody behind them. They were herded, not slaughtered.", "Scales set, stalls open, nobody behind them."],
  ],
  C1E1M04: [
    ["Calder, the chandlery. The cellars run under half the quay. Somewhere down there is the drain gate; it needs the chandler's iron key.", "The cellars run under half the quay, Calder. Somewhere down there is the drain gate; it needs the chandler's iron key."],
    ["Lamplighter Hill is the way up. The survivors there signal by lamp: green for safe, red for bells.", "The survivors on the hill signal by lamp, Calder. Green is safe. Red is bells."],
    ["If you have found this stair, your father was not the only Calder who knew the harbour keeps secrets. Come up.", "If you have found this stair, your father was not the only Calder who knew the harbour keeps secrets. I kept this light before him. Come up."],
  ],
  C1E1S01: [
    ["A warm room under a dark lamp.", "A warm room under a lamp that flashes for no ship."],
    ["Welcome, Calder. Your father kept this cellar for the day the harbour needed one. It does now. Sit a minute.", "Welcome, Calder. I kept this cellar, and then your father did, for the day the harbour needed one. It does now. Sit a minute."],
    ["Every step of this stair was cut by hand. He climbed it every night to keep the lamp lit. Every night for thirty years.", "Every step of this stair was cut by hand. He climbed it every night for thirty years to keep the lamp lit."],
  ],
  C1E1M05: [
    ["Calder, the hill. There are people at the top: the lamps along the switchbacks are theirs. Get to the summit beacon.", "There are people at the top, Calder: the lamps along the switchbacks are theirs. Get to the summit beacon."],
    ["The lamplighter's mallet, left at the foot of the hill. A blow staggers what it strikes, and plate does not turn it. Keep it for the Warden.", "The lamplighter's mallet, left at the foot of the hill. A blow staggers what it strikes, and plate does not turn it."],
    ["Ferry Terminal is over the crest and down. Whatever the town could not carry, it left there.", "I can see the beacon from here, Calder. It is burning green."],
    ["Next: the Ferry Terminal. Whatever the town could not carry, it left there.", "Next: the Ferry Terminal. What the town could not carry, it left there."],
  ],
  C1E1M06: [
    ["Calder, the Ferry Terminal. The last boat never left the quay. The bow ramp is winched up: find the winch, the control cabin on the north quay.", "Calder, the bow ramp is winched up. The winch is in the control cabin on the north quay."],
    ["That is Tide-Warden plate: the front is nearly armour-proof. Do not stand in front of it. Let it charge, and let it hit something.", "That is Tide-Warden plate. Somebody on the Board wore that, once. The front is nearly armour-proof: let it charge, and let it hit something."],
  ],
  C1E1M07: [
    ["Next: the Bell Tower of St. Orrin. The transmission gave the hour.", "Next: the Bell Tower of St. Orrin, on the ridge."],
    ["Calder, the Signal House. The generator is down. Three fuses will bring it up: the cellar, the dormitory, the attic. Ammunition is short.", "The generator is down, Calder. Three fuses will bring it up: the cellar, the dormitory, the attic. Ammunition is short."],
    ["The lamp on the lighthouse is lit, Calder. Your father wrote that a lit lamp holds the tone back. I cannot say it does. I keep it lit.", "The lamp here is lit, Calder. Your father wrote that a lit lamp holds the tone back. I cannot say it does. I keep it lit."],
    ["It is dark on purpose. They cut the lamps so we cannot see them. The lanterns are yours: stay near them.", "It is dark on purpose. They cut the lamps so we cannot see them. Stay near the lanterns."],
    ["Beds. All made. Whatever slept here got up in the night and did not undo them.", "Beds. All made. Whoever slept here got up in the night and did not undo them."],
  ],
  C1E1M08: [
    ["The tower is silent. The signal did not stop: it went somewhere else. The hatch is open.", "The tower is silent, Calder, and the signal did not stop. I have its bearing: the Salt Works. The hatch is open."],
    ["Calder, the Bell Tower. It has rung since the transmission, and the signal goes up through it. Climb: the tower is a spiral, a long stair. Whatever rings it is at the top.", "Calder, the bell has rung since the transmission, and the signal goes up through it. The tower is one long spiral stair. Something at the top is ringing it."],
    ["Port Marrow is quiet. The signal is not: it is going somewhere. Episode one ends here.", "Port Marrow is quiet. The signal is not."],
  ],
  // ---------------------------------------------------------------- Episode 2
  C1E2M01: [
    ["Calder, the Salt Works. Past that door is open ground and the Brine Gate at the far end. The road runs straight at it. Do not take the road.", "Calder, I have the Works plans out. Past that door is open ground and the Brine Gate at the far end, and the road runs straight at it. Do not take the road."],
  ],
  C1E2M02: [
    ["Calder, the Evaporation Pans. White ground to the horizon and one roof in the middle: the pump station. Everything between us and it is working.", "White ground to the horizon, Calder, and one roof in the middle: the pump station. Everything between you and it is working."],
    ["That is the hall rolling up. Whatever it hung up there has been waiting a long time for the pumps.", "That is the hall rolling up. What it hung up there has waited a long time for the pumps."],
    ["RESERVE CISTERN. DRY SINCE THE SECOND FIRING. THE FOREMAN KEPT HIS OWN SUPPLIES HERE AND PAINTED THE DOOR OVER.", "RESERVE CISTERN. DRY SINCE THE KILNS WERE LIT. THE FOREMAN KEPT HIS OWN SUPPLIES HERE AND PAINTED THE DOOR OVER."],
  ],
  C1E2M03: [
    ["Calder, the Rail Yard. The trains here shipped the grafted inland. A consist is parked across the shed, three wagons wide, and each wagon has its own lever.", "The trains here shipped the grafted inland, Calder. A consist is parked across the shed, three wagons wide, and each wagon has its own lever."],
    ["Pull one and the way east opens, and so does whatever is waiting there.", "Pull one and the way east opens, and so does what is waiting there."],
  ],
  C1E2M04: [
    ["Calder, Kiln Row. They fire the shells here. The flue is dampered shut, and the handles were taken out and hidden so nobody could draw it. Brass first: the charging hall.", "They fire the shells here, Calder. The flue is dampered shut and the handles are hidden. Brass first: the charging hall."],
    ["The flue is drawing. That is the cold coming up the stack. Whatever they hid below the Works, it is much colder than it should be.", "The flue is drawing. That is the cold coming up the stack. What they hid below the Works is colder than it should be."],
  ],
  C1E2S01: [
    ["Racks and racks. Look at the dates on the crates: all of them before the firing. They knew, Calder. Someone here knew for years.", "Racks and racks. Look at the dates on the crates: all of them from before the kilns were lit. They knew. Someone here knew for years."],
    ["SEVEN YEARS BEFORE THE FIRING. THE HUM IN THE CHALK IS NOT GEOLOGY: IT HAS A RHYTHM.", "SEVEN YEARS BEFORE THE KILNS WERE LIT. THE HUM IN THE CHALK IS NOT GEOLOGY: IT HAS A RHYTHM."],
    ["SEVEN YEARS BEFORE THE KILNS WERE FIRST LIT. THE HUM", "SEVEN YEARS BEFORE THE KILNS WERE LIT. THE HUM"],
    ["It is rolling up. Cold air is coming out. Whatever they kept, they kept it a long time.", "It is rolling up. Cold air is coming out of it. They kept it a long time."],
  ],
  C1E2M05: [
    ["Calder, the Cradle Annex. This is where the grafts are made. Do not run, do not fire. Nothing in here is awake yet.", "This is where the grafts are made, Calder. Do not run, do not fire. Nothing in here is awake yet."],
    ["They are hatching! Not people. Not anything I know. Aim UP: they are flying.", "They are hatching. Not people, and nothing I know. Aim up: they are flying."],
    ["The line is stopped. Calder, those were not drones in the aisle: they were hatchlings. The Vael are growing their own now.", "The line is stopped. Calder, those Gills in the aisle were hatchlings. The Vael are growing their own now."],
  ],
  C1E2M06: [
    ["Calder, the Pump Cathedral. The pump that drains the pans is in the middle of the nave. The cage on the east side is the only way up to the catwalks. Cross the floor first.", "The pump that drains the pans is in the middle of the nave, Calder. The cage on the east side is the only way up to the catwalks. Cross the floor first."],
    ["Next: the Slurry Undercroft. Whatever they drained comes out down there.", "Next: the Slurry Undercroft. What they drained comes out down there."],
  ],
  C1E2M07: [
    ["The sump heart. Every pipe in the Works ends in that wall. The cradles are warm, Calder: this is where the line starts.", "The sump heart. The cradles are warm, Calder: this is where the line starts."],
    ["Calder, the Slurry Undercroft. They cut the lights down here so nobody would see what drains in. Four breakers, one in each hall. Each one you throw wakes the hall ahead.", "Calder, the lights are cut down here. Four breakers, one in each hall. Each one you throw wakes the hall ahead."],
  ],
  C1E2M08: [
    ["The feeders are gone. All of them. Hit it, Calder, hit it with everything.", "The feeders are gone. All of them. Now hit it with everything."],
    ["Calder, the Grafting Floor. The whole Works feeds this room. Whatever runs it is at the north end. Break its feeders first: they hatch its guards and half-shield it.", "Calder, the thing that runs the line is at the north end. Break its feeders first: they hatch its guards and half-shield it."],
    ["There. Three cradle feeders, one on each wing and one behind the conveyor. Each hatches a Gill every so often. Break them and she is bare.", "There. Three cradle feeders, one on each wing and one behind the conveyor. Each hatches a Gill every so often. Break them and it is bare."],
    ["The line is broken. Calder, whatever the Mother was feeding has landed. Episode three is a crater, and the Choir ships are in it.", "The line is broken, Calder. The set is reading something large down in a crater east of the Works."],
    ["Episode three: Landing Scar. Whatever the Mother was feeding, it has landed.", "Next: the Landing Scar, east of the Works."],
  ],
  // ---------------------------------------------------------------- Episode 3
  C1E3M01: [
    ["Calder, the Landing Scar. Three nights ago something came down in that bowl. The ship is in the east wall. There is no other way to it.", "Calder, I am reading the ship off its own hum, so you get its shape and not its contents. It came down in that bowl three nights ago, in the east wall."],
  ],
  C1E3M03: [
    ["Calder, the gardens. Whatever the ship keeps alive it keeps here. The floor is not safe to stand on. Watch it: it swells before it blooms.", "Calder, the ship keeps what it keeps alive here. The floor is not safe to stand on. Watch it: it swells before it blooms."],
  ],
  C1E3M04: [
    ["Calder, the nave. There is no roof left: the ship tore it open to sing at the sky. Whatever sits at the far end is why the gate is sealed.", "Calder, there is no roof left: the ship tore it open to sing at the sky. Something sits at the far end, and it is why the gate is sealed."],
    ["Break the Choir: the Mother on the dais. The gate waits for her", "Break the Choir: the Weeping Mother on the dais. The gate waits"],
  ],
  C1E3S01: [
    ["Calder, I have lost the hum. Not faded: gone. There is no signal where you are standing. I do not know whether to be glad.", "Calder, I have lost the hum. It did not fade; it stopped. There is nothing from the ship where you are standing. I do not know whether to be glad."],
  ],
  C1E3M05: [
    ["Calder, the Loom. Every door in there listens. Make a noise near one and it will not open for you until it has heard nothing for a while. Kill quietly, or wait.", "Every door in there listens, Calder. Make a noise near one and it will not open for you until it has heard nothing for a while. Kill quietly, or wait."],
    ["Another of the tall ones, a wheel of bells behind it. Whatever stands near it takes half. Kill it first.", "Another of the tall ones, a wheel of bells behind it. Anything near it takes half. Kill it first."],
    ["That is the end of the tuning. Whatever was being tuned is still above us, singing.", "That is the end of the tuning. What was being tuned is still above us, singing."],
  ],
  C1E3M06: [
    ["Do what you do near them from behind a pew.", "Fight from behind a pew."],
    ["Standing in rows like the stops of an organ. Asleep, or what the ship calls asleep. Whatever you do near them, do it from behind a pew.", "Standing in rows like the stops of an organ. Asleep, or what the ship calls asleep. Do what you do near them from behind a pew."],
    ["Past the conductor. Whatever they were rehearsing, they were rehearsing for this.", "Past the conductor. They were rehearsing for this."],
  ],
  C1E3M07: [
    ["Calder, the Foundry. Whatever the Choir wants more of, it grows here. I am reading four vats on a ring round a furnace. Break them and the way out opens.", "Calder, the Choir grows what it wants more of here. I am reading four vats on a ring round a furnace. Break them and the way out opens."],
    ["All four vats are dead. The north passage is open. Whatever was casting bell-bearers is cold.", "All four vats are dead. The north passage is open. The furnace is going cold."],
  ],
  C1E3M08: [
    ["The reeds are silent. One ring now, and it is angry. Hit it with everything.", "The reeds are silent. One ring now, and it is angry. Stay behind a pillar for the ring, then hit it."],
    ["Calder, the Throat. Every ship in the fleet sings through this chamber. Whatever sings it is at the far end, and I read four reeds feeding it. Cut the reeds first.", "Calder, every ship in the fleet sings through this chamber. The singer is at the far end, and I read four reeds feeding it. Cut the reeds first."],
    ["The voice is gone, Calder. The ships are quiet. Whatever they were calling heard that. We should not be here when it answers.", "The voice is gone, Calder. The ships are quiet. They were calling something, and it heard that. We should not be here when it answers."],
    ["Episode three is done. The Choir ships fall silent. Whatever they were calling, it heard.", "Next: the Ascent Tether, where the cable goes up from the foot of the world."],
  ],
  // ---------------------------------------------------------------- Episode 4
  C1E4M01: [
    ["Calder, the Ascent Tether. The Vael freight goes up this cable and so do you. One road, round and round it. Nothing on it moves slowly except the loads.", "The Vael freight goes up this cable, Calder, and the call went up with it. One road, round and round it. Nothing on it moves slowly except the loads."],
  ],
  C1E4M02: [
    ["Calder, the Wreck Belt: wrecks of earlier invasions. Step on a lit plate and it throws you across the gap. Steer a little, shoot as you go. If you miss, the sky puts you back.", "Those are wrecks of earlier invasions, Calder. Step on a lit plate and it throws you across the gap. Steer a little, shoot as you go. If you miss, the sky puts you back."],
    ["Rings inside rings. Everything here is a different world. The hub has the fuse, and so does whatever guards it.", "Rings inside rings. Everything here is from a different world. The hub has the fuse, and so does the thing guarding it."],
  ],
  C1E4M03: [
    ["Calder, the Cold Dock: the Vael parked their fleet here. Two bays are open to the dark and the air in them is gone. A lock lets you in and out, but not both doors at once.", "The Vael parked their fleet here, Calder. Two bays are open to the dark and the air in them is gone. A lock lets you in and out, but not both doors at once."],
  ],
  C1E4M04: [
    ["Calder, the Mirror Array: where the Gate is focused. Light does the work here. Use turns a mirror a quarter step. A mirror has a face and a back: light that meets the back stops.", "This is where the Gate is focused, Calder. Light does the work here. Use turns a mirror a quarter step. A mirror has a face and a back: light that meets the back stops."],
    ["The light wants somewhere to go.", "Mirrors on plinths, a bright face and a dark back to each. Nothing in the array is lit yet."],
  ],
  C1E4S01: [
    ["I held the Pier Nine lock the winter the first ships came. A door is held from one side or the other. I chose the side I could see and stayed. You may choose differently.", "I held Pier Nine's lock when the first ships came, and was taken up the cable. A door is held from one side or the other. I chose the side I could see. You may choose differently."],
    ["I held Pier Nine's lock when the first ships came. They took me up the cable. A door is held from one side or the other. I chose the side I could see. You may choose differently.", "I held Pier Nine's lock when the first ships came, and was taken up the cable. A door is held from one side or the other. I chose the side I could see. You may choose differently."],
  ],
  C1E4M05: [
    ["Calder, the Drift Orchard. The Vael grow Tollbearers in orbit. The moss has no grip: you will slide where you push, and the plates throw you across. Landing is the whole art.", "The moss has no grip, Calder: you will slide where you push, and the plates throw you across. Landing is the whole art."],
  ],
  C1E4M06: [
    ["The hall opens. Above the last steps the light stops being a rumour and becomes a thing you can look at.", "The hall opens. Above the last steps the glare gathers into a shape."],
    ["Calder, the Approach. Five ranks, each a step higher, each with its own guard. The gaps in the screens do not line up. The tunnels in the flanks go round the first two.", "Five ranks, Calder, each a step higher, each with its own guard. The gaps in the screens do not line up. The tunnels in the flanks go round the first two."],
    ["The Mother is in the round room west of this rank: kill her", "The Weeping Mother is in the round room west of this rank: kill her"],
    ["The Mother is down. The way out is open: the Gate yard, straight ahead", "The Weeping Mother is down. The way out is open: the Gate yard, straight ahead"],
  ],
  C1E4M07: [
    ["The last door is behind you. The Gate is the colour of the inside of a bell, and it is not quiet.", "The last door is behind you. The Gate is near enough to feel in the floor, and it is not quiet."],
    ["Calder, the foot of the Hollow Stair. You will hear them long before you see them. There is a lever on every landing; the Gate opens for all four.", "You will hear them long before you see them, Calder. There is a lever on every landing; the Gate opens for all four."],
  ],
  C1E4M08: [
    ["The last seal is gone. The shield is gone. Hit it with everything.", "The last seal is gone, and the shield with it. Now it can be hurt."],
    ["Calder, the Gate Warden. Three seals hold its shield up: shoot them, or turn its own beam onto one with the plinths. Its eye opens before the beam. Stone stops it.", "Three seals hold its shield up, Calder: shoot them, or turn its own beam onto one with the plinths. Its eye opens before the beam. Stone stops it."],
    ["It is down. The Gate is open, Calder. The way out is the way in. Whatever is on the other side has stopped being quiet.", "It is down. The Gate is open, Calder. The way out is the way in, and the far side has stopped being quiet."],
  ],
  // ---------------------------------------------------------------- Campaign Two
  C2M02: [],
  C2M03: [
    ["You do not sing. Good. I keep the dead, and they shut me in the bell house for not singing at a burying. The north gate answers to me. It is open.", "You do not sing. Good. I keep the dead, and they shut me in the bell house for not singing at a burying. The north gate is mine, and it is open. Go on to the Fields."],
  ],
  C2M04: [
    ["A brass plate hammered onto the foot, in our letters: PELLEW, S. MATE. Somebody here had that courtesy. I count eight more plates in this row.", "A brass plate hammered onto the foot, in our letters: AMBLER, T. BOSUN. Somebody here had that courtesy. I count eight more plates in this row."],
  ],
  C2M01: [
    ["Third night of the Hush. Skipper took her out past the bar to get clear. The Gate opened under the keel. We did not sink. We arrived.", "Third night of the Hush. Skipper took her out past the bar to get clear. The sea opened under the keel. We did not sink. We arrived."],
  ],
  C2M08: [
    ["A hollow spire, a round well in the middle of it and a stair going down the wall. Cold air comes up it, and a sound. That is where the sound comes from.", "A hollow spire, a round well in the middle of it and a stair going down the wall. Cold air comes up it, and a sound. I think that is what holds the Gate open. I am going down."],
    ["Below the spire is the Deep. The first act of the descent ends here.", "Below the spire is the Deep."],
  ],
  C2M09: [
    ["The lantern is L. Gaunts and Gills find you by eye: from 6 metres with it out, 24 with it lit. Tollbearers follow the Hush and do not care about light.", "Gaunts and Gills find you by eye: from 6 metres with the lantern out, 24 with it lit. Tollbearers follow the Hush and do not care about light."],
  ],
  C2M10: [
    ["The well is an echo well: a noise made over it comes back from the walls. Whatever you do not want heard, do it somewhere else.", "The well is an echo well: a noise made over it comes back from the walls. Keep anything quiet away from it."],
  ],
  C2M11: [
    ["The seat is empty. The stair behind it goes down, and whichever way she came, someone in this house will tell the next what she did.", "The seat is empty. The stair behind it goes down, and whichever way you came, someone in this house will tell the next what you did."],
  ],
  C2M13: [
    ["The lantern is L, an oil a second, a tin is thirty. Gaunts, Gills and Zealots find you by eye: 6 metres in the dark, 24 with the lantern lit. Tollbearers do not care.", "The lantern burns an oil a second, and a tin is thirty. Gaunts, Gills and Zealots find you by eye: 6 metres in the dark, 24 with the lantern lit. Tollbearers do not care."],
  ],
  C2M14: [
    ["Behind her the garden is still ringing, very faintly, in a chord she did not play.", "Behind you the garden is still ringing, very faintly, in a chord you did not play."],
  ],
  C2M16: [
    ["A corridor, straight, the first straight thing in the whole Deep. Cold air at the far end. Whatever is below this is not warm.", "A corridor, straight, the first straight thing in the whole Deep. Cold air at the far end. What is below this is not warm."],
  ],
  C2M17: [
    ["The drum gate turned on its two bolts and let the red in. The floor beyond it goes down in wide steps, and the light on the ribs is beating a little faster.", "The drum gate turned on its two bolts and let the red in. Beyond it the ribs are lit a little faster."],
  ],
  C2M18: [
    ["A cathedral with no floor. An island in the middle, two rings round it, and eight bridges over a drop I cannot see the bottom of. Every bridge lights one segment at a time.", "A cathedral with no floor, and a drop I cannot see the bottom of. Every bridge lights one segment at a time."],
  ],
  C2M22: [
    ["The lift came to the bottom and stopped. The shaft is a long way down. The east door of the hall had unlocked itself by then, and nobody was in the room to hear it.", "The lift came to the bottom and stopped. The shaft is a long way down. The east door of the hall had unlocked itself by then."],
  ],
  C2M24: [
    ["A bowl of seats, sixteen singers, one conductor over the podium.", "A bowl of seats, nine singers, one conductor over the podium."],
    ["A conductor sits down between movements. This was the chair. Whoever it was is not on the podium now, and the baton is on the podium. Draw the line.", "A conductor sits down between movements. This was the chair. Whoever it was is not on the podium now, and the baton is on the podium."],
  ],
  C2S02: [
    ["The pier was the same length going back. The lamp behind her was lit, and then it was not behind her any more.", "The pier was the same length going back. Behind you the post was bare, and the lamp in your hand was lit."],
  ],
  C2M26: [
    ["The HUD says how far a shot will carry. The lantern is seen from far off.", "A shot carries far in here. So does a lit lantern."],
    ["The mark on the screen says how far the gun in your hand carries. The arc lamp, the fork and a blow carry almost nowhere. A lit lantern is seen from far off by whatever sees.", "Gunfire carries far in here. The arc lamp, the fork and a blow carry almost nowhere. A lit lantern is seen from far off by anything that sees."],
    ["The refectory was a long table laid for forty, and nobody at it. The corridor beyond the table goes on down into the root, and there is a sound at the end of it that is very slow.", "The refectory was a long table laid for forty. The corridor beyond it goes down into the root, and there is a sound at the end of it that is very slow."],
  ],
  C2M29: [
    ["Every weapon is on you. The ammunition boxes are here and on the top tier. Oil on the road, a mortar in four places on the rim. A lit lantern (L) cuts a ring to six tenths.", "Every weapon is on you. The ammunition boxes are here and on the top tier. Oil on the road, a mortar in four places on the rim. A lit lantern cuts a ring to three-fifths."],
  ],
  C2M30: [
    ["The Hive, and nothing moving in it. The organs hang where they hung and none of them swells. Whatever kept the beat has stopped.", "The Hive, and nothing moving in it. The organs hang where they hung and none of them swells. The beat has stopped."],
    ["At the Gate: light the lamp (L), and keep it lit.", "At the Gate: light the lamp, and keep it lit."],
  ],
};

/** the epilogue and the cards live in src/game/ending.js; one edit there */
export const CARD_CHANGES = [
  ['src/game/ending.js', "I can see them from the tower.", "I can see them from the lighthouse."],
];

export const DELETE = {
  C1E1M02: ["Fishmarket Rows next. That is where the town tried to run. Mind the lanes."],
  C1E1M03: ["That is the way out. After it, the Drowned Chandlery: the cellars flood on the ebb. Bring a light, and courage."],
  C1E1M06: ["The Signal House is next: the ridge antenna is still answering. Whatever comes down that ramp, it is not the only one."],
};

/** a man who is not there does not speak as if present: Warden Calder's lines in the secret rooms are notes he left (the Record sets notes apart from voices) */
export const SPEAKERS = {
  C1E2M04: [['tunnel', "WARDEN CALDER'S NOTE"]],
  C1E2M07: [['drain', "WARDEN CALDER'S NOTE"]],
  C1E2S01: [['arrive', "WARDEN CALDER'S NOTE"]],
};

/** which reminder is held by what, by message id (the text of a line is rewritten by later passes; the id is not). A condition is a string or a list (ANY holds); a list inside the list is an AND. */
export const UNLESS = {
  C1E1M07: [["radio-locked", ["msg:vael"]]],
  C1E1M08: [["ring", ["msg:quiet"]]],
  C2M03: [["bridge", ["msg:gate"]]],
  C2M09: [["drum", ["msg:open"]]],
  C2M13: [["sealedhint", ["msg:winch"]]],
  C2M17: [["gate", [["msg:relay-s", "msg:relay-n"]]]],
  C2M18: [["door", ["msg:cut"]]],
  C2M19: [["door", ["key:iron"]]],
  C2M20: [["exit", ["msg:relay"]]],
  C2M21: [["exit", ["msg:v3"]]],
  C2M22: [["door", ["msg:gone"]]],
  C2M25: [["door-shut", ["msg:door-open"]]],
  C2M26: [["gate", ["msg:r3"]]],
  C2M27: [["exit", ["msg:far-lip"]]],
  C2M28: [["exit", ["msg:ninth"]]],
};

// ------------------------------------------------------------------------------------------------ the machinery
const esc = (t) => JSON.stringify(t).slice(1, -1);
/** which quote encloses position `pos` of the text `s` (a source holds the lines in JS strings: an apostrophe in new text must be escaped to match the literal it lands in) */
const BS = String.fromCharCode(92), NL = String.fromCharCode(10);
const quoteAt = (s, pos) => { const ls = s.lastIndexOf(NL, pos) + 1; let q = null; for (let i = ls; i < pos; i++) { const c = s[i]; if (q) { if (c === BS) i++; else if (c === q) q = null; } else if (c === "'" || c === '"' || c === '`') q = c; } return q; };
const escFor = (q, t) => (q === "'" ? t.split("'").join(BS + "'") : q === '"' ? t.split('"').join(BS + '"') : q === '`' ? t.split('`').join(BS + '`').split('${').join(BS + '${') : t);
const fileOf = (id) => { const src = path.join(root, 'maps-src', id + '.level.mjs'); return fs.existsSync(src) ? { file: src, src: true } : { file: path.join(root, 'maps', id + '.json'), src: false }; };
const formsOf = (a, b, useSrc) => (useSrc ? [[a, b], [a.replace(/'/g, "\\'"), b.replace(/'/g, "\\'")]] : [[esc(a), esc(b)]]);
const mapJson = (id) => JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'));
const idOf = (id, text) => {                      // an anchor may be named by the text it had before or after this table rewrote it
  const alts = [text]; for (const [a, b] of CHANGES[id] ?? []) { if (a === text) alts.push(b); if (b === text) alts.push(a); }
  const m = mapJson(id).messages.find((x) => alts.includes(x.text)); if (!m) throw new Error(`${id}: no message with the text "${text.slice(0, 60)}"`); return m.id;
};

const touched = new Set(), missing = [], problems = []; let changed = 0;
const MARK_A = '// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened', MARK_B = '// ---- end PT-070 unless';

for (const [id, pairs] of Object.entries(CHANGES)) {
  const { file, src } = fileOf(id); let s = fs.readFileSync(file, 'utf8'), dirty = false;
  const msgs = fs.existsSync(path.join(root, 'maps', id + '.json')) ? mapJson(id).messages : [];
  for (const [a, b] of pairs) {
    if (a === b) continue;
    for (const m of msgs) if (m.text.includes(a) && m.text.replace(a, b).length > 180) problems.push(`${id}: the message ${m.id} would be ${m.text.replace(a, b).length} characters (limit 180): ${b.slice(0, 50)}`);
    if (src) {
      let did = false;
      for (const aForm of [a, a.split("'").join(BS + "'")]) { let from = 0, i; while ((i = s.indexOf(aForm, from)) >= 0) { const r = escFor(quoteAt(s, i), b); s = s.slice(0, i) + r + s.slice(i + aForm.length); from = i + r.length; did = true; } }
      if (did) { changed++; dirty = true; } else if (![b, b.split("'").join(BS + "'")].some((y) => s.includes(y))) missing.push(`${id}: ${a.slice(0, 70)}`);
    } else {
      const forms = formsOf(a, b, false), hit = forms.find(([x]) => s.includes(x));
      if (hit) { s = s.split(hit[0]).join(hit[1]); changed++; dirty = true; }
      else if (!forms.some(([, y]) => s.includes(y))) missing.push(`${id}: ${a.slice(0, 70)}`);
    }
  }
  if (dirty) { touched.add(id); if (!check) fs.writeFileSync(file, s); }
}

for (const [id, texts] of Object.entries(DELETE)) {
  const { file, src } = fileOf(id); if (!src) { problems.push(`${id}: delete needs a source`); continue; }
  let lines = fs.readFileSync(file, 'utf8').split('\n'), dirty = false;
  for (const text of texts) {
    const forms = [text, text.replace(/'/g, "\\'")], idx = lines.map((l, i) => (forms.some((f) => l.includes(f)) ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) continue;                       // already gone
    if (idx.length > 1) { problems.push(`${id}: the text to delete is on ${idx.length} lines: ${text.slice(0, 50)}`); continue; }
    const line = lines[idx[0]].trim(); if (!/^(msg\(|\{ ?id:)/.test(line) || !/(\)|\}),?\s*$/.test(line.replace(/\/\/.*$/, '').trim())) { problems.push(`${id}: the message is not on a line of its own: ${line.slice(0, 80)}`); continue; }
    lines.splice(idx[0], 1); changed++; dirty = true;
  }
  if (dirty) { touched.add(id); if (!check) fs.writeFileSync(file, lines.join('\n')); }
}

for (const [id, list] of Object.entries(UNLESS)) {
  const { file, src } = fileOf(id); if (!src) { problems.push(`${id}: unless needs a source`); continue; }
  const entries = list.map(([mid, conds]) => { if (!mapJson(id).messages.some((x) => x.id === mid)) problems.push(`${id}: unless names a message that does not exist: ${mid}`); return `${JSON.stringify(mid)}: ${JSON.stringify(conds)}`; });
  const block = `${MARK_A}\nfor (const [mid, unless] of Object.entries({ ${entries.join(', ')} })) MAP.messages.find((m) => m.id === mid).unless = unless;\n${MARK_B}\n`;
  let s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf(MARK_A), b = s.indexOf(MARK_B);
  let t;
  if (a >= 0 && b > a) t = s.slice(0, a) + block + s.slice(b + MARK_B.length + 1);
  else { const anchor = 'export default MAP;'; if (s.split(anchor).length !== 2) { problems.push(`${id}: no single 'export default MAP;'`); continue; } t = s.replace(anchor, block + anchor); }
  if (t !== s) { changed++; touched.add(id); if (!check) fs.writeFileSync(file, t); }
}

for (const [id, list] of Object.entries(SPEAKERS)) {
  const { file, src } = fileOf(id); if (!src) { problems.push(`${id}: speakers need a source`); continue; }
  const lines = fs.readFileSync(file, 'utf8').split(String.fromCharCode(10)); let dirty = false;
  for (const [mid, who] of list) {
    const i = lines.findIndex((l) => l.includes(`id: '${mid}'`) && /speaker: /.test(l)); if (i < 0) { problems.push(`${id}: no message line for ${mid}`); continue; }
    const t = lines[i].replace(/speaker: ('[^']*'|"[^"]*")/, `speaker: ${JSON.stringify(who)}`); if (t !== lines[i]) { lines[i] = t; dirty = true; changed++; }
  }
  if (dirty) { touched.add(id); if (!check) fs.writeFileSync(file, lines.join(String.fromCharCode(10))); }
}

for (const [file, a, b] of CARD_CHANGES) {
  const f = path.join(root, file); const s = fs.readFileSync(f, 'utf8');
  if (s.includes(a)) { changed++; if (!check) fs.writeFileSync(f, s.split(a).join(b)); }
  else if (!s.includes(b)) missing.push(`${file}: ${a.slice(0, 60)}`);
}

console.log(`${changed} edit(s) ${check ? 'would be made' : 'made'} in ${touched.size} map(s)${missing.length ? '\nNOT FOUND:\n  ' + missing.join('\n  ') : ''}${problems.length ? '\nPROBLEMS:\n  ' + problems.join('\n  ') : ''}`);
if (!check && touched.size) for (const id of touched) { if (!fileOf(id).src) continue; const r = spawnSync(process.execPath, [path.join(root, 'tools/mapkit/compile.mjs'), id], { cwd: root, encoding: 'utf8' }); console.log(`compile ${id}: ${r.status === 0 ? 'ok' : 'FAILED ' + (r.stderr || r.stdout).slice(0, 300)}`); }
if (check && (changed || problems.length)) process.exit(1);
if (problems.length) process.exit(1);         // NOT FOUND is only a note: the table is a record, and a line a later pass (tools/dev/story-voice.mjs) or the author changed again is no longer there
