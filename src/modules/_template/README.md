# Module scaffold (FE-P0)

Copy this folder to `src/modules/{module-name}` when starting a vertical module.

```
module-name/
  components/   # UI specific to the module
  hooks/        # React Query hooks
  services/     # API calls via central apiClient (no business rules)
  types/        # TS types for DTOs
  validations/  # Zod schemas (client-side only; Backend is SoT)
```

Rules:
- No physical FK awareness; talk to Backend via versioned `/api/v1/...`
- Permission checks via `Can` / `usePermission` for UI only
- Shared UI lives in `src/shared`, not inside the module
