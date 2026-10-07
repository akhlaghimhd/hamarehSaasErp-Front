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

export const accountService = {
  async listTree(): Promise<AccountTreeNode[]> {
    const envelope = await apiGet(`${financePaths.accounts}?tree=1`);
    const data = unwrapData<AccountTreeNode[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async listFlat(): Promise<AccountDto[]> {
    const envelope = await apiGet(`${financePaths.accounts}?tree=0`);
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
