/** FIN-P0 FE types — aligned with FinancialAccounting API */

export const FinancePermissions = {
  coaView: "finance.coa.view",
  coaCreate: "finance.coa.create",
  coaUpdate: "finance.coa.update",
  coaDelete: "finance.coa.delete",
  journalView: "finance.journal.view",
  journalCreate: "finance.journal.create",
  journalUpdate: "finance.journal.update",
  journalDelete: "finance.journal.delete",
  journalPost: "finance.journal.post",
  journalReverse: "finance.journal.reverse",
  periodView: "finance.period.view",
  periodClose: "finance.period.close",
  periodReopen: "finance.period.reopen",
  reportView: "finance.report.view",
} as const;

export type FinancePermissionCode =
  (typeof FinancePermissions)[keyof typeof FinancePermissions];

export type AccountType = 1 | 2 | 3 | 4 | 5;

export interface AccountDto {
  account_id: string;
  tenant_id?: string;
  parent_account_id?: string | null;
  account_code: string;
  name: string;
  account_type: AccountType | number;
  account_level?: number;
  normal_balance?: number;
  is_control_account?: boolean;
  is_postable?: boolean;
  status?: number;
  children?: AccountTreeNode[];
}

export type AccountTreeNode = AccountDto & { children?: AccountTreeNode[] };

export interface CreateAccountPayload {
  account_code: string;
  name: string;
  account_type: number;
  normal_balance?: number;
  parent_account_id?: string | null;
  is_control_account?: boolean;
  is_postable?: boolean;
  account_level?: number;
}

export type JournalStatus = "DRAFT" | "POSTED" | "REVERSED";

export interface JournalItemDto {
  journal_item_id?: string;
  account_id: string;
  debit_amount?: number | string;
  credit_amount?: number | string;
  description?: string | null;
  cost_center_id?: string | null;
  business_unit_id?: string | null;
  sort_order?: number;
}

export interface JournalEntryDto {
  journal_entry_id: string;
  ledger_id: string;
  company_id: string;
  period_id: string;
  entry_number?: string | null;
  document_date: string;
  posting_date?: string | null;
  status: JournalStatus | string;
  description?: string | null;
  reverses_entry_id?: string | null;
  reversed_by_entry_id?: string | null;
  items?: JournalItemDto[];
}

export interface CreateJournalPayload {
  ledger_id: string;
  company_id: string;
  period_id: string;
  document_date: string;
  description?: string;
  lines: Array<{
    account_id: string;
    debit_amount?: number;
    credit_amount?: number;
    description?: string;
  }>;
}

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  name: string;
  account_type: number;
  debit: string;
  credit: string;
  balance: string;
}

export interface ProfitAndLossDto {
  revenue: Array<TrialBalanceRow & { amount: string }>;
  expense: Array<TrialBalanceRow & { amount: string }>;
  total_revenue: string;
  total_expense: string;
  net_income: string;
}

export interface BalanceSheetDto {
  assets: Array<{ amount: string; account_code?: string; name?: string }>;
  liabilities: Array<{ amount: string; account_code?: string; name?: string }>;
  equity: Array<{ amount: string; account_code?: string; name?: string }>;
  total_assets: string;
  total_liabilities_equity: string;
}

/** Demo period from DemoFinanceCoaSeeder */
export const DEMO_PERIOD_ID = "a1000000-0000-4000-8000-000000000001";

export const ACCOUNT_TYPE_LABELS: Record<number, string> = {
  1: "دارایی",
  2: "بدهی",
  3: "حقوق صاحبان سهام",
  4: "درآمد",
  5: "هزینه",
};
