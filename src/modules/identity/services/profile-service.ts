import { apiGet, apiPut, apiClient, ApiClientError } from "@/api";
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
    const res = await apiClient.post(identityPaths.profileMeAvatar, form, {
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData && headers) {
            delete (headers as Record<string, unknown>)["Content-Type"];
          }
          return data;
        },
      ],
    });
    return unwrapData<UserProfileDto>(res.data);
  },

  /**
   * Load avatar with Authorization header → object URL for <img>.
   * Caller must revokeObjectURL when done.
   */
  async fetchAvatarObjectUrl(): Promise<string | null> {
    try {
      const res = await apiClient.get(identityPaths.profileMeAvatar, {
        responseType: "blob",
      });
      if (!(res.data instanceof Blob) || res.data.size === 0) return null;
      if (res.data.type && res.data.type.includes("json")) return null;
      return URL.createObjectURL(res.data);
    } catch {
      return null;
    }
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
