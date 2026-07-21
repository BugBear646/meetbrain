//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export default function Home() {
  return (
    <main className="wrap" style={{ maxWidth: 720, paddingTop: 56 }}>
      <p className="label" style={{ marginBottom: 10 }}>meeting intelligence</p>
      <h1 style={{ fontSize: 34, lineHeight: 1.15, marginBottom: 14 }}>
        {APP_NAME} remembers every call, so you don&apos;t start over.
      </h1>
      <p className="sub" style={{ fontSize: 16.5, marginBottom: 32, maxWidth: 560 }}>
        One shared brain behind every deal. Reps get a brief before each call
        and update it in 30 seconds after. Managers see which deals are real
        without waiting for pipeline review.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Link href="/rep" className="card click" style={{ padding: '22px 20px' }}>
          <p className="label">I&apos;m a rep</p>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Prep for a call</div>
          <p className="meta" style={{ margin: 0 }}>Open a prospect, get a tailored brief, paste notes after.</p>
        </Link>
        <Link href="/manager" className="card click" style={{ padding: '22px 20px' }}>
          <p className="label">I&apos;m a manager</p>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Check the pipeline</div>
          <p className="meta" style={{ margin: 0 }}>See what&apos;s advancing, stalling, or shouldn&apos;t have been booked.</p>
        </Link>
      </div>
    </main>
  );
}
