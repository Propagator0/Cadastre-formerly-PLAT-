// PLAT — snapshot list / create endpoints.
//
// GET  /api/plat/snapshots  → { snapshots: Array<{id, name, createdAt}> }
// POST /api/plat/snapshots  → { snapshot: {id, name, createdAt} }
//
// Snapshots are named bookmarks of the full tower state so the user can
// rewind to a saved point.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Tower } from '@/lib/plat/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await db.snapshotRecord.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json({
      snapshots: rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; tower?: Tower };
    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'missing or invalid `name` in body' },
        { status: 400 },
      );
    }
    if (!body?.tower) {
      return NextResponse.json(
        { error: 'missing `tower` in body' },
        { status: 400 },
      );
    }
    // Cap name at 30 chars.
    const name = body.name.trim().slice(0, 30);
    if (!name) {
      return NextResponse.json(
        { error: 'snapshot name cannot be empty' },
        { status: 400 },
      );
    }
    const data = JSON.stringify(body.tower);
    const row = await db.snapshotRecord.create({
      data: { name, data },
    });
    return NextResponse.json({
      snapshot: {
        id: row.id,
        name: row.name,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
