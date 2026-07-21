//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

// Graceful degradation: if every LLM provider fails, render structured
// output straight from memory. Clearly labeled so nobody mistakes it for AI
// judgment. The product never white-screens during a review.

export function fallbackBrief({ prospect, meetings, meetingType }) {
  const m = prospect.memory || {};
  const openCommitments = (m.commitments || [])
    .filter((c) => (c.status || '').startsWith('open'))
    .map((c) => `${c.who === 'us' ? 'We owe' : 'They owe'}: ${c.what}`);
  const objectives = {
    discovery: 'Qualify: uncover pain, budget owner, and timeline.',
    demo: 'Prove value against their stated pains and book the next step.',
    closing: 'Clear remaining blockers and get explicit commitment.',
  };
  return {
    degraded: true,
    headline: m.summary
      ? m.summary.split('.')[0] + '.'
      : `${meetings.length} prior meeting(s). Review intel below before the call.`,
    where_we_are: m.summary || 'No merged summary yet - this may be the first meeting.',
    what_they_care_about: (m.pains || []).slice(0, 5),
    landmines: (m.objections || [])
      .filter((o) => (o.status || '').startsWith('open'))
      .map((o) => `Unresolved: ${o.objection}`),
    objective: objectives[meetingType] || objectives.discovery,
    talking_points: (m.next_steps || []).concat(
      (m.stakeholders || []).map((s) => `Stakeholder: ${s.name} (${s.role}) - ${s.notes}`)
    ).slice(0, 5),
    open_commitments: openCommitments,
    smart_question: (m.personal_notes || [])[0]
      ? `Callback detail on file: ${(m.personal_notes || [])[0]}`
      : 'Ask what has changed on their side since the last conversation.',
  };
}

export function fallbackTriage({ prospect, meetings }) {
  const m = prospect.memory || {};
  const reasons = [];
  if (!prospect.contact_role) reasons.push('Contact role unknown - authority unverified');
  if (meetings.length >= 2 && !(m.budget_signals || []).some((b) => b && !/none/i.test(b)))
    reasons.push('No budget signal after 2+ meetings');
  if ((m.next_steps || []).length === 0 && meetings.length >= 1)
    reasons.push('No next step from the last meeting');
  return {
    degraded: true,
    verdict: reasons.length >= 2 ? 'caution' : 'proceed',
    reasons: reasons.length ? reasons : ['No obvious red flags in stored intel'],
    what_would_change_this: 'AI check unavailable - verdict from stored facts only.',
  };
}
