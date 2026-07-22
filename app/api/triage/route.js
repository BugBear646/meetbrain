//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { chatJSON } from '@/lib/llm';
import { triagePrompt } from '@/lib/prompts';
import { fallbackTriage } from '@/lib/fallback';
import { scrape } from '@/lib/scrape';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Jina reader: free, keyless scraping. 8s budget, fail quiet - a dead
// website must never block a brief. (shared implementation: lib/scrape.js)

// POST /api/triage { prospect_id, force? }
export async function POST(req) {
  try {
    const { prospect_id, force } = await req.json();
    const supa = db();
    const { data: prospect, error } = await supa
      .from('prospects').select('*').eq('id', prospect_id).single();
    if (error) throw error;

    // Cache: triage is re-run only after new information (ingest clears it).
    if (prospect.triage && !force) {
      return NextResponse.json({ triage: prospect.triage, cached: true });
    }

    const { data: meetings } = await supa
      .from('meetings').select('*').eq('prospect_id', prospect_id)
      .order('created_at', { ascending: false });

    const scrapeResult = await scrape(prospect.company_url);
    const { system, user } = triagePrompt({ prospect, meetings: meetings || [], scraped: scrapeResult.text, scrapeReason: scrapeResult.reason });

    let triage;
    try {
      const { data } = await chatJSON(system, user);
      triage = { ...data, degraded: false, used_website: Boolean(scrapeResult.text), checked_at: new Date().toISOString() };
    } catch {
      triage = { ...fallbackTriage({ prospect, meetings: meetings || [] }), used_website: false, checked_at: new Date().toISOString() };
    }

    await supa.from('prospects').update({ triage }).eq('id', prospect_id);
    return NextResponse.json({ triage, cached: false });
  } catch (err) {
    console.error('[triage]', err.message);
    return NextResponse.json({ error: 'Could not run triage.' }, { status: 500 });
  }
}