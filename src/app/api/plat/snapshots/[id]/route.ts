// PLAT — single snapshot get / delete endpoints.
//
// GET    /api/plat/snapshots/[id]  → { snapshot: {id, name, data, createdAt} }
// DELETE /api/plat/snapshots/[id]  → { ok: true }

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const row = await db.snapshotRecord.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json(
        { error: 'snapshot not found' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      snapshot: {
        id: row.id,
        name: row.name,
        data: row.data,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.snapshotRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
