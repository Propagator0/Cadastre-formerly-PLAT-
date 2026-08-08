// PLAT — the ground. The single client-side store for tower state, selection,
// view, and filters. Talks to the API for persistence; holds an optimistic
// local copy so the city never blanks out while a save is in flight.

'use client';

import { create } from 'zustand';
import {
  District,
  FileCube,
  Status,
  StratumId,
  Tower,
  ViewState,
  ViewTheme,
  LinkKind,
  nextStatus,
  CubeRef,
} from '@/lib/plat/types';
import { defaultTower } from '@/lib/plat/seed';
import { deriveLinks, linksForCube, Link } from '@/lib/plat/wiring';
import { PITCH_MIN, PITCH_MAX, normalizeYaw } from '@/lib/plat/iso';
import {
  Part,
  PartKind,
  newPart,
  rollup,
  progressOf,
  synthesise,
} from '@/lib/plat/parts';

// Re-exported from types.ts, where it now lives, so every existing
// `import { CubeRef } from '@/lib/plat/store'` keeps working.
export type { CubeRef };

// An entry in the activity log. Each cube change (status, progress, mark,
// notes) pushes one entry so the user has a "what did I just do" timeline.
export interface ActivityEntry {
  id: string;
  ts: number; // epoch ms
  kind: 'status' | 'progress' | 'mark' | 'notes' | 'reset' | 'shuffle' | 'snapshot' | 'import' | 'rewind';
  districtId: string;
  districtName: string;
  path: string;
  // Short human label like "planned → in_hand" or "marked ?".
  summary: string;
}

export interface SnapshotMeta {
  id: string;
  name: string;
  createdAt: string;
}

interface PlatState {
  // ---- data ----
  tower: Tower;
  loading: boolean;
  saving: boolean;
  dirty: boolean;

  // ---- selection / view ----
  selected: CubeRef | null;
  hovered: CubeRef | null;
  view: ViewState;

  // ---- filters ----
  query: string;
  statusFilter: Set<Status>;

  // ---- derived (recomputed on demand) ----
  links: Link[];

  // ---- activity log (in-memory ring buffer, most-recent first) ----
  activity: ActivityEntry[];
  // ---- tower snapshots keyed by activity id, for click-to-rewind ----
  // Each entry maps an ActivityEntry.id to the tower state right BEFORE that
  // action was applied. Clicking "rewind" on an activity entry restores the
  // snapshot, effectively undoing everything from that entry forward.
  // Only kept for the most recent SNAPSHOT_MAX entries to bound memory.
  activitySnapshots: Record<string, Tower>;

  // ---- snapshots ----
  snapshots: SnapshotMeta[];

  // ---- actions ----
  init: () => Promise<void>;
  resetTower: () => Promise<void>;
  selectCube: (ref: CubeRef | null) => void;
  setHovered: (ref: CubeRef | null) => void;
  cycleStatus: (ref: CubeRef, back?: boolean) => Promise<void>;
  setStatus: (ref: CubeRef, status: Status) => Promise<void>;
  setProgress: (ref: CubeRef, progress: number) => Promise<void>;
  // Parts. Every one of these re-derives status and progress from the parts
  // it just changed, so the checklist and the building can never disagree.
  setPartStatus: (ref: CubeRef, partId: string, status: Status) => Promise<void>;
  addPart: (ref: CubeRef, name: string, kind: PartKind) => Promise<void>;
  removePart: (ref: CubeRef, partId: string) => Promise<void>;
  // The panel checkbox. Finishes the next unfinished part — one course laid
  // per click — or strips the last one back.
  advanceCube: (ref: CubeRef, back?: boolean) => Promise<void>;
  // Draw a wire from one part to another, or remove it if it exists.
  toggleWire: (ref: CubeRef, partId: string, targetRef: string) => Promise<void>;
  setTraced: (ref: string | null) => void;
  setNotes: (ref: CubeRef, notes: string) => Promise<void>;
  toggleMark: (ref: CubeRef, mark: string) => Promise<void>;
  setNotepad: (text: string) => Promise<void>;
  addCube: (districtId: string, path: string) => Promise<void>;
  removeCube: (ref: CubeRef) => Promise<void>;
  renameCube: (ref: CubeRef, newPath: string) => Promise<void>;
  shuffleDistrict: (districtId: string) => Promise<void>;
  undoLast: () => Promise<void>;
  rewindToActivity: (activityId: string) => Promise<void>;

  setSeparated: (v: boolean) => void;
  focusStratum: (s: StratumId | null) => void;
  toggleCables: () => void;
  setCamera: (p: Partial<Pick<ViewState, 'yaw' | 'pitch' | 'zoom'>>) => void;
  animateCamera: (target: Partial<Pick<ViewState, 'yaw' | 'pitch' | 'zoom'>>) => void;
  // Small, repeatable camera deltas — arrow keys and the gizmo's nudge ring.
  // Complements drag-orbit, which is fast but imprecise.
  nudgeCamera: (d: { dYaw?: number; dPitch?: number; dZoom?: number }) => void;
  setQuery: (q: string) => void;
  toggleStatusFilter: (s: Status) => void;
  clearActivity: () => void;
  focusDistrict: (id: string | null) => void;
  toggleColorblind: () => void;
  toggleGridSnap: () => void;
  setTheme: (t: ViewTheme) => void;
  cycleTheme: () => void;
  toggleCableKind: (k: LinkKind) => void;
  setCableKinds: (kinds: LinkKind[]) => void;
  toggleStackNumbers: () => void;
  reorderCube: (districtId: string, fromPath: string, toPath: string) => Promise<void>;
  saveSnapshot: (name: string) => Promise<string | null>;
  loadSnapshot: (id: string) => Promise<boolean>;
  deleteSnapshot: (id: string) => Promise<void>;
  listSnapshots: () => Promise<void>;
  importTower: (tower: Tower, filename: string) => Promise<void>;
}

const DEFAULT_VIEW: ViewState = {
  separated: false,
  focusStratum: null,
  showCables: true,
  yaw: 30, // degrees
  pitch: 55,
  zoom: 1,
  focusDistrict: null,
  colorblindMode: false,
  gridSnap: false,
  theme: 'paper',
  cableKinds: new Set<LinkKind>(), // empty = show all
  showStackNumbers: false,
  traced: null,
};

function recomputeLinks(tower: Tower): Link[] {
  return deriveLinks(tower);
}

// Deep-clone a tower. Tower is plain serializable data (no Dates/functions),
// so a manual structural clone is fastest and works in every environment
// (structuredClone is also fine in modern browsers, but this avoids any
// runtime dependency on it). Used for activity snapshots — we want the
// snapshot to be fully independent of the live tower.
function cloneTower(t: Tower): Tower {
  return {
    name: t.name,
    created: t.created,
    modified: t.modified,
    notepad: t.notepad,
    districts: t.districts.map((d) => ({
      ...d,
      anchor: { ...d.anchor },
      files: d.files.map((f) => ({ ...f, marks: [...f.marks] })),
    })),
  };
}

// Render a relative time like "now", "12s", "3m", "2h", "5d". Used both by
// the timeline UI and by the rewind summary ("rewound to 5m").
export function relTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// The one write path for parts.
//
// Mutate the array, re-derive both rollups, persist the array. Nothing else
// in the store touches `status` or `progress` on a cube any more — they are
// outputs of this function. That is the whole reason the checklist in the
// inspector and the courses on the building can be trusted to agree.
async function applyParts(
  get: () => PlatState,
  set: (partial: Partial<PlatState>) => void,
  ref: CubeRef,
  fn: (parts: Part[]) => Part[],
): Promise<void> {
  const tower = get().tower;
  const d = tower.districts.find((x) => x.id === ref.districtId);
  const c = d?.files.find((f) => f.path === ref.path);
  if (!c || !d) return;

  const parts = fn(c.parts ?? []);
  const status = rollup(parts);
  const progress = progressOf(parts);
  if (
    parts === c.parts &&
    status === c.status &&
    progress === c.progress
  ) {
    return;
  }

  const updated = patchCube(tower, ref, (cu) => ({ ...cu, parts, status, progress }));
  const built = parts.filter((p) => p.status === 'done').length;
  const live = parts.filter((p) => p.status !== 'removed').length;

  set({
    tower: updated,
    links: deriveLinks(updated),
    ...pushActivity(
      get().activity,
      get().activitySnapshots,
      {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        kind: 'progress',
        districtId: d.id,
        districtName: d.name,
        path: c.path,
        summary: `${built}/${live} parts`,
      },
      tower,
    ),
  });

  try {
    await fetch('/api/plat/cube', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        districtId: ref.districtId,
        path: ref.path,
        patch: { parts },
      }),
    });
  } catch {
    /* noop — the city is already updated locally; the next save reconciles */
  }
}

function patchCube(
  tower: Tower,
  ref: CubeRef,
  fn: (c: FileCube) => FileCube,
): Tower {
  return {
    ...tower,
    modified: new Date().toISOString(),
    districts: tower.districts.map((d) =>
      d.id !== ref.districtId
        ? d
        : {
            ...d,
            files: d.files.map((f) =>
              f.path !== ref.path ? f : fn(f),
            ),
          },
    ),
  };
}

// Push an entry onto the activity ring buffer (kept to the most recent 40).
// Also saves a deep copy of `oldTower` (the tower state right BEFORE the
// action that triggered this entry) keyed by entry.id, so clicking
// "rewind" on the entry restores the pre-action state. Snapshots are only
// kept for the most recent SNAPSHOT_MAX entries to bound memory growth.
const ACTIVITY_MAX = 40;
const SNAPSHOT_MAX = 20;
function pushActivity(
  prevActivity: ActivityEntry[],
  prevSnapshots: Record<string, Tower>,
  entry: ActivityEntry,
  oldTower?: Tower,
): { activity: ActivityEntry[]; activitySnapshots: Record<string, Tower> } {
  const activity = [entry, ...prevActivity].slice(0, ACTIVITY_MAX);
  // Keep snapshots only for entries that survived the ring buffer AND are
  // within the most recent SNAPSHOT_MAX. The new entry's snapshot (if any)
  // is added on top.
  const keepIds = new Set(activity.slice(0, SNAPSHOT_MAX).map((a) => a.id));
  const activitySnapshots: Record<string, Tower> = {};
  if (oldTower) {
    activitySnapshots[entry.id] = cloneTower(oldTower);
  }
  for (const [id, t] of Object.entries(prevSnapshots)) {
    if (keepIds.has(id)) activitySnapshots[id] = t;
  }
  return { activity, activitySnapshots };
}

const STATUS_LABEL_SHORT: Record<Status, string> = {
  planned: 'planned',
  in_progress: 'in hand',
  done: 'built',
  stuck: 'stuck',
  abandoned: 'abandoned',
  removed: 'removed',
};

export const usePlat = create<PlatState>((set, get) => ({
  tower: defaultTower('atlas'),
  loading: false,
  saving: false,
  dirty: false,

  selected: null,
  hovered: null,
  view: DEFAULT_VIEW,

  query: '',
  statusFilter: new Set<Status>([
    'planned',
    'in_progress',
    'done',
    'stuck',
    'abandoned',
  ]),

  links: [],
  activity: [],
  activitySnapshots: {},
  snapshots: [],

  init: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/plat/tower', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const tower: Tower = data.tower;
        set({
          tower,
          links: recomputeLinks(tower),
          loading: false,
          dirty: false,
        });
        // Also load snapshot list in the background.
        get().listSnapshots();
        return;
      }
    } catch {
      // fall back to the local default if the API is unreachable
    }
    const t = get().tower;
    set({ loading: false, links: recomputeLinks(t) });
  },

  resetTower: async () => {
    const oldTower = get().tower;
    set({ saving: true });
    try {
      await fetch('/api/plat/reset', { method: 'POST' });
      const res = await fetch('/api/plat/tower', { cache: 'no-store' });
      const data = await res.json();
      const tower: Tower = data.tower;
      set({
        tower,
        links: recomputeLinks(tower),
        saving: false,
        dirty: false,
        selected: null,
        ...pushActivity(
          get().activity,
          get().activitySnapshots,
          {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ts: Date.now(),
            kind: 'reset',
            districtId: '',
            districtName: '',
            path: '',
            summary: 'reset the city to defaults',
          },
          oldTower,
        ),
      });
    } catch {
      set({ saving: false });
    }
  },

  selectCube: (ref) => set({ selected: ref }),
  setHovered: (ref) => set({ hovered: ref }),

  cycleStatus: async (ref, back) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c) return;
    const next = nextStatus(c.status, back);
    await get().setStatus(ref, next);
  },

  setStatus: async (ref, status) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c || !d) return;
    const progress =
      status === 'done'
        ? 100
        : status === 'planned'
          ? 0
          : status === 'in_progress' && c.progress === 0
            ? 30
            : c.progress;
    const updated = patchCube(tower, ref, (cu) => ({
      ...cu,
      status,
      progress,
      marks:
        status === 'stuck' && !cu.marks.includes('?')
          ? [...cu.marks, '?']
          : cu.marks,
    }));
    set({
      tower: updated,
      links: recomputeLinks(updated),
      saving: true,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'status',
          districtId: d.id,
          districtName: d.name,
          path: c.path,
          summary: `${STATUS_LABEL_SHORT[c.status]} → ${STATUS_LABEL_SHORT[status]}`,
        },
        tower,
      ),
    });
    try {
      await fetch('/api/plat/cube', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtId: ref.districtId,
          path: ref.path,
          patch: { status, progress },
        }),
      });
    } finally {
      set({ saving: false });
    }
  },

  // ---------- parts ----------
  //
  // All five funnel through one helper: mutate the parts array, re-roll
  // status and progress, persist the whole array. There is deliberately no
  // path that writes status or progress directly any more.
  setPartStatus: async (ref, partId, status) => {
    await applyParts(get, set, ref, (parts) =>
      parts.map((p) => (p.id === partId ? { ...p, status } : p)),
    );
  },

  addPart: async (ref, name, kind) => {
    const part = newPart(name, kind);
    await applyParts(get, set, ref, (parts) =>
      parts.some((p) => p.id === part.id) ? parts : [...parts, part],
    );
  },

  removePart: async (ref, partId) => {
    await applyParts(get, set, ref, (parts) => parts.filter((p) => p.id !== partId));
  },

  advanceCube: async (ref, back = false) => {
    await applyParts(get, set, ref, (parts) => {
      const live = parts.filter((p) => p.status !== 'removed');
      if (live.length === 0) return parts;
      const target = back
        ? [...live].reverse().find((p) => p.status === 'done') ??
          [...live].reverse().find((p) => p.status === 'in_progress')
        : live.find((p) => p.status === 'in_progress') ??
          live.find((p) => p.status === 'planned');
      if (!target) return parts;
      const next: Status = back
        ? target.status === 'done'
          ? 'in_progress'
          : 'planned'
        : target.status === 'planned'
          ? 'in_progress'
          : 'done';
      return parts.map((p) => (p.id === target.id ? { ...p, status: next } : p));
    });
  },

  toggleWire: async (ref, partId, targetRef) => {
    await applyParts(get, set, ref, (parts) =>
      parts.map((p) =>
        p.id !== partId
          ? p
          : {
              ...p,
              wires: p.wires.includes(targetRef)
                ? p.wires.filter((w) => w !== targetRef)
                : [...p.wires, targetRef],
            },
      ),
    );
  },

  setTraced: (ref) => {
    set((s) => ({ view: { ...s.view, traced: ref } }));
  },

  setProgress: async (ref, progress) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c || !d) return;
    const p = Math.max(0, Math.min(100, Math.round(progress)));
    // Throttle activity for progress: only push when crossing a 10% boundary
    // so dragging the slider doesn't flood the log.
    const crossed = Math.floor(p / 10) !== Math.floor(c.progress / 10);
    const updated = patchCube(tower, ref, (cu) => ({ ...cu, progress: p }));
    set({
      tower: updated,
      ...(crossed
        ? pushActivity(
            get().activity,
            get().activitySnapshots,
            {
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              ts: Date.now(),
              kind: 'progress',
              districtId: d.id,
              districtName: d.name,
              path: c.path,
              summary: `${p}% (${STATUS_LABEL_SHORT[c.status]})`,
            },
            tower,
          )
        : {}),
    });
    try {
      await fetch('/api/plat/cube', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtId: ref.districtId,
          path: ref.path,
          patch: { progress: p },
        }),
      });
    } catch {
      /* noop */
    }
  },

  setNotes: async (ref, notes) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c || !d) return;
    const updated = patchCube(tower, ref, (cu) => ({ ...cu, notes }));
    set({
      tower: updated,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'notes',
          districtId: d.id,
          districtName: d.name,
          path: c.path,
          summary: notes.length > 0 ? `notes: ${notes.slice(0, 30)}${notes.length > 30 ? '…' : ''}` : 'cleared notes',
        },
        tower,
      ),
    });
  },

  toggleMark: async (ref, mark) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c || !d) return;
    const has = c.marks.includes(mark);
    const updated = patchCube(tower, ref, (cu) => ({
      ...cu,
      marks: has ? cu.marks.filter((m) => m !== mark) : [...cu.marks, mark],
    }));
    set({
      tower: updated,
      links: recomputeLinks(updated),
      saving: true,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'mark',
          districtId: d.id,
          districtName: d.name,
          path: c.path,
          summary: has ? `unmarked ${mark}` : `marked ${mark}`,
        },
        tower,
      ),
    });
    try {
      await fetch('/api/plat/cube', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          districtId: ref.districtId,
          path: ref.path,
          patch: { marks: updated.districts.find((dd) => dd.id === ref.districtId)!.files.find((f) => f.path === ref.path)!.marks },
        }),
      });
    } finally {
      set({ saving: false });
    }
  },

  // Add a new cube to a district's stack. The new file lands at the top of the
  // stack as a planned (ghost) cube — the user then cycles its status to
  // "build" it. Persisted via full-tower POST (small dataset).
  addCube: async (districtId, path) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === districtId);
    if (!d) return;
    // Reject empty / duplicate paths within the district.
    const trimmed = path.trim();
    if (!trimmed) return;
    if (d.files.some((f) => f.path === trimmed)) return;
    const updated: Tower = {
      ...tower,
      modified: new Date().toISOString(),
      districts: tower.districts.map((dd) =>
        dd.id !== districtId
          ? dd
          : {
              ...dd,
              files: [
                ...dd.files,
                // A new cube arrives with a skeleton derived from its own
                // extension, so it is a building under construction from the
                // first frame rather than an empty lot to furnish later.
                {
                  path: trimmed,
                  status: 'planned',
                  notes: '',
                  marks: [],
                  progress: 0,
                  parts: synthesise(trimmed, 'planned'),
                },
              ],
            },
      ),
    };
    set({
      tower: updated,
      links: recomputeLinks(updated),
      saving: true,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'status',
          districtId: d.id,
          districtName: d.name,
          path: trimmed,
          summary: 'added to the stack',
        },
        tower,
      ),
    });
    try {
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower: updated }),
      });
    } finally {
      set({ saving: false });
    }
  },

  // Remove a cube from a district. Marks the cube as 'removed' which hides it
  // from the city and from the tower list (but keeps the data in the database
  // for potential restore via a future history feature).
  removeCube: async (ref) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c || !d) return;
    // Hard delete: actually remove the file from the array. (Soft 'removed'
    // status hides it but keeps it; hard delete is what the UI button does.)
    const updated: Tower = {
      ...tower,
      modified: new Date().toISOString(),
      districts: tower.districts.map((dd) =>
        dd.id !== ref.districtId
          ? dd
          : {
              ...dd,
              files: dd.files.filter((f) => f.path !== ref.path),
            },
      ),
    };
    set({
      tower: updated,
      links: recomputeLinks(updated),
      saving: true,
      selected: null,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'status',
          districtId: d.id,
          districtName: d.name,
          path: c.path,
          summary: 'removed from the stack',
        },
        tower,
      ),
    });
    try {
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower: updated }),
      });
    } finally {
      set({ saving: false });
    }
  },

  // Rename a cube's path. Rejects empty / duplicate paths within the district.
  // Persisted via full-tower POST. Updates the selection to the new path so the
  // inspector stays open on the renamed cube.
  renameCube: async (ref, newPath) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === ref.districtId);
    const c = d?.files.find((f) => f.path === ref.path);
    if (!c || !d) return;
    const trimmed = newPath.trim();
    if (!trimmed) return;
    if (trimmed === ref.path) return;
    if (d.files.some((f) => f.path === trimmed)) return;
    const updated: Tower = {
      ...tower,
      modified: new Date().toISOString(),
      districts: tower.districts.map((dd) =>
        dd.id !== ref.districtId
          ? dd
          : {
              ...dd,
              files: dd.files.map((f) =>
                f.path !== ref.path ? f : { ...f, path: trimmed },
              ),
            },
      ),
    };
    set({
      tower: updated,
      links: recomputeLinks(updated),
      saving: true,
      selected: { districtId: ref.districtId, path: trimmed },
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'notes',
          districtId: d.id,
          districtName: d.name,
          path: trimmed,
          summary: `renamed from ${ref.path}`,
        },
        tower,
      ),
    });
    try {
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower: updated }),
      });
    } finally {
      set({ saving: false });
    }
  },

  // Shuffle statuses for cubes in a single district — the per-district version
  // of the global shuffle. Same positional bias (earlier files more likely
  // done, later more likely planned).
  shuffleDistrict: async (districtId) => {
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === districtId);
    if (!d) return;
    let seed = (Date.now() ^ districtId.charCodeAt(0)) & 0xffff;
    const rng = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
    let changes = 0;
    for (let i = 0; i < d.files.length; i++) {
      const f = d.files[i];
      if (f.status === 'removed') continue;
      const r = rng();
      const threshold = (i + 1) / (d.files.length + 2);
      const newStatus: Status =
        r < threshold * 0.7 ? 'done'
        : r < threshold ? 'in_progress'
        : r < threshold + 0.05 ? 'stuck'
        : 'planned';
      const progress = newStatus === 'done' ? 100 : newStatus === 'in_progress' ? Math.round(20 + rng() * 60) : 0;
      if (newStatus !== f.status || progress !== f.progress) {
        await get().setStatus({ districtId: d.id, path: f.path }, newStatus);
        if (newStatus === 'in_progress') {
          await get().setProgress({ districtId: d.id, path: f.path }, progress);
        }
        changes++;
      }
    }
    if (changes > 0) {
      // Snapshot the pre-shuffle tower (captured above) so rewinding to this
      // entry restores the city as it was before the whole shuffle.
      const { activity, activitySnapshots } = pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-shuf-${districtId}`,
          ts: Date.now(),
          kind: 'shuffle' as const,
          districtId: d.id,
          districtName: d.name,
          path: '',
          summary: `shuffled ${changes} cubes in ${d.name}`,
        },
        tower,
      );
      usePlat.setState({ activity, activitySnapshots });
    }
  },

  // Undo the most recent status / progress / mark / notes change for which we
  // have an activity entry. We look at the latest activity entry that
  // references a real cube and try to revert the status based on the
  // "from → to" summary. If we can't parse it, we just clear the entry.
  undoLast: async () => {
    const activity = get().activity;
    // Find the most recent entry that has a parseable status change summary.
    const idx = activity.findIndex(
      (a) => a.districtId && a.kind === 'status' && a.summary.includes(' → '),
    );
    if (idx === -1) return;
    const entry = activity[idx];
    const m = entry.summary.match(/^(.+?) → (.+)$/);
    if (!m) return;
    const fromLabel = m[1]!.trim();
    // Reverse-map the short label back to a Status.
    const REVERSE: Record<string, Status> = {
      planned: 'planned',
      'in hand': 'in_progress',
      built: 'done',
      stuck: 'stuck',
      abandoned: 'abandoned',
      removed: 'removed',
    };
    const fromStatus = REVERSE[fromLabel];
    if (!fromStatus) return;
    await get().setStatus(
      { districtId: entry.districtId, path: entry.path },
      fromStatus,
    );
    // Remove the entry we just reverted so a second undo goes further back.
    usePlat.setState((s) => ({
      activity: s.activity.filter((a) => a.id !== entry.id),
    }));
  },

  // Click-to-rewind: restore the tower to the state captured right BEFORE the
  // action that produced the given activity entry, then truncate the activity
  // log so every entry that came AFTER the rewound one (chronologically newer,
  // which appear earlier in the most-recent-first array) is dropped — those
  // actions are now overwritten. A fresh "rewound to <rel>" marker entry is
  // pushed on top so the rewind itself is visible in the timeline.
  rewindToActivity: async (activityId) => {
    const state = get();
    const snapshot = state.activitySnapshots[activityId];
    const entry = state.activity.find((a) => a.id === activityId);
    if (!snapshot || !entry) return;
    const idx = state.activity.findIndex((a) => a.id === activityId);
    if (idx === -1) return;

    const restored = cloneTower(snapshot);
    restored.modified = new Date().toISOString();

    // Truncate everything chronologically newer than the rewound entry. The
    // activity array is most-recent-first, so those newer entries live at
    // indices [0, idx). Keep the rewound entry itself + everything older.
    const truncated = state.activity.slice(idx);

    const rewindEntry: ActivityEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      kind: 'rewind',
      districtId: entry.districtId,
      districtName: entry.districtName,
      path: entry.path,
      summary: `rewound to ${relTime(entry.ts)}`,
    };
    const newActivity = [rewindEntry, ...truncated].slice(0, ACTIVITY_MAX);

    // Rebuild snapshots: keep only those whose activity id survived the
    // truncation AND is within the most recent SNAPSHOT_MAX. The rewind
    // marker itself has no snapshot (it's a marker, not a restore point).
    const keepIds = new Set(newActivity.slice(0, SNAPSHOT_MAX).map((a) => a.id));
    const newSnapshots: Record<string, Tower> = {};
    for (const [id, t] of Object.entries(state.activitySnapshots)) {
      if (keepIds.has(id)) newSnapshots[id] = t;
    }

    // If the rewound entry references a real cube that still exists in the
    // restored tower, select it so the user lands on the right cube.
    const restoredDistrict = entry.districtId
      ? restored.districts.find((d) => d.id === entry.districtId)
      : undefined;
    const restoredCube = restoredDistrict?.files.find((f) => f.path === entry.path);
    const selectedUpdate =
      entry.districtId && restoredCube
        ? { selected: { districtId: entry.districtId, path: entry.path } as CubeRef }
        : {};

    set({
      tower: restored,
      links: recomputeLinks(restored),
      saving: true,
      activity: newActivity,
      activitySnapshots: newSnapshots,
      ...selectedUpdate,
    });

    try {
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower: restored }),
      });
    } catch {
      /* noop */
    } finally {
      set({ saving: false });
    }
  },

  setSeparated: (v) =>
    set((s) => ({
      view: {
        ...s.view,
        separated: v,
        focusStratum: v ? s.view.focusStratum : null,
      },
    })),

  // Global notepad — the tower-level scratchpad. Debounced persistence via a
  // trailing timer so rapid typing doesn't fire a request per keystroke.
  setNotepad: async (text) => {
    const updated = { ...get().tower, notepad: text, modified: new Date().toISOString() };
    set({ tower: updated });
    // Debounce the API save.
    const state = get() as PlatState & { _notepadTimer?: ReturnType<typeof setTimeout> };
    if (state._notepadTimer) clearTimeout(state._notepadTimer);
    state._notepadTimer = setTimeout(async () => {
      try {
        await fetch('/api/plat/notepad', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notepad: text }),
        });
      } catch {
        /* noop */
      }
    }, 600);
  },

  focusStratum: (st) =>
    set((s) => ({ view: { ...s.view, focusStratum: st } })),

  focusDistrict: (id) =>
    set((s) => ({ view: { ...s.view, focusDistrict: id } })),

  toggleCables: () =>
    set((s) => ({ view: { ...s.view, showCables: !s.view.showCables } })),

  toggleColorblind: () =>
    set((s) => ({ view: { ...s.view, colorblindMode: !s.view.colorblindMode } })),

  toggleGridSnap: () =>
    set((s) => ({ view: { ...s.view, gridSnap: !s.view.gridSnap } })),

  // Theme switching — paper (warm), blueprint (cool), dark (night).
  setTheme: (t) =>
    set((s) => ({ view: { ...s.view, theme: t } })),

  cycleTheme: () =>
    set((s) => {
      const order: ViewTheme[] = ['paper', 'blueprint', 'dark'];
      const i = order.indexOf(s.view.theme);
      const next = order[(i + 1) % order.length] ?? 'paper';
      return { view: { ...s.view, theme: next } };
    }),

  // Cable-kind visibility filter. An empty set means "show all" (the default).
  // Toggling a kind adds/removes it from the set; when the set becomes empty
  // again, all cables are shown.
  toggleCableKind: (k) =>
    set((s) => {
      const next = new Set(s.view.cableKinds);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return { view: { ...s.view, cableKinds: next } };
    }),

  setCableKinds: (kinds) =>
    set((s) => ({ view: { ...s.view, cableKinds: new Set(kinds) } })),

  toggleStackNumbers: () =>
    set((s) => ({ view: { ...s.view, showStackNumbers: !s.view.showStackNumbers } })),

  // Reorder a cube within a district's stack — moves the cube at fromPath to
  // the position currently occupied by toPath (i.e. insert before toPath).
  // Persisted via full-tower POST.
  reorderCube: async (districtId, fromPath, toPath) => {
    if (fromPath === toPath) return;
    const tower = get().tower;
    const d = tower.districts.find((x) => x.id === districtId);
    if (!d) return;
    const fromIdx = d.files.findIndex((f) => f.path === fromPath);
    const toIdx = d.files.findIndex((f) => f.path === toPath);
    if (fromIdx === -1 || toIdx === -1) return;
    // Build the new file order: remove fromIdx, then insert before toIdx.
    const newFiles = [...d.files];
    const [moved] = newFiles.splice(fromIdx, 1);
    if (!moved) return;
    // After splice, the toIdx might have shifted if fromIdx < toIdx.
    const newToIdx = newFiles.findIndex((f) => f.path === toPath);
    newFiles.splice(newToIdx === -1 ? newFiles.length : newToIdx, 0, moved);
    const updated: Tower = {
      ...tower,
      modified: new Date().toISOString(),
      districts: tower.districts.map((dd) =>
        dd.id !== districtId ? dd : { ...dd, files: newFiles },
      ),
    };
    set({
      tower: updated,
      links: recomputeLinks(updated),
      saving: true,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'notes',
          districtId: d.id,
          districtName: d.name,
          path: fromPath,
          summary: `reordered above ${toPath}`,
        },
        tower,
      ),
    });
    try {
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower: updated }),
      });
    } finally {
      set({ saving: false });
    }
  },

  setCamera: (p) =>
    set((s) => {
      const next = { ...s.view, ...p };
      // Normalize yaw to [-180, 180] so the readout stays clean and orbiting
      // doesn't accumulate to yaw=720 after a few spins. Free orbit is
      // preserved — this only affects the stored number, not the view.
      if (p.yaw !== undefined) next.yaw = normalizeYaw(next.yaw);
      return { view: next };
    }),

  // Animated camera: ease the camera toward a target over ~600ms. Cancels any
  // in-flight animation so rapid preset clicks don't fight each other.
  animateCamera: (target) => {
    const start = { ...get().view };
    // Pick the shortest angular path for yaw so the camera doesn't spin the
    // long way around when, e.g., current=170 and target=-170 (only 20° apart
    // via the wraparound, but 340° if interpolated linearly).
    let yawTarget = target.yaw;
    if (yawTarget !== undefined) {
      yawTarget = normalizeYaw(yawTarget);
      let delta = yawTarget - start.yaw;
      if (delta > 180) delta -= 360;
      else if (delta < -180) delta += 360;
      yawTarget = start.yaw + delta;
    }
    const t0 = performance.now();
    const DURATION = 620;
    // Track the latest animation id so a later call can cancel an earlier one.
    const id = Symbol();
    (get() as PlatState & { _camAnim?: symbol })._camAnim = id;
    const ease = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    const tick = () => {
      // Canceled by a newer animateCamera call?
      if ((get() as PlatState & { _camAnim?: symbol })._camAnim !== id) return;
      const t = Math.min(1, (performance.now() - t0) / DURATION);
      const e = ease(t);
      const next = {
        yaw: yawTarget !== undefined ? start.yaw + (yawTarget - start.yaw) * e : start.yaw,
        pitch: target.pitch !== undefined ? start.pitch + (target.pitch - start.pitch) * e : start.pitch,
        zoom: target.zoom !== undefined ? start.zoom + (target.zoom - start.zoom) * e : start.zoom,
      };
      set((s) => ({ view: { ...s.view, ...next } }));
      if (t < 1) requestAnimationFrame(tick);
      else {
        // Normalize the final yaw so the stored value stays in [-180, 180].
        set((s) => ({ view: { ...s.view, yaw: normalizeYaw(s.view.yaw) } }));
      }
    };
    requestAnimationFrame(tick);
  },

  // Nudge the camera by a small delta — arrow keys and the gizmo nudge ring.
  // Clamps pitch to the guardrails and normalizes yaw.
  nudgeCamera: (d) =>
    set((s) => {
      const yaw = normalizeYaw(s.view.yaw + (d.dYaw ?? 0));
      const pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, s.view.pitch + (d.dPitch ?? 0)));
      const zoom = Math.max(0.5, Math.min(1.9, s.view.zoom + (d.dZoom ?? 0)));
      return { view: { ...s.view, yaw, pitch, zoom } };
    }),

  setQuery: (q) => set({ query: q }),

  toggleStatusFilter: (st) =>
    set((s) => {
      const next = new Set(s.statusFilter);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return { statusFilter: next };
    }),

  clearActivity: () => set({ activity: [], activitySnapshots: {} }),

  // ---- snapshot actions ----

  listSnapshots: async () => {
    try {
      const res = await fetch('/api/plat/snapshots', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        set({ snapshots: data.snapshots ?? [] });
      }
    } catch {
      /* noop */
    }
  },

  saveSnapshot: async (name) => {
    const oldTower = get().tower;
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed) return null;
    try {
      const res = await fetch('/api/plat/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, tower: oldTower }),
      });
      if (res.ok) {
        const data = await res.json();
        const snap: SnapshotMeta = data.snapshot;
        set((s) => ({ snapshots: [snap, ...s.snapshots] }));
        const { activity, activitySnapshots } = pushActivity(
          get().activity,
          get().activitySnapshots,
          {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ts: Date.now(),
            kind: 'snapshot',
            districtId: '',
            districtName: '',
            path: '',
            summary: `saved snapshot "${trimmed}"`,
          },
          oldTower,
        );
        usePlat.setState({ activity, activitySnapshots });
        return snap.id;
      }
    } catch {
      /* noop */
    }
    return null;
  },

  loadSnapshot: async (id) => {
    const oldTower = get().tower;
    try {
      const res = await fetch(`/api/plat/snapshots/${id}`, { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      const raw = data.snapshot?.data;
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // Basic validation: must have a districts array.
      if (!parsed || !Array.isArray(parsed.districts)) return false;
      const tower: Tower = parsed;
      set({
        tower,
        links: recomputeLinks(tower),
        dirty: false,
        selected: null,
      });
      // Find the snapshot name for the activity entry.
      const snap = get().snapshots.find((s) => s.id === id);
      const snapName = snap?.name ?? id;
      const { activity, activitySnapshots } = pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'snapshot',
          districtId: '',
          districtName: '',
          path: '',
          summary: `restored snapshot "${snapName}"`,
        },
        oldTower,
      );
      usePlat.setState({ activity, activitySnapshots });
      // Persist the restored tower.
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower }),
      });
      return true;
    } catch {
      return false;
    }
  },

  deleteSnapshot: async (id) => {
    try {
      await fetch(`/api/plat/snapshots/${id}`, { method: 'DELETE' });
      set((s) => ({ snapshots: s.snapshots.filter((sn) => sn.id !== id) }));
    } catch {
      /* noop */
    }
  },

  // Import a tower from a .tower.json file. POST the full tower to the API
  // (full replace), update local state, and push an activity entry.
  importTower: async (tower, filename) => {
    const oldTower = get().tower;
    set({ saving: true });
    set({
      tower,
      links: recomputeLinks(tower),
      dirty: false,
      selected: null,
      ...pushActivity(
        get().activity,
        get().activitySnapshots,
        {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          kind: 'import',
          districtId: '',
          districtName: '',
          path: '',
          summary: `imported tower from ${filename}`,
        },
        oldTower,
      ),
    });
    try {
      await fetch('/api/plat/tower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tower }),
      });
    } finally {
      set({ saving: false });
    }
  },
}));

// ---- selectors (pure helpers, not hooks) ----

export function districtOf(tower: Tower, id: string): District | undefined {
  return tower.districts.find((d) => d.id === id);
}

export function cubeOf(
  tower: Tower,
  ref: CubeRef,
): { district?: District; cube?: FileCube } {
  const district = districtOf(tower, ref.districtId);
  const cube = district?.files.find((f) => f.path === ref.path);
  return { district, cube };
}

export function linksFor(ref: CubeRef): (links: Link[]) => Link[] {
  return (links) => linksForCube(links, ref.districtId, ref.path);
}

// Counts for the status legend.
export function statusCounts(tower: Tower): Record<Status, number> {
  const counts: Record<Status, number> = {
    planned: 0,
    in_progress: 0,
    done: 0,
    stuck: 0,
    abandoned: 0,
    removed: 0,
  };
  for (const d of tower.districts)
    for (const f of d.files) counts[f.status]++;
  return counts;
}

export function districtProgress(d: District): { built: number; total: number } {
  const total = d.files.length;
  const built = d.files.filter(
    (f) => f.status === 'done' || f.status === 'in_progress',
  ).length;
  return { built, total };
}
