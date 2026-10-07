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
  cashAccounts: `${FINANCE_BASE}/cash-accounts`,
  treasuryDocuments: `${FINANCE_BASE}/treasury-documents`,
  treasuryPost: (id: string) => `${FINANCE_BASE}/treasury-documents/${id}/post`,
  cheques: `${FINANCE_BASE}/cheques`,
  chequeTransition: (id: string) => `${FINANCE_BASE}/cheques/${id}/transition`,
  openItems: `${FINANCE_BASE}/open-items`,
  openItemsAging: `${FINANCE_BASE}/open-items/aging`,
  openItemAllocate: (id: string) => `${FINANCE_BASE}/open-items/${id}/allocate`,
  bankStatements: `${FINANCE_BASE}/bank-statements`,
  taxRates: `${FINANCE_BASE}/tax/rates`,
  taxSplit: `${FINANCE_BASE}/tax/split`,
  taxTransactions: `${FINANCE_BASE}/tax/transactions`,
  moodianSubmissions: `${FINANCE_BASE}/moodian/submissions`,
  moodianSubmit: `${FINANCE_BASE}/moodian/submit`,
  moodianPoll: (id: string) => `${FINANCE_BASE}/moodian/submissions/${id}/poll`,
  complianceAlerts: `${FINANCE_BASE}/compliance-alerts`,
  complianceScan: `${FINANCE_BASE}/compliance-alerts/scan`,
  complianceResolve: (id: string) => `${FINANCE_BASE}/compliance-alerts/${id}/resolve`,
  suggestedJournals: `${FINANCE_BASE}/suggested-journals`,
  suggestedJournal: (id: string) => `${FINANCE_BASE}/suggested-journals/${id}`,
  suggestedJournalAccept: (id: string) =>
    `${FINANCE_BASE}/suggested-journals/${id}/accept`,
  suggestedJournalReject: (id: string) =>
    `${FINANCE_BASE}/suggested-journals/${id}/reject`,
  accountDeterminationRules: `${FINANCE_BASE}/account-determination-rules`,
} as const;
