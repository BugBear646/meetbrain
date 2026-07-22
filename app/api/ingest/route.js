//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { chatJSON } from '@/lib/llm';
import { ingestPrompt } from '@/lib/prompts';
import { computeSignal } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/ingest { prospect_id, meeting_type, rep_name, notes }
// The loop-closer: notes -> extraction -> merged memory -> recomputed signal.
export async function POST(req) {
  try {
    const { prospect_id, meeting_type, rep_name, notes } = await req.json();
    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Paste your call notes first.' }, { status: 400 });
    }
    const supa = db();
    const { data: prospect, error } = await supa
      .from('prospects').select('*').eq('id', prospect_id).single();
    if (error) throw error;

    let extracted = null;
    let newMemory = prospect.memory || {};
    let newStage = prospect.stage;
    let degraded = false;

    try {
      const { system, user } = ingestPrompt({ prospect, meetingType: meeting_type, notes });
      const { data } = await chatJSON(system, user);
      extracted = {
        meeting_summary: data.meeting_summary,
        commitments_made: data.commitments_made || [],
        stage_suggestion: data.stage_suggestion,
      };
      newMemory = data.memory || newMemory;
      const stages = ['discovery', 'demo', 'closing', 'closed_won', 'closed_lost'];
      if (stages.includes(data.stage_suggestion)) newStage = data.stage_suggestion;

      // Stage floor: a meeting that was logged means that stage was reached,
      // regardless of outcome (no-show, cut short, etc). The LLM's
      // stage_suggestion is trusted to move stage FORWARD or to closed_won/
      // closed_lost, but it must never regress stage below the ordinary
      // rank of the meeting type just held - that would silently undo the
      // "stage tracks meeting type reached" rule if the model ever
      // second-guesses a bad meeting.
      const rank = { discovery: 0, demo: 1, closing: 2, closed_won: 3, closed_lost: 3 };
      const loggedTypeRank = rank[meeting_type];
      const newStageRank = rank[newStage];
      if (loggedTypeRank !== undefined && (newStageRank === undefined || newStageRank < loggedTypeRank)) {
        newStage = meeting_type;
      }
    } catch {
      // LLM down: save raw notes (extracted stays null). The brief prompt
      // includes unprocessed notes, and the next successful ingest merges them.
      degraded = true;
    }

    const { data: meeting, error: e2 } = await supa
      .from('meetings')
      .insert({ prospect_id, meeting_type, rep_name: rep_name || prospect.rep_name, notes, extracted })
      .select().single();
    if (e2) throw e2;

    const { data: allMeetings } = await supa
      .from('meetings').select('*').eq('prospect_id', prospect_id);

    const updatedProspect = { ...prospect, memory: newMemory, triage: null };
    const signal = degraded ? prospect.signal : computeSignal(updatedProspect, allMeetings || []);

    await supa.from('prospects').update({
      memory: newMemory,
      stage: newStage,
      signal,
      triage: null, // new information invalidates the cached verdict
      updated_at: new Date().toISOString(),
    }).eq('id', prospect_id);

    return NextResponse.json({
      degraded,
      meeting_id: meeting.id,
      extracted,
      signal,
      stage: newStage,
      memory: newMemory,
    });
  } catch (err) {
    console.error('[ingest]', err.message);
    return NextResponse.json({ error: 'Could not save notes.' }, { status: 500 });
  }
}