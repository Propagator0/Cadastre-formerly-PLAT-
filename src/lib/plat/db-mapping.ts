// PLAT — row ↔ domain mapping.
//
// The database stores the tower as three flat tables (TowerRecord,
// DistrictRecord, FileCubeRecord). The frontend speaks the nested `Tower`
// shape from types.ts. This module is the only place that translates between
// the two, so the rest of the backend can stay agnostic of the column layout.
//
// Two operations:
//   loadTower()  — read everything back into a Tower, seeding first if empty.
//   saveTower(t) — replace the whole city (delete + re-insert in one
//                  transaction). The dataset is ~90 cubes; a full replace is
//                  simpler and safer than diffing.

import { db } from '@/lib/db';
import { District, FileCube, Status, Tower } from './types';
import { parseParts, serialiseParts, synthesise, progressOf, rollup } from './parts';
import { ensureSeeded } from './db-seed';

const SINGLETON_ID = 'singleton';

function parseMarks(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((m) => String(m));
    return [];
  } catch {
    return [];
  }
}

export async function loadTower(): Promise<Tower> {
  let towerRow = await db.towerRecord.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (!towerRow) {
    await ensureSeeded();
    towerRow = await db.towerRecord.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (!towerRow) {
      // ensureSeeded should have created it; if not, something is very wrong.
      throw new Error('PLAT: failed to ensure seed tower');
    }
  }

  const districtRows = await db.districtRecord.findMany({
    where: { towerId: SINGLETON_ID },
    orderBy: { order: 'asc' },
  });

  const cubeRows = await db.fileCubeRecord.findMany({
    orderBy: { order: 'asc' },
  });

  // Bucket cubes by district id once, then walk districts in order so the
  // nested array preserves both the district order and the per-district file
  // order.
  const cubesByDistrict = new Map<string, FileCube[]>();
  for (const c of cubeRows) {
    const list = cubesByDistrict.get(c.districtId) ?? [];
    // A row written before parts existed carries "[]". Synthesise a
    // skeleton from its path, seeded with the status and progress the row
    // already had, so an old database opens looking exactly as it did.
    const stored = parseParts(c.parts);
    const parts =
      stored.length > 0
        ? stored
        : synthesise(c.path, c.status as Status, c.progress);
    list.push({
      path: c.path,
      // Both derived. The columns are a cache of these two calls, and this
      // is the read path that keeps the cache honest.
      status: rollup(parts),
      progress: progressOf(parts),
      notes: c.notes,
      marks: parseMarks(c.marks),
      parts,
    });
    cubesByDistrict.set(c.districtId, list);
  }

  const districts: District[] = districtRows.map((d) => ({
    id: d.id,
    name: d.name,
    tag: d.tag,
    color: d.color,
    note: d.note,
    anchor: { x: d.anchorX, z: d.anchorZ, rot: d.anchorRot },
    files: cubesByDistrict.get(d.id) ?? [],
  }));

  return {
    name: towerRow.name,
    created: towerRow.created.toISOString(),
    modified: towerRow.modified.toISOString(),
    notepad: towerRow.notepad,
    districts,
  };
}

export async function saveTower(t: Tower): Promise<void> {
  await db.$transaction(async (tx) => {
    // Upsert the singleton tower row.
    await tx.towerRecord.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        name: t.name,
        created: new Date(t.created),
        modified: new Date(t.modified),
        notepad: t.notepad,
      },
      update: {
        name: t.name,
        created: new Date(t.created),
        modified: new Date(t.modified),
        notepad: t.notepad,
      },
    });

    // Full replace of districts + cubes. There is only ever one tower, so we
    // can safely clear both tables wholesale.
    await tx.fileCubeRecord.deleteMany({});
    await tx.districtRecord.deleteMany({ where: { towerId: SINGLETON_ID } });

    for (let di = 0; di < t.districts.length; di++) {
      const d = t.districts[di]!;
      await tx.districtRecord.create({
        data: {
          id: d.id,
          name: d.name,
          tag: d.tag,
          color: d.color,
          note: d.note,
          anchorX: d.anchor.x,
          anchorZ: d.anchor.z,
          anchorRot: d.anchor.rot,
          order: di,
          towerId: SINGLETON_ID,
        },
      });

      for (let fi = 0; fi < d.files.length; fi++) {
        const f = d.files[fi]!;
        await tx.fileCubeRecord.create({
          data: {
            districtId: d.id,
            path: f.path,
            status: f.status,
            progress: f.progress,
            notes: f.notes,
            marks: JSON.stringify(f.marks),
            parts: serialiseParts(f.parts ?? []),
            order: fi,
          },
        });
      }
    }
  });
}

// Clear the whole city. Used by the reset endpoint before re-seeding.
export async function clearTower(): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.fileCubeRecord.deleteMany({});
    await tx.districtRecord.deleteMany({});
    await tx.towerRecord.deleteMany({});
  });
}
