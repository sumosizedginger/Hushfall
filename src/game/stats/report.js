// THE STATS SCREENS' QUESTIONS (PT-077): every number the game shows about your play is one SQL query here, asked of the stats database when a screen opens (nothing is cached: the database is small and local).
// Every query takes `:pt`: a playthrough's number for "this playthrough", or NULL for "lifetime" (everything ever recorded): `WHERE :pt IS NULL OR playthrough_id = :pt` serves both with one text.
// The results are plain objects; the story is a few sentences built only from those facts. No DOM.

/** the runs in scope, as a CTE ("common table expression": a named, temporary result the rest of the query uses) */
const RUNS = 'WITH r AS (SELECT * FROM level_runs WHERE :pt IS NULL OR playthrough_id = :pt)';

export const Q = {
  overview: `${RUNS}
SELECT (SELECT COUNT(*) FROM r) AS attempts,
       (SELECT COUNT(DISTINCT level_id) FROM r WHERE outcome = 'complete') AS finished,
       (SELECT COALESCE(SUM(seconds), 0) FROM r) AS seconds,
       (SELECT COUNT(*) FROM deaths d JOIN r ON r.run_id = d.run_id) AS deaths,
       (SELECT COUNT(*) FROM kills k JOIN r ON r.run_id = k.run_id JOIN sources s ON s.source_id = k.victim WHERE s.peaceful = 0) AS kills,
       (SELECT COUNT(*) FROM kills k JOIN r ON r.run_id = k.run_id JOIN sources s ON s.source_id = k.victim WHERE s.peaceful = 1) AS innocents,
       (SELECT COALESCE(SUM(h.amount), 0) FROM hits_taken h JOIN r ON r.run_id = h.run_id) AS damage_taken,
       (SELECT COUNT(DISTINCT playthrough_id) FROM r) AS playthroughs`,
  guns: `${RUNS}
SELECT u.weapon, w.name, SUM(u.attacks_fired) AS attacks, SUM(u.attacks_connected) AS connected, SUM(u.targets_hit) AS targets, ROUND(SUM(u.damage)) AS damage,
       (SELECT COUNT(*) FROM kills k JOIN r r2 ON r2.run_id = k.run_id WHERE k.weapon = u.weapon) AS kills
FROM weapon_use u JOIN r ON r.run_id = u.run_id JOIN weapons w ON w.weapon = u.weapon
GROUP BY u.weapon
HAVING SUM(u.attacks_fired) > 0 OR SUM(u.damage) > 0
ORDER BY attacks DESC, damage DESC`,
  hurt: `${RUNS}
SELECT s.source_id, s.name, s.type, SUM(h.amount) AS damage, COUNT(*) AS hits
FROM hits_taken h JOIN r ON r.run_id = h.run_id JOIN sources s ON s.source_id = h.source
GROUP BY h.source ORDER BY damage DESC LIMIT 8`,
  hurtTypes: `${RUNS}
SELECT s.type, SUM(h.amount) AS damage
FROM hits_taken h JOIN r ON r.run_id = h.run_id JOIN sources s ON s.source_id = h.source
GROUP BY s.type ORDER BY damage DESC`,
  deathsByLevel: `${RUNS}
SELECT l.level_id, l.name, COUNT(d.death_id) AS deaths, COUNT(*) AS attempts
FROM r JOIN levels l ON l.level_id = r.level_id LEFT JOIN deaths d ON d.run_id = r.run_id
GROUP BY r.level_id HAVING COUNT(d.death_id) > 0 ORDER BY deaths DESC, attempts DESC LIMIT 8`,
  killers: `${RUNS}
SELECT s.name, COUNT(*) AS deaths
FROM deaths d JOIN r ON r.run_id = d.run_id JOIN sources s ON s.source_id = d.killer
GROUP BY d.killer ORDER BY deaths DESC LIMIT 6`,
  /** PT-080, the death map: every death's level and where (metres), for the plans on the stats screen */
  deathSpots: `${RUNS}
SELECT r.level_id, d.x, d.z FROM deaths d JOIN r ON r.run_id = d.run_id ORDER BY d.death_id`,
  recentDeaths: `${RUNS}
SELECT l.level_id, l.name AS level, s.name AS killer, d.x, d.z, d.at_second
FROM deaths d JOIN r ON r.run_id = d.run_id JOIN levels l ON l.level_id = r.level_id JOIN sources s ON s.source_id = d.killer
ORDER BY d.death_id DESC LIMIT 8`,
  killsByCreature: `${RUNS}
SELECT s.name, s.is_boss, COUNT(*) AS kills
FROM kills k JOIN r ON r.run_id = k.run_id JOIN sources s ON s.source_id = k.victim
WHERE s.peaceful = 0 GROUP BY k.victim ORDER BY kills DESC LIMIT 12`,
  /** the lowest health reached in a level you went on to finish (a low point in an attempt that ended in death was not survived) */
  closestCall: `${RUNS}
SELECT l.name AS level, h.hp_after AS hp
FROM hits_taken h JOIN r ON r.run_id = h.run_id JOIN levels l ON l.level_id = r.level_id
WHERE r.outcome = 'complete' AND h.hp_after > 0
ORDER BY h.hp_after ASC, h.hit_id ASC LIMIT 1`,
  /** "gaps and islands": a running count of deaths numbers every stretch between two deaths; count the finished levels in each */
  streak: `${RUNS},
ordered AS (SELECT run_id, outcome, SUM(CASE WHEN outcome = 'dead' THEN 1 ELSE 0 END) OVER (ORDER BY run_id) AS stretch FROM r WHERE outcome IN ('complete', 'dead'))
SELECT COALESCE(MAX(levels), 0) AS longest FROM (SELECT stretch, COUNT(*) AS levels FROM ordered WHERE outcome = 'complete' GROUP BY stretch)`,
  longestLevel: `${RUNS}
SELECT l.name, r.seconds FROM r JOIN levels l ON l.level_id = r.level_id WHERE r.outcome = 'complete' ORDER BY r.seconds DESC LIMIT 1`,
  bestAgainstPar: `${RUNS}
SELECT l.name, r.seconds, l.par_seconds AS par FROM r JOIN levels l ON l.level_id = r.level_id
WHERE r.outcome = 'complete' AND l.par_seconds IS NOT NULL ORDER BY r.seconds * 1.0 / l.par_seconds ASC LIMIT 1`,
  parByChapter: `${RUNS}
SELECT l.campaign, l.episode, ROUND(AVG(r.seconds)) AS mine, ROUND(AVG(l.par_seconds)) AS par, COUNT(*) AS levels
FROM r JOIN levels l ON l.level_id = r.level_id
WHERE r.outcome = 'complete' GROUP BY l.campaign, l.episode ORDER BY l.campaign, l.episode`,
  /** a window function: RANK() within each chapter, by attacks fired */
  favouriteByChapter: `${RUNS}
SELECT campaign, episode, name, attacks FROM (
  SELECT l.campaign, l.episode, w.name, SUM(u.attacks_fired) AS attacks,
         RANK() OVER (PARTITION BY l.campaign, l.episode ORDER BY SUM(u.attacks_fired) DESC) AS place
  FROM weapon_use u JOIN r ON r.run_id = u.run_id JOIN levels l ON l.level_id = r.level_id JOIN weapons w ON w.weapon = u.weapon
  GROUP BY l.campaign, l.episode, u.weapon HAVING SUM(u.attacks_fired) > 0
) WHERE place = 1 ORDER BY campaign, episode`,
  // ---- one run (the card after a level, the death screen)
  run: `SELECT r.run_id, r.level_id, r.seconds, r.outcome, l.name, l.par_seconds AS par FROM level_runs r JOIN levels l ON l.level_id = r.level_id WHERE r.run_id = :run`,
  runKills: `SELECT COUNT(*) AS kills FROM kills k JOIN sources s ON s.source_id = k.victim WHERE k.run_id = :run AND s.peaceful = 0`,
  runGun: `SELECT w.name, u.attacks_fired AS attacks, u.attacks_connected AS connected FROM weapon_use u JOIN weapons w ON w.weapon = u.weapon WHERE u.run_id = :run AND u.attacks_fired > 0 ORDER BY u.attacks_fired DESC LIMIT 1`,
  runHurt: `SELECT s.name, SUM(h.amount) AS damage FROM hits_taken h JOIN sources s ON s.source_id = h.source WHERE h.run_id = :run GROUP BY h.source ORDER BY damage DESC LIMIT 1`,
  runLowest: `SELECT MIN(hp_after) AS hp FROM hits_taken WHERE run_id = :run AND hp_after > 0`,
  levelHistory: `SELECT COUNT(*) AS attempts, SUM(CASE WHEN outcome = 'dead' THEN 1 ELSE 0 END) AS deaths
FROM level_runs WHERE level_id = :level AND (:pt IS NULL OR playthrough_id = :pt)`,
  runDeath: `SELECT s.name AS killer FROM deaths d JOIN sources s ON s.source_id = d.killer WHERE d.run_id = :run`,
};

const pt = (p) => ({ ':pt': p ?? null });

/** the whole rundown for a scope (a playthrough's number, or null for lifetime) */
export function rundown(db, scope) {
  const P = pt(scope), one = (q) => db.get(q, P) ?? {}, all = (q) => db.all(q, P);
  const overview = one(Q.overview);
  const guns = all(Q.guns).map((g) => ({ ...g, accuracy: g.attacks > 0 ? Math.round((g.connected * 100) / g.attacks) : null }));
  return {
    scope: scope ?? null, overview, guns,
    hurt: all(Q.hurt), hurtTypes: all(Q.hurtTypes), deathsByLevel: all(Q.deathsByLevel), deathSpots: all(Q.deathSpots), killers: all(Q.killers), recentDeaths: all(Q.recentDeaths), killsByCreature: all(Q.killsByCreature),
    records: { closest: db.get(Q.closestCall, P), streak: Number(one(Q.streak).longest ?? 0), longest: db.get(Q.longestLevel, P), bestPar: db.get(Q.bestAgainstPar, P) },
    parByChapter: all(Q.parByChapter), favourites: all(Q.favouriteByChapter),
  };
}

/** the short card about ONE run (after a level, or on the death screen) */
export function runCard(db, runId, scope) {
  const R = { ':run': runId }, run = db.get(Q.run, R); if (!run) return null;
  const gun = db.get(Q.runGun, R), hurt = db.get(Q.runHurt, R), low = db.get(Q.runLowest, R)?.hp ?? null, hist = db.get(Q.levelHistory, { ':level': run.level_id, ...pt(scope) }) ?? {};
  return { level: run.name, seconds: run.seconds, outcome: run.outcome, par: run.par, kills: Number(db.get(Q.runKills, R)?.kills ?? 0),
    gun: gun ? { name: gun.name, attacks: gun.attacks, accuracy: gun.attacks > 0 ? Math.round((gun.connected * 100) / gun.attacks) : null } : null,
    hurt: hurt ? { name: hurt.name, damage: hurt.damage } : null, lowest: low, attempts: Number(hist.attempts ?? 0), deaths: Number(hist.deaths ?? 0), killer: db.get(Q.runDeath, R)?.killer ?? null };
}

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
/** a creature is "the Tollbearer"; a hazard's name already reads as the start of a sentence ("Toxic residue", "A falling container", "Your own blast") */
const subject = (name, type) => (type === 'creature' && !/^The /.test(name) ? 'The ' + name : name);
const gunName = (name) => (name === 'Fists' ? 'your fists' : 'the ' + name);
/** the run as a story, from the facts only (design/STATS_DATABASE.md, the end of a campaign) */
export function story(m) {
  const o = m.overview ?? {}, lines = [];
  if (!o.attempts) return ['Nothing recorded yet.'];
  lines.push(`You finished ${plural(o.finished, 'level')} in ${plural(o.attempts, 'attempt')}, and died ${o.deaths === 0 ? 'not once' : o.deaths === 1 ? 'once' : o.deaths + ' times'}.`);
  if (m.hurt[0]) lines.push(`${subject(m.hurt[0].name, m.hurt[0].type)} hurt you more than anything else: ${Math.round(m.hurt[0].damage)} damage.`);
  if (m.deathsByLevel[0] && m.deathsByLevel[0].deaths >= 2) lines.push(`${m.deathsByLevel[0].name} claimed you ${m.deathsByLevel[0].deaths} times.`);
  const g = m.guns.find((x) => x.attacks > 0);
  if (g) lines.push(`You used ${gunName(g.name)} ${g.attacks} times${g.accuracy != null ? `, and ${g.accuracy}% of them found something` : ''}.`);
  const k = m.killsByCreature[0]; if (k) lines.push(`You put down ${plural(k.kills, k.name)}${m.killsByCreature.length > 1 ? `, more than any other kind` : ''}.`);
  if (m.records.closest) lines.push(`Your closest call: ${m.records.closest.hp} health left on ${m.records.closest.level}, and you still finished it.`);
  if (m.records.streak >= 2) lines.push(`Your longest stretch without dying: ${m.records.streak} levels.`);
  if (o.innocents > 0) lines.push(`${plural(o.innocents, 'of the quiet folk', 'of the quiet folk')} died by your hand.`);
  if (o.finished > 0) lines.push(o.deaths > 0 ? 'Every time you fell, you got back up.' : 'And you never fell once.');
  return lines;
}
