# Architecture

## Structure only

The PM requested an architecture-only React project. Module folders reserve ownership; they are not implemented panels. No preview route, sample page or mock dashboard is present. Shared controls remain reusable building blocks and are not mounted as a demo.

```text
src/
  app/
    providers/         root providers
    router/            future approved routes; currently renders no UI
  assets/images/       local reusable assets
  auth/                session adapter, context and access helpers
  components/
    ui/                reusable controls
    forms/             reusable fields
    data-display/      tables and pagination
    feedback/          loading, empty and error components
    layout/            reusable page-level components
  config/              public configuration validation
  constants/           shared constants
  hooks/               reusable React hooks
  layouts/             future application frame; currently Outlet only
  modules/
    hr/
      api/             future module endpoint functions
      components/      future HR-only components
      hooks/           future module query/feature hooks
      pages/           future HR screens
      schemas/         future API/form validation
      types/           future API DTOs and view models
      utils/           module-specific helpers
      index.ts         public export boundary
    attendance/        same folder convention
    sales/
    inventory/
    procurement/
    accounts/
    projects/
    engineering/
    field-service/
    admin-fleet/
    approvals/
    documents/
    reports/
    administration/
  pages/               future shared application screens
  services/api/        HTTP wrapper and safe errors
  services/query/      QueryClient configuration
  styles/              reusable CSS foundations
  types/               shared contracts
  utils/               shared pure helpers
```

## Panels and screens

A future HR panel belongs to `src/modules/hr`; an HR employee screen belongs to `src/modules/hr/pages`. General buttons belong to `src/components`. Common application chrome belongs to `src/layouts`. Do not add a second `panels` hierarchy that duplicates the same module boundary.

The app will compose approved features through each module's `index.ts`. Modules may use shared helpers but must not reach into another module's internal files. ESLint checks alias-based dependency boundaries; review relative imports for escapes and cycles too.

## Responsibilities

- Pages compose feature components and hooks.
- Module API functions use the shared HTTP wrapper.
- TanStack Query owns server data; local component state owns local presentation state.
- Client schemas validate inputs/responses but never replace backend validation.
- Session context owns identity only, not all company data.
- Business authorization, record scope, salary policies and EF migrations belong in .NET.
- Department administration belongs to the web application. Employee mobile self-service remains a separate React Native project.
- Build only approved workflows. No permission catalogue, hiring approval or new UI is implemented merely by creating folders.
