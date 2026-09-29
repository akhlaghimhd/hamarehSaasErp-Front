import { apiDelete, apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type SodRoleRef = {
  tenant_role_id?: string;
  code?: string | null;
  name?: string | null;
};

export type SodRuleDto = {
  sod_rule_id: string;
  role_a_id?: string;
  role_b_id?: string;
  code?: string | null;
  name?: string;
  description?: string | null;
  severity?: number;
  enforcement?: string;
  is_active?: boolean;
  role_a?: SodRoleRef | null;
  role_b?: SodRoleRef | null;
  [key: string]: unknown;
};

export type CreateSodRulePayload = {
  role_a_id: string;
  role_b_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  severity?: number;
  enforcement?: "BLOCK" | "WARN";
  is_active?: boolean;
};

export type SodEvaluateResult = {
  conflicts: Array<{
    sod_rule_id?: string;
    code?: string;
    name?: string;
    severity?: number;
    enforcement?: string;
    role_a_id?: string;
    role_b_id?: string;
  }>;
  has_block: boolean;
  has_warn: boolean;
};

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function asList<T>(data: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;
  return [];
}

export const sodService = {
  async list(): Promise<SodRuleDto[]> {
    const envelope = await apiGet(identityPaths.sodRules);
    return asList(unwrapData(envelope));
  },

  async create(payload: CreateSodRulePayload): Promise<SodRuleDto> {
    const envelope = await apiPost(identityPaths.sodRules, payload);
    return unwrapData<SodRuleDto>(envelope);
  },

  async softDelete(id: string): Promise<void> {
    await apiDelete(identityPaths.sodRule(id));
  },

  async evaluate(roleIds: string[]): Promise<SodEvaluateResult> {
    const envelope = await apiPost(identityPaths.sodEvaluate, {
      role_ids: roleIds,
    });
    return unwrapData<SodEvaluateResult>(envelope);
  },
};
