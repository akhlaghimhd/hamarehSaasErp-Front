/**
 * FE-P0-T01 — Shared API contract types aligned with Backend responses.
 */

export type ApiSuccessStatus = "success";
export type ApiErrorStatus = "error";

export interface ApiSuccessResponse<T = unknown> {
  status?: ApiSuccessStatus;
  success?: boolean;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  status?: ApiErrorStatus;
  success?: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly message: string;
  readonly errors?: Record<string, string[]>;
  readonly isNetworkError: boolean;
  readonly isUnauthorized: boolean;
  readonly isForbidden: boolean;
  readonly isValidationError: boolean;

  constructor(params: {
    statusCode: number;
    message: string;
    errors?: Record<string, string[]>;
    isNetworkError?: boolean;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.statusCode = params.statusCode;
    this.message = params.message;
    this.errors = params.errors;
    this.isNetworkError = params.isNetworkError ?? false;
    this.isUnauthorized = params.statusCode === 401;
    this.isForbidden = params.statusCode === 403;
    this.isValidationError = params.statusCode === 422;
  }
}

export interface LoginResponseData {
  access_token: string;
  token_type: string;
  expires_in: number | null;
  requires_tenant_selection?: boolean;
  user: {
    user_id: string;
    tenant_user_id: string | null;
    first_name: string;
    last_name: string;
    email: string;
    mobile?: string | null;
  };
  active_tenant_id: string | null;
  organization?: {
    tenant_id: string;
    tenant_name: string | null;
    tenant_code: string | null;
  };
  security_context: {
    user_id: string;
    tenant_id: string | null;
    tenant_user_id: string | null;
    roles: Array<{
      role_id: string;
      code: string;
      name: string;
      is_system_default: boolean;
    }>;
    permissions: string[];
    scopes: Array<{
      scope_id: string;
      scope_name: string;
      scope_type: string;
      reference_id: string | null;
    }>;
    is_owner: boolean;
  };
}
