/**
 * FE-P0-T02..T06 — Auth module public API
 */

export { useAuthStore } from "./auth-store";
export { authService } from "./auth-service";
export { TenantProvider, useTenantContext } from "./tenant-context";
export { AuthGuard } from "./auth-guard";
export type {
  AuthUser,
  AuthRole,
  AuthScope,
  SecurityContext,
  LoginCredentials,
  AuthSessionSnapshot,
} from "./types";
