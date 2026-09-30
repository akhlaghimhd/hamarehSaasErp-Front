export type GenderCode = 1 | 2;

export type AddressChangeStatus = 0 | 1 | 2 | 3;

/** Membership status on tenant_users (1 = active, 0 = inactive). */
export type MembershipStatus = 0 | 1;

export type TenantUserRoleSummaryDto = {
  tenant_role_id: string;
  code?: string | null;
  name?: string | null;
};

export type TenantUserDto = {
  tenant_user_id: string;
  tenant_id?: string;
  user_id?: string;
  status?: MembershipStatus | number;
  is_owner?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  user?: {
    user_id?: string;
    email?: string | null;
    mobile?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  roles?: TenantUserRoleSummaryDto[];
  scopes?: Array<{ scope_id?: string; name?: string | null; code?: string | null }>;
  [key: string]: unknown;
};

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
  accessCertView: "identity.access_cert.view",
  accessCertManage: "identity.access_cert.manage",
  accessCertCertify: "identity.access_cert.certify",
  privilegedView: "identity.privileged.view",
  privilegedRequest: "identity.privileged.request",
  privilegedApprove: "identity.privileged.approve",
  sodView: "identity.sod.view",
  sodManage: "identity.sod.manage",
  /** دریافت پیام‌های سیستمی (انواع در payload.message_type) */
  systemNotificationReceive: "identity.system_notification.receive",
} as const;

export type IdentityPermissionCode =
  (typeof IdentityPermissions)[keyof typeof IdentityPermissions];
