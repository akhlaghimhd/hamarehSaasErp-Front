import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { TreasuryDocumentDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type CashAccountDto = {
  cash_account_id: string;
  company_id: string;
  gl_account_id: string;
  code: string;
  name: string;
  cash_kind?: string | null;
  bank_account_id?: string | null;
  is_active?: boolean;
};

export type CreateCashAccountPayload = {
  company_id: string;
  gl_account_id: string;
  code: string;
  name: string;
  cash_kind?: "BANK" | "PETTY_CASH";
  bank_account_id?: string;
};

export type CreateTreasuryDocumentPayload = {
  company_id: string;
  period_id: string;
  cash_account_id: string;
  document_type: "RECEIPT" | "PAYMENT";
  document_date: string;
  amount: number;
  counterparty_name?: string;
  description?: string;
  offset_account_id?: string;
  ledger_id?: string;
  auto_post?: boolean;
};

export const treasuryService = {
  async listCashAccounts(companyId?: string): Promise<CashAccountDto[]> {
    const q = new URLSearchParams();
    if (companyId) q.set("company_id", companyId);
    const qs = q.toString();
    const envelope = await apiGet(
      qs ? `${financePaths.cashAccounts}?${qs}` : financePaths.cashAccounts
    );
    const data = unwrapData<CashAccountDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async createCashAccount(
    payload: CreateCashAccountPayload
  ): Promise<CashAccountDto> {
    const envelope = await apiPost(financePaths.cashAccounts, payload);
    return unwrapData<CashAccountDto>(envelope);
  },

  async listDocuments(params?: {
    company_id?: string;
    status?: string;
  }): Promise<TreasuryDocumentDto[]> {
    const q = new URLSearchParams();
    if (params?.company_id) q.set("company_id", params.company_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const envelope = await apiGet(
      qs ? `${financePaths.treasuryDocuments}?${qs}` : financePaths.treasuryDocuments
    );
    const data = unwrapData<TreasuryDocumentDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async createDocument(
    payload: CreateTreasuryDocumentPayload
  ): Promise<TreasuryDocumentDto> {
    const envelope = await apiPost(financePaths.treasuryDocuments, payload);
    return unwrapData<TreasuryDocumentDto>(envelope);
  },

  async postDocument(
    id: string,
    opts: { offset_account_id: string; ledger_id?: string }
  ): Promise<TreasuryDocumentDto> {
    const envelope = await apiPost(financePaths.treasuryPost(id), {
      offset_account_id: opts.offset_account_id,
      ledger_id: opts.ledger_id ?? null,
    });
    return unwrapData<TreasuryDocumentDto>(envelope);
  },
};
