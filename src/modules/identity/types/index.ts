export type GenderCode = 1 | 2;

export type AddressChangeStatus = 0 | 1 | 2 | 3;

/** Membership status on tenant_users (1 = active, 0 = inactive). */
export type TenantUserStatus = 0 | 1;

export interface UserProfileDto {
  profile_id?: string;
  user_id: string;
  national_id?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  has_avatar?: boolean;
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
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile?: string | null;
  } | null;
}

export interface SelfUpsertProfilePayload {
  display_bio?: string | null;
}

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

export interface TenantUserUserDto {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string | null;
  user_kind?: number;
  status?: number;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TenantUserDto {
  tenant_user_id: string;
  tenant_id: string;
  user_id: string;
  employee_id?: string | null;
  is_owner: boolean;
  status: TenantUserStatus | number;
  row_version?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  user?: TenantUserUserDto | null;
}

export interface CreateTenantUserPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  mobile?: string | null;
  is_owner?: boolean;
  role_ids?: string[];
}

export interface UpdateTenantUserPayload {
  first_name?: string;
  last_name?: string;
  mobile?: string | null;
  is_owner?: boolean;
  status?: TenantUserStatus | number;
}

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
  scopeView: "identity.scope.view",
  scopeAssign: "identity.scope.assign",
  membershipHistoryView: "identity.membership_history.view",
} as const;

export type IdentityPermissionCode =
  (typeof IdentityPermissions)[keyof typeof IdentityPermissions];
