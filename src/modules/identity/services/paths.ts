export const IDENTITY_BASE = "/identity-core/identity";

export const identityPaths = {
  profileMe: `${IDENTITY_BASE}/profiles/me`,
  profileMeAvatar: `${IDENTITY_BASE}/profiles/me/avatar`,
  profileMeMobileRequest: `${IDENTITY_BASE}/profiles/me/mobile/request`,
  profileMeMobileVerify: `${IDENTITY_BASE}/profiles/me/mobile/verify`,
  profileByUser: (userId: string) => `${IDENTITY_BASE}/profiles/${userId}`,
  profileAvatarByUser: (userId: string) =>
    `${IDENTITY_BASE}/profiles/${userId}/avatar`,
  profileApproveAddress: (userId: string) =>
    `${IDENTITY_BASE}/profiles/${userId}/approve-address`,
  users: `${IDENTITY_BASE}/users`,
  usersEmailHost: `${IDENTITY_BASE}/users/email-host`,
  user: (id: string) => `${IDENTITY_BASE}/users/${id}`,
  userRestore: (id: string) => `${IDENTITY_BASE}/users/${id}/restore`,
  roles: `${IDENTITY_BASE}/roles`,
  role: (id: string) => `${IDENTITY_BASE}/roles/${id}`,
  roleAssign: `${IDENTITY_BASE}/roles/assign`,
  roleAssignPermissions: (roleId: string) =>
    `${IDENTITY_BASE}/roles/${roleId}/permissions`,
  permissions: `${IDENTITY_BASE}/permissions`,
  permission: (id: string) => `${IDENTITY_BASE}/permissions/${id}`,
  scopes: `${IDENTITY_BASE}/scopes`,
  scope: (id: string) => `${IDENTITY_BASE}/scopes/${id}`,
  scopeRestore: (id: string) => `${IDENTITY_BASE}/scopes/${id}/restore`,
  scopeAssign: `${IDENTITY_BASE}/scopes/assign`,
  scopeUnassign: `${IDENTITY_BASE}/scopes/unassign`,
  scopeUser: (tenantUserId: string) =>
    `${IDENTITY_BASE}/scopes/user/${tenantUserId}`,
  membershipHistories: `${IDENTITY_BASE}/membership-histories`,
  membershipHistoryByUser: (tenantUserId: string) =>
    `${IDENTITY_BASE}/membership-histories/user/${tenantUserId}`,
  mfaStatus: `${IDENTITY_BASE}/auth/mfa/status`,
  mfaEnable: `${IDENTITY_BASE}/auth/mfa/enable`,
  mfaConfirm: `${IDENTITY_BASE}/auth/mfa/confirm`,
  mfaDisable: `${IDENTITY_BASE}/auth/mfa/disable`,
  accessCertifications: `${IDENTITY_BASE}/access-certifications`,
  accessCertification: (id: string) =>
    `${IDENTITY_BASE}/access-certifications/${id}`,
  accessCertificationOpen: (id: string) =>
    `${IDENTITY_BASE}/access-certifications/${id}/open`,
  accessCertificationItems: (id: string) =>
    `${IDENTITY_BASE}/access-certifications/${id}/items`,
  accessCertificationComplete: (id: string) =>
    `${IDENTITY_BASE}/access-certifications/${id}/complete`,
  accessCertifyItem: (itemId: string) =>
    `${IDENTITY_BASE}/access-certifications/items/${itemId}/certify`,
  privilegedAccess: `${IDENTITY_BASE}/privileged-access`,
  privilegedRequest: `${IDENTITY_BASE}/privileged-access/request`,
  privilegedApprove: (id: string) =>
    `${IDENTITY_BASE}/privileged-access/${id}/approve`,
  privilegedDeny: (id: string) => `${IDENTITY_BASE}/privileged-access/${id}/deny`,
  privilegedRevoke: (id: string) =>
    `${IDENTITY_BASE}/privileged-access/${id}/revoke`,
  privilegedMarkRole: `${IDENTITY_BASE}/privileged-access/mark-role`,
  roleAssignmentRequests: `${IDENTITY_BASE}/role-assignment-requests`,
  roleAssignmentApprove: (id: string) =>
    `${IDENTITY_BASE}/role-assignment-requests/${id}/approve`,
  roleAssignmentReject: (id: string) =>
    `${IDENTITY_BASE}/role-assignment-requests/${id}/reject`,
  sodRules: `${IDENTITY_BASE}/sod-rules`,
  sodRule: (id: string) => `${IDENTITY_BASE}/sod-rules/${id}`,
  sodEvaluate: `${IDENTITY_BASE}/sod-rules/evaluate`,
  sodRuleRestore: (id: string) =>
    `${IDENTITY_BASE}/sod-rules/${id}/restore`,
} as const;
