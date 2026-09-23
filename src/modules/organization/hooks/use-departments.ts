"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/api";
import { departmentService } from "../services/department-service";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../types";

export function departmentsQueryKey(companyId: string) {
  return ["organization", "companies", companyId, "departments"] as const;
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function useDepartments(companyId: string | null | undefined) {
  return useQuery({
    queryKey: departmentsQueryKey(companyId ?? ""),
    queryFn: () =>
      companyId
        ? departmentService.listByCompany(companyId)
        : Promise.resolve([]),
    enabled: Boolean(companyId) && hasAuthContext(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateDepartment(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      departmentService.create(companyId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsQueryKey(companyId) });
    },
  });
}

export function useUpdateDepartment(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      departmentId,
      payload,
    }: {
      departmentId: string;
      payload: UpdateDepartmentPayload;
    }) => departmentService.update(departmentId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsQueryKey(companyId) });
    },
  });
}

export function useSoftDeleteDepartment(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) =>
      departmentService.softDelete(departmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsQueryKey(companyId) });
    },
  });
}
