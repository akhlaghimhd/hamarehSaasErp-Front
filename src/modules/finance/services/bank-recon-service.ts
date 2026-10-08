import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type BankStatementLine = {
  bank_statement_line_id: string;
  line_date: string;
  description?: string | null;
  debit_amount?: number | string;
  credit_amount?: number | string;
  status: string;
  matched_treasury_document_id?: string | null;
  matched_journal_entry_id?: string | null;
};

export type BankStatement = {
  bank_statement_id: string;
  company_id: string;
  cash_account_id: string;
  statement_date: string;
  reference?: string | null;
  opening_balance?: number | string;
  closing_balance?: number | string;
  status: string;
  lines?: BankStatementLine[];
};

export const bankReconService = {
  async list(companyId?: string) {
    const q = companyId ? `?company_id=${companyId}` : "";
    const envelope = await apiGet(`${financePaths.bankStatements}${q}`);
    return unwrapData<BankStatement[]>(envelope);
  },

  async create(payload: {
    company_id: string;
    cash_account_id: string;
    statement_date: string;
    reference?: string;
    opening_balance?: number;
    closing_balance?: number;
    lines?: Array<{
      line_date: string;
      description?: string;
      debit_amount?: number;
      credit_amount?: number;
    }>;
  }) {
    const envelope = await apiPost(financePaths.bankStatements, payload);
    return unwrapData<BankStatement>(envelope);
  },

  async matchLine(
    lineId: string,
    payload: { treasury_document_id?: string; journal_entry_id?: string }
  ) {
    const envelope = await apiPost(financePaths.bankStatementMatch(lineId), payload);
    return unwrapData<BankStatementLine>(envelope);
  },
};
