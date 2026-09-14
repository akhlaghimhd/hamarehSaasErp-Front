# Identity module (FE-P1)

Tenant-scoped Identity & Access UI on top of Backend `IdentityCore`.

## Sprint 1 (done)

| Code | Item |
|------|------|
| FE-P1-T01 | Module scaffold under `src/modules/identity` + routes `/dashboard/identity` |
| FE-P1-T02 | `profileService` + `identityPaths` (API via central `apiClient`) |
| FE-P1-T03 | `Can` / `usePermission` (already in `@/auth`) wired in hub + sidebar pattern |
| FE-P1-T04 | Profile me page — GET/PUT `profiles/me` |
| FE-P1-T05 | **Deferred** — no Backend change-password endpoint yet |

## Routes

- `/dashboard/identity` — hub
- `/dashboard/identity/me` — current user profile

## Rules

- No business logic beyond form validation; Backend is SoT
- Self profile (`/me`) needs only authenticated session + tenant header
- Admin profile routes use `identity.profile.*` permissions (Sprint 2+)
