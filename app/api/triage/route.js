//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { chatJSON } from '@/lib/llm';
import { triagePrompt } from '@/lib/prompts';
import { fallbackTriage } from '@/lib/fallback';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Jina reader: free, keyless scraping. 8s budget, fail quiet - a dead
// website must never block a brief. Returns { text, reason } so triage
// can explain WHY there's no company context, not just that there isn't.
async function scrape(url) {
  if (!url) return { text: null, reason: 'no_url' };
  try {
    const target = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://r.jina.ai/${target}`, {
      signal: controller.signal,
      headers: { 'X-Return-Format': 'text' },
    });
    clearTimeout(timer);
    if (!res.ok) return { text: null, reason: 'unreachable' };
    const text = (await res.text()).slice(0, 6000);
    if (!text.trim()) return { text: null, reason: 'empty' };
    return { text, reason: null };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : 'unreachable';
    return { text: null, reason };
  }
}

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