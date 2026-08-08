// PLAT — database seeding.
//
// The city starts as the default tower defined in seed.ts. This module makes
// sure that default exists in the database on first contact, idempotently: if
// the singleton tower row is already there we do nothing, otherwise we insert
// the tower, every district, and every cube — preserving order and serializing
// marks as JSON strings (SQLite primitives can't be lists).
//
// `ensureSeeded` is the only thing that should ever CREATE the initial tower
// row. Subsequent edits go through saveTower / the cube patch endpoint, which
// mutate or replace rows in place.

import { db } from '@/lib/db';
import { defaultTower } from './seed';

const SINGLETON_ID = 'singleton';

export async function ensureSeeded(): Promise<void> {
  const existing = await db.towerRecord.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (existing) return;

  const tower = defaultTower();

  await db.$transaction(async (tx) => {
    await tx.towerRecord.create({
      data: {
        id: SINGLETON_ID,
        name: tower.name,
        created: new Date(tower.created),
        modified: new Date(tower.modified),
        notepad: tower.notepad,
      },
    });

    for (let di = 0; di < tower.districts.length; di++) {
      const d = tower.districts[di]!;
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
            order: fi,
          },
        });
      }
    }
  });
}
