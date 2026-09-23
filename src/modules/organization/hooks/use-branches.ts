"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { branchService } from "../services/branch-service";
import type { CreateBranchPayload, UpdateBranchPayload } from "../types";

export function branchesQueryKey(companyId: string) {
  return ["organization", "companies", companyId, "branches"] as const;
}

export function useBranches(companyId: string | null | undefined) {
  return useQuery({
    queryKey: branchesQueryKey(companyId ?? ""),
    queryFn: () =>
      companyId ? branchService.listByCompany(companyId) : Promise.resolve([]),
    enabled: Boolean(companyId),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateBranch(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => branchService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchesQueryKey(companyId) });
    },
  });
}

export function useUpdateBranch(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      payload,
    }: {
      branchId: string;
      payload: UpdateBranchPayload;
    }) => branchService.update(branchId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchesQueryKey(companyId) });
    },
  });
}

export function useSoftDeleteBranch(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => branchService.softDelete(branchId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchesQueryKey(companyId) });
    },
  });
}
