export interface SessionUser {
  id: string;
  displayName: string;
  permissions: readonly string[];
}
export interface AuthAdapter {
  configured: boolean;
  restoreSession: () => Promise<SessionUser | null>;
  getAccessToken: () => Promise<string | null>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
export type SessionStatus = 'loading' | 'unconfigured' | 'anonymous' | 'authenticated';
