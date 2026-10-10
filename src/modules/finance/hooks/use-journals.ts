"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { journalService } from "../services/journal-service";
import type { CreateJournalPayload } from "../types";

export const financeJournalKeys = {
  all: ["finance", "journals"] as const,
  list: (filters?: object) => ["finance", "journals", "list", filters] as const,
};

export function useJournals(filters?: {
  company_id?: string;
  period_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: financeJournalKeys.list(filters),
    queryFn: () => journalService.list(filters),
  });
}

export function usePostJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalService.post(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeJournalKeys.all });
    },
  });
}

export function useReverseJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalService.reverse(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeJournalKeys.all });
    },
  });
}

export function useCreateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateJournalPayload) => journalService.createDraft(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeJournalKeys.all });
    },
  });
}

export function useUpdateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CreateJournalPayload>;
    }) => journalService.updateDraft(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeJournalKeys.all });
    },
  });
}

export function useDeleteJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalService.deleteDraft(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeJournalKeys.all });
    },
  });
}
