/**
 * FE-P1 — Identity & Access UI module public surface.
 */

export { IdentityHome } from "./pages/identity-home";
export { ProfileMePage } from "./pages/profile-me";
export { MembersListPage } from "./pages/members-list";
export { MemberDetailPage } from "./pages/member-detail";
export { profileService } from "./services/profile-service";
export { tenantUserService } from "./services/tenant-user-service";
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
