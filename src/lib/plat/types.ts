// PLAT — shared types.
//
// A tower is a codebase mapped to a city. Districts are languages, files are
// cubes, and every cube lives in one of three strata: the surface you look at
// (frontend), the wiring that connects, or the foundation that holds (backend).

// The six lives a cube can live. Drives the whole visual treatment.
import type { Part } from './parts';

export const STATUS = [
  'planned', // ghost outline — named but not built, the slot waiting to be filled
  'in_progress', // translucent, half-built, faintly glowing
  'done', // solid, full material — the cube is placed in the stack
  'stuck', // solid but red-glowing, auto-marked "?"
  'abandoned', // faded, half-sunk, marked "X"
  'removed', // gone from the city, remembered in history only
] as const;

export type Status = (typeof STATUS)[number];

export const DEFAULT_STATUS: Status = 'planned';

export function isActiveStatus(s: Status): boolean {
  return s === 'in_progress' || s === 'done' || s === 'stuck';
}

export function isVisibleStatus(s: Status): boolean {
  return s !== 'removed';
}

// The order the checkbox walks through on click. Deliberately omits 'removed' —
// deleting a cube is a decision, not a misclick.
export const STATUS_CYCLE: Status[] = [
  'planned',
  'in_progress',
  'done',
  'stuck',
  'abandoned',
];

export function nextStatus(current: Status, back = false): Status {
  const i = STATUS_CYCLE.indexOf(current);
  const at = i === -1 ? 0 : i;
  const n = (at + (back ? -1 : 1) + STATUS_CYCLE.length) % STATUS_CYCLE.length;
  return STATUS_CYCLE[n]!;
}

export const STATUS_LABEL: Record<Status, string> = {
  planned: 'planned',
  in_progress: 'in hand',
  done: 'built',
  stuck: 'stuck',
  abandoned: 'abandoned',
  removed: 'removed',
};

export const STATUS_GLYPH: Record<Status, string> = {
  planned: '',
  in_progress: '◐',
  done: '✓',
  stuck: '?',
  abandoned: '✕',
  removed: '–',
};

export const STATUS_DESCRIPTION: Record<Status, string> = {
  planned: 'named but not yet built. a ghost slot in the stack.',
  in_progress: 'started, not finished. translucent in the city.',
  done: 'built. a solid cube placed in the stack.',
  stuck: 'built but blocked. glows red, auto-marked "?".',
  abandoned: 'given up on. faded, half-sunk, marked "X".',
  removed: 'no longer in the city. remembered in history only.',
};

// A mark is a small symbol annotation on a cube (not a status).
export const BUILTIN_MARKS = ['?', 'X', '!', '1', '2', '3', '4', '5'] as const;
export type BuiltinMark = (typeof BUILTIN_MARKS)[number];
export type Mark = string;

export function isBuiltinMark(s: string): s is BuiltinMark {
  return (BUILTIN_MARKS as readonly string[]).includes(s);
}

// The three strata. A codebase is not flat: there is a surface you look at
// (frontend), a layer of wiring underneath, and a foundation the whole thing
// stands on (backend). Layer-separation mode lifts these apart so you can see
// what sits over what — which is the whole point of "what is wired underneath".
export type StratumId = 'surface' | 'wiring' | 'foundation';

export interface Stratum {
  id: StratumId;
  name: string;
  gloss: string; // one-line description, shown as the layer label
  // How far this layer lifts when the city is sectioned, in world units.
  lift: number;
  color: string;
  role: 'frontend' | 'connective' | 'backend';
}

export const STRATA: Stratum[] = [
  {
    id: 'surface',
    name: 'Surface',
    gloss: 'what is seen — the frontend',
    // Big lift so the sectioned view reads as a physical exploded-view: the
    // surface floats high above the wiring, with visible pillars between.
    lift: 18.0,
    color: '#c96442',
    role: 'frontend',
  },
  {
    id: 'wiring',
    name: 'Wiring',
    gloss: 'what connects — the plumbing',
    lift: 8.5,
    color: '#6aa0d8',
    role: 'connective',
  },
  {
    id: 'foundation',
    name: 'Foundation',
    gloss: 'what holds — the backend',
    lift: 0,
    color: '#7a8a72',
    role: 'backend',
  },
];

// district id -> stratum. The judgement calls worth defending:
//   - ts is wiring, not surface. Types are connective tissue; you look THROUGH
//     them, not at them.
//   - md is foundation. Documentation is what the thing rests on when you come
//     back to it in eight months.
//   - sh is wiring. Shell scripts are plumbing nobody photographs.
const STRATUM_ASSIGNMENT: Record<string, StratumId> = {
  html: 'surface',
  css: 'surface',
  gl: 'surface',
  js: 'wiring',
  ts: 'wiring',
  cfg: 'wiring',
  sh: 'wiring',
  py: 'foundation',
  rs: 'foundation',
  md: 'foundation',
};

export function stratumOf(districtId: string): Stratum {
  const id = STRATUM_ASSIGNMENT[districtId] ?? 'foundation';
  return STRATA.find((s) => s.id === id)!;
}

export function districtsInStratum(stratumId: StratumId): string[] {
  return Object.entries(STRATUM_ASSIGNMENT)
    .filter(([, s]) => s === stratumId)
    .map(([d]) => d);
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// A language district. Each has its own color, personality note, and default
// file list. A building in the city.
export interface District {
  id: string; // 'py', 'ts', ...
  name: string; // 'Python'
  tag: string; // 'the spiral'
  color: string; // '#4b8bbe'
  note: string; // the personality text
  files: FileCube[];
  // Random anchor position on the board (set by seed/placement, not user).
  anchor: { x: number; z: number; rot: number };
}

// A cube. Every file is a cube — but the cube is no longer the atom.
export interface FileCube {
  path: string; // 'core.py' — unique within a district
  // DERIVED from parts. Never assign directly; call rollup(). It stays on
  // the record because the panel, the filters, the health ring and the
  // search all read it hot, and recomputing per frame is wasteful.
  status: Status;
  notes: string;
  marks: Mark[];
  // 0..100. Also DERIVED — progressOf(parts). It was the only handle on
  // "piece by piece" and it did the job as well as a scalar can, which is
  // to say it could report how much was done and never what. Parts took
  // that over; this is kept so every existing consumer keeps working.
  progress: number;
  // The things inside the file. A cube assembles one course per part.
  parts: Part[];
}

// Wiring. A cable has to mean something or it's decoration. Each link answers:
// which thing up there (surface) is connected to which thing down here
// (foundation), and why.
// 'wire' is new and outranks everything below it: a connection the user
// asserted between two specific PARTS, not one the heuristics inferred
// between two files. It is also the only kind permitted to run sideways
// between two cubes in the same stratum — an explicit statement is not a
// guess, and does not need the shallow-to-deep discipline that keeps the
// derived cables readable.
export type LinkKind = 'wire' | 'stem' | 'mark' | 'kin' | 'mention';

export interface Endpoint {
  districtId: string;
  path: string;
  // Which part of the file. Null for a derived file-level link — those
  // land on the cube itself rather than on a specific course.
  partId: string | null;
}

export interface Link {
  id: string;
  from: Endpoint; // shallower end (surface)
  to: Endpoint; // deeper end (foundation)
  // Fully-qualified refs, so trace matching doesn't rebuild strings per frame.
  fromRef: string;
  toRef: string;
  kind: LinkKind;
  reason: string;
  strength: number; // 0..1, drives cable thickness
}

// A pointer to one cube. Lived in store.ts, which meant components that
// only needed the shape had to import the store to get it. It is a domain
// type; it belongs here.
export interface CubeRef {
  districtId: string;
  path: string;
}

export interface Tower {
  name: string;
  created: string;
  modified: string;
  districts: District[];
  notepad: string;
}

// The viewport's visual theme. Affects the canvas background, ground plane,
// fog, and grid colors so the same city can be read as a warm "paper plate"
// (default), a cool "blueprint" survey, or a dark "night" plate.
export type ViewTheme = 'paper' | 'blueprint' | 'dark';

// The view the user is looking at — what's toggled, what's selected, the camera.
export interface ViewState {
  // Is the city sectioned into its three strata?
  separated: boolean;
  // When separated, optionally focus a single stratum (dims the others hard).
  focusStratum: StratumId | null;
  // Are wiring cables drawn?
  showCables: boolean;
  // Camera orbit (yaw around Y, pitch down from horizontal), zoom.
  yaw: number;
  pitch: number;
  zoom: number;
  // District focus mode: zoom/dim to a single district building.
  focusDistrict: string | null;
  // Colorblind-friendly mode: adds status glyph overlay patterns on cube faces
  // so status is distinguishable by shape, not just color.
  colorblindMode: boolean;
  // Snap yaw to 45° increments — for cleaner screenshots / repeatable views.
  gridSnap: boolean;
  // The current visual theme — paper (warm off-white), blueprint (cool blue),
  // or dark (night). Affects the canvas background, ground plane, fog, and
  // grid colors so the same city can be read in different "lights".
  theme: ViewTheme;
  // Cable-kind visibility filter — when non-empty, only cables whose kind is in
  // the set are drawn. An empty set means "show all". Lets users reduce visual
  // noise on large codebases by hiding e.g. all 'mention' cables.
  cableKinds: Set<LinkKind>;
  // Whether to draw the small stack-position number on the side of each cube
  // (e.g. "3/14"). Helps read the assembly order at a glance.
  showStackNumbers: boolean;
  // The part under examination, as a 'districtId:path#partId' ref. When set,
  // only cables touching that part are drawn and every cube not on one of
  // them drops to context tone. Nothing moves — the city holds still and
  // the diagram thins out, which is a better answer to "what is this wired
  // to" than hauling the strata apart.
  traced: string | null;
}
