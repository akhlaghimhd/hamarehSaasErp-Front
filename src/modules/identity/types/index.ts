export type GenderCode = 1 | 2;

export type AddressChangeStatus = 0 | 1 | 2 | 3;

/** Membership status on tenant_users (1 = active, 0 = inactive). */
export type TenantUserStatus = 0 | 1;

export interface TenantUserUserDto {
  user_id?: string;
  email?: string | null;
  mobile?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

/** Role summary attached on members list. */
export interface TenantUserRoleSummaryDto {
  tenant_role_id: string;
  name?: string | null;
  code?: string | null;
  parent_role_id?: string | null;
}

/** Scope summary attached on members list. */
export interface TenantUserScopeSummaryDto {
  scope_id: string;
  scope_name?: string | null;
  scope_type?: string | null;
}

export interface TenantUserDto {
  tenant_user_id: string;
  tenant_id?: string;
  user_id?: string;
  status?: number | TenantUserStatus;
  is_owner?: boolean;
  joined_at?: string | null;
  left_at?: string | null;
  user?: TenantUserUserDto | null;
  /** Assigned roles (from list API). */
  roles?: TenantUserRoleSummaryDto[];
  /** Assigned scopes (from list API). */
  scopes?: TenantUserScopeSummaryDto[];
  [key: string]: unknown;
}

export interface CreateTenantUserPayload {
  mobile: string;
  display_name?: string;
  [key: string]: unknown;
}

export interface UpdateTenantUserPayload {
  status?: number;
  display_name?: string;
  [key: string]: unknown;
}

export interface UserProfileDto {
  user_id?: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  gender?: GenderCode | null;
  birth_date?: string | null;
  [key: string]: unknown;
}

export interface SelfUpsertProfilePayload {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  gender?: GenderCode | string;
  birth_date?: string | null;
  [key: string]: unknown;
}

export type UpsertProfilePayload = SelfUpsertProfilePayload;

export const IdentityPermissions = {
  userView: "identity.user.view",
  userCreate: "identity.user.create",
  userUpdate: "identity.user.update",
  userDelete: "identity.user.delete",
  userRestore: "identity.user.restore",
  profileView: "identity.profile.view",
  profileUpdate: "identity.profile.update",
  roleView: "identity.role.view",
  roleCreate: "identity.role.create",
  roleUpdate: "identity.role.update",
  roleDelete: "identity.role.delete",
  roleAssign: "identity.role.assign",
  roleAssignPermissions: "identity.role.assign-permissions",
  permissionView: "identity.permission.view",
  permissionCreate: "identity.permission.create",
  permissionUpdate: "identity.permission.update",
  permissionDelete: "identity.permission.delete",
  scopeView: "identity.scope.view",
  scopeAssign: "identity.scope.assign",
  membershipHistoryView: "identity.membership_history.view",
} as const;

export type IdentityPermissionCode =
  (typeof IdentityPermissions)[keyof typeof IdentityPermissions];
