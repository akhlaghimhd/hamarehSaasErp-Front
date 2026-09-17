"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  roleService,
  type CreateRolePayload,
  type UpdateRolePayload,
} from "../services/role-service";

export const rolesQueryKey = ["identity", "roles"] as const;

export function roleQueryKey(id: string) {
  return ["identity", "roles", id] as const;
}

export function userRolesQueryKey(userId: string) {
  return ["identity", "roles", "user", userId] as const;
}

export function useRoles() {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: () => roleService.list(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useUserRoles(userId: string | null | undefined) {
  return useQuery({
    queryKey: userRolesQueryKey(userId ?? ""),
    queryFn: () =>
      userId ? roleService.listByUser(userId) : Promise.resolve([]),
    enabled: Boolean(userId),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRole(id: string | null | undefined) {
  return useQuery({
    queryKey: roleQueryKey(id ?? ""),
    queryFn: () => (id ? roleService.getById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => roleService.create(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: rolesQueryKey }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateRolePayload;
    }) => roleService.update(id, payload),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: rolesQueryKey });
      if (data?.tenant_role_id) {
        qc.setQueryData(roleQueryKey(data.tenant_role_id), data);
      }
    },
  });
}

export function useSoftDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roleService.softDelete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: rolesQueryKey }),
  });
}

export function useAssignRoleToUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      roleIds,
    }: {
      userId: string;
      roleIds: string[];
    }) => roleService.assignToUser(userId, roleIds),
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({ queryKey: userRolesQueryKey(vars.userId) });
      void qc.invalidateQueries({ queryKey: rolesQueryKey });
    },
  });
}

export function useAssignPermissionsToRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantRoleId,
      permissionIds,
    }: {
      tenantRoleId: string;
      permissionIds: string[];
    }) => roleService.assignPermissions(tenantRoleId, permissionIds),
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({
        queryKey: roleQueryKey(vars.tenantRoleId),
      });
    },
  });
}
