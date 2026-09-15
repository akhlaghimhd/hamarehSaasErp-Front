"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  scopeService,
  type CreateScopePayload,
  type UpdateScopePayload,
} from "../services/scope-service";

export const scopesQueryKey = ["identity", "scopes"] as const;

export function useScopes() {
  return useQuery({
    queryKey: scopesQueryKey,
    queryFn: () => scopeService.list(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateScopePayload) => scopeService.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: scopesQueryKey }),
  });
}

export function useUpdateScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateScopePayload;
    }) => scopeService.update(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: scopesQueryKey }),
  });
}

export function useSoftDeleteScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scopeService.softDelete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: scopesQueryKey }),
  });
}

export function useUserScopes(tenantUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["identity", "user-scopes", tenantUserId ?? ""],
    queryFn: () =>
      tenantUserId
        ? scopeService.listForUser(tenantUserId)
        : Promise.resolve([]),
    enabled: Boolean(tenantUserId),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAssignScopesToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantUserId,
      scopeIds,
    }: {
      tenantUserId: string;
      scopeIds: string[];
    }) => scopeService.assignToUser(tenantUserId, scopeIds),
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({
        queryKey: ["identity", "user-scopes", vars.tenantUserId],
      });
    },
  });
}
