// PLAT — tower endpoints.
//
// GET  /api/plat/tower   → { tower: Tower }   (seeds on first contact)
// POST /api/plat/tower   → { ok: true }       (full-state replace, e.g. reset)
//
// These are the load/save pair the frontend talks to. The cube patch endpoint
// is the surgical one; this is the "give me everything" / "replace everything"
// one. Both are force-dynamic so the city is never served from a stale cache.

import { NextRequest, NextResponse } from 'next/server';
import { loadTower, saveTower } from '@/lib/plat/db-mapping';
import { Tower } from '@/lib/plat/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const tower = await loadTower();
    return NextResponse.json({ tower });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tower?: Tower };
    if (!body?.tower) {
      return NextResponse.json(
        { error: 'missing `tower` in body' },
        { status: 400 },
      );
    }
    await saveTower(body.tower);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
