/**
 * MFA (TOTP) hooks — profile self-service.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mfaService } from "../services/mfa-service";

export const mfaStatusQueryKey = ["identity", "mfa", "status"] as const;

export function useMfaStatus() {
  return useQuery({
    queryKey: mfaStatusQueryKey,
    queryFn: () => mfaService.status(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useMfaBeginEnable() {
  return useMutation({
    mutationFn: () => mfaService.beginEnable(),
  });
}

export function useMfaConfirmEnable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => mfaService.confirmEnable(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mfaStatusQueryKey });
    },
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => mfaService.disable(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: mfaStatusQueryKey });
    },
  });
}
