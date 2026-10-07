/** Backend ModuleServiceProvider maps FinancialAccounting → /api/v1/financial-accounting */

export const FINANCE_BASE = "/financial-accounting";

export const financePaths = {
  accounts: `${FINANCE_BASE}/accounts`,
  account: (id: string) => `${FINANCE_BASE}/accounts/${id}`,
  journals: `${FINANCE_BASE}/journals`,
  journal: (id: string) => `${FINANCE_BASE}/journals/${id}`,
  journalPost: (id: string) => `${FINANCE_BASE}/journals/${id}/post`,
  journalReverse: (id: string) => `${FINANCE_BASE}/journals/${id}/reverse`,
  periodControls: `${FINANCE_BASE}/period-controls`,
  periodSoftClose: `${FINANCE_BASE}/period-controls/soft-close`,
  periodHardClose: `${FINANCE_BASE}/period-controls/hard-close`,
  periodReopen: `${FINANCE_BASE}/period-controls/reopen`,
  trialBalance: `${FINANCE_BASE}/reports/trial-balance`,
  profitAndLoss: `${FINANCE_BASE}/reports/profit-and-loss`,
  balanceSheet: `${FINANCE_BASE}/reports/balance-sheet`,
} as const;
