// PLAT — parts.
//
// The atom of this city was the file, and the file is one atom too big.
//
// `FileCube.progress` was a number 0..100 doing an honest job badly: it
// gave a cube a fill level, so an in-hand cube could look half-built.
// But a scalar can only say HOW MUCH is done. It cannot say WHAT is
// done, and it gives a cable nowhere to land — which is why the wiring
// can currently only claim `auth.tsx` relates to `auth.py`, and never
// that `SessionForm` calls `POST /session`.
//
// A part is a named thing inside a file with its own status:
// an export, a component, a handler, a model. Consequences:
//
//   • progress becomes DERIVED. `completion(parts) * 100`. The number
//     the cube renders and the checklist the user ticks are now the
//     same number, and cannot drift.
//   • a cube assembles course by course — one course per part, laid
//     bottom-up. Built parts are solid; the rest are open frame. You
//     see the whole intended envelope and exactly how much stands.
//   • a Link can point at a part. That is the only version of the
//     wiring diagram worth drawing.
//
// Storage follows the existing `marks` convention exactly: SQLite has
// no list primitive, so parts live in a JSON string column and are
// parsed here.

import { Status } from './types';

export const PART_KINDS = [
  'export', // a named export — the default
  'component', // a UI component — a frontend face
  'handler', // a route or event handler — where a wire lands
  'model', // a data shape
  'helper', // internal, not exported
  'test',
  'style',
] as const;

export type PartKind = (typeof PART_KINDS)[number];

export interface Part {
  id: string; // stable within the file — slug of the name
  name: string; // 'handleSubmit', 'UserCard', 'POST /session'
  kind: PartKind;
  status: Status;
  notes: string;
  // Explicit wiring: 'districtId:path#partId'. A connection the user
  // asserted, as opposed to one the heuristics in wiring.ts guessed.
  // These always win.
  wires: string[];
}

// Which side of the stage a part plays on.
//
// STRATUM_ASSIGNMENT in types.ts maps a whole DISTRICT to a layer — ts
// is wiring, py is foundation. That is a fact about languages and it is
// the right call for the exploded view. But it cannot express the
// ordinary case where one file holds a component AND the handler behind
// it. Face is that distinction, at part granularity, and the two
// coexist: stratum decides which layer a cube lifts to, face decides
// how a single course inside it reads.
export type Face = 'front' | 'back' | 'neither';

const FACE: Record<PartKind, Face> = {
  component: 'front',
  style: 'front',
  handler: 'back',
  model: 'back',
  export: 'neither',
  helper: 'neither',
  test: 'neither',
};

export function faceOf(kind: PartKind): Face {
  return FACE[kind] ?? 'neither';
}

// ---------- refs ----------

export function partRef(districtId: string, path: string, partId: string): string {
  return `${districtId}:${path}#${partId}`;
}

export function parseRef(
  ref: string,
): { districtId: string; path: string; partId: string } | null {
  const hash = ref.lastIndexOf('#');
  const colon = ref.indexOf(':');
  if (hash < 0 || colon < 0 || colon > hash) return null;
  return {
    districtId: ref.slice(0, colon),
    path: ref.slice(colon + 1, hash),
    partId: ref.slice(hash + 1),
  };
}

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'part'
  );
}

export function newPart(name: string, kind: PartKind = 'export'): Part {
  return { id: slug(name), name, kind, status: 'planned', notes: '', wires: [] };
}

// ---------- rollup ----------

// A file's status as a function of its parts. Deliberately not an
// average: one stuck part makes the whole file stuck, because that is
// what has to be visible from across the room. And a file is not "done"
// because seven of its eight exports are.
export function rollup(parts: Part[]): Status {
  if (parts.length === 0) return 'planned';
  const live = parts.filter((p) => p.status !== 'removed');
  if (live.length === 0) return 'removed';
  if (live.some((p) => p.status === 'stuck')) return 'stuck';
  if (live.every((p) => p.status === 'abandoned')) return 'abandoned';
  const done = live.filter((p) => p.status === 'done').length;
  if (done === live.length) return 'done';
  if (done === 0 && !live.some((p) => p.status === 'in_progress')) return 'planned';
  return 'in_progress';
}

// 0..1. A part in hand counts half; a stuck part counts 0.4, because
// stuck work is real work that stopped, and showing it as zero makes
// the city lie about where the effort went.
export function completion(parts: Part[]): number {
  const live = parts.filter((p) => p.status !== 'removed');
  if (live.length === 0) return 0;
  let sum = 0;
  for (const p of live) {
    if (p.status === 'done') sum += 1;
    else if (p.status === 'in_progress') sum += 0.5;
    else if (p.status === 'stuck') sum += 0.4;
  }
  return sum / live.length;
}

// The number FileCube.progress used to hold. Kept on the record so the
// existing renderer, the health panel and the district bars keep
// working unchanged — but written only from here.
export function progressOf(parts: Part[]): number {
  return Math.round(completion(parts) * 100);
}

export function liveParts(parts: Part[] | undefined): Part[] {
  return (parts ?? []).filter((p) => p.status !== 'removed');
}

export function builtCount(parts: Part[] | undefined): number {
  return liveParts(parts).filter((p) => p.status === 'done').length;
}

// ---------- synthesis ----------

// A cube with no parts still has to render as something. It gets a
// plausible skeleton from its extension, every part inheriting the
// cube's existing status, so an upgrade changes nothing visible on the
// day it lands. Progress becomes granular the moment someone touches a
// part, not before.
//
// This is a starting position, not a claim about anybody's code.
export function synthesise(path: string, status: Status, progress = 0): Part[] {
  const base = (path.split(/[/\\]/).pop() ?? path).replace(/\.[^.]+$/, '');
  const ext = (path.match(/\.([^.]+)$/)?.[1] ?? '').toLowerCase();
  const names = skeletonFor(ext, base);

  // If the cube carried a progress figure, honour it: mark the first
  // parts done until the rollup lands near where the scalar was. A
  // cube that read 60% keeps reading 60%.
  const target = status === 'done' ? names.length : Math.round((progress / 100) * names.length);

  return names.map(([name, kind], i) => ({
    id: slug(name),
    name,
    kind,
    status: statusForIndex(status, i, target),
    notes: '',
    wires: [],
  }));
}

function statusForIndex(fileStatus: Status, i: number, target: number): Status {
  if (fileStatus === 'planned' || fileStatus === 'removed' || fileStatus === 'abandoned') {
    return fileStatus;
  }
  if (fileStatus === 'done') return 'done';
  if (i < target) return 'done';
  // The first unbuilt part of a stuck file carries the stuck status —
  // the flag flies on the course where the work stopped.
  if (fileStatus === 'stuck' && i === target) return 'stuck';
  if (fileStatus === 'in_progress' && i === target) return 'in_progress';
  return 'planned';
}

function skeletonFor(ext: string, base: string): Array<[string, PartKind]> {
  const pascal = base.replace(/(^|[-_.])(\w)/g, (_m, _s, c: string) => c.toUpperCase());
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return [
        [pascal, 'component'],
        ['props', 'model'],
        ['handlers', 'handler'],
      ];
    case 'ts':
    case 'js':
      return [
        ['exports', 'export'],
        ['types', 'model'],
        ['internals', 'helper'],
      ];
    case 'py':
      return [
        ['module', 'export'],
        ['classes', 'model'],
        ['entrypoint', 'handler'],
      ];
    case 'rs':
      return [
        ['pub', 'export'],
        ['structs', 'model'],
        ['impl', 'helper'],
      ];
    case 'css':
    case 'scss':
      return [
        ['tokens', 'style'],
        ['rules', 'style'],
      ];
    case 'glsl':
    case 'frag':
    case 'vert':
      return [
        ['uniforms', 'model'],
        ['main', 'export'],
      ];
    case 'html':
      return [
        ['head', 'style'],
        ['body', 'component'],
      ];
    case 'md':
      return [['body', 'export']];
    case 'sh':
      return [['main', 'handler']];
    case 'json':
    case 'yml':
    case 'yaml':
    case 'toml':
      return [['keys', 'model']];
    default:
      return [['body', 'export']];
  }
}

// ---------- serialisation ----------
//
// Same shape as parseMarks in db-mapping.ts. Tolerant on read, because
// a malformed column should cost one cube its detail, not the whole
// city its load.

export function parseParts(raw: string): Part[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((p) => {
      if (!p || typeof p !== 'object') return [];
      const o = p as Record<string, unknown>;
      if (typeof o.id !== 'string' || typeof o.name !== 'string') return [];
      return [
        {
          id: o.id,
          name: o.name,
          kind: (PART_KINDS as readonly string[]).includes(String(o.kind))
            ? (o.kind as PartKind)
            : 'export',
          status: (typeof o.status === 'string' ? o.status : 'planned') as Status,
          notes: typeof o.notes === 'string' ? o.notes : '',
          wires: Array.isArray(o.wires) ? o.wires.map(String) : [],
        },
      ];
    });
  } catch {
    return [];
  }
}

export function serialiseParts(parts: Part[]): string {
  return JSON.stringify(parts ?? []);
}
