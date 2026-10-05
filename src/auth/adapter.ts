import type { AuthAdapter } from './types';

// Replace with the approved identity SDK once backend login/session contracts exist.
export const authAdapter: AuthAdapter = {
  configured: false,
  restoreSession: async () => null,
  getAccessToken: async () => null,
  signIn: async () => {
    throw new Error('Identity integration is not configured.');
  },
  signOut: async () => undefined,
};
