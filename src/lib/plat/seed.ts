// PLAT — default tower seed.
//
// The starting city. Ten language districts, each with its own personality and
// default file list. Files are seeded with a realistic spread of statuses so
// the piece-by-piece assembly is visible the moment the city loads: a few built
// cubes at the bottom of each stack, a translucent one in hand, ghosts above.

import { District, FileCube, Status, Tower } from './types';
import { synthesise, rollup, progressOf } from './parts';

// Deterministic PRNG so the city layout is identical every load (a building
// must stand where it stood yesterday — that's the point of a map).
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Scatter districts across the board so they "fight the checkered grid" — no
// neat rows, just clusters of buildings at odd angles like a real neighborhood.
function scatter(): { x: number; z: number; rot: number }[] {
  const rng = mulberry32(0x5143a7);
  // Hand-tuned anchors that read as a loose neighborhood, with jitter.
  const seeds: Array<{ x: number; z: number }> = [
    { x: -7.5, z: -4.5 }, // py
    { x: -3.2, z: -6.8 }, // ts
    { x: 1.0, z: -5.5 }, // js
    { x: 5.5, z: -6.2 }, // html
    { x: 8.2, z: -2.0 }, // css
    { x: 6.0, z: 2.5 }, // md
    { x: 2.0, z: 3.5 }, // rs
    { x: -2.0, z: 2.0 }, // gl
    { x: -6.0, z: 1.5 }, // sh
    { x: -8.5, z: 3.5 }, // cfg
  ];
  return seeds.map((s) => ({
    x: s.x + (rng() - 0.5) * 0.6,
    z: s.z + (rng() - 0.5) * 0.6,
    rot: (rng() - 0.5) * 0.5, // small yaw, ±14°, so buildings aren't axis-aligned
  }));
}

function cube(
  path: string,
  status: FileCube['status'] = 'planned',
  progress = 0,
  notes = '',
  marks: string[] = [],
): FileCube {
  // Every seeded cube gets a part skeleton derived from its own path and
  // the progress figure the seed asked for, so the fixture city assembles
  // course by course from the first load rather than after an edit.
  const parts = synthesise(path, status, progress);
  return { path, status: rollup(parts), progress: progressOf(parts), notes, marks, parts };
}

// Re-derive a seeded cube at a given status and progress. Status and
// progress are both rollups of parts, so changing either means rebuilding
// the parts — assigning the fields directly would leave the cube claiming
// one thing and its courses showing another.
function withParts(f: FileCube, status: Status, progress: number): FileCube {
  const parts = synthesise(f.path, status, progress);
  return { ...f, status: rollup(parts), progress: progressOf(parts), parts };
}

// A helper to give a district a believable progress spread: the first N files
// built, one in hand, the rest planned. This is what makes the stack visibly
// assemble cube-by-cube on first load.
function withProgress(
  files: FileCube[],
  built: number,
  inHand: number,
): FileCube[] {
  return files.map((f, i) => {
    if (i < built) return withParts(f, 'done', 100);
    if (i < built + inHand)
      return withParts(f, 'in_progress', 30 + ((i * 17) % 50));
    return f;
  });
}

const DISTRICT_DEFS: Array<Omit<District, 'anchor'>> = [
  {
    id: 'py',
    name: 'Python',
    tag: 'the spiral',
    color: '#4b8bbe',
    note: 'Strictly sequential — one block at a time, coiling upward. No jitter. Ever.',
    files: withProgress(
      [
        cube('__init__.py'),
        cube('core.py'),
        cube('model.py'),
        cube('auth.py'),
        cube('user.py'),
        cube('api.py'),
        cube('query.py'),
        cube('render.py'),
        cube('solve.py'),
        cube('fields.py'),
        cube('mesh.py'),
        cube('cli.py'),
        cube('bench.py'),
      ],
      4,
      1,
    ),
  },
  {
    id: 'ts',
    name: 'TypeScript',
    tag: 'the mold',
    color: '#6aa0d8',
    note: 'The wireframe contract lands instantly — the type is known before the value exists. The solid pours in a beat later.',
    files: withProgress(
      [
        cube('types.ts'),
        cube('api.ts'),
        cube('auth.ts'),
        cube('user.ts'),
        cube('query.ts'),
        cube('store.ts'),
        cube('hooks.ts'),
        cube('router.ts'),
        cube('forms.ts'),
        cube('dashboard.ts'),
        cube('ws.ts'),
      ],
      5,
      1,
    ),
  },
  {
    id: 'js',
    name: 'JavaScript',
    tag: 'the sprawl',
    color: '#d4b83a',
    note: 'No zoning. Blocks land wherever there is free ground, each with its own async delay. You cannot predict the order. That is the point.',
    files: withProgress(
      [
        cube('index.js'),
        cube('auth.js'),
        cube('user.js'),
        cube('api.js'),
        cube('render.js'),
        cube('viewer.js'),
        cube('events.js'),
        cube('fetch.js'),
        cube('dom.js'),
        cube('router.js'),
        cube('store.js'),
        cube('cache.js'),
        cube('queue.js'),
      ],
      6,
      2,
    ),
  },
  {
    id: 'html',
    name: 'HTML',
    tag: 'the monolith',
    color: '#e2643c',
    note: 'One file. Everything inside it — markup, style, logic. A new sheet does not stand beside the last; it is absorbed. The monolith only grows taller.',
    files: withProgress(
      [
        cube('index.html'),
        cube('dashboard.html'),
        cube('viewer.html'),
        cube('auth.html'),
        cube('user.html'),
        cube('report.html'),
      ],
      2,
      1,
    ),
  },
  {
    id: 'css',
    name: 'CSS',
    tag: 'the ivy',
    color: '#8a5fb0',
    note: 'Owns no ground. Each sheet attaches as a coloured facade to whatever is already standing. Clear the hosts and the ivy has nothing to cling to.',
    files: withProgress(
      [
        cube('reset.css'),
        cube('theme.css'),
        cube('layout.css'),
        cube('components.css'),
        cube('overrides.css'),
      ],
      2,
      1,
    ),
  },
  {
    id: 'md',
    name: 'Markdown',
    tag: 'the survey',
    color: '#b8b2a8',
    note: 'Never a building. Each document is a surveyed plot with a ghost volume standing over it: the shape of a thing described but not yet made.',
    files: withProgress(
      [
        cube('README.md'),
        cube('PLAN.md'),
        cube('SPEC.md'),
        cube('ARCHITECTURE.md'),
        cube('NOTES.md'),
        cube('TODO.md'),
        cube('CHANGELOG.md'),
        cube('BESTIARY.md'),
      ],
      3,
      0,
    ),
  },
  {
    id: 'rs',
    name: 'Rust',
    tag: 'the fortress',
    color: '#c8623a',
    note: 'Perimeter wall must close before the interior may exist. Toggle an interior file early: it hovers, red, refused.',
    files: withProgress(
      [
        cube('lib.rs'),
        cube('main.rs'),
        cube('auth.rs'),
        cube('user.rs'),
        cube('query.rs'),
        cube('error.rs'),
        cube('config.rs'),
        cube('ffi.rs'),
        cube('cli.rs'),
        cube('parser.rs'),
        cube('lexer.rs'),
        cube('eval.rs'),
        cube('vm.rs'),
      ],
      3,
      0,
    ),
  },
  {
    id: 'gl',
    name: 'GLSL',
    tag: 'the surface',
    color: '#4fd6c0',
    note: 'No partial builds. Either every stage is present and the whole surface lights in a single frame, or there is nothing at all.',
    files: withProgress(
      [
        cube('common.glsl'),
        cube('render.glsl'),
        cube('vertex.glsl'),
        cube('fragment.glsl'),
        cube('post.glsl'),
      ],
      0,
      0,
    ),
  },
  {
    id: 'sh',
    name: 'Shell',
    tag: 'the shanty',
    color: '#b0a898',
    note: 'No district, no grid alignment. Small irregular pieces appear instantly at odd angles, leaning on each other. It works. Do not ask how.',
    files: withProgress(
      [
        cube('build.sh'),
        cube('deploy.sh'),
        cube('clean.sh'),
        cube('backup.sh'),
        cube('hotfix.sh'),
        cube('fix_the_fix.sh'),
      ],
      2,
      0,
    ),
  },
  {
    id: 'cfg',
    name: 'Config',
    tag: 'the paving',
    color: '#5c5850',
    note: 'JSON and YAML never rise. They surface from below the ground plane as flat slabs, and everything else is built on top of them.',
    files: withProgress(
      [
        cube('package.json'),
        cube('tsconfig.json'),
        cube('.eslintrc'),
        cube('tauri.conf.json'),
        cube('ci.yml'),
      ],
      4,
      0,
    ),
  },
];

export function defaultTower(name = 'atlas'): Tower {
  const anchors = scatter();
  const now = new Date().toISOString();
  return {
    name,
    created: now,
    modified: now,
    notepad:
      'A codebase is a city. Files are buildings, languages are districts, ' +
      'status is color. Pull the city apart to see what is wired to what.\n\n' +
      '— surface (frontend) sits on wiring sits on foundation (backend).',
    districts: DISTRICT_DEFS.map((d, i) => ({ ...d, anchor: anchors[i]! })),
  };
}
