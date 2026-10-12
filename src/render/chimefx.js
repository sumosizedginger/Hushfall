// What the chimes look like (PT-038, Campaign 2 Act B; engine/chimes.js): a CHIME is a stone plinth with a brass bell hung over it and a disc on its face that wears the note's GLYPH in the note's COLOUR (circle, triangle,
// square, diamond, ring: a puzzle is never audio-only), which flares when the note is struck and fades; the CHIME TREE is a pale trunk with five fruits, one of each note, that light in order as the tree plays a
// phrase. A read-only view of the sim: the time since each chime was struck is `chimeSince(w, id)`, the tree's last note is `w.chimes.lastTree`.
import * as THREE from 'three';
import { CHIME } from '../engine/defs.js';
import { chimeSince } from '../engine/chimes.js';

const lam = (o) => new THREE.MeshLambertMaterial(o), bas = (o) => new THREE.MeshBasicMaterial(o);
const color = (n) => new THREE.Color(CHIME.colors[n]);

/** a glyph drawn on a canvas (white on transparent): circle, triangle, square, diamond, ring */
function glyphTexture(note) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 7; g.translate(32, 32);
  const kind = CHIME.glyphs[note];
  if (kind === 'circle') { g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); }
  else if (kind === 'triangle') { g.beginPath(); g.moveTo(0, -21); g.lineTo(20, 15); g.lineTo(-20, 15); g.closePath(); g.fill(); }
  else if (kind === 'square') g.fillRect(-16, -16, 32, 32);
  else if (kind === 'diamond') { g.beginPath(); g.moveTo(0, -23); g.lineTo(18, 0); g.lineTo(0, 23); g.lineTo(-18, 0); g.closePath(); g.fill(); }
  else { g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

export function makeChimeView(map) {
  const group = new THREE.Group(), chimes = new Map(), fruit = [];
  const stone = lam({ color: 0x3a3a46, emissive: 0x0c0c12 }), brass = lam({ color: 0xc09848, emissive: 0x2a1c08 }), pale = lam({ color: 0xd8d0b8, emissive: 0x14120c });
  const textures = [0, 1, 2, 3, 4].map((n) => (typeof document !== 'undefined' ? glyphTexture(n) : null));
  for (const pr of map.props) {
    const y = map.floor(Math.floor(pr.x / map.cell), Math.floor(pr.z / map.cell));
    if (pr.kind === 'chime') {
      const g = new THREE.Group(); g.position.set(pr.x, y, pr.z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.7, 8), stone); base.position.y = 0.35; g.add(base);
      const col = color(pr.note), face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 16), bas({ color: col.clone().multiplyScalar(0.35), map: textures[pr.note] })); face.position.set(0, 0.74, 0); face.rotation.x = -Math.PI / 2; g.add(face);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), brass); rod.position.y = 1.2; g.add(rod);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 8, 1, true), brass); bell.position.y = 1.5; bell.rotation.x = Math.PI; g.add(bell);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bas({ color: col })); glow.position.y = 1.44; glow.scale.setScalar(0.3); g.add(glow);
      group.add(g); chimes.set(pr.id, { g, face, glow, bell, note: pr.note, col });
    } else if (pr.kind === 'chimetree') {
      const g = new THREE.Group(); g.position.set(pr.x, y, pr.z);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 3.4, 8), pale); trunk.position.y = 1.7; g.add(trunk);
      for (let i = 0; i < 3; i++) { const bough = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.5, 5), pale); bough.position.set(Math.sin(i * 2.1) * 0.5, 3.1 + i * 0.1, Math.cos(i * 2.1) * 0.5); bough.rotation.z = Math.sin(i * 2.1) * 1.1; bough.rotation.x = -Math.cos(i * 2.1) * 1.1; g.add(bough); }
      for (let n = 0; n < 5; n++) {
        const a = (n / 5) * Math.PI * 2, col = color(n), orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bas({ color: col.clone().multiplyScalar(0.3) })); orb.position.set(Math.sin(a) * 1.15, 3.3 + 0.18 * Math.sin(n * 1.7), Math.cos(a) * 1.15); g.add(orb);
        const mark = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), bas({ color: 0xffffff, map: textures[n], transparent: true, depthWrite: false })); mark.position.copy(orb.position).multiplyScalar(1.0); mark.position.x += Math.sin(a) * 0.205; mark.position.z += Math.cos(a) * 0.205; mark.lookAt(mark.position.x * 2, mark.position.y, mark.position.z * 2); g.add(mark);
        fruit.push({ orb, col, note: n, tree: pr.id });
      }
      const light = new THREE.PointLight(0xffe8b0, 0, 12, 1.5); light.position.set(0, 3.9, 0); g.add(light); group.add(g); fruit.light = light;
    }
  }
  return {
    group, chimes, fruit,
    /** per frame: a struck chime flares and fades over 1.4 s, a tree's fruit lights for the note it just played */
    update(w, time) {
      for (const [id, c] of chimes) {
        const since = chimeSince(w, id), k = since < 1.4 ? Math.pow(1 - since / 1.4, 1.6) : 0;
        c.face.material.color.copy(c.col).multiplyScalar(0.35 + 0.9 * k); c.glow.scale.setScalar(0.3 + 1.1 * k); c.bell.rotation.z = Math.sin(time * 34) * 0.09 * k;
      }
      const lt = w.chimes?.lastTree; let lit = 0;
      for (const f of fruit) { const since = lt && lt.note === f.note ? w.time - lt.t : Infinity, k = since < 1.1 ? Math.pow(1 - since / 1.1, 1.4) : 0; f.orb.material.color.copy(f.col).multiplyScalar(0.3 + 0.95 * k); f.orb.scale.setScalar(1 + 0.45 * k); lit = Math.max(lit, k); }
      if (fruit.light) fruit.light.intensity = 12 * lit;
    },
  };
}
