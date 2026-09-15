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
    staleTime: 30_000,
  });
}

export function useUpsertProfileMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SelfUpsertProfilePayload) =>
      profileService.upsertMe(payload),
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
