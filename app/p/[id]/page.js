//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

'use client';
import { useEffect, useState } from 'react';

const SIGNAL_TEXT = { advancing: 'advancing', stalling: 'stalling', at_risk: 'at risk', new: 'new' };
const VERDICT_TITLE = {
  proceed: 'Good to meet',
  caution: 'Meet, but eyes open',
  dont_book: 'This meeting may not be worth having',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Workspace({ params }) {
  const { id } = params;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const [meetingType, setMeetingType] = useState('discovery');
  const [repName, setRepName] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState(null);
  const [triage, setTriage] = useState(null);

  const [notes, setNotes] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [signalJustUpdated, setSignalJustUpdated] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/prospects/${id}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
      if (d.prospect.rep_name) setRepName(d.prospect.rep_name);
      const stageToType = { discovery: 'discovery', demo: 'demo', closing: 'closing' };
      if (stageToType[d.prospect.stage]) setMeetingType(stageToType[d.prospect.stage]);
    } catch (e) {
      setError(e.message || 'Could not load this prospect.');
    }
  }
  useEffect(() => { load(); }, [id]);

  async function getBrief() {
    setBriefLoading(true);
    setBrief(null);
    setTriage(null);
    setError(null);
    try {
      const [triageRes, briefRes] = await Promise.all([
        fetch('/api/triage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_id: id }),
        }),
        fetch('/api/brief', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_id: id, meeting_type: meetingType, rep_name: repName }),
        }),
      ]);
      const t = await triageRes.json();
      const b = await briefRes.json();
      if (triageRes.ok) setTriage(t.triage);
      if (!briefRes.ok) throw new Error(b.error);
      setBrief(b.brief);
    } catch (e) {
      setError(e.message || 'Could not generate the brief.');
    }
    setBriefLoading(false);
  }

  async function saveNotes() {
    setIngesting(true);
    setIngestResult(null);
    setError(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: id, meeting_type: meetingType, rep_name: repName, notes }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setIngestResult(d);
      setNotes('');
      await load();
      setSignalJustUpdated(true);
      setTimeout(() => setSignalJustUpdated(false), 600);
    } catch (e) {
      setError(e.message || 'Could not save notes.');
    }
    setIngesting(false);
  }

  if (error && !data) return <main className="wrap"><div className="err">{error}</div><a href="/">&larr; Back to pipeline</a></main>;
  if (!data) return <main className="wrap"><div className="empty"><span className="spin dark" /> Loading...</div></main>;

  const p = data.prospect;

  return (
    <main className="wrap">
      <p style={{ margin: '0 0 14px' }}><a href="/rep" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14 }}>&larr; Back to pipeline</a></p>

      <div className="spread" style={{ marginBottom: 4 }}>
        <h1>{p.company}</h1>
        <span className={`chip ${p.signal}${signalJustUpdated ? ' chip-updated' : ''}`}>{SIGNAL_TEXT[p.signal] || p.signal}</span>
      </div>
      <p className="sub">
        {p.contact_name ? `${p.contact_name}${p.contact_role ? ` · ${p.contact_role}` : ''} · ` : ''}
        stage: {p.stage} · {data.meetings.length} meeting{data.meetings.length === 1 ? '' : 's'} on record
      </p>

      {/* STEP 1: before the call */}
      <div className="card">
        <p className="label">1 · Before the call</p>
        <div className="field">
          <label>What kind of meeting is this?</label>
          <div className="pills" role="group" aria-label="Meeting type">
            {['discovery', 'demo', 'closing'].map((t) => (
              <button key={t} type="button" className={`pill ${meetingType === t ? 'on' : ''}`} onClick={() => setMeetingType(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="rep">Who&apos;s running the call?</label>
          <input id="rep" value={repName} onChange={(e) => setRepName(e.target.value)} placeholder="Your name" />
        </div>
        <button className="btn primary big" onClick={getBrief} disabled={briefLoading}>
          {briefLoading ? <span><span className="spin" />Checking this prospect and writing your brief...</span> : 'Get my brief'}
        </button>
        {data.meetings.length === 0 && (
          <p className="hint">First meeting with this prospect - the brief will focus on qualification. It gets sharper after you paste notes below.</p>
        )}
      </div>

      {error && <div className="err">{error}</div>}

      {/* Triage banner */}
      {triage && (
        <div className={`banner ${triage.verdict}`}>
          <p className="label">Triage · {VERDICT_TITLE[triage.verdict] || triage.verdict}</p>
          <ul>{(triage.reasons || []).map((r, i) => <li key={i}>{r}</li>)}</ul>
          {triage.what_would_change_this && <div className="hint">{triage.what_would_change_this}</div>}
          {triage.degraded && <div className="hint">AI check unavailable right now - this verdict comes from stored facts only.</div>}
        </div>
      )}

      {/* The brief */}
      {brief && (
        <div className="card">
          {brief.degraded && (
            <div className="degraded-note">AI is busy - showing your stored intel directly. Everything below is from past calls, nothing is generated.</div>
          )}
          <p className="label">
            Your brief · {meetingType}
            {brief.degraded ? null : (
              <>
                {' · '}
                <span className={brief.used_website ? 'src-ok' : 'src-none'}>
                  {brief.used_website
                    ? 'used live company website'
                    : brief.scrape_reason === 'no_url'
                    ? 'no company website provided'
                    : brief.scrape_reason === 'empty'
                    ? 'company website had no usable content'
                    : 'company website could not be reached'}
                </span>
              </>
            )}
          </p>
          <p className="brief-headline">{brief.headline}</p>

          <div className="brief-section">
            <p className="label">Where we are</p>
            <p>{brief.where_we_are}</p>
          </div>

          {brief.what_they_care_about?.length > 0 && (
            <div className="brief-section">
              <p className="label">What they care about</p>
              <ul>{brief.what_they_care_about.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {brief.landmines?.length > 0 && (
            <div className="brief-section">
              <p className="label">Landmines</p>
              <ul>{brief.landmines.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          <div className="brief-section">
            <p className="label">This meeting&apos;s one objective</p>
            <div className="objective">{brief.objective}</div>
          </div>

          {brief.talking_points?.length > 0 && (
            <div className="brief-section">
              <p className="label">Talking points</p>
              <ul>{brief.talking_points.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {brief.open_commitments?.length > 0 && (
            <div className="brief-section">
              <p className="label">Open commitments</p>
              <ul>{brief.open_commitments.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}

          {brief.smart_question && (
            <div className="brief-section">
              <p className="label">Ask this to show we listened</p>
              <p>{brief.smart_question}</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: after the call */}
      <div className="card">
        <p className="label">2 · After the call</p>
        <div className="field">
          <label htmlFor="notes">Paste your call notes - raw and messy is fine</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={'e.g. "CFO joined late, pushed on ROI. promised to send security doc by fri. they want pilot before Q4. sarah from IT skeptical about integration..."'}
          />
        </div>
        <button className="btn primary big" onClick={saveNotes} disabled={ingesting || !notes.trim()}>
          {ingesting ? <span><span className="spin" />Updating what we know...</span> : 'Save notes & update memory'}
        </button>
        <p className="hint">30 seconds now saves the 10-minute scramble before the next call - for you or whoever takes it.</p>
      </div>

      {ingestResult && (
        <div className="card signal-advancing">
          <p className="label">Memory updated</p>
          {ingestResult.degraded ? (
            <p>AI is busy right now, so your notes are saved raw. They&apos;ll be woven into the prospect&apos;s memory automatically on the next save, and briefs will include them meanwhile.</p>
          ) : (
            <>
              <p style={{ marginTop: 0 }}>{ingestResult.extracted?.meeting_summary}</p>
              {ingestResult.extracted?.commitments_made?.length > 0 && (
                <>
                  <p className="label" style={{ marginTop: 10 }}>New commitments captured</p>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                    {ingestResult.extracted.commitments_made.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </>
              )}
              <div className="row" style={{ marginTop: 12 }}>
                <span className="meta">Deal signal is now</span>
                <span className={`chip ${ingestResult.signal} chip-updated`}>{SIGNAL_TEXT[ingestResult.signal]}</span>
                <span className="meta">· stage: {ingestResult.stage}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* History */}
      {data.meetings.length > 0 && (
        <>
          <h2 className="section-title">Meeting history</h2>
          {data.meetings.map((m) => (
            <div key={m.id} className="card">
              <div className="row">
                <span className="chip plain">{m.meeting_type}</span>
                <span className="meta">{fmtDate(m.created_at)}{m.rep_name ? ` · ${m.rep_name}` : ''}</span>
              </div>
              <p style={{ margin: '10px 0 0' }}>
                {m.extracted?.meeting_summary || (
                  <span className="meta">Notes saved, not yet processed - they&apos;ll be merged on the next save.</span>
                )}
              </p>
            </div>
          ))}
        </>
      )}
    </main>
  );
}