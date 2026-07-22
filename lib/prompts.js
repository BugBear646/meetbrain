//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

// The three jobs, as prompt builders. Each demands strict JSON with a fixed
// schema so the UI can render without guessing. Keep inputs small: briefs are
// generated from merged memory, never from raw transcripts.

export function briefPrompt({ prospect, meetings, meetingType, repName }) {
  const pendingNotes = meetings
    .filter((m) => m.notes && !m.extracted)
    .map((m) => `(${m.meeting_type}, unprocessed) ${m.notes}`)
    .join('\n');

  const system = `You are a sales meeting prep assistant. You write sharp, specific pre-call briefs a rep can absorb on a phone in under 5 minutes. Never invent facts: if memory lacks something, say so plainly (e.g. "budget owner unknown - find out"). Respond with ONLY a JSON object, no markdown, matching exactly:
{
  "headline": "one sentence: the single most important thing to know walking in",
  "where_we_are": "2-3 sentences on deal state and what happened last meeting",
  "what_they_care_about": ["3-5 short bullets, most important first"],
  "landmines": ["things NOT to do or bring up, with why; empty array if none"],
  "objective": "the ONE outcome this meeting must produce",
  "talking_points": ["3-5 concrete points/questions tailored to this meeting type"],
  "open_commitments": ["promises either side has not delivered yet; empty array if none"],
  "smart_question": "one question that shows we listened last time"
}`;

  const user = `Meeting type: ${meetingType}
Rep running the call: ${repName || prospect.rep_name || 'unknown'}
Prospect company: ${prospect.company}
Contact: ${prospect.contact_name || 'unknown'} (${prospect.contact_role || 'role unknown'})
Current stage: ${prospect.stage}
Meetings so far: ${meetings.length}

WHAT WE KNOW (merged memory from prior calls):
${JSON.stringify(prospect.memory || {}, null, 2)}
${pendingNotes ? `\nRAW NOTES NOT YET PROCESSED (weave in if useful):\n${pendingNotes}` : ''}

Tailor to meeting type: discovery = qualify and uncover pain; demo = prove value against their stated pains; closing = clear remaining blockers and get commitment.`;

  return { system, user };
}

export function triagePrompt({ prospect, meetings, scraped, scrapeReason }) {
  const system = `You are a sales qualification gatekeeper. Decide if the NEXT meeting with this prospect should happen. Be direct; a wrong "proceed" costs a rep 30 minutes, a wrong "dont_book" costs a deal - so reserve "dont_book" for strong evidence (competitor recon, fake buyer, zero qualification after multiple calls). Respond with ONLY a JSON object:
{
  "verdict": "proceed" | "caution" | "dont_book",
  "reasons": ["1-3 short, specific reasons"],
  "what_would_change_this": "one sentence: what evidence would upgrade/downgrade this verdict"
}`;

  const websiteReasons = {
    no_url: '(No company URL was provided for this prospect - website research was not attempted.)',
    unreachable: "(A company URL was provided, but the site could not be reached or returned an error - website research could not be completed. This is not, by itself, a red flag about the prospect.)",
    timeout: "(A company URL was provided, but the site did not respond in time - website research could not be completed. This is not, by itself, a red flag about the prospect.)",
    empty: '(A company URL was provided and the site responded, but no usable content was found - website research was inconclusive.)',
  };

  const user = `Prospect: ${prospect.company}
Contact: ${prospect.contact_name || 'unknown'} (${prospect.contact_role || 'role unknown'})
Stage: ${prospect.stage} | Meetings so far: ${meetings.length}

MEMORY:
${JSON.stringify(prospect.memory || {}, null, 2)}
${scraped ? `\nCOMPANY WEBSITE (scraped just now, may clarify who they really are):\n${scraped.slice(0, 4000)}` : `\n${websiteReasons[scrapeReason] || '(No company URL available to verify.)'}`}

Red flags to weigh: no identifiable buyer or budget after 2+ meetings, contact cannot name who they represent, unusually deep competitor/architecture/pricing probing, role with no purchase authority and no path to one. A missing or unreachable website is an information gap, not itself a red flag - do not treat it as suspicious on its own.`;

  return { system, user };
}

export function ingestPrompt({ prospect, meetingType, notes }) {
  const system = `You maintain the durable memory of a sales prospect. Merge new call notes into existing memory. Rules:
- Newer facts override older ones on conflict.
- Keep only durable, decision-relevant facts. Throw away pleasantries and rambling.
- Objections: update status if the notes show progress; never silently drop an open objection.
- Commitments: mark done if fulfilled, add new ones with who/what.
- personal_notes = small human details that make the next call warmer (max 3).
Respond with ONLY a JSON object:
{
  "memory": {
    "summary": "3-4 sentence current state of this deal",
    "stakeholders": [{"name": "", "role": "", "notes": ""}],
    "pains": [""],
    "objections": [{"objection": "", "status": "open|resolved - how"}],
    "competitors": [""],
    "budget_signals": [""],
    "commitments": [{"who": "us|them", "what": "", "status": "open|done"}],
    "next_steps": [""],
    "personal_notes": [""]
  },
  "meeting_summary": "2 sentences: what actually happened and what changed",
  "commitments_made": ["new promises from this call, empty if none"],
  "stage_suggestion": "discovery|demo|closing|closed_won|closed_lost"
}`;

  const user = `Prospect: ${prospect.company} (current stage: ${prospect.stage})
Meeting type just finished: ${meetingType}

EXISTING MEMORY:
${JSON.stringify(prospect.memory || {}, null, 2)}

NEW CALL NOTES (raw, messy is fine):
${notes}`;

  return { system, user };
}