import { apiGet, apiPost, apiPut, apiDelete } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { AccountDto, AccountTreeNode, CreateAccountPayload } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function withCompanyQuery(base: string, companyId?: string | null): string {
  if (!companyId) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}company_id=${encodeURIComponent(companyId)}`;
}

export const accountService = {
  /** FIN-HOLD-W4: pass companyId when known; BE falls back to primary if omitted. */
  async listTree(companyId?: string | null): Promise<AccountTreeNode[]> {
    const url = withCompanyQuery(`${financePaths.accounts}?tree=1`, companyId);
    const envelope = await apiGet(url);
    const data = unwrapData<AccountTreeNode[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async listFlat(companyId?: string | null): Promise<AccountDto[]> {
    const url = withCompanyQuery(`${financePaths.accounts}?tree=0`, companyId);
    const envelope = await apiGet(url);
    const data = unwrapData<AccountDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async create(payload: CreateAccountPayload): Promise<AccountDto> {
    const envelope = await apiPost(financePaths.accounts, payload);
    return unwrapData<AccountDto>(envelope);
  },

  async update(id: string, payload: Partial<CreateAccountPayload>): Promise<AccountDto> {
    const envelope = await apiPut(financePaths.account(id), payload);
    return unwrapData<AccountDto>(envelope);
  },

  async softDelete(id: string): Promise<void> {
    await apiDelete(financePaths.account(id));
  },
};
