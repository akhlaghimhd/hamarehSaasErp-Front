# Module scaffold (FE-P0)

Copy this folder to `src/modules/{module-name}` when starting a vertical module.

```
module-name/
  components/   # UI specific to the module
  hooks/        # React Query hooks
  services/     # API calls via central apiClient (no business rules)
  types/        # TS types for DTOs
  validations/  # Zod schemas (client-side only; Backend is SoT)
  pages/        # Route-facing screens composed in app/dashboard/...
```

## Shared patterns (import from `@/shared` / `@/auth`)

| Need | Import |
|------|--------|
| Page title + breadcrumb | `PageHeader` |
| Empty initial / search | `EmptyState` |
| Tables + page-size | `DataTable` |
| Status text+color | `StatusChip` |
| Forms (RHF) | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormGrid` |
| Modal with dirty lock | `DirtyDialog` |
| Permission UI gate | `Can` / `usePermission` |
| Error isolation | `AppErrorBoundary` (already on dashboard layout) |

## Rules

- No physical FK awareness; talk to Backend via versioned `/api/v1/...`
- Permission checks via `Can` / `usePermission` for UI only
- Shared UI lives in `src/shared`, not inside the module
- Dirty overlays: use `DirtyDialog` — never allow Escape/backdrop close while form is dirty
