/**
 * FE-P1 — React Query hooks for current user profile.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "../services/profile-service";
import type { UpsertProfilePayload } from "../types";

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
    mutationFn: (payload: UpsertProfilePayload) =>
      profileService.upsertMe(payload),
    onSuccess: (data) => {
      qc.setQueryData(profileMeQueryKey, data);
    },
  });
}
