/**
 * FE-P1 — Identity & Access UI module public surface.
 */

export { IdentityHome } from "./pages/identity-home";
export { ProfileMePage } from "./pages/profile-me";
export { profileService } from "./services/profile-service";
export { identityPaths } from "./services/paths";
export {
  useProfileMe,
  useUpsertProfileMe,
  useUploadAvatarMe,
  profileMeQueryKey,
} from "./hooks/use-profile-me";
export {
  IdentityPermissions,
  type UserProfileDto,
  type SelfUpsertProfilePayload,
  type UpsertProfilePayload,
  type IdentityPermissionCode,
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
