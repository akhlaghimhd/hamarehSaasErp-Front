/**
 * FE-P0-T02..T06 — Auth domain types (aligned with Backend LoginResponseData).
 */

export interface AuthUser {
  user_id: string;
  tenant_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string | null;
}

export interface AuthRole {
  role_id: string;
  code: string;
  name: string;
  is_system_default: boolean;
}

export interface AuthScope {
  scope_id: string;
  scope_name: string;
  scope_type: string;
  reference_id: string | null;
}

export interface SecurityContext {
  user_id: string;
  tenant_id: string | null;
  tenant_user_id: string | null;
  roles: AuthRole[];
  permissions: string[];
  scopes: AuthScope[];
  is_owner: boolean;
}

/** Active organization returned by Backend on full session login. */
export interface ActiveOrganization {
  tenant_id: string;
  tenant_name: string | null;
  tenant_code: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** Required by Backend TenantContextMiddleware on login route. */
  tenant_id: string;
}

export interface AuthSessionSnapshot {
  user: AuthUser;
  security_context: SecurityContext;
  active_tenant_id: string | null;
  organization?: ActiveOrganization | null;
}

/** Platform user profile (identity.profiles/me) — optional fields. */
export interface UserProfile {
  profile_id?: string;
  user_id: string;
  national_id?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  gender?: string | null;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
}
