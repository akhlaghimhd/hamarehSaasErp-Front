/** FIN-P0/P1/P2/P3 FE types — aligned with FinancialAccounting API */

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
  treasuryView: "finance.treasury.view",
  treasuryManage: "finance.treasury.manage",
  treasuryPost: "finance.treasury.post",
  arView: "finance.ar.view",
  arManage: "finance.ar.manage",
  apView: "finance.ap.view",
  apManage: "finance.ap.manage",
  taxView: "finance.tax.view",
  taxManage: "finance.tax.manage",
  moodianView: "finance.moodian.view",
  moodianSubmit: "finance.moodian.submit",
  complianceView: "finance.compliance.view",
  complianceManage: "finance.compliance.manage",
  suggestView: "finance.suggest.view",
  suggestManage: "finance.suggest.manage",
  suggestDecide: "finance.suggest.decide",
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

export interface TreasuryDocumentDto {
  treasury_document_id: string;
  company_id: string;
  period_id: string;
  cash_account_id: string;
  document_type: "RECEIPT" | "PAYMENT" | string;
  document_number?: string | null;
  document_date: string;
  status: string;
  amount: number | string;
  counterparty_name?: string | null;
  description?: string | null;
  journal_entry_id?: string | null;
}

export interface ChequeDto {
  cheque_id: string;
  company_id: string;
  direction: string;
  cheque_number: string;
  bank_name?: string | null;
  due_date: string;
  amount: number | string;
  status: string;
  payee_name?: string | null;
  drawer_name?: string | null;
}

export interface OpenItemDto {
  open_item_id: string;
  company_id: string;
  side: "AR" | "AP" | string;
  document_number?: string | null;
  document_date: string;
  due_date?: string | null;
  counterparty_name: string;
  original_amount: number | string;
  open_amount: number | string;
  status: string;
}

export interface AgingBucketDto {
  bucket: string;
  count: number;
  amount: string;
}

export interface TaxRateConfigDto {
  tax_rate_config_id: string;
  tax_code: string;
  name: string;
  rate_percent: number | string;
  valid_from: string;
  valid_to?: string | null;
  is_default?: boolean;
}

export interface TaxTransactionDto {
  tax_transaction_id: string;
  company_id: string;
  tax_code: string;
  taxable_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  transaction_date: string;
  direction: string;
  source_document_type: string;
}

export interface MoodianSubmissionDto {
  moodian_submission_id: string;
  company_id: string;
  source_document_type: string;
  source_document_id: string;
  external_ref?: string | null;
  status: string;
  error_message?: string | null;
  submitted_at?: string | null;
}

export interface ComplianceAlertDto {
  compliance_alert_id: string;
  company_id?: string | null;
  alert_code: string;
  severity: string;
  title: string;
  message: string;
  is_resolved: boolean;
}

export interface SuggestedJournalLineDto {
  suggested_line_id: string;
  account_id: string;
  debit_amount?: number | string;
  credit_amount?: number | string;
  line_role?: string;
  suggestion_reason?: string;
  sort_order?: number;
}

export interface SuggestedJournalDto {
  suggested_journal_id: string;
  company_id: string;
  ledger_id: string;
  period_id: string;
  source_event_type: string;
  source_document_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | string;
  description?: string | null;
  journal_entry_id?: string | null;
  decision_note?: string | null;
  lines?: SuggestedJournalLineDto[];
}

export const DEMO_PERIOD_ID = "a1000000-0000-4000-8000-000000000001";

export const ACCOUNT_TYPE_LABELS: Record<number, string> = {
  1: "دارایی",
  2: "بدهی",
  3: "حقوق صاحبان سهام",
  4: "درآمد",
  5: "هزینه",
};

export const AGING_BUCKET_LABELS: Record<string, string> = {
  current: "جاری",
  "1_30": "۱–۳۰ روز",
  "31_60": "۳۱–۶۰ روز",
  "61_90": "۶۱–۹۰ روز",
  "90_plus": "بیش از ۹۰ روز",
};

export const MOODIAN_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  SUBMITTED: "ارسال‌شده",
  ACCEPTED: "پذیرفته",
  REJECTED: "ردشده",
  FAILED: "خطا",
  CANCELLED: "لغو",
};
