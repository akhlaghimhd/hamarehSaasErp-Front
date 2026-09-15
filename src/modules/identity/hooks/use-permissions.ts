"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  permissionService,
  type CreatePermissionPayload,
  type UpdatePermissionPayload,
} from "../services/permission-service";

export const permissionsQueryKey = ["identity", "permissions"] as const;

export function usePermissions() {
  return useQuery({
    queryKey: permissionsQueryKey,
    queryFn: () => permissionService.list(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePermissionPayload) =>
      permissionService.create(payload),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: permissionsQueryKey }),
  });
}

export function useUpdatePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePermissionPayload;
    }) => permissionService.update(id, payload),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: permissionsQueryKey }),
  });
}

export function useSoftDeletePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permissionService.softDelete(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: permissionsQueryKey }),
  });
}
