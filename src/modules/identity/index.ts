/**
 * FE-P1 — Identity & Access UI module public surface.
 */

export { IdentityHome } from "./pages/identity-home";
export { ProfileMePage } from "./pages/profile-me";
export { profileService } from "./services/profile-service";
export { identityPaths } from "./services/paths";
export { useProfileMe, useUpsertProfileMe, profileMeQueryKey } from "./hooks/use-profile-me";
export {
  IdentityPermissions,
  type UserProfileDto,
  type UpsertProfilePayload,
  type IdentityPermissionCode,
} from "./types";
export {
  profileUpsertSchema,
  type ProfileUpsertFormValues,
  GENDER_OPTIONS,
} from "./validations/profile-schema";
