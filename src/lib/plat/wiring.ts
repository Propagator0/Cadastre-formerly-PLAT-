// PLAT — wiring derivation.
//
// A cable has to mean something or it's decoration. This module answers the
// only question that matters when the city is sectioned: which thing up there
// (the frontend) is connected to which thing down here (the backend), and why.
//
// Three sources of truth, strongest first:
//
//   0. WIRE     An explicit part-to-part connection the user drew:
//               `auth.tsx#SessionForm` -> `routes.py#POST /session`. Not a
//               guess, so it outranks everything below and is the only kind
//               allowed to run sideways within a stratum. This is the answer
//               to "which part of which file is wired to which part of which
//               other file" — the previous three could only ever name files.
//   1. STEM     `user.ts` <-> `user.py` <-> `users.sql`. Shared basename is the
//               strongest signal in almost every codebase, and costs nothing.
//   2. MARK     Two cubes carrying the same non-builtin mark are related. The
//               user's own explicit override — tag both ends with `auth` and
//               they wire up.
//   3. MENTION  One cube's notes name the other cube's path. Weakest, but it
//               catches the cases the other two miss.
//
// Nothing here guesses beyond those. A cable you can't explain is worse than
// no cable, because it teaches the user the diagram is decorative.

import { District, Endpoint, Link, LinkKind, Tower } from './types';
import { Part, parseRef } from './parts';
import { isBuiltinMark } from './types';
import { stratumOf } from './types';

// Re-exported so components can import the Link shape from the module that
// produces it rather than reaching past it into types.ts.
export type { Link, LinkKind, Endpoint };

const STRENGTH: Record<LinkKind, number> = {
  wire: 1.2,
  stem: 1.0,
  mark: 0.75,
  kin: 0.6,
  mention: 0.45,
};

// Strip the extension and conventional decoration so `use-auth.hook.ts` and
// `auth.py` meet in the middle.
export function refOf(e: Endpoint): string {
  return `${e.districtId}:${e.path}#${e.partId ?? '*'}`;
}

export function stemOf(path: string): string {
  const base = (path.split(/[/\\]/).pop() ?? path).toLowerCase();
  return base
    .replace(/\.[^.]+$/, '')
    .replace(/\.(d|test|spec|min|hook|store|api|view|page|component)$/, '')
    .replace(/^(use|with|the|_+)/, '')
    .replace(
      /[-_.]?(handler|handlers|service|services|controller|model|models|schema|schemas|adapter|repo|repository|provider|context|slice|reducer|hook|store|route|routes|api|view|page|component|worker|client|server)$/,
      '',
    )
    .replace(/[-_.]/g, '')
    .replace(/(ies)$/, 'y')
    .replace(/s$/, '')
    .trim();
}

// Everything short and generic matches everything. Excluding these is the
// difference between a diagram and a hairball.
const NOISE = new Set([
  'index',
  'main',
  'init',
  'app',
  'lib',
  'mod',
  'core',
  'common',
  'utils',
  'util',
  'helpers',
  'types',
  'config',
  'constants',
  'readme',
]);

function isUsefulStem(s: string): boolean {
  return s.length >= 4 && !NOISE.has(s);
}

interface Entry {
  districtId: string;
  path: string;
  depth: number; // 0 surface, 1 wiring, 2 foundation
  stem: string;
  notes: string;
  marks: string[];
  parts: Part[];
}

function depthOf(districtId: string): number {
  const s = stratumOf(districtId).id;
  return s === 'surface' ? 0 : s === 'wiring' ? 1 : 2;
}

export function deriveLinks(tower: Tower, max = 200): Link[] {
  const entries: Entry[] = [];
  for (const d of tower.districts) {
    for (const f of d.files) {
      if (f.status === 'removed') continue;
      entries.push({
        districtId: d.id,
        path: f.path,
        depth: depthOf(d.id),
        stem: stemOf(f.path),
        notes: f.notes,
        marks: f.marks,
        parts: f.parts ?? [],
      });
    }
  }

  const links = new Map<string, Link>();

  const push = (from: Endpoint, to: Endpoint, kind: LinkKind, reason: string) => {
    const fromRef = refOf(from);
    const toRef = refOf(to);
    const id = `${fromRef}->${toRef}`;
    const existing = links.get(id);
    if (existing && STRENGTH[existing.kind] >= STRENGTH[kind]) return;
    links.set(id, { id, from, to, fromRef, toRef, kind, reason, strength: STRENGTH[kind] });
  };

  const add = (a: Entry, b: Entry, kind: LinkKind, reason: string) => {
    // Derived links never wire two things at the same depth — that's a
    // sideways relationship, and the inferred diagram is about the vertical
    // one (frontend over backend). Explicit wires are exempt; see below.
    if (a.depth === b.depth) return;
    const [up, down] = a.depth < b.depth ? [a, b] : [b, a];
    push(
      { districtId: up.districtId, path: up.path, partId: null },
      { districtId: down.districtId, path: down.path, partId: null },
      kind,
      reason,
    );
  };

  // ---- 0. wire ----
  //
  // What the user actually asserted. Each part carries `wires: string[]` of
  // 'districtId:path#partId' refs; every one that resolves to a real part
  // becomes a cable landing on that specific course at both ends. These run
  // first so the heuristics below can only fill gaps, never overwrite a
  // statement of fact.
  for (const e of entries) {
    for (const part of e.parts) {
      for (const ref of part.wires) {
        const other = parseRef(ref);
        if (!other) continue;
        const target = entries.find(
          (x) => x.districtId === other.districtId && x.path === other.path,
        );
        if (!target) continue;
        if (!target.parts.some((p) => p.id === other.partId)) continue;
        const targetPart = target.parts.find((p) => p.id === other.partId)!;
        push(
          { districtId: e.districtId, path: e.path, partId: part.id },
          { districtId: other.districtId, path: other.path, partId: other.partId },
          'wire',
          `${part.name} → ${targetPart.name}`,
        );
      }
    }
  }

  // ---- 1. stem ----
  const byStem = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!isUsefulStem(e.stem)) continue;
    const list = byStem.get(e.stem) ?? [];
    list.push(e);
    byStem.set(e.stem, list);
  }
  for (const [stem, group] of byStem) {
    if (group.length < 2 || group.length > 5) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        add(group[i]!, group[j]!, 'stem', `shared name "${stem}"`);
      }
    }
  }

  // ---- 1b. kin ---- `userprofile.ts` contains `user`.
  const usable = entries.filter((e) => isUsefulStem(e.stem));
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i]!;
      const b = usable[j]!;
      if (a.stem === b.stem) continue;
      const [long, short] =
        a.stem.length >= b.stem.length ? [a, b] : [b, a];
      if (short.stem.length < 5) continue;
      if (!long.stem.includes(short.stem)) continue;
      if (long.stem.length - short.stem.length < 2) continue;
      add(a, b, 'kin', `"${long.stem}" contains "${short.stem}"`);
    }
  }

  // ---- 2. mark ----
  const byMark = new Map<string, Entry[]>();
  for (const e of entries) {
    for (const m of e.marks) {
      if (isBuiltinMark(m)) continue;
      const list = byMark.get(m) ?? [];
      list.push(e);
      byMark.set(m, list);
    }
  }
  for (const [mark, group] of byMark) {
    if (group.length < 2 || group.length > 8) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        add(group[i]!, group[j]!, 'mark', `both marked "${mark}"`);
      }
    }
  }

  // ---- 3. mention ----
  for (const e of entries) {
    if (!e.notes) continue;
    const notes = e.notes.toLowerCase();
    for (const other of entries) {
      if (other === e) continue;
      if (other.path.length < 5) continue;
      if (notes.includes(other.path.toLowerCase())) {
        add(e, other, 'mention', `${e.path} names it in its notes`);
      }
    }
  }

  return Array.from(links.values())
    .sort((a, b) => b.strength - a.strength)
    .slice(0, max);
}

// Find every link that touches a given cube — used by the inspector to show
// "this file is wired to these".
export function linksForCube(
  links: Link[],
  districtId: string,
  path: string,
): Link[] {
  return links.filter(
    (l) =>
      (l.from.districtId === districtId && l.from.path === path) ||
      (l.to.districtId === districtId && l.to.path === path),
  );
}

export function districtById(tower: Tower, id: string): District | undefined {
  return tower.districts.find((d) => d.id === id);
}

export function findCube(
  tower: Tower,
  districtId: string,
  path: string,
) {
  const d = districtById(tower, districtId);
  return d?.files.find((f) => f.path === path);
}
