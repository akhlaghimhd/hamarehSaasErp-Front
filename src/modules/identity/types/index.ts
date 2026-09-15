/**
 * FE-P1 — Identity module DTO types (aligned with IdentityCore Backend).
 */

export type GenderCode = 1 | 2;

/** 0=none, 1=pending, 2=approved, 3=rejected */
export type AddressChangeStatus = 0 | 1 | 2 | 3;

export interface UserProfileDto {
  profile_id?: string;
  user_id: string;
  national_id?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  gender?: number | null;
  address?: string | null;
  pending_address?: string | null;
  address_change_status?: AddressChangeStatus | number;
  phone?: string | null;
  display_bio?: string | null;
  description?: string | null;
  row_version?: number;
  created_at?: string;
  updated_at?: string;
}

/** Self-service payload only */
export interface SelfUpsertProfilePayload {
  display_bio?: string | null;
  address?: string | null;
}

/** @deprecated use SelfUpsertProfilePayload for /me */
export interface UpsertProfilePayload {
  national_id?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  gender?: number | null;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  display_bio?: string | null;
}

export const IdentityPermissions = {
  userView: "identity.user.view",
  userCreate: "identity.user.create",
  userUpdate: "identity.user.update",
  userDelete: "identity.user.delete",
  profileView: "identity.profile.view",
  profileUpdate: "identity.profile.update",
  roleView: "identity.role.view",
  roleCreate: "identity.role.create",
  roleUpdate: "identity.role.update",
  roleDelete: "identity.role.delete",
  roleAssign: "identity.role.assign",
  roleAssignPermissions: "identity.role.assign-permissions",
  permissionView: "identity.permission.view",
  scopeView: "identity.scope.view",
  scopeAssign: "identity.scope.assign",
  membershipHistoryView: "identity.membership_history.view",
} as const;

export type IdentityPermissionCode =
  (typeof IdentityPermissions)[keyof typeof IdentityPermissions];
