/**
 * FE-P1-T02 — Profile service (self-service me + admin by userId).
 * All calls go through central apiClient (Token + X-Tenant-ID).
 */

import { apiGet, apiPut, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";
import type { UpsertProfilePayload, UserProfileDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const profileService = {
  /**
   * GET profiles/me — 404 means no profile row yet (first-time upsert is OK).
   */
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

  async upsertMe(payload: UpsertProfilePayload): Promise<UserProfileDto> {
    const envelope = await apiPut(identityPaths.profileMe, payload);
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
