"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountService } from "../services/account-service";
import type { CreateAccountPayload } from "../types";

export const financeAccountKeys = {
  all: ["finance", "accounts"] as const,
  tree: ["finance", "accounts", "tree"] as const,
  flat: ["finance", "accounts", "flat"] as const,
};

export function useAccountTree() {
  return useQuery({
    queryKey: financeAccountKeys.tree,
    queryFn: () => accountService.listTree(),
  });
}

export function useAccountFlat() {
  return useQuery({
    queryKey: financeAccountKeys.flat,
    queryFn: () => accountService.listFlat(),
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
