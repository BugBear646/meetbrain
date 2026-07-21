//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

const AUTHOR = {
  name: 'Aniket Kumar Jha',
  email: 'aniketjha646@gmail.com',
  socials: {
    linkedin: 'https://linkedin.com/in/aniketjha646',
    github: 'https://github.com/bugbear646/meetbrain',
    twitter: 'https://x.com/aniketjha_2651',
  },
};

const ICONS = {
  email: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3 6.5l9 6.2 9-6.2" />
    </svg>
  ),
  linkedin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10.5v6M7.5 7.8v.01M12 16.5v-3.7c0-1.4 1-2.3 2.3-2.3s2.2 1 2.2 2.3v3.7" />
    </svg>
  ),
  github: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5c-5.2 0-9.5 4.3-9.5 9.5 0 4.2 2.7 7.7 6.4 9-.1-.7-.1-1.7 0-2.4-1.9.4-2.4-.9-2.6-1.4-.2-.5-.9-1.4-1.5-1.7-.5-.3-1.2-1-.02-1 1.1 0 1.9 1 2.1 1.4.8 1.3 1.9 1 2.4.8.1-.6.4-1 .7-1.3-2.4-.3-3.9-1.9-3.9-4.1 0-1 .3-1.9 1-2.6-.1-.3-.4-1.2.1-2.5 0 0 .9-.3 2.7 1a9 9 0 0 1 4.9 0c1.8-1.3 2.7-1 2.7-1 .5 1.3.2 2.2.1 2.5.7.7 1 1.6 1 2.6 0 2.2-1.5 3.8-3.9 4.1.4.4.7 1.1.7 2v3c0 .3.2.5.5.4 3.4-1.4 5.9-4.8 5.9-8.9 0-5.2-4.3-9.5-9.5-9.5z" />
    </svg>
  ),
  twitter: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4l7.5 9.6L4.4 20H6l6.3-5.4L17.6 20H20L12.1 10 19 4h-1.6l-5.8 5-4.6-5H4z" />
    </svg>
  ),
};

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="logo">{APP_NAME.toLowerCase()}<span>.</span></Link>
          </div>
          <div className="footer-icons">
            <a href={`mailto:${AUTHOR.email}`} aria-label="Email">{ICONS.email}</a>
            <a href={AUTHOR.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">{ICONS.linkedin}</a>
            <a href={AUTHOR.socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">{ICONS.github}</a>
            <a href={AUTHOR.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">{ICONS.twitter}</a>
          </div>
        </div>
        <div className="footer-copy">&copy; {year} {APP_NAME} - Built by {AUTHOR.name}.</div>
      </div>
    </footer>
  );
}
