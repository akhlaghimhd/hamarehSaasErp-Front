/**
 * FE-P0-T01 — Public API barrel
 */

export {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  TENANT_HEADER,
  default as default,
} from "./client";

export { tokenStorage } from "./token-storage";

export {
  ApiClientError,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type LoginResponseData,
} from "./types";
