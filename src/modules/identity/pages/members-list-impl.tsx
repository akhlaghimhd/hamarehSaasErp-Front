"use client";

/**
 * TEMP: full UI was truncated on develop. Restore with:
 *   git fetch origin
 *   git checkout 401be2a22d75aa8ff84b43a5674dae5bf51c712c -- src/modules/identity/pages/members-list-impl.tsx
 *   git add src/modules/identity/pages/members-list-impl.tsx && git commit -m "fix(identity): restore full members-list UI" && git push origin develop
 *
 * That commit has full table + bulk + holding gates (canMutateMembers, company filter, role/scope cols).
 */
export { MembersListPage } from "./members-list-helpers-shim";
