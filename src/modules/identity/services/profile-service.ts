/**
 * Profile service — self-service me + avatar + mobile change OTP.
 */

import { apiGet, apiPut, apiPost, apiClient, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";
import type {
  SelfUpsertProfilePayload,
  UpsertProfilePayload,
  UserProfileDto,
} from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const profileService = {
  async getMe(): Promise<UserProfileDto | null> {
    try {
      const envelope = await apiGet(identityPaths.profileMe);
      return unwrapData<UserProfileDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  },

  async upsertMe(payload: SelfUpsertProfilePayload): Promise<UserProfileDto> {
    const envelope = await apiPut(identityPaths.profileMe, {
      display_bio: payload.display_bio ?? null,
    });
    return unwrapData<UserProfileDto>(envelope);
  },

  async uploadAvatarMe(file: File): Promise<UserProfileDto> {
    const form = new FormData();
    form.append("avatar", file);

    // Important: do NOT force application/json — let axios set multipart boundary
    const res = await apiClient.post(identityPaths.profileMeAvatar, form, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData && headers) {
            // axios v1 may set Content-Type incorrectly; delete so browser sets boundary
            delete (headers as Record<string, unknown>)["Content-Type"];
          }
          return data;
        },
      ],
    });
    return unwrapData<UserProfileDto>(res.data);
  },

  async requestMobileChange(mobile: string): Promise<{
    expires_in: number;
    resend_available_in: number;
    debug_code?: string;
  }> {
    const envelope = await apiPost(identityPaths.profileMeMobileRequest, {
      mobile,
    });
    return unwrapData(envelope);
  },

  async verifyMobileChange(
    mobile: string,
    code: string
  ): Promise<{ mobile: string; user_id: string }> {
    const envelope = await apiPost(identityPaths.profileMeMobileVerify, {
      mobile,
      code,
    });
    return unwrapData(envelope);
  },

  async getByUserId(userId: string): Promise<UserProfileDto | null> {
    try {
      const envelope = await apiGet(identityPaths.profileByUser(userId));
      return unwrapData<UserProfileDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  },

  async upsertByUserId(
    userId: string,
    payload: UpsertProfilePayload
  ): Promise<UserProfileDto> {
    const envelope = await apiPut(identityPaths.profileByUser(userId), payload);
    return unwrapData<UserProfileDto>(envelope);
  },
};
