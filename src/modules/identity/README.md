# Identity module (FE-P1)

## Profile me policy (locked 2026-09-15)

| Field | Self `/me` | Admin |
|-------|------------|-------|
| first/last name | RO | yes |
| national_id | RO | yes |
| birth_date (Jalali UI) | RO | yes |
| gender (1/2 only) | RO | yes |
| login mobile/email | RO (OTP later) | verified flow |
| display_bio | edit | yes |
| address | request → pending approval | approve endpoint |
| avatar | single image upload | yes |
| HR fields | none — deferred to HR module | — |

## API

- `GET/PUT /identity-core/identity/profiles/me`
- `POST /identity-core/identity/profiles/me/avatar` (multipart `avatar`)
- `POST /identity-core/identity/profiles/{userId}/approve-address` (permission: identity.profile.update)

## Backend migrate

```bash
docker compose exec app php artisan migrate
```
