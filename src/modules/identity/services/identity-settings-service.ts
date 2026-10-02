import { apiGet, apiPut } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type IdentitySettingsDto = {
  require_role_assignment_approval: boolean;
  require_privileged_access_approval: boolean;
};

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const identitySettingsService = {
  async get(): Promise<IdentitySettingsDto> {
    const envelope = await apiGet(identityPaths.identitySettings);
    const data = unwrapData<IdentitySettingsDto>(envelope);
    return {
      require_role_assignment_approval: Boolean(
        data?.require_role_assignment_approval
      ),
      require_privileged_access_approval: Boolean(
        data?.require_privileged_access_approval ?? true
      ),
    };
  },

  async update(
    payload: Partial<IdentitySettingsDto>
  ): Promise<IdentitySettingsDto> {
    const envelope = await apiPut(identityPaths.identitySettings, payload);
    const data = unwrapData<IdentitySettingsDto>(envelope);
    return {
      require_role_assignment_approval: Boolean(
        data?.require_role_assignment_approval
      ),
      require_privileged_access_approval: Boolean(
        data?.require_privileged_access_approval ?? true
      ),
    };
  },
};
