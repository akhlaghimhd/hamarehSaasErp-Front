"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/api";
import { branchService, type BranchListFilter } from "../services/branch-service";
import type { CreateBranchPayload, UpdateBranchPayload } from "../types";

export function branchesQueryKey(companyId: string, membership: BranchListFilter = "active") {
  return ["organization", "companies", companyId, "branches", membership] as const;
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function useBranches(
  companyId: string | null | undefined,
  membership: BranchListFilter = "active"
) {
  return useQuery({
    queryKey: branchesQueryKey(companyId ?? "", membership),
    queryFn: () =>
      companyId
        ? branchService.listByCompany(companyId, membership)
        : Promise.resolve([]),
    enabled: Boolean(companyId) && hasAuthContext(),
    staleTime: 60_000,
    retry: 1,
  });
}

function invalidateBranchLists(qc: ReturnType<typeof useQueryClient>, companyId?: string) {
  if (companyId) {
    void qc.invalidateQueries({
      queryKey: ["organization", "companies", companyId, "branches"],
    });
  } else {
    void qc.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "organization" &&
        q.queryKey[3] === "branches",
    });
  }
}

export function useCreateBranch(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => branchService.create(payload),
    onSuccess: (_data, variables) => {
      invalidateBranchLists(qc, variables.company_id || companyId);
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
    onSuccess: (_data, variables) => {
      invalidateBranchLists(qc, variables.payload.company_id || companyId);
    },
  });
}

export function useSoftDeleteBranch(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => branchService.softDelete(branchId),
    onSuccess: () => {
      invalidateBranchLists(qc, companyId);
    },
  });
}

export function useRestoreBranch(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => branchService.restore(branchId),
    onSuccess: () => {
      invalidateBranchLists(qc, companyId);
    },
  });
}
