--Author: Aniket Jha
--URL: https://github.com/BugBear646/meetbrain

-- Meetbrain schema + seed data
-- Paste this entire file into Supabase SQL Editor and click Run.
-- Safe to re-run: drops and recreates everything.

drop table if exists meetings;
drop table if exists prospects;
drop table if exists reps;

create table reps (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table prospects (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  contact_role text,
  company_url text,
  rep_name text,
  stage text default 'discovery',          -- discovery | demo | closing | closed_won | closed_lost
  signal text default 'new',               -- new | advancing | stalling | at_risk
  memory jsonb default '{}'::jsonb,        -- the shared brain (merged, durable facts)
  triage jsonb,                            -- cached triage verdict {verdict, reasons[], checked_at}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade,
  meeting_type text,                       -- discovery | demo | closing
  rep_name text,
  notes text,                              -- raw pasted notes (kept for audit)
  extracted jsonb,                         -- what the LLM pulled out (null = pending)
  created_at timestamptz default now()
);

-- Lock these tables to the public anon key; the app uses service_role from the server.
alter table reps enable row level security;
alter table prospects enable row level security;
alter table meetings enable row level security;

-- ---------------------------------------------------------------------------
-- Seed: 2 reps, 3 prospects, 6 meetings of history
-- ---------------------------------------------------------------------------

insert into reps (name) values ('Asha Verma'), ('Dev Kapoor');

-- 1) Northwind Logistics: healthy deal, advancing toward close
insert into prospects (id, company, contact_name, contact_role, company_url, rep_name, stage, signal, memory, triage, updated_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'Northwind Logistics', 'Priya Nair', 'VP Operations', '',
  'Asha Verma', 'closing', 'advancing',
  '{
    "summary": "Mid-size freight coordinator drowning in manual dispatch. Priya is a strong champion; CFO Rohan controls budget and wants hard ROI. Deal is one security review away from a closing conversation.",
    "stakeholders": [
      {"name": "Priya Nair", "role": "VP Operations", "notes": "Champion. Measured on SLA compliance, personally embarrassed by Q2 penalty fees."},
      {"name": "Rohan Mehta", "role": "CFO", "notes": "Economic buyer. Skeptical of tooling spend; responded well to penalty-avoidance framing."}
    ],
    "pains": [
      "Dispatch team of 6 coordinates 400+ loads/week over spreadsheets and WhatsApp",
      "Paid ~$80k in SLA penalty fees last quarter from missed handoffs"
    ],
    "objections": [
      {"objection": "CFO doubts ROI vs hiring one more dispatcher", "status": "resolved - penalty math landed in demo"},
      {"objection": "IT wants a security review before contract", "status": "open"}
    ],
    "competitors": ["Evaluated FreightFlow last year, dropped it over per-seat pricing"],
    "budget_signals": ["CFO said budget exists this quarter if ROI case holds"],
    "commitments": [
      {"who": "us", "what": "Send ROI one-pager with their penalty numbers", "status": "done"},
      {"who": "us", "what": "Send SOC 2 report + security questionnaire answers", "status": "open"},
      {"who": "them", "what": "Priya to get 30 min on CFO calendar for closing call", "status": "open"}
    ],
    "next_steps": ["Closing call with Priya + CFO once security doc lands"],
    "personal_notes": ["Priya prefers numbers over slides; keep demos under 20 min"]
  }'::jsonb,
  '{"verdict": "proceed", "reasons": ["Clear pain with quantified cost", "Champion and economic buyer both engaged"], "checked_at": "seed"}'::jsonb,
  now() - interval '5 days'
);

insert into meetings (prospect_id, meeting_type, rep_name, notes, extracted, created_at) values
(
  '11111111-1111-1111-1111-111111111111', 'discovery', 'Asha Verma',
  'Priya walked me through dispatch chaos - 6 people, 400 loads a week, all on sheets + whatsapp. Q2 they ate about 80k in SLA penalties, she got grilled by exec team. Wants automation but CFO Rohan signs anything over 15k and thinks tools are toys. She said if we can show penalty avoidance he will listen. Agreed to a demo next week with her team lead.',
  '{"meeting_summary": "Strong discovery. Quantified pain ($80k/quarter penalties), champion identified, CFO named as skeptical economic buyer.", "commitments_made": ["Demo booked with team lead"], "stage_suggestion": "demo"}'::jsonb,
  now() - interval '12 days'
),
(
  '11111111-1111-1111-1111-111111111111', 'demo', 'Asha Verma',
  'Demo went well. Kept it to 18 min like she likes. Her team lead loved auto-handoff alerts. Rohan (CFO) joined last 10 min - pushed on ROI vs just hiring another dispatcher. Walked him through penalty math using THEIR q2 number, he went quiet then asked about contract terms. IT guy raised security review requirement - need SOC 2 + questionnaire. Priya committed to getting CFO time for a closing call once security doc is in.',
  '{"meeting_summary": "Demo converted the CFO from skeptic to engaged - penalty math with their own numbers landed. Security review is the last gate.", "commitments_made": ["Us: send SOC 2 + questionnaire", "Priya: book closing call with CFO"], "stage_suggestion": "closing"}'::jsonb,
  now() - interval '5 days'
);

-- 2) Cascade Health: was promising, now quietly stalling
insert into prospects (id, company, contact_name, contact_role, company_url, rep_name, stage, signal, memory, triage, updated_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'Cascade Health', 'Marcus Webb', 'Director of Patient Services', '',
  'Dev Kapoor', 'demo', 'stalling',
  '{
    "summary": "Regional clinic network interested in patient-intake automation. Marcus likes the product but has no budget authority, compliance objection is unresolved, and no next meeting is booked. Deal is drifting.",
    "stakeholders": [
      {"name": "Marcus Webb", "role": "Director of Patient Services", "notes": "Friendly, engaged, but has said twice that final decisions go through the COO and compliance."}
    ],
    "pains": [
      "Front-desk staff spend ~3 hrs/day re-keying intake forms into their EHR",
      "Patient no-show rate climbing; no automated reminders"
    ],
    "objections": [
      {"objection": "Compliance team requires HIPAA/BAA review before any pilot", "status": "open"},
      {"objection": "Unclear who owns budget - Marcus deflected twice", "status": "open"}
    ],
    "competitors": [],
    "budget_signals": ["No budget owner identified after two meetings"],
    "commitments": [
      {"who": "them", "what": "Marcus to intro us to compliance lead", "status": "open - promised 16 days ago"},
      {"who": "us", "what": "Sent HIPAA compliance overview PDF", "status": "done"}
    ],
    "next_steps": [],
    "personal_notes": ["Marcus responds fastest to early-morning emails"]
  }'::jsonb,
  '{"verdict": "caution", "reasons": ["No economic buyer identified after 2 meetings", "Open compliance gate with no owner on their side"], "checked_at": "seed"}'::jsonb,
  now() - interval '16 days'
);

insert into meetings (prospect_id, meeting_type, rep_name, notes, extracted, created_at) values
(
  '22222222-2222-2222-2222-222222222222', 'discovery', 'Dev Kapoor',
  'Marcus runs patient services across 4 clinics. Intake is paper + manual re-entry into EHR, front desk loses ~3hrs a day. No-shows rising too. He is enthusiastic but mentioned decisions route through COO and compliance. Did not get a read on budget. He wants a demo for his team.',
  '{"meeting_summary": "Real workflow pain but authority and budget sit elsewhere. COO and compliance flagged as gatekeepers.", "commitments_made": ["Demo scheduled"], "stage_suggestion": "demo"}'::jsonb,
  now() - interval '21 days'
),
(
  '22222222-2222-2222-2222-222222222222', 'demo', 'Dev Kapoor',
  'Demoed intake automation to Marcus + 2 front desk leads. Good reactions on re-keying elimination. Compliance question came up hard - they need HIPAA/BAA review before any pilot, Marcus promised to intro their compliance lead. Asked about budget owner again, he deflected, said "we will figure that out later". No date set for next step.',
  '{"meeting_summary": "Demo well received by end users but meeting ended with no booked next step, no budget owner, and an unresolved compliance gate.", "commitments_made": ["Marcus: intro to compliance lead (no date)"], "stage_suggestion": "demo"}'::jsonb,
  now() - interval '16 days'
);

-- 3) Forgeline Robotics: triage says this meeting probably should not have happened
insert into prospects (id, company, contact_name, contact_role, company_url, rep_name, stage, signal, memory, triage, updated_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'Forgeline Robotics', 'Sam Torres', 'Technical Consultant', '',
  'Dev Kapoor', 'discovery', 'at_risk',
  '{
    "summary": "Inbound request that pattern-matches to competitor recon or a consultant fishing for pricing. Asked unusually detailed architecture and pricing questions, would not name the end client, no identifiable buying intent.",
    "stakeholders": [
      {"name": "Sam Torres", "role": "Technical Consultant", "notes": "Says he is evaluating on behalf of an unnamed client. Declined to share client name, industry, or timeline."}
    ],
    "pains": [],
    "objections": [],
    "competitors": ["Asked pointed questions about how we differ from FreightFlow - knew their feature set unusually well"],
    "budget_signals": ["None - no budget, no timeline, no named buyer"],
    "commitments": [],
    "next_steps": [],
    "personal_notes": ["Requested our API docs and rate limits in first call"]
  }'::jsonb,
  '{"verdict": "dont_book", "reasons": ["Contact cannot name the buyer or timeline", "Deep competitor + architecture questions in first call pattern-match to recon", "Zero qualification signals after 30 minutes"], "checked_at": "seed"}'::jsonb,
  now() - interval '8 days'
);

insert into meetings (prospect_id, meeting_type, rep_name, notes, extracted, created_at) values
(
  '33333333-3333-3333-3333-333333333333', 'discovery', 'Dev Kapoor',
  'Odd call. Sam says he is a consultant evaluating solutions for a client he cannot name. Asked very specific questions about our pricing tiers, API rate limits, and how our routing engine differs from FreightFlow - he knew their roadmap better than most customers would. No pain points shared, no timeline, no budget. Asked for API docs. Gut says recon.',
  '{"meeting_summary": "No qualification signals. Detailed competitive and architecture probing with an unnameable client - likely recon or pricing research.", "commitments_made": [], "stage_suggestion": "discovery"}'::jsonb,
  now() - interval '8 days'
);
