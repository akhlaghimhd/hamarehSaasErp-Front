/**
 * FE-P0-T02..T06 — Auth domain types (aligned with Backend LoginResponseData).
 */

export interface AuthUser {
  user_id: string;
  tenant_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
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
}
