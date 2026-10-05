# Cosmix frontend

- This is the React web frontend, not the .NET backend or React Native mobile app.
- Read README.md, docs/Architecture.md and the relevant module README before editing.
- Work in one feature/module. Keep controllers, EF entities/migrations and business policy calculations in the backend.
- Use the existing React, TypeScript, React Router and TanStack Query patterns. Do not add Redux, microfrontends or a second UI framework without a concrete requirement.
- Shared UI goes in src/components. Feature-only UI stays in src/modules/<module>/components. Avoid cross-module deep imports.
- Do not invent employee fields, permission names, salary formulas, approval chains or integration endpoints. Use the approved SRS/backend contracts.
- Architecture-only scope: do not add demo/preview routes, mock dashboards, placeholder business screens, sample module implementations or screenshot/artifact folders without an explicit request. AppRoutes intentionally renders no UI.
- Auth is intentionally unconfigured until the real identity contract is approved. Never fabricate tokens, sample users, a localStorage login or an authorization bypass.
- Server permissions and record/field scopes are authoritative. UI permission checks are only presentation.
- Never commit credentials, production employee data, face images/templates, bank/medical records or tokens. All VITE_ variables are public.
- Automated test projects/files are not requested. Do not add them without PM approval. Run lint, formatting, type/build checks and relevant manual/browser verification. Report missing regression coverage honestly.
- Do not push, create a remote repository, deploy or change the backend without authorization.
- Run npm run verify before handoff. Preserve package-lock.json and document actual checks.
