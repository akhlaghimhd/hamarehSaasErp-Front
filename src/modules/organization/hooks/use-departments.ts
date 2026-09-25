"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/api";
import {
  departmentService,
  type DepartmentListFilter,
} from "../services/department-service";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../types";

export function departmentsQueryKey(
  companyId: string,
  membership: DepartmentListFilter = "active"
) {
  return ["organization", "companies", companyId, "departments", membership] as const;
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function invalidateDepartmentLists(
  qc: ReturnType<typeof useQueryClient>,
  companyId?: string
) {
  if (companyId) {
    void qc.invalidateQueries({
      queryKey: ["organization", "companies", companyId, "departments"],
    });
  } else {
    void qc.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "organization" &&
        q.queryKey[3] === "departments",
    });
  }
}

export function useDepartments(
  companyId: string | null | undefined,
  membership: DepartmentListFilter = "active"
) {
  return useQuery({
    queryKey: departmentsQueryKey(companyId ?? "", membership),
    queryFn: () =>
      companyId
        ? departmentService.listByCompany(companyId, membership)
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
      invalidateDepartmentLists(qc, companyId);
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
      invalidateDepartmentLists(qc, companyId);
    },
  });
}

export function useSoftDeleteDepartment(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) =>
      departmentService.softDelete(departmentId),
    onSuccess: () => {
      invalidateDepartmentLists(qc, companyId);
    },
  });
}

export function useRestoreDepartment(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: string) =>
      departmentService.restore(departmentId),
    onSuccess: () => {
      invalidateDepartmentLists(qc, companyId);
    },
  });
}
