'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavTabs() {
  const path = usePathname();
  const isManager = path.startsWith('/manager');
  const isRep = path.startsWith('/rep') || path.startsWith('/p/');
  return (
    <div className="nav-tabs">
      <Link href="/rep" className={`nav-tab ${isRep ? 'active' : ''}`}>Rep view</Link>
      <Link href="/manager" className={`nav-tab ${isManager ? 'active' : ''}`}>Manager view</Link>
    </div>
  );
}
