"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { departmentService } from "../services/department-service";
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../types";

export function departmentsQueryKey(companyId: string) {
  return ["organization", "companies", companyId, "departments"] as const;
}

export function useDepartments(companyId: string | null | undefined) {
  return useQuery({
    queryKey: departmentsQueryKey(companyId ?? ""),
    queryFn: () =>
      companyId
        ? departmentService.listByCompany(companyId)
        : Promise.resolve([]),
    enabled: Boolean(companyId),
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
