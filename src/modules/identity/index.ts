/**
 * FE-P1 — Identity & Access UI module public surface.
 */

export { IdentityHome } from "./pages/identity-home";
export { ProfileMePage } from "./pages/profile-me";
export { MembersListPage } from "./pages/members-list";
export { MemberDetailPage } from "./pages/member-detail";
export { MemberCreatePage } from "./pages/member-create";
export { RolesListPage } from "./pages/roles-list";
export { RoleDetailPage } from "./pages/role-detail";
export { PermissionsListPage } from "./pages/permissions-list";
export { ScopesListPage } from "./pages/scopes-list";
export { profileService } from "./services/profile-service";
export { tenantUserService } from "./services/tenant-user-service";
export { roleService } from "./services/role-service";
export { permissionService } from "./services/permission-service";
export { scopeService } from "./services/scope-service";
export { membershipHistoryService } from "./services/membership-history-service";
export { identityPaths } from "./services/paths";
export {
  useProfileMe,
  useUpsertProfileMe,
  useUploadAvatarMe,
  profileMeQueryKey,
} from "./hooks/use-profile-me";
export {
  useTenantUsers,
  useTenantUser,
  useCreateTenantUser,
  useUpdateTenantUser,
  useSoftDeleteTenantUser,
  tenantUsersQueryKey,
  tenantUserQueryKey,
} from "./hooks/use-tenant-users";
export {
  useMembershipHistory,
  membershipHistoryQueryKey,
} from "./hooks/use-membership-history";
export {
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useSoftDeleteRole,
  useAssignRoleToUser,
  useAssignPermissionsToRole,
  rolesQueryKey,
} from "./hooks/use-roles";
export {
  usePermissions,
  useCreatePermission,
  useUpdatePermission,
  useSoftDeletePermission,
  permissionsQueryKey,
} from "./hooks/use-permissions";
export {
  useScopes,
  useCreateScope,
  useUpdateScope,
  useSoftDeleteScope,
  useUserScopes,
  useAssignScopesToUser,
  scopesQueryKey,
} from "./hooks/use-scopes";
export {
  IdentityPermissions,
  type UserProfileDto,
  type SelfUpsertProfilePayload,
  type UpsertProfilePayload,
  type IdentityPermissionCode,
  type TenantUserDto,
  type TenantUserUserDto,
  type TenantUserStatus,
  type CreateTenantUserPayload,
  type UpdateTenantUserPayload,
} from "./types";
export {
  selfProfileSchema,
  profileUpsertSchema,
  type SelfProfileFormValues,
  type ProfileUpsertFormValues,
  GENDER_OPTIONS,
  GENDER_LABELS,
  ADDRESS_STATUS_LABELS,
  toJalaliDisplay,
} from "./validations/profile-schema";
export {
  createMemberSchema,
  type CreateMemberFormValues,
} from "./validations/member-schema";
