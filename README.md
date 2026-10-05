# Cosmix Frontend

React + TypeScript architecture-only starter for the Cosmix Engineering web application. HR and Attendance are the first implementation workstream, not the entire system.

Folder: `cosmix_frotned`. Package: `cosmix-frontend`.

## Current scope

Only the project structure, build tooling and reusable foundations are prepared. There are **no mock dashboards, preview pages, business screens or demo records**. `AppRoutes` intentionally returns `null`, so starting the app displays an empty page. Do not add UI until it is explicitly requested.

## Developer commands

Use Node.js 24 and npm.

```powershell
npm ci
npm run dev
npm run verify
```

The dev server prints its local URL. There is no `/preview` feature. `npm run build` generates `dist` for a future deployment; `npm run preview` is Vite's standard build-serving command, not a mock UI.

## Where to work

| Responsibility                             | Folder                                |
| ------------------------------------------ | ------------------------------------- |
| Department/panel features                  | `src/modules/<module>`                |
| Reusable buttons, inputs, tables, feedback | `src/components`                      |
| Future shared application layout           | `src/layouts`                         |
| Providers and future routes                | `src/app`                             |
| Session adapter and access helpers         | `src/auth`                            |
| Shared HTTP client and query configuration | `src/services`                        |
| Shared hooks, helpers and types            | `src/hooks`, `src/utils`, `src/types` |
| Configuration and constants                | `src/config`, `src/constants`         |
| Shared styles and assets                   | `src/styles`, `src/assets`            |
| Future cross-application screens           | `src/pages`                           |

Each of the 14 modules has `pages`, `components`, `api`, `hooks`, `schemas`, `types` and `utils`. Empty folders use `.gitkeep`. The public `index.ts` reserves the module's export boundary.

## What remains

Approved UI implementation, real identity integration, permissions and record scopes, module API contracts, employee/attendance workflows, production hosting and business acceptance testing. Authentication helpers are scaffolding, not a working sign-in system.

No automated test suite, deployment or backend change was made. This is not a production-ready ERP.

## Repository

The configured remote is [cosmixengineering/Cosmix-Frontend](https://github.com/cosmixengineering/Cosmix-Frontend). The initial architecture branch is `codex/frontend-foundation`.

```powershell
git clone --branch codex/frontend-foundation https://github.com/cosmixengineering/Cosmix-Frontend.git cosmix_frotned
cd cosmix_frotned
npm ci
```

Generated output, `node_modules`, local environment files and artifacts are excluded from Git. `.env.example` contains public configuration only.

## Guides

1. [Architecture](docs/Architecture.md)
2. [Add a feature](docs/Add-A-Feature.md)
3. [Backend integration](docs/Backend-Integration.md)
4. [Security and release](docs/Security-And-Release.md)
5. [Verification](docs/Verification.md)
