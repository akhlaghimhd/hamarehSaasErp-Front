"use client";

import { useQuery } from "@tanstack/react-query";
import { membershipHistoryService } from "../services/membership-history-service";

export function membershipHistoryQueryKey(tenantUserId: string) {
  return ["identity", "membership-history", tenantUserId] as const;
}

export function useMembershipHistory(tenantUserId: string | null | undefined) {
  return useQuery({
    queryKey: membershipHistoryQueryKey(tenantUserId ?? ""),
    queryFn: () =>
      tenantUserId
        ? membershipHistoryService.listByTenantUser(tenantUserId)
        : Promise.resolve([]),
    enabled: Boolean(tenantUserId),
    staleTime: 30_000,
    retry: 1,
  });
}
