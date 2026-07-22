//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/prospects/:id - prospect + full meeting history
export async function GET(_req, { params }) {
  try {
    const supa = db();
    const { data: prospect, error } = await supa
      .from('prospects')
      .select('*')
      .eq('id', params.id)
      .single();
    if (error) throw error;
    const { data: meetings, error: e2 } = await supa
      .from('meetings')
      .select('*')
      .eq('prospect_id', params.id)
      .order('created_at', { ascending: false });
    if (e2) throw e2;
    return NextResponse.json({ prospect, meetings: meetings || [] });
  } catch (err) {
    console.error('[prospect GET]', err.message);
    return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
  }
}

// DELETE /api/prospects/:id - removes the prospect and its meetings
// (meetings cascade-delete via the FK in schema.sql). Used by the
// manager view to clear out test data.
export async function DELETE(_req, { params }) {
  try {
    const supa = db();
    const { error } = await supa.from('prospects').delete().eq('id', params.id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[prospect DELETE]', err.message);
    return NextResponse.json({ error: 'Could not delete prospect.' }, { status: 500 });
  }
}
