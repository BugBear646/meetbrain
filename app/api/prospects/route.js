//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/prospects - list for the rep home screen
export async function GET() {
  try {
    const supa = db();
    const { data: prospects, error } = await supa
      .from('prospects')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const { data: meetings, error: e2 } = await supa
      .from('meetings')
      .select('id, prospect_id, meeting_type, created_at');
    if (e2) throw e2;
    const byProspect = {};
    for (const m of meetings || []) {
      (byProspect[m.prospect_id] = byProspect[m.prospect_id] || []).push(m);
    }
    return NextResponse.json({
      prospects: (prospects || []).map((p) => ({
        ...p,
        meeting_count: (byProspect[p.id] || []).length,
        last_meeting_at: (byProspect[p.id] || [])
          .map((m) => m.created_at)
          .sort()
          .pop() || null,
      })),
    });
  } catch (err) {
    console.error('[prospects GET]', err.message);
    return NextResponse.json({ error: 'Could not load prospects. Check Supabase env vars.' }, { status: 500 });
  }
}

// POST /api/prospects - add a prospect (also how reviewers test real URLs)
export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.company?.trim()) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    const supa = db();
    const { data, error } = await supa
      .from('prospects')
      .insert({
        company: body.company.trim(),
        contact_name: body.contact_name?.trim() || null,
        contact_role: body.contact_role?.trim() || null,
        company_url: body.company_url?.trim() || null,
        rep_name: body.rep_name?.trim() || null,
        memory: {},
        signal: 'new',
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ prospect: data });
  } catch (err) {
    console.error('[prospects POST]', err.message);
    return NextResponse.json({ error: 'Could not save prospect.' }, { status: 500 });
  }
}
