"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountService } from "../services/account-service";
import type { CreateAccountPayload } from "../types";

export const financeAccountKeys = {
  all: ["finance", "accounts"] as const,
  tree: (companyId?: string | null) =>
    ["finance", "accounts", "tree", companyId ?? ""] as const,
  flat: (companyId?: string | null) =>
    ["finance", "accounts", "flat", companyId ?? ""] as const,
};

export function useAccountTree(companyId?: string | null) {
  return useQuery({
    queryKey: financeAccountKeys.tree(companyId),
    queryFn: () => accountService.listTree(companyId),
    enabled: true,
  });
}

export function useAccountFlat(options?: {
  enabled?: boolean;
  companyId?: string | null;
}) {
  const companyId = options?.companyId;
  return useQuery({
    queryKey: financeAccountKeys.flat(companyId),
    queryFn: () => accountService.listFlat(companyId),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAccountPayload) => accountService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeAccountKeys.all });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeAccountKeys.all });
    },
  });
}
