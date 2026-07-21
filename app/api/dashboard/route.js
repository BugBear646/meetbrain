//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { daysSinceLastMeeting } from '@/lib/scoring';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/dashboard - manager aggregate. ZERO LLM calls: everything here is
// a read of precomputed signals, so it loads instantly and never rate-limits.
export async function GET() {
  try {
    const supa = db();
    const [{ data: prospects, error: e1 }, { data: meetings, error: e2 }] = await Promise.all([
      supa.from('prospects').select('*'),
      supa.from('meetings').select('*').order('created_at', { ascending: false }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const byProspect = {};
    for (const m of meetings || []) {
      (byProspect[m.prospect_id] = byProspect[m.prospect_id] || []).push(m);
    }

    const deals = (prospects || []).map((p) => {
      const ms = byProspect[p.id] || [];
      const memory = p.memory || {};
      return {
        id: p.id,
        company: p.company,
        contact: p.contact_name,
        rep: p.rep_name,
        stage: p.stage,
        signal: p.signal,
        triage_verdict: p.triage?.verdict || null,
        meetings: ms.length,
        days_since: daysSinceLastMeeting(ms),
        next_step: (memory.next_steps || [])[0] || null,
        open_objections: (memory.objections || []).filter((o) => (o.status || '').startsWith('open')).length,
        summary: memory.summary || null,
      };
    });

    const order = { at_risk: 0, stalling: 1, new: 2, advancing: 3 };
    deals.sort((a, b) => (order[a.signal] ?? 9) - (order[b.signal] ?? 9));

    const flagged = deals.filter((d) => d.triage_verdict === 'dont_book' || d.triage_verdict === 'caution');

    // Coaching: deterministic per-rep patterns from the same data.
    const reps = {};
    for (const d of deals) {
      if (!d.rep) continue;
      const r = (reps[d.rep] = reps[d.rep] || { rep: d.rep, deals: 0, stalling: 0, at_risk: 0, no_next_step: 0, flagged_booked: 0 });
      r.deals += 1;
      if (d.signal === 'stalling') r.stalling += 1;
      if (d.signal === 'at_risk') r.at_risk += 1;
      if (!d.next_step && d.meetings > 0) r.no_next_step += 1;
      if (d.triage_verdict === 'dont_book') r.flagged_booked += 1;
    }
    const coaching = Object.values(reps).map((r) => {
      const tips = [];
      if (r.no_next_step > 0) tips.push(`${r.no_next_step} deal(s) ended a meeting without a booked next step - coach on closing for commitment.`);
      if (r.flagged_booked > 0) tips.push(`${r.flagged_booked} meeting(s) triage flagged as should-not-book - review qualification before booking.`);
      if (r.stalling > 0) tips.push(`${r.stalling} deal(s) stalling - nudge for re-engagement this week.`);
      return { ...r, tips };
    });

    return NextResponse.json({
      stats: {
        total: deals.length,
        advancing: deals.filter((d) => d.signal === 'advancing').length,
        stalling: deals.filter((d) => d.signal === 'stalling').length,
        at_risk: deals.filter((d) => d.signal === 'at_risk').length,
        meetings_this_week: (meetings || []).filter((m) => Date.now() - new Date(m.created_at) < 7 * 86400000).length,
      },
      deals,
      flagged,
      coaching,
    });
  } catch (err) {
    console.error('[dashboard]', err.message);
    return NextResponse.json({ error: 'Could not load dashboard. Check Supabase env vars.' }, { status: 500 });
  }
}
