import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import logo from '@/assets/images/cosmix-logo.png';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <img src={logo} alt="Cosmix Engineering" width="192" height="80" />
        <span className="auth-security">
          <LockKeyhole size={15} aria-hidden="true" /> Employee access
        </span>
      </header>
      <main className="auth-main" id="main-content">
        {children}
      </main>
      <footer className="auth-footer">
        <span>Cosmix Engineering</span>
        <span>Authorized personnel only</span>
      </footer>
    </div>
  );
}
