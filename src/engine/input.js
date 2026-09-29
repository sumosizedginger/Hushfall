// Input layer: device events -> semantic actions -> one command per sim tick.
// Keyboard/mouse and the automation bot/test hook all go through the same press()/release()/addYaw() path.
import { TICK } from './defs.js';

export const ACTIONS = ['forward', 'back', 'left', 'right', 'turnLeft', 'turnRight', 'lookUp', 'lookDown', 'fire', 'use', 'weapon1', 'weapon2', 'weapon3', 'pause'];
export const DEFAULT_BINDINGS = {
  forward: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  turnLeft: ['ArrowLeft'], turnRight: ['ArrowRight'], lookUp: ['ArrowUp'], lookDown: ['ArrowDown'],
  fire: ['Mouse0', 'ControlLeft'], use: ['KeyE', 'Space'], weapon1: ['Digit1'], weapon2: ['Digit2'], weapon3: ['Digit3'], pause: ['Escape', 'KeyP'],
};
const TURN_RATE = 2.2, LOOK_RATE = 1.6;              // rad/s for keyboard turning

export class InputState {
  constructor(bindings = DEFAULT_BINDINGS) { this.setBindings(bindings); this.down = new Set(); this.edge = new Set(); this.tapped = new Set(); this.yaw = 0; this.pitch = 0; }
  setBindings(b) {
    this.bindings = JSON.parse(JSON.stringify(b)); this.byCode = new Map();
    for (const [action, codes] of Object.entries(this.bindings)) for (const c of codes) this.byCode.set(c, action);
  }
  /** Rebind an action to `codes`. A code already used by another action is taken from it; returns the displaced action names. */
  rebind(action, codes) {
    if (!ACTIONS.includes(action)) throw new Error('unknown action ' + action);
    const b = JSON.parse(JSON.stringify(this.bindings)), displaced = [];
    for (const [a, cs] of Object.entries(b)) if (a !== action) { const keep = cs.filter((c) => !codes.includes(c)); if (keep.length !== cs.length) displaced.push(a); b[a] = keep; }
    b[action] = [...codes]; this.setBindings(b); return displaced;
  }
  // device path
  keyDown(code) { const a = this.byCode.get(code); if (a) this.press(a); }
  keyUp(code) { const a = this.byCode.get(code); if (a) this.release(a); }
  addMouse(dx, dy, sensitivity = 0.0022) { this.yaw -= dx * sensitivity; this.pitch -= dy * sensitivity; }
  // semantic path (also used by the device path)
  press(action) { if (!ACTIONS.includes(action)) throw new Error('unknown action ' + action); if (!this.down.has(action)) this.edge.add(action); this.down.add(action); this.tapped.add(action); }
  release(action) { this.down.delete(action); }
  addYaw(rad) { this.yaw += rad; }
  addPitch(rad) { this.pitch += rad; }
  releaseAll() { this.down.clear(); this.edge.clear(); this.tapped.clear(); this.yaw = this.pitch = 0; }
  /** One command per sim tick. Edge actions (use, weapon, pause) fire once per press. */
  sample() {
    const d = new Set([...this.down, ...this.tapped]);        // tap latch: a press shorter than one tick still registers once
    const cmd = {
      move: [(d.has('right') ? 1 : 0) - (d.has('left') ? 1 : 0), (d.has('forward') ? 1 : 0) - (d.has('back') ? 1 : 0)],
      yaw: this.yaw + ((d.has('turnLeft') ? 1 : 0) - (d.has('turnRight') ? 1 : 0)) * TURN_RATE * TICK,
      pitch: this.pitch + ((d.has('lookUp') ? 1 : 0) - (d.has('lookDown') ? 1 : 0)) * LOOK_RATE * TICK,
      fire: d.has('fire'), use: this.edge.has('use'), pause: this.edge.has('pause'),
      weapon: this.edge.has('weapon1') ? 0 : this.edge.has('weapon2') ? 1 : this.edge.has('weapon3') ? 2 : null,
    };
    this.yaw = 0; this.pitch = 0; this.edge.clear(); this.tapped.clear();
    return cmd;
  }
}
