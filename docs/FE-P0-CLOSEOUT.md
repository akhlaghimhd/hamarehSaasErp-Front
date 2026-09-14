# FE-P0 Closeout Checklist

**Repo:** hamarehSaasErp-Front  
**Phase:** FE-P0 — Foundation & Shell  
**Updated:** 2026-09-14

## Goal (exit criteria)

Runnable shell where the user can log in, session/tenant are known, API calls
send Token + Tenant header, and Header + Sidebar are ready for modules.

## Task status

| Code | Title | Status | Notes |
|------|--------|--------|-------|
| FE-P0-T01 | API Client | Done* | *Refresh queue deferred (no Backend endpoint) |
| FE-P0-T02 | Auth Store | Done* | *localStorage; httpOnly later |
| FE-P0-T03 | Auth Service | Done* | login/OTP/select/logout/getProfile; no refresh |
| FE-P0-T04 | Login page | Done | RTL, RHF+Zod, OTP, Persian digits |
| FE-P0-T05 | Auth Guard | Done | AuthGuard + GuestGuard |
| FE-P0-T06 | Tenant Context | Done | id + name/code from login organization |
| FE-P0-T07 | App Shell | Done | Header user/org + Sidebar collapse + logout |
| FE-P0-T08 | Module folders | Done | `src/modules/_template` + conventions |
| FE-P0-T09 | Form primitives | Done | shared form + UI guide |
| FE-P0-T10 | Data table | Done | pagination, skeleton, empty |
| FE-P0-T11 | Dirty overlay | Done | DirtyDialog |
| FE-P0-T12 | Feedback | Done | Toast, Alert, StatusChip, Empty |
| FE-P0-T13 | Theme tokens | Done | palettes + dark/light |
| FE-P0-T14 | A11y shell | Partial | aria-labels on key controls; full audit later |
| FE-P0-T15 | Env & config | Done | `.env.example` + CORS/Docker notes |
| FE-P0-T16 | Error boundary | Done | AppErrorBoundary on dashboard content |
| FE-P0-T17 | Manual E2E checklist | Listed below | Execute on local stack |
| FE-P0-T18 | This document | Done | |

## Manual test checklist (T17)

1. Backend up (`docker compose`) + Frontend `pnpm dev` with `.env.local`.
2. Open `/login` as guest; authenticated users redirect to `/dashboard`.
3. Login with password (seed/demo user) → land on dashboard.
4. Header shows user display name and **organization name** (not only UUID).
5. Network tab: authenticated calls include `Authorization` and `X-Tenant-ID`.
6. Logout → session cleared → `/dashboard` redirects to `/login`.
7. OTP path: request code → enter code → session (when SMS/debug available).
8. Multi-org user: org picker → select → session with chosen tenant.

## Known debts (do not rework until Backend ready)

1. **Refresh token / 401 queue** — Backend Sanctum has no refresh endpoint.
2. **httpOnly cookie token storage** — security hardening after cookie API exists.
3. **Tenant module catalog** — active modules list when Platform API is stable.
4. **Deep a11y audit** — reduced-motion + full keyboard pass on all overlays.

## Definition of Done (phase)

- [x] Login against real Backend contracts
- [x] Protected requests carry Token + Tenant
- [x] Dashboard routes require session
- [x] Shell shows user + organization + logout
- [x] Shared form/table/dirty/feedback patterns available
- [x] UI Guide routes remain available
- [ ] T17 executed and signed off by the team (human)

When T17 is signed off, FE-P0 may be marked **closed** with the debts above
carried into the next phase backlog (not blockers for first module work).
