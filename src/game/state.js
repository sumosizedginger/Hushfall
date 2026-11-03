// The shell's running state, in one place, by what it is for. main.js owns it; the dev test hook reads it. Nothing here is saved (saves are the world
// and the progress).
import { InputState } from '../engine/input.js';
import { newProgress } from '../engine/progress.js';
import { FrameHistogram, loadLog } from './playlog.js';
import { QualityGovernor } from './quality.js';
import { CaptionFeed } from './captions.js';

export function makeShellState({ storage, settings, firstMap }) {
  return {
    // the session: what is being played
    mode: 'title', // title | playing | paused | dying | dead | ending | complete | epilogue | cinematic
    world: null,
    view: null,
    loop: null,
    mapId: firstMap,
    nextId: undefined,
    difficulty: 'normal',
    seed: 1,
    timer: 0,
    // the campaign run's salvage, upgrade tiers and per-map records (engine/progress.js); saved with every save, reset by a new game
    progress: newProgress(),
    lastEarn: undefined,
    lockerNote: undefined,
    loadedSlot: undefined,
    sinceLoad: undefined,
    ending: undefined,
    credits: undefined,
    cine: undefined,
    coldThen: undefined,
    artKey: undefined,
    holdSkip: undefined,
    commsHold: undefined,

    // input: the keyboard, the mouse and the pad all reach the simulation through `input`
    input: new InputState(settings.bindings),
    settings,
    locked: false,
    lockFailed: false,
    lockClick: undefined,
    lockDenials: undefined,
    aimToggleOn: undefined,
    capture: null,
    capturePad: undefined,
    pad: undefined,
    gp: undefined,
    padActive: undefined,
    padSprint: undefined,
    padSprintHeld: undefined,
    padSprintEngaged: undefined,
    padWasConnected: undefined,
    wheel: undefined,
    wheelMuffled: undefined,

    // screens: the Journal, the maps and the text over the game
    mapOpen: false,
    unread: new Set(),
    journalTab: 'map',
    journalPins: undefined,
    objectives: [],
    recordFrom: undefined,
    miniN: 0,
    miniModel: null,
    captions: new CaptionFeed(),

    // timing: the clock the simulation is fed, and what the frames measured
    timeScale: undefined,
    devScale: undefined,
    manual: false, // the dev test hook owns the clock
    frameTimes: [],
    last: performance.now(),
    governor: new QualityGovernor(settings.internalWidth),
    hist: new FrameHistogram(),

    // the play log and the stats database
    playlog: loadLog(storage),
    attempt: 0,
    attemptLogged: true,
    survey: null,
    stats: undefined,
    statsOff: undefined,
    statsNote: undefined,
    statsLastRun: undefined,
    statsFrom: undefined,
    statsScope: undefined,

    // the dev test hook
    events: [], // every event this session (the hook reads and clears it)
  };
}
