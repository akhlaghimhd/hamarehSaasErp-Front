import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type MfaStatusDto = {
  enabled: boolean;
  required?: boolean;
  confirmed?: boolean;
  confirmed_at?: string | null;
};

export type MfaBeginEnableDto = {
  secret: string;
  otpauth_uri: string;
  period?: number;
  digits?: number;
};

export type MfaConfirmEnableDto = {
  enabled: boolean;
  recovery_codes: string[];
};

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const mfaService = {
  async status(): Promise<MfaStatusDto> {
    const envelope = await apiGet(identityPaths.mfaStatus);
    return unwrapData<MfaStatusDto>(envelope);
  },

  async beginEnable(): Promise<MfaBeginEnableDto> {
    const envelope = await apiPost(identityPaths.mfaEnable, {});
    return unwrapData<MfaBeginEnableDto>(envelope);
  },

  async confirmEnable(code: string): Promise<MfaConfirmEnableDto> {
    const envelope = await apiPost(identityPaths.mfaConfirm, { code });
    return unwrapData<MfaConfirmEnableDto>(envelope);
  },

  async disable(code: string): Promise<void> {
    await apiPost(identityPaths.mfaDisable, { code });
  },
};
