//Author: Aniket Jha
//URL: https://github.com/BugBear646/meetbrain

import './globals.css';
import Link from 'next/link';
import NavTabs from './nav-tabs';
import ThemeToggle from './theme-toggle';
import Footer from './footer';
import { Analytics } from '@vercel/analytics/next';
import { APP_NAME } from '@/lib/config';

export const metadata = {
  title: `${APP_NAME} - meeting intelligence for sales teams`,
  description: 'Prep in 5 minutes, capture in 30 seconds, and let every meeting make the next one smarter.',
};

const THEME_INIT = `
(function () {
  try {
    var saved = localStorage.getItem('meetbrain-theme');
    var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="logo">{APP_NAME.toLowerCase()}<span>.</span></Link>
            <NavTabs />
            <ThemeToggle />
          </div>
        </nav>
        <div className="page-body">
        {children}
        </div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}