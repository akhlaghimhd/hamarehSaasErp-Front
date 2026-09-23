"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/api";
import { companyService } from "../services/company-service";
import type { CreateCompanyPayload, UpdateCompanyPayload } from "../types";

export const companiesQueryKey = ["organization", "companies"] as const;

export function companyQueryKey(companyId: string) {
  return ["organization", "companies", companyId] as const;
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function useCompanies() {
  return useQuery({
    queryKey: companiesQueryKey,
    queryFn: () => companyService.list(),
    enabled: hasAuthContext(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCompany(companyId: string | null | undefined) {
  return useQuery({
    queryKey: companyQueryKey(companyId ?? ""),
    queryFn: () =>
      companyId ? companyService.getById(companyId) : Promise.resolve(null),
    enabled: Boolean(companyId) && hasAuthContext(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCompanyPayload) => companyService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: companiesQueryKey });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      payload,
    }: {
      companyId: string;
      payload: UpdateCompanyPayload;
    }) => companyService.update(companyId, payload),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: companiesQueryKey });
      if (data?.company_id) {
        qc.setQueryData(companyQueryKey(data.company_id), data);
      }
    },
  });
}

export function useSoftDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => companyService.softDelete(companyId),
    onSuccess: (_v, companyId) => {
      void qc.invalidateQueries({ queryKey: companiesQueryKey });
      qc.removeQueries({ queryKey: companyQueryKey(companyId) });
    },
  });
}
