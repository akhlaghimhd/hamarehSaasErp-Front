export const IDENTITY_BASE = "/identity-core/identity";

export const identityPaths = {
  profileMe: `${IDENTITY_BASE}/profiles/me`,
  profileMeAvatar: `${IDENTITY_BASE}/profiles/me/avatar`,
  profileMeMobileRequest: `${IDENTITY_BASE}/profiles/me/mobile/request`,
  profileMeMobileVerify: `${IDENTITY_BASE}/profiles/me/mobile/verify`,
  profileByUser: (userId: string) => `${IDENTITY_BASE}/profiles/${userId}`,
  profileApproveAddress: (userId: string) =>
    `${IDENTITY_BASE}/profiles/${userId}/approve-address`,
  users: `${IDENTITY_BASE}/users`,
  usersEmailHost: `${IDENTITY_BASE}/users/email-host`,
  user: (id: string) => `${IDENTITY_BASE}/users/${id}`,
  userRestore: (id: string) => `${IDENTITY_BASE}/users/${id}/restore`,
  roles: `${IDENTITY_BASE}/roles`,
  role: (id: string) => `${IDENTITY_BASE}/roles/${id}`,
  roleAssign: `${IDENTITY_BASE}/roles/assign`,
  roleAssignPermissions: `${IDENTITY_BASE}/roles/assign-permissions`,
  permissions: `${IDENTITY_BASE}/permissions`,
  permission: (id: string) => `${IDENTITY_BASE}/permissions/${id}`,
  scopes: `${IDENTITY_BASE}/scopes`,
  scope: (id: string) => `${IDENTITY_BASE}/scopes/${id}`,
  scopeAssign: `${IDENTITY_BASE}/scopes/assign`,
  scopeUnassign: `${IDENTITY_BASE}/scopes/unassign`,
  scopeUser: (tenantUserId: string) =>
    `${IDENTITY_BASE}/scopes/user/${tenantUserId}`,
  membershipHistories: `${IDENTITY_BASE}/membership-histories`,
  membershipHistoryByUser: (tenantUserId: string) =>
    `${IDENTITY_BASE}/membership-histories/user/${tenantUserId}`,
} as const;
