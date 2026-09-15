/** React Query hooks for tenant memberships (TenantUser). */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  tenantUserService,
  type MembershipListFilter,
} from "../services/tenant-user-service";
import type {
  CreateTenantUserPayload,
  UpdateTenantUserPayload,
} from "../types";

export const tenantUsersQueryKey = ["identity", "tenant-users"] as const;

export function tenantUserQueryKey(tenantUserId: string) {
  return ["identity", "tenant-users", tenantUserId] as const;
}

export function useTenantUsers(membership: MembershipListFilter = "active") {
  return useQuery({
    queryKey: [...tenantUsersQueryKey, membership],
    queryFn: () => tenantUserService.list(membership),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useTenantUser(tenantUserId: string | null | undefined) {
  return useQuery({
    queryKey: tenantUserQueryKey(tenantUserId ?? ""),
    queryFn: () =>
      tenantUserId
        ? tenantUserService.getById(tenantUserId)
        : Promise.resolve(null),
    enabled: Boolean(tenantUserId),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenantUserPayload) =>
      tenantUserService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tenantUsersQueryKey });
    },
  });
}

export function useUpdateTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantUserId,
      payload,
    }: {
      tenantUserId: string;
      payload: UpdateTenantUserPayload;
    }) => tenantUserService.update(tenantUserId, payload),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: tenantUsersQueryKey });
      if (data?.tenant_user_id) {
        qc.setQueryData(tenantUserQueryKey(data.tenant_user_id), data);
      }
    },
  });
}

export function useSoftDeleteTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantUserId: string) =>
      tenantUserService.softDelete(tenantUserId),
    onSuccess: (_void, tenantUserId) => {
      void qc.invalidateQueries({ queryKey: tenantUsersQueryKey });
      qc.removeQueries({ queryKey: tenantUserQueryKey(tenantUserId) });
    },
  });
}

export function useRestoreTenantUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tenantUserId: string) =>
      tenantUserService.restore(tenantUserId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tenantUsersQueryKey });
    },
  });
}
