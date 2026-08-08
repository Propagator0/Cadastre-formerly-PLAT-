// PLAT — PUT /api/plat/notepad
//
// Updates only the tower-level notepad field. The notepad is a global
// scratchpad for project-level notes ("the next thing to build", "what's
// blocking me"), kept separate from per-file notes (which live on cubes).
//
// Body: { notepad: string }
// Returns: { ok: true, notepad: string }

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.notepad !== 'string') {
      return NextResponse.json(
        { error: 'notepad must be a string' },
        { status: 400 },
      );
    }
    // Cap the notepad at a generous size to avoid runaway payloads.
    const notepad = body.notepad.slice(0, 20_000);

    await db.towerRecord.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        name: 'atlas',
        created: new Date(),
        modified: new Date(),
        notepad,
      },
      update: {
        notepad,
        modified: new Date(),
      },
    });

    return NextResponse.json({ ok: true, notepad });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
