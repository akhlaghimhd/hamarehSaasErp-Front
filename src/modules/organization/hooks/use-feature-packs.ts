"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FEATURE_PACK_CODES,
  featureEntitlementsService,
  type FeaturePackCode,
} from "../services/feature-entitlements-service";

export const featureEntitlementsQueryKey = ["saas", "feature-entitlements"] as const;

export function useFeatureEntitlements() {
  return useQuery({
    queryKey: featureEntitlementsQueryKey,
    queryFn: () => featureEntitlementsService.mine(),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useFeaturePackEnabled(code: FeaturePackCode | string) {
  const { data, isLoading, isError } = useFeatureEntitlements();
  const enabled = featureEntitlementsService.isEnabled(data, code);
  return { enabled, isLoading, isError, data };
}

export { FEATURE_PACK_CODES };
