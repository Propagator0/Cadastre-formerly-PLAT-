// PLAT — cube patch endpoint.
//
// PUT /api/plat/cube
//   body: { districtId, path, patch: { status?, progress?, notes?, marks? } }
//   → 200 { cube: FileCube } | 404 { error } | 400 { error } | 500 { error }
//
// Strategy: load the whole tower, find the cube, apply the patch in memory,
// bump `modified`, then save the whole tower back. We do the full save (rather
// than a targeted row update) so the load/save pair stays the single source of
// truth for serialization — no second code path that can drift on the marks
// JSON format. The dataset is small (~90 cubes) so the cost is negligible.

import { NextRequest, NextResponse } from 'next/server';
import { loadTower, saveTower } from '@/lib/plat/db-mapping';
import { findCube } from '@/lib/plat/wiring';
import { Status } from '@/lib/plat/types';
import { Part, rollup, progressOf } from '@/lib/plat/parts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CubePatch {
  status?: Status;
  progress?: number;
  notes?: string;
  marks?: string[];
  // Parts arrive as a whole array rather than as per-part deltas. The client
  // already holds the authoritative list and the file is small; sending the
  // array back means there is one merge rule (last write wins) instead of a
  // second one hiding in the patch semantics. Status and progress are then
  // re-derived server-side and any values the client sent for them are
  // ignored — they are rollups, and the server does not trust a rollup it
  // did not compute.
  parts?: Part[];
}

interface CubePutBody {
  districtId?: string;
  path?: string;
  patch?: CubePatch;
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as CubePutBody;

    if (!body.districtId || !body.path) {
      return NextResponse.json(
        { error: 'missing `districtId` or `path`' },
        { status: 400 },
      );
    }
    if (!body.patch || typeof body.patch !== 'object') {
      return NextResponse.json(
        { error: 'missing `patch` object' },
        { status: 400 },
      );
    }

    const tower = await loadTower();
    const cube = findCube(tower, body.districtId, body.path);
    if (!cube) {
      return NextResponse.json(
        {
          error: `cube not found: ${body.districtId}/${body.path}`,
        },
        { status: 404 },
      );
    }

    // Apply the patch field-by-field so unspecified fields are left untouched.
    const patch = body.patch;
    if (patch.status !== undefined) cube.status = patch.status;
    if (patch.progress !== undefined) {
      const n = Number(patch.progress);
      if (!Number.isFinite(n)) {
        return NextResponse.json(
          { error: '`progress` must be a number' },
          { status: 400 },
        );
      }
      cube.progress = Math.max(0, Math.min(100, Math.round(n)));
    }
    if (patch.notes !== undefined) cube.notes = patch.notes;
    if (patch.marks !== undefined) {
      if (!Array.isArray(patch.marks)) {
        return NextResponse.json(
          { error: '`marks` must be an array of strings' },
          { status: 400 },
        );
      }
      cube.marks = patch.marks.map((m) => String(m));
    }
    if (patch.parts !== undefined) {
      if (!Array.isArray(patch.parts)) {
        return NextResponse.json(
          { error: '`parts` must be an array' },
          { status: 400 },
        );
      }
      cube.parts = patch.parts;
      // Rollups, recomputed here and nowhere else on this path. Whatever the
      // client said about status or progress above is overwritten, because a
      // cube whose courses and whose badge disagree is worse than either.
      cube.status = rollup(cube.parts);
      cube.progress = progressOf(cube.parts);
    }

    tower.modified = new Date().toISOString();
    await saveTower(tower);

    return NextResponse.json({ cube });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
