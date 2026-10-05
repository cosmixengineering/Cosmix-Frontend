import { useEffect, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './context';
import { authAdapter } from './adapter';
import type { SessionStatus, SessionUser } from './types';
import { SESSION_EXPIRED_EVENT } from '@/constants/events';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>(
    authAdapter.configured ? 'loading' : 'unconfigured',
  );
  useEffect(() => {
    if (!authAdapter.configured) return;
    let active = true;
    void authAdapter
      .restoreSession()
      .then((session) => {
        if (!active) return;
        setUser(session);
        setStatus(session ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const expire = () => {
      setUser(null);
      setStatus('anonymous');
      void queryClient.cancelQueries().then(() => queryClient.clear());
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, [queryClient]);
  async function signOut() {
    setUser(null);
    setStatus('anonymous');
    await queryClient.cancelQueries();
    queryClient.clear();
    await authAdapter.signOut();
  }
  return <AuthContext.Provider value={{ user, status, signOut }}>{children}</AuthContext.Provider>;
}
