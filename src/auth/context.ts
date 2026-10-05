import { createContext } from 'react';
import type { SessionStatus, SessionUser } from './types';
export interface AuthContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  signOut: () => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
