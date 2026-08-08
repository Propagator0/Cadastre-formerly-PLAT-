// PLAT — reset endpoint.
//
// POST /api/plat/reset  → { ok: true }
//
// Wipes the whole city (tower + districts + cubes) and re-seeds from
// defaultTower(). Used by the "reset to defaults" button. Force-dynamic so a
// cached reset response can't fool a later load.

import { NextResponse } from 'next/server';
import { clearTower } from '@/lib/plat/db-mapping';
import { ensureSeeded } from '@/lib/plat/db-seed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    await clearTower();
    await ensureSeeded();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
