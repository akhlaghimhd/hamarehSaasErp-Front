/**
 * React Query hooks for current user profile (self-service).
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "../services/profile-service";
import type { SelfUpsertProfilePayload } from "../types";

export const profileMeQueryKey = ["identity", "profile", "me"] as const;

export function useProfileMe() {
  return useQuery({
    queryKey: profileMeQueryKey,
    queryFn: () => profileService.getMe(),
    // Profile rarely changes outside this page — avoid refetch storms
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useUpsertProfileMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SelfUpsertProfilePayload) =>
      profileService.upsertMe(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: profileMeQueryKey });
      const previous = qc.getQueryData(profileMeQueryKey);
      qc.setQueryData(profileMeQueryKey, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        return {
          ...(old as object),
          display_bio: payload.display_bio ?? null,
          description: payload.display_bio ?? null,
        };
      });
      return { previous };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(profileMeQueryKey, ctx.previous);
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(profileMeQueryKey, data);
    },
  });
}

export function useUploadAvatarMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatarMe(file),
    onSuccess: (data) => {
      qc.setQueryData(profileMeQueryKey, data);
    },
  });
}
