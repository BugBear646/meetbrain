//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SIGNAL_TEXT = { advancing: 'advancing', stalling: 'stalling', at_risk: 'at risk', new: 'new' };

export default function Manager() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message || 'Could not load the dashboard.'));
  }, []);

  async function handleDelete(e, deal) {
    e.stopPropagation(); // don't trigger the row's navigate-to-workspace click
    const ok = window.confirm(`Delete ${deal.company}? This removes the prospect and all its meeting history. This can't be undone.`);
    if (!ok) return;
    setDeletingId(deal.id);
    try {
      const res = await fetch(`/api/prospects/${deal.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setData((prev) => ({
        ...prev,
        deals: prev.deals.filter((d) => d.id !== deal.id),
        flagged: prev.flagged.filter((d) => d.id !== deal.id),
        stats: { ...prev.stats, total: prev.stats.total - 1 },
      }));
    } catch {
      alert('Could not delete this prospect. Try again.');
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <main className="wrap wide"><h1>Pipeline health</h1><div className="err">{error}</div></main>;
  if (!data) return <main className="wrap wide"><h1>Pipeline health</h1><div className="empty"><span className="spin dark" /> Loading...</div></main>;

  const { stats, deals, flagged, coaching } = data;

  return (
    <main className="wrap wide">
      <h1>Pipeline health</h1>
      <p className="sub">Every deal, scored from what actually happened in meetings - not from rep optimism. Updated the moment a rep saves call notes.</p>

      {deals.length === 0 ? (
        <div className="empty">
          <strong>Nothing to show yet</strong>
          Deals appear here automatically once reps add prospects and save call notes in the rep view. <a href="/rep">Open the rep view</a> to add the first one.
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><div className="n">{stats.total}</div><div className="meta">deals in play</div></div>
            <div className="stat good"><div className="n">{stats.advancing}</div><div className="meta">advancing</div></div>
            <div className="stat warn"><div className="n">{stats.stalling}</div><div className="meta">stalling</div></div>
            <div className="stat bad"><div className="n">{stats.at_risk}</div><div className="meta">at risk</div></div>
            <div className="stat"><div className="n">{stats.meetings_this_week}</div><div className="meta">meetings this week</div></div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Signal</th><th>Company</th><th>Rep</th><th>Stage</th><th>Mtgs</th><th>Last met</th><th>Next step</th><th></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="rowlink" onClick={() => router.push(`/p/${d.id}`)} title={d.summary || ''}>
                    <td><span className={`chip ${d.signal}`}>{SIGNAL_TEXT[d.signal] || d.signal}</span></td>
                    <td style={{ fontWeight: 600 }}>{d.company}</td>
                    <td>{d.rep || '-'}</td>
                    <td>{d.stage}</td>
                    <td>{d.meetings}</td>
                    <td>{d.days_since === null ? 'never' : d.days_since === 0 ? 'today' : `${d.days_since}d ago`}</td>
                    <td className={d.next_step ? '' : 'meta'}>{d.next_step || 'none booked'}</td>
                    <td>
                      <button
                        type="button"
                        className="del-btn"
                        title={`Delete ${d.company}`}
                        aria-label={`Delete ${d.company}`}
                        disabled={deletingId === d.id}
                        onClick={(e) => handleDelete(e, d)}
                      >
                        {deletingId === d.id ? (
                          '...'
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">Click any row to open the full deal workspace. &quot;None booked&quot; in the next-step column is the earliest stall warning you&apos;ll get.</p>

          <h2 className="section-title">Meetings that deserve a second look</h2>
          {flagged.length === 0 ? (
            <div className="empty"><strong>All clear</strong> No deals are currently triage-flagged.</div>
          ) : (
            flagged.map((d) => (
              <div key={d.id} className={`banner ${d.triage_verdict}`}>
                <p className="label">{d.company} · {d.triage_verdict === 'dont_book' ? 'should not have been booked' : 'proceed with caution'}</p>
                <div>{d.summary}</div>
                <div className="hint">Rep: {d.rep || 'unassigned'} · {d.meetings} meeting(s) spent</div>
              </div>
            ))
          )}

          <h2 className="section-title">Coaching signals</h2>
          {coaching.filter((c) => c.tips.length > 0).length === 0 ? (
            <div className="empty"><strong>No patterns yet</strong> Coaching signals appear when reps show repeated patterns - meetings without next steps, flagged bookings, stalling deals.</div>
          ) : (
            coaching.filter((c) => c.tips.length > 0).map((c) => (
              <div key={c.rep} className="card">
                <div className="spread">
                  <div style={{ fontWeight: 700 }}>{c.rep}</div>
                  <span className="meta">{c.deals} deal{c.deals === 1 ? '' : 's'}</span>
                </div>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {c.tips.map((t, i) => <li key={i} style={{ margin: '3px 0' }}>{t}</li>)}
                </ul>
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}