//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { chatJSON } from '@/lib/llm';
import { briefPrompt } from '@/lib/prompts';
import { fallbackBrief } from '@/lib/fallback';
import { scrape } from '@/lib/scrape';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/brief { prospect_id, meeting_type, rep_name }
export async function POST(req) {
  let payload = {};
  try {
    payload = await req.json();
    const { prospect_id, meeting_type, rep_name } = payload;
    const supa = db();
    const { data: prospect, error } = await supa
      .from('prospects').select('*').eq('id', prospect_id).single();
    if (error) throw error;
    const { data: meetings } = await supa
      .from('meetings').select('*').eq('prospect_id', prospect_id)
      .order('created_at', { ascending: false });

    const scrapeResult = await scrape(prospect.company_url);

    const { system, user } = briefPrompt({
      prospect, meetings: meetings || [], meetingType: meeting_type, repName: rep_name,
      scraped: scrapeResult.text, scrapeReason: scrapeResult.reason,
    });
    try {
      const { data, provider } = await chatJSON(system, user);
      return NextResponse.json({ brief: { ...data, degraded: false, used_website: Boolean(scrapeResult.text) }, provider });
    } catch {
      // Whole LLM chain down: render straight from memory, clearly labeled.
      const brief = fallbackBrief({ prospect, meetings: meetings || [], meetingType: meeting_type });
      return NextResponse.json({ brief, provider: 'none' });
    }
  } catch (err) {
    console.error('[brief]', err.message);
    return NextResponse.json({ error: 'Could not generate brief.' }, { status: 500 });
  }
}
