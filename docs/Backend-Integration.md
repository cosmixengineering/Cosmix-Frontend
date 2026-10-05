# Backend integration

## Existing endpoint reference

The current backend has JWT validation but not complete login/session issuance. Its available HR reference is:

```text
GET /api/v1/hr/departments?page=1&pageSize=20&search=...
Permission: hr.organization.read
Response: { items: [{ id, code, name, isActive }], totalCount, page, pageSize }
```

This is a documentation reference only. The frontend has no Departments sample page, types, schema or endpoint integration. Verify the current backend contract before implementing an approved feature.

## Local development

The browser calls `/api/v1` on the same dev origin. Vite proxies `/api` to `http://localhost:5240`, matching the backend launch profile. The frontend does not start, migrate or change the backend.

Copy `.env.example` to a local ignored `.env.local` only when overriding settings. `API_PROXY_TARGET` is a dev-server setting. `VITE_API_BASE_URL` is public browser configuration. Never put signing keys, client secrets or connection strings in either browser code or a VITE_ variable.

If using direct cross-origin calls instead of the dev proxy, agree the exact frontend origin with backend CORS. Do not disable CORS globally. For production, route `/api` to the .NET service at the reverse proxy or configure an approved HTTPS API origin.

## Identity decision still required

`src/auth/adapter.ts` is deliberately unconfigured. Choose the approved established identity SDK and login/MFA/device/refresh contract with the backend team. Implement restoreSession, getAccessToken, signIn and signOut there. The existing HTTP wrapper uses bearer tokens because the current API validates JWT bearer authentication.

Do not invent `/login`, `/refresh` or `/me` contracts. Do not decode an arbitrary JWT and treat it as an authenticated server session. A future cookie/BFF design needs deliberate changes to credentials, CSRF, CORS, session lookup and the adapter; adding credentials: include is not sufficient.

Bind queries to the actual user and clear them on logout/expiry. Complete the provider's token refresh/reuse handling, revocation and secure storage strategy before considering authentication ready. Frontend permissions must come from the approved identity/session response; server enforcement remains mandatory.

## Errors and writes

Use safe user-facing errors and correlation IDs. The client does not display raw server exception text. Add approved field-error mapping for concrete forms without leaking sensitive values. Abort navigation-cancelled requests and handle timeouts. For writes, agree backend concurrency/idempotency contracts; do not retry mutations blindly.

Model/database changes are made by .NET developers using EF Code First. Frontend DTOs and Zod schemas describe API boundaries only.
