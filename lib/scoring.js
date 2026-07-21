//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

// Deal signal is COMPUTED, not asked for. Pure rules over memory + meeting
// recency, run at ingest time and stored on the prospect. The manager
// dashboard is therefore instant and immune to LLM rate limits.
//
// Rules (documented in the one-pager):
//   at_risk    - triage says dont_book, OR 2+ open objections with no next step
//   stalling   - last meeting > 14 days ago, OR latest meeting produced no
//                next step and no new commitments
//   advancing  - there is a concrete next step or open mutual commitments,
//                and the deal has momentum (met within 14 days)
//   new        - no meetings yet

export function computeSignal(prospect, meetings) {
  if (!meetings || meetings.length === 0) return 'new';

  const memory = prospect.memory || {};
  const openObjections = (memory.objections || []).filter(
    (o) => (o.status || '').startsWith('open')
  ).length;
  const nextSteps = (memory.next_steps || []).filter(Boolean).length;
  const openCommitments = (memory.commitments || []).filter(
    (c) => (c.status || '').startsWith('open')
  ).length;

  const last = meetings.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );
  const daysSince = (Date.now() - new Date(last.created_at).getTime()) / 86400000;

  const triageVerdict = prospect.triage?.verdict;
  if (triageVerdict === 'dont_book') return 'at_risk';
  if (openObjections >= 2 && nextSteps === 0) return 'at_risk';
  if (daysSince > 14) return 'stalling';
  if (nextSteps === 0 && openCommitments === 0) return 'stalling';
  return 'advancing';
}

export function daysSinceLastMeeting(meetings) {
  if (!meetings || meetings.length === 0) return null;
  const last = meetings.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );
  return Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400000);
}
