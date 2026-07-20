# Meetbrain - one-pager

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

**Calendar ingestion (Google Calendar free API): briefs arrive, unprompted, 30 minutes before each call.** Today the rep must remember to open the tool - the biggest adoption risk in the whole design. Reading the calendar removes the last manual step: match the invitee's domain to a prospect, auto-generate, deliver by email/Slack link. It also unlocks triage *before booking* (scan tomorrow's calendar each evening), which is when a flag is actually cheap to act on.

Why not the alternatives: transcription (Whisper on call recordings) improves note quality but reps do not control recording consent, and pasted notes already capture the decision-relevant 20%; CRM sync (HubSpot free) is an integration tax with no new intelligence; multi-tenant auth matters for selling the product, not for proving the loop works. Week 2 goes to the step that compounds the loop: getting the brief in front of the rep without being asked.
