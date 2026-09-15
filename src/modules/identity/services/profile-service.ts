/**
 * FE-P1 — Profile service (self-service me + admin by userId).
 */

import { apiGet, apiPut, apiPost, ApiClientError } from "@/api";
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
    const envelope = await apiPut(identityPaths.profileMe, payload);
    return unwrapData<UserProfileDto>(envelope);
  },

  async uploadAvatarMe(file: File): Promise<UserProfileDto> {
    const form = new FormData();
    form.append("avatar", file);
    // Let the browser set multipart boundary (do not force application/json)
    const envelope = await apiPost(identityPaths.profileMeAvatar, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrapData<UserProfileDto>(envelope);
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
