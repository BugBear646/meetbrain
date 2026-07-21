//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function timeAgo(iso) {
  if (!iso) return 'no meetings yet';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'met today';
  if (days === 1) return 'met yesterday';
  return `last met ${days} days ago`;
}

const SIGNAL_TEXT = { advancing: 'advancing', stalling: 'stalling', at_risk: 'at risk', new: 'new' };

export default function RepHome() {
  const router = useRouter();
  const [prospects, setProspects] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company: '', contact_name: '', contact_role: '', company_url: '', rep_name: '' });

  async function load() {
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProspects(data.prospects);
    } catch (e) {
      setError(e.message || 'Could not load prospects.');
    }
  }
  useEffect(() => { load(); }, []);

  async function addProspect(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/p/${data.prospect.id}`);
    } catch (e2) {
      setError(e2.message || 'Could not save prospect.');
      setSaving(false);
    }
  }

  return (
    <main className="wrap">
      <h1>Your pipeline</h1>
      <p className="sub">Pick who you&apos;re meeting - you&apos;ll get a brief built from every past call. Paste notes after, and the next meeting starts smarter.</p>

      <div className="row" style={{ marginBottom: 18 }}>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Close' : '+ Add prospect'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={addProspect}>
          <p className="label">New prospect</p>
          <div className="field">
            <label htmlFor="company">Company name (required)</label>
            <input id="company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Freight Inc" />
          </div>
          <div className="field">
            <label htmlFor="url">Company website - used to research and qualify them</label>
            <input id="url" value={form.company_url} onChange={(e) => setForm({ ...form, company_url: e.target.value })} placeholder="acmefreight.com" />
          </div>
          <div className="field">
            <label htmlFor="cname">Contact name</label>
            <input id="cname" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div className="field">
            <label htmlFor="crole">Contact role</label>
            <input id="crole" value={form.contact_role} onChange={(e) => setForm({ ...form, contact_role: e.target.value })} placeholder="VP Operations" />
          </div>
          <div className="field">
            <label htmlFor="rep">Your name (the rep)</label>
            <input id="rep" value={form.rep_name} onChange={(e) => setForm({ ...form, rep_name: e.target.value })} placeholder="Asha Verma" />
          </div>
          <button className="btn primary big" disabled={saving}>
            {saving ? <span><span className="spin" />Saving...</span> : 'Add & open workspace'}
          </button>
        </form>
      )}

      {error && <div className="err">{error}</div>}

      {prospects === null && !error && (
        <div className="empty"><span className="spin dark" /> Loading your pipeline...</div>
      )}

      {prospects && prospects.length === 0 && (
        <div className="empty">
          <strong>No prospects yet</strong>
          Add your first prospect above. From then on: open them before each call for a tailored brief, paste your notes after, and this list becomes your living pipeline.
        </div>
      )}

      {prospects && prospects.map((p) => (
        <a key={p.id} href={`/p/${p.id}`} className={`card click signal-${p.signal}`}>
          <div className="spread">
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{p.company}</div>
              <div className="meta">
                {p.contact_name ? `${p.contact_name}${p.contact_role ? ` - ${p.contact_role}` : ''}` : 'No contact on file'}
              </div>
            </div>
            <span className={`chip ${p.signal}`}>{SIGNAL_TEXT[p.signal] || p.signal}</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="chip plain">{p.stage}</span>
            <span className="meta">{p.meeting_count} meeting{p.meeting_count === 1 ? '' : 's'} · {timeAgo(p.last_meeting_at)}</span>
          </div>
        </a>
      ))}
    </main>
  );
}
