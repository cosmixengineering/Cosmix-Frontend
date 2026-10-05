# Security and release

## Current protections and limits

- No business routes or demo UI are registered. Reusable session and permission helpers are scaffolding, not a completed identity system. Protect approved routes when implemented, and enforce authorization independently on every backend endpoint.
- No identity is fabricated, no live records are seeded and no token is persisted in browser storage.
- Bearer requests are limited to the configured API base. Redirects are rejected; raw server exception text is not rendered.
- Production assets do not include source maps by default. This is not a substitute for protecting secrets, which must never enter a browser bundle.
- No HTML injection helper, arbitrary third-party script, analytics agent or external image is introduced.

## Before a release

1. Implement and review real identity, MFA, refresh/revocation, logout and disabled-user behavior.
2. Verify server permissions, record/field isolation, protected downloads and each implemented workflow.
3. Configure HTTPS, correct API routing, a restrictive CSP, HSTS where appropriate, anti-framing/frame-ancestors, X-Content-Type-Options and Referrer-Policy at the serving infrastructure. Review connect-src against real identity and API origins.
4. Serve static assets with appropriate caching and SPA fallback to index.html for client routes. Do not route unknown API requests to the SPA fallback.
5. Do not use Vite dev/preview servers as production web hosting. Restrict access to internal staging and preview environments.
6. Run lint/type/build checks, relevant browser/API verification, dependency review and approved UAT. Record what was not verified.
7. Agree observability and redact employee/face/financial data. Decide retention and export protections with management/backend owners.
8. Raise the lack of automated regression coverage before production. No test suite was added under the current instruction.

The starter is not a guarantee of production security. New modules require their own approved permissions and negative-case verification. A public frontend environment variable is never a place for a secret.
