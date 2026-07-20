import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
