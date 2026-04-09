// AdSync Financial Types — not yet in generated bindings
// These mirror the Motoko backend types for the Billing + Earnings system

export interface AdSyncTransaction {
  id: bigint;
  syncId: string;
  transactionType: { credit: null } | { debit: null };
  amount: bigint;
  reason:
    | { ad_click: null }
    | { earning: null }
    | { topup: null }
    | { payout: null }
    | { refund: null };
  createdAt: bigint;
}

export interface AdSyncPayoutLog {
  id: bigint;
  syncId: string;
  amount: bigint;
  status: { processing: null } | { completed: null } | { failed: null };
  paymentMethod: string;
  createdAt: bigint;
  completedAt: [] | [bigint];
}

export interface AdSyncTaxProfile {
  syncId: string;
  country: string;
  panNumber: string;
  gstNumber: string;
  taxRate: bigint;
  lastUpdatedAt: bigint;
}

export interface AdSyncInvoice {
  id: bigint;
  syncId: string;
  amount: bigint;
  taxAmount: bigint;
  finalAmount: bigint;
  invoiceType: { earning: null } | { payout: null };
  reference: string;
  createdAt: bigint;
}

export type AdSyncTaxProfileResult =
  | { __kind__: "ok"; ok: AdSyncTaxProfile }
  | { __kind__: "err"; err: string };

export type AdSyncTextResult =
  | { __kind__: "ok"; ok: string }
  | { __kind__: "err"; err: string };
