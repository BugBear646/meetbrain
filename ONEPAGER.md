# Meetbrain - One-Pager

## The 3 hardest tradeoffs

**1. Merged memory vs append-only history.** Storing every transcript verbatim and letting the LLM re-read it all before each brief would be more "complete" - and would produce slow, bloated briefs that outgrow free-tier token limits by week two. I chose a merged memory document per prospect (stakeholders, pains, objections, commitments, next steps) that each ingest updates, with raw notes retained in the meetings table for audit. Rule for the merge: newer facts win, open objections are never silently dropped. The brief reads one small JSON blob, so it is fast on a phone and cheap on tokens. What I gave up: perfect recall of nuance. Decision rule: the rep has 5 minutes, not 50 - memory should be a briefing document, not an archive.

**2. Triage as advisory banner vs hard block.** A hard block ("this meeting is cancelled") is the more dramatic demo. I made triage a banner the rep can override, because the two error costs are wildly asymmetric: a wrong "proceed" wastes 30 rep-minutes; a wrong "don't book" can kill a real deal and, worse, teaches reps to distrust the system. The manager still sees every flag - so a rep who repeatedly ignores good flags becomes a coaching signal, which is the correct place for enforcement to live. The prompt encodes the same asymmetry: "dont_book" requires strong evidence.

**3. Zero LLM calls on the manager dashboard.** The tempting build is "AI summarizes your pipeline every morning." Instead, deal signals (advancing/stalling/at-risk) are computed by deterministic rules at ingest time - meeting recency, booked next steps, open objections, triage verdicts - and the dashboard just reads them. What I gave up: prose-y AI insights. What I got: a dashboard that loads instantly, costs nothing per view, is identical on every refresh, and keeps working when every free LLM tier is rate-limiting. The manager surface is the one that must never be flaky, because it is opened daily and judged in 60 seconds.

## How I would measure this in production

- **Memory accuracy (the core promise):** % of briefs where the rep flags a factual error (one-tap "this is wrong" on any brief line). Target < 5%. This is the trust metric; if it drifts, nothing else matters.
- **Prep adoption:** % of held meetings where the brief was opened in the 24h before. Target > 80% by week 4. Measured from brief-view events joined to meeting records.
- **Capture rate and effort:** % of meetings with notes pasted within 24h (target > 90%), and median seconds from paste to save (target < 60s). Capture is the fuel; if reps stop pasting, memory decays.
- **Loop value:** stall rate = % of deals with no meeting and no completed commitment in 14 days. Compare cohorts before/after adoption; the assignment's own claim is that half of deals stall from dropped context - this is the number that should move.
- **Triage precision:** of meetings flagged caution/dont_book that reps held anyway, what % did the rep afterwards mark "flag was right"? Precision > 70% before making flags louder.
- **Manager utility:** weekly active manager sessions and, more honestly, count of dashboard-initiated interventions (manager clicked into a stalling deal within a day of it turning amber).

## Week 2 - and why this, not something else

**Problem:** The rep has to remember to open Meetbrain before every call. That's the single biggest adoption risk in the whole design - a tool that only works when someone remembers to use it doesn't get used.

**Solution:** Calendar ingestion, using the Google Calendar free API (or an equivalent free-tier calendar API). Match the invitee's domain to a prospect, auto-generate the brief, deliver it 30 minutes before the call by email or Slack link - no manual step left for the rep. It also lets triage run *before* booking, by scanning tomorrow's calendar each evening, which is when a flag is still cheap to act on.

**Why not the alternatives:** transcription (Whisper on call recordings) would improve note quality, but reps don't control recording consent, and pasted notes already capture the decision-relevant 20% - it's a future upgrade, not a Week 2 blocker. CRM sync (HubSpot, Salesforce) is real integration work worth doing, but it's additive - it doesn't close the adoption loop the way calendar ingestion does. Multi-tenant auth matters more for selling the product long-term than for proving the loop works this week - it belongs on the roadmap once there's a real company to onboard.

## Future roadmap / alternatives

**1. Multi-tenant auth and governance**

**Problem:** Anyone with the URL sees every deal, and "rep name" is a free-text field, not tied to a real person - two spellings of the same rep fragment coaching signals. Today only a manager can delete a prospect; there's no edit or undo on any prospect data or memory, so a bad note merge or a wrong contact detail is stuck until someone deletes and recreates it, losing history.

**Solution:** A company onboards, invites its team, and assigns each person a role (rep or manager) at invite time. The rep-name field becomes a select from that company's real user list, and access scopes by company and role. On top of that, add a proper governance layer - view, edit, and delete permissions scoped by role, so the assigned rep or their manager can correct a record instead of only a manager being able to delete it - paired with a lightweight audit trail (who changed what, when) rather than full undo.

**2. CRM sync (HubSpot, Salesforce)**

**Problem:** A lot of real deal activity already lives in a CRM. Without a sync, Meetbrain is a second system reps have to keep updated by hand, and deal data can drift out of step with what the CRM shows.

**Solution:** Two-way sync on core fields (stage, next step, owner) with whichever CRM the company already runs, so Meetbrain sits on top of existing sales infrastructure instead of competing with it.

**3. Call transcription (Whisper)**

**Problem:** Pasted notes capture the decision-relevant parts of a call, but they're only as good as what the rep remembers to write down.

**Solution:** Optional transcription of call recordings where the rep has consent, feeding the same merge pipeline as pasted notes. Kept optional and opt-in, since consent and recording policy vary by team and by region.

**4. Configurable triage gating**

**Problem:** Triage and brief generation run in parallel, so a `dont_book` verdict renders next to a brief that's already been written.

**Solution:** Make enforcement a per-company setting. Some sales orgs want triage to gate brief generation outright; others want today's advisory banner. Let the customer choose rather than hardcoding one behavior.

**5. Cache the company-site scrape**

**Problem:** Triage and brief generation each independently scrape the same company URL on a single click.

**Solution:** Cache the scrape per prospect per session (short TTL, keyed by `company_url`) so both features read the same fetch. Low priority at current volume, matters once request volume is real - halves scraper load and shaves latency off every brief.