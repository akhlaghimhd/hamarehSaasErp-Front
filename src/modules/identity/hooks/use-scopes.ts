"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  scopeService,
  type CreateScopePayload,
  type ScopeMembershipFilter,
  type UpdateScopePayload,
} from "../services/scope-service";

export const scopesQueryKey = ["identity", "scopes"] as const;

export function scopesListQueryKey(membership: ScopeMembershipFilter = "active") {
  return [...scopesQueryKey, membership] as const;
}

export function userScopesQueryKey(tenantUserId: string) {
  return ["identity", "user-scopes", tenantUserId] as const;
}

export function useScopes(membership: ScopeMembershipFilter = "active") {
  return useQuery({
    queryKey: scopesListQueryKey(membership),
    queryFn: () => scopeService.list({ membership }),
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

export function useRestoreScope() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scopeService.restore(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: scopesQueryKey }),
  });
}

export function useUserScopes(tenantUserId: string | null | undefined) {
  return useQuery({
    queryKey: userScopesQueryKey(tenantUserId ?? ""),
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
        queryKey: userScopesQueryKey(vars.tenantUserId),
      });
    },
  });
}

export function useUnassignScopesFromUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantUserId,
      scopeIds,
    }: {
      tenantUserId: string;
      scopeIds: string[];
    }) => scopeService.unassignFromUser(tenantUserId, scopeIds),
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({
        queryKey: userScopesQueryKey(vars.tenantUserId),
      });
    },
  });
}
