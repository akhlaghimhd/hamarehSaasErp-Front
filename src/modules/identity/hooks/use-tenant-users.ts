/**
 * React Query hooks for tenant memberships (TenantUser).
 * Used by FE-P1-T06+ member list / detail pages.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantUserService } from "../services/tenant-user-service";
import type {
  CreateTenantUserPayload,
  UpdateTenantUserPayload,
} from "../types";

export const tenantUsersQueryKey = ["identity", "tenant-users"] as const;

export function tenantUserQueryKey(tenantUserId: string) {
  return ["identity", "tenant-users", tenantUserId] as const;
}

export function useTenantUsers() {
  return useQuery({
    queryKey: tenantUsersQueryKey,
    queryFn: () => tenantUserService.list(),
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
