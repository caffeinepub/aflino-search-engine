import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type AdSyncKycRecord,
  AdSyncKycStatus,
  type AdSyncPaymentDetails,
  AdSyncPaymentMethod,
  type AdSyncUser,
  type AdSyncWallet,
} from "../backend.d";
import {
  useCreateAdSyncRazorpayOrder,
  useGetAdSyncInvoices,
  useGetAdSyncKycRecord,
  useGetAdSyncPaymentDetails,
  useGetAdSyncPayoutLogs,
  useGetAdSyncTaxProfile,
  useGetAdSyncTransactions,
  useGetAdSyncUser,
  useGetAdSyncWallet,
  useSetAdSyncPaymentDetails,
  useSetAdSyncTaxProfile,
  useSubmitAdSyncKyc,
  useVerifyAdSyncRazorpayPayment,
} from "../hooks/useQueries";
import type {
  AdSyncInvoice,
  AdSyncPayoutLog,
  AdSyncTaxProfile,
  AdSyncTransaction,
} from "../types/adsync-financial";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOL: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
};

function getSymbol(currency?: string) {
  return currency ? (CURRENCY_SYMBOL[currency] ?? "₹") : "₹";
}

function formatAmount(amount: bigint, currency?: string) {
  return `${getSymbol(currency)}${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function kycBadge(status: AdSyncKycStatus) {
  if (status === AdSyncKycStatus.verified)
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200 font-medium">
        Verified
      </Badge>
    );
  if (status === AdSyncKycStatus.pending)
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
        Pending
      </Badge>
    );
  return <Badge variant="secondary">Not started</Badge>;
}

function docStatusIcon(status: AdSyncKycStatus) {
  if (status === AdSyncKycStatus.verified)
    return <span className="text-green-600 font-bold">✓</span>;
  if (status === AdSyncKycStatus.pending)
    return <span className="text-amber-600 font-bold">⏳</span>;
  return <span className="text-muted-foreground">○</span>;
}

function txTypeBadge(txType: AdSyncTransaction["transactionType"]) {
  const isCredit = "credit" in txType;
  return isCredit ? (
    <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-medium">
      Credit
    </Badge>
  ) : (
    <Badge className="bg-red-50 text-red-700 border-red-200 text-xs font-medium">
      Debit
    </Badge>
  );
}

function txReasonLabel(reason: AdSyncTransaction["reason"]) {
  if ("ad_click" in reason) return "Ad Click";
  if ("earning" in reason) return "Earning";
  if ("topup" in reason) return "Top-up";
  if ("payout" in reason) return "Payout";
  return "Refund";
}

function payoutStatusBadge(status: AdSyncPayoutLog["status"]) {
  if ("completed" in status)
    return (
      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-medium">
        Completed
      </Badge>
    );
  if ("processing" in status)
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-medium">
        Processing
      </Badge>
    );
  return (
    <Badge className="bg-red-50 text-red-700 border-red-200 text-xs font-medium">
      Failed
    </Badge>
  );
}

function invoiceTypeBadge(invoiceType: AdSyncInvoice["invoiceType"]) {
  if ("earning" in invoiceType)
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium">
        Earning
      </Badge>
    );
  return (
    <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-medium">
      Payout
    </Badge>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({
  user,
  wallet,
}: {
  user: AdSyncUser;
  wallet: AdSyncWallet | null | undefined;
}) {
  const isPayoutEligible =
    wallet &&
    Number(wallet.balance) >= 500 &&
    user.kycStatus === AdSyncKycStatus.verified;

  const symbol = getSymbol(wallet?.currency);

  return (
    <div className="space-y-6">
      {/* Financial summary cards */}
      {wallet && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Balance",
              value: `${symbol}${Number(wallet.balance).toLocaleString("en-IN")}`,
              accent: true,
            },
            {
              label: "Total Earned",
              value: `${symbol}${Number(wallet.totalEarned).toLocaleString("en-IN")}`,
            },
            {
              label: "Total Spent",
              value: `${symbol}${Number(wallet.totalSpent).toLocaleString("en-IN")}`,
            },
            {
              label: "Payout Eligible",
              custom: isPayoutEligible ? (
                <Badge className="bg-green-50 text-green-700 border-green-200 font-medium mt-1">
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-1">
                  No
                </Badge>
              ),
            },
          ].map(({ label, value, accent, custom }) => (
            <div
              key={label}
              className={`rounded-xl p-4 border ${accent ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border"}`}
            >
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              {custom ?? (
                <p
                  className={`text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
                >
                  {value}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sync ID card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
          Your Sync ID
        </p>
        <p
          className="text-lg font-mono font-bold text-primary break-all select-all"
          data-ocid="syncid-display"
        >
          {user.syncId}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Keep this ID safe — it uniquely identifies your AdSync account
        </p>
      </div>

      {/* Profile grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Full Name", value: user.fullName },
          { label: "Email", value: user.email },
          { label: "Mobile", value: user.mobile },
          {
            label: "Account Type",
            value: user.accountType === "business" ? "Business" : "Individual",
          },
          {
            label: "Role",
            value: user.role.charAt(0).toUpperCase() + user.role.slice(1),
          },
          { label: "Country", value: user.country },
          { label: "State", value: user.state },
          { label: "City", value: user.city },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-medium text-foreground truncate">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* KYC status */}
      <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
        <span className="text-sm font-medium text-muted-foreground">
          KYC Status:
        </span>
        {kycBadge(user.kycStatus)}
        {!isPayoutEligible && wallet && (
          <span className="text-xs text-muted-foreground ml-2">
            {user.kycStatus !== AdSyncKycStatus.verified
              ? "Complete KYC to enable auto-payout"
              : `Need ${getSymbol(wallet.currency)}500 balance for auto-payout`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Wallet Tab ────────────────────────────────────────────────────────────────
function WalletTab({ syncId, email }: { syncId: string; email: string }) {
  const { data: wallet, refetch } = useGetAdSyncWallet(syncId);
  const createOrder = useCreateAdSyncRazorpayOrder();
  const verifyPayment = useVerifyAdSyncRazorpayPayment();
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const symbol = wallet ? getSymbol(wallet.currency) : "₹";

  async function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleAddFunds() {
    const amt = Number.parseInt(amount, 10);
    if (!amt || amt < 100) {
      toast.error("Minimum amount is ₹100");
      return;
    }
    if (!wallet) {
      toast.error("Wallet not loaded");
      return;
    }

    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const amountPaise = BigInt(amt * 100);
      const orderResult = await createOrder.mutateAsync({
        syncId,
        amountPaise,
      });

      if (orderResult.__kind__ === "err") {
        toast.error(orderResult.err);
        return;
      }
      const { orderId, keyId, amount: orderAmount } = orderResult.ok;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: Number(orderAmount),
        currency: String(wallet.currency),
        name: "Aflino AdSync",
        description: "Wallet Top-up",
        order_id: orderId,
        handler: (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          verifyPayment
            .mutateAsync({
              syncId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amountPaise,
            })
            .then((vResult) => {
              if (vResult.__kind__ === "ok") {
                toast.success(`${symbol}${amt} added to your wallet!`);
                setAmount("");
                void refetch();
              } else {
                toast.error(vResult.err);
              }
            })
            .catch((err: unknown) => {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Payment verification failed",
              );
            });
        },
        prefill: { email },
        theme: { color: "#006AFF" },
        modal: { ondismiss: () => {} },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  if (!wallet)
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Balance",
            value: `${symbol}${Number(wallet.balance).toLocaleString("en-IN")}`,
            accent: true,
          },
          {
            label: "Total Spent",
            value: `${symbol}${Number(wallet.totalSpent).toLocaleString("en-IN")}`,
          },
          {
            label: "Total Earned",
            value: `${symbol}${Number(wallet.totalEarned).toLocaleString("en-IN")}`,
          },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={`rounded-xl p-4 border ${accent ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-border"}`}
          >
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p
              className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {wallet.currency}
            </p>
          </div>
        ))}
      </div>

      {/* Add Funds */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-3">Add Funds</h3>
        <div className="flex gap-3">
          <Input
            type="number"
            placeholder="Enter amount (min ₹100)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1"
            data-ocid="wallet-amount-input"
          />
          <Button
            onClick={handleAddFunds}
            disabled={paying || !amount}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
            data-ocid="wallet-add-funds"
          >
            {paying ? "Processing…" : "Add Funds"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Powered by Razorpay · Secure payment gateway
        </p>
      </div>
    </div>
  );
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab({
  syncId,
  currency,
}: {
  syncId: string;
  currency?: string;
}) {
  const { data: txns, isLoading } = useGetAdSyncTransactions(syncId);

  if (isLoading)
    return (
      <div className="space-y-2">
        {["t1", "t2", "t3", "t4"].map((k) => (
          <Skeleton key={k} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );

  if (!txns || txns.length === 0)
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-ocid="transactions-empty"
      >
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-muted-foreground"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="font-semibold text-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your transaction history will appear here
        </p>
      </div>
    );

  const sorted = [...txns]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 50);

  return (
    <div className="space-y-1" data-ocid="transactions-list">
      <div className="hidden sm:grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Date</span>
        <span>Type</span>
        <span>Reason</span>
        <span className="text-right">Amount</span>
      </div>
      {sorted.map((tx) => (
        <div
          key={tx.id.toString()}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors"
          data-ocid="transaction-row"
        >
          <span className="text-sm text-muted-foreground">
            {formatDate(tx.createdAt)}
          </span>
          <div>{txTypeBadge(tx.transactionType)}</div>
          <span className="text-sm text-foreground capitalize hidden sm:block">
            {txReasonLabel(tx.reason)}
          </span>
          <span
            className={`text-sm font-semibold text-right ${"credit" in tx.transactionType ? "text-green-600" : "text-red-600"}`}
          >
            {"credit" in tx.transactionType ? "+" : "-"}
            {formatAmount(tx.amount, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Payouts Tab ───────────────────────────────────────────────────────────────
function PayoutsTab({
  syncId,
  wallet,
  kycStatus,
}: {
  syncId: string;
  wallet: AdSyncWallet | null | undefined;
  kycStatus: AdSyncKycStatus;
}) {
  const { data: payouts, isLoading } = useGetAdSyncPayoutLogs(syncId);
  const symbol = getSymbol(wallet?.currency);
  const isEligible =
    wallet &&
    Number(wallet.balance) >= 500 &&
    kycStatus === AdSyncKycStatus.verified;

  return (
    <div className="space-y-5">
      {/* Auto-payout rule card */}
      <div
        className={`rounded-xl p-5 border ${isEligible ? "bg-green-50 border-green-200" : "bg-muted/40 border-border"}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isEligible ? "bg-green-100" : "bg-muted"}`}
          >
            <svg
              className={`w-5 h-5 ${isEligible ? "text-green-600" : "text-muted-foreground"}`}
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h3
              className={`font-semibold ${isEligible ? "text-green-800" : "text-foreground"}`}
            >
              Auto-Payout Rule
            </h3>
            <p
              className={`text-sm mt-0.5 ${isEligible ? "text-green-700" : "text-muted-foreground"}`}
            >
              Minimum balance: {symbol}500 · KYC: Verified required
            </p>
            {isEligible ? (
              <p className="text-sm font-semibold text-green-700 mt-2">
                ✓ You are eligible for auto-payout
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {wallet && Number(wallet.balance) < 500 && (
                  <li className="text-xs text-muted-foreground">
                    • Balance: {symbol}
                    {Number(wallet.balance).toLocaleString("en-IN")} / {symbol}
                    500 minimum
                  </li>
                )}
                {kycStatus !== AdSyncKycStatus.verified && (
                  <li className="text-xs text-muted-foreground">
                    • KYC:{" "}
                    {kycStatus === AdSyncKycStatus.pending
                      ? "Under review"
                      : "Not submitted"}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Payout history */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Payout History</h3>
        {isLoading ? (
          <div className="space-y-2">
            {["p1", "p2", "p3"].map((k) => (
              <Skeleton key={k} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : !payouts || payouts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-xl border border-dashed border-border"
            data-ocid="payouts-empty"
          >
            <p className="font-medium text-muted-foreground">No payouts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Payouts will appear here once processed
            </p>
          </div>
        ) : (
          <div className="space-y-1" data-ocid="payouts-list">
            <div className="hidden sm:grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Date</span>
              <span>Amount</span>
              <span>Method</span>
              <span>Status</span>
            </div>
            {payouts.map((payout) => (
              <div
                key={payout.id.toString()}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center px-4 py-3 bg-card border border-border rounded-lg"
                data-ocid="payout-row"
              >
                <span className="text-sm text-muted-foreground">
                  {formatDate(payout.createdAt)}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatAmount(payout.amount, wallet?.currency)}
                </span>
                <span className="text-sm text-foreground hidden sm:block capitalize">
                  {payout.paymentMethod}
                </span>
                <div>{payoutStatusBadge(payout.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────────────
function InvoicesTab({
  syncId,
  currency,
}: {
  syncId: string;
  currency?: string;
}) {
  const { data: invoices, isLoading } = useGetAdSyncInvoices(syncId);

  if (isLoading)
    return (
      <div className="space-y-2">
        {["i1", "i2", "i3"].map((k) => (
          <Skeleton key={k} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );

  if (!invoices || invoices.length === 0)
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-ocid="invoices-empty"
      >
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-muted-foreground"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="font-semibold text-foreground">No invoices yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Invoices will be generated when you earn or receive payouts
        </p>
      </div>
    );

  const sorted = [...invoices].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  return (
    <div className="space-y-2" data-ocid="invoices-list">
      {sorted.map((inv, idx) => (
        <div
          key={inv.id.toString()}
          className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center px-4 py-4 bg-card border border-border rounded-xl hover:bg-muted/20 transition-colors"
          data-ocid="invoice-row"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              #INV-{String(idx + 1).padStart(3, "0")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(inv.createdAt)}
            </p>
          </div>
          <div>{invoiceTypeBadge(inv.invoiceType)}</div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-medium">
              {formatAmount(inv.amount, currency)}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="text-sm font-medium">
              {formatAmount(inv.taxAmount, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Total
            </p>
            <p className="text-sm font-bold text-primary">
              {formatAmount(inv.finalAmount, currency)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tax Settings Tab ──────────────────────────────────────────────────────────
function TaxSettingsTab({
  syncId,
  country,
}: {
  syncId: string;
  country: string;
}) {
  const { data: profile, refetch } = useGetAdSyncTaxProfile(syncId);
  const { mutateAsync: saveTax } = useSetAdSyncTaxProfile();
  const [saving, setSaving] = useState(false);

  const isIndia = country.toLowerCase().includes("india");

  const [form, setForm] = useState({
    country: country,
    panNumber: "",
    gstNumber: "",
    taxRate: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        country: profile.country,
        panNumber: profile.panNumber,
        gstNumber: profile.gstNumber,
        taxRate: profile.taxRate.toString(),
      });
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveTax({
        syncId,
        country: form.country,
        panNumber: form.panNumber,
        gstNumber: form.gstNumber,
        taxRate: BigInt(Number.parseInt(form.taxRate, 10) || 0),
      });
      if (result.__kind__ === "err") {
        toast.error(result.err);
        return;
      }
      toast.success("Tax profile saved successfully");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Current profile summary */}
      {profile && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-2">
            Current Tax Profile
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Country</p>
              <p className="font-medium">{profile.country}</p>
            </div>
            {profile.panNumber && (
              <div>
                <p className="text-xs text-muted-foreground">PAN</p>
                <p className="font-medium font-mono">{profile.panNumber}</p>
              </div>
            )}
            {profile.gstNumber && (
              <div>
                <p className="text-xs text-muted-foreground">GST</p>
                <p className="font-medium font-mono">{profile.gstNumber}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Tax Rate</p>
              <p className="font-medium">{profile.taxRate.toString()}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {formatDate(profile.lastUpdatedAt)}
          </p>
        </div>
      )}

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="bg-card border border-border rounded-xl p-5 space-y-4"
      >
        <h3 className="font-semibold text-foreground">
          {profile ? "Update Tax Profile" : "Set Up Tax Profile"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tax-country">Country</Label>
            <Input
              id="tax-country"
              value={form.country}
              onChange={(e) =>
                setForm((f) => ({ ...f, country: e.target.value }))
              }
              data-ocid="tax-country"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 18"
              value={form.taxRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, taxRate: e.target.value }))
              }
              data-ocid="tax-rate"
            />
          </div>

          {isIndia && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="tax-pan">PAN Number (India)</Label>
                <Input
                  id="tax-pan"
                  placeholder="ABCDE1234F"
                  value={form.panNumber}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      panNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  maxLength={10}
                  className="font-mono"
                  data-ocid="tax-pan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax-gst">GST Number (India, optional)</Label>
                <Input
                  id="tax-gst"
                  placeholder="22ABCDE1234F1Z5"
                  value={form.gstNumber}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gstNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  className="font-mono"
                  data-ocid="tax-gst"
                />
              </div>
            </>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> Tax is calculated as{" "}
            <code className="bg-amber-100 px-1 rounded">
              amount × taxRate / 100
            </code>{" "}
            and applied to your earning invoices.
          </p>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          data-ocid="tax-save"
        >
          {saving ? "Saving…" : "Save Tax Profile"}
        </Button>
      </form>
    </div>
  );
}

// ── Payment Details Tab ───────────────────────────────────────────────────────
function PaymentDetailsTab({
  syncId,
  country,
}: {
  syncId: string;
  country: string;
}) {
  const { data: existing, refetch } = useGetAdSyncPaymentDetails(syncId);
  const { mutateAsync: save } = useSetAdSyncPaymentDetails();
  const [saving, setSaving] = useState(false);

  const isIndia = (existing?.country ?? country)
    .toLowerCase()
    .includes("india");

  const [form, setForm] = useState<{
    country: string;
    method: AdSyncPaymentMethod;
    accountName: string;
    upiId: string;
    accountNumber: string;
    ifsc: string;
    swiftCode: string;
    iban: string;
  }>({
    country: existing?.country ?? country,
    method:
      existing?.method ??
      (isIndia ? AdSyncPaymentMethod.upi : AdSyncPaymentMethod.swift),
    accountName: existing?.accountName ?? "",
    upiId: existing?.upiId ?? "",
    accountNumber: existing?.accountNumber ?? "",
    ifsc: existing?.ifsc ?? "",
    swiftCode: existing?.swiftCode ?? "",
    iban: existing?.iban ?? "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        country: existing.country,
        method: existing.method,
        accountName: existing.accountName,
        upiId: existing.upiId ?? "",
        accountNumber: existing.accountNumber ?? "",
        ifsc: existing.ifsc ?? "",
        swiftCode: existing.swiftCode ?? "",
        iban: existing.iban ?? "",
      });
    }
  }, [existing]);

  const isIndiaForm = form.country.toLowerCase().includes("india");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await save({
        syncId,
        country: form.country,
        method: form.method,
        upiId: form.upiId || null,
        accountNumber: form.accountNumber || null,
        ifsc: form.ifsc || null,
        swiftCode: form.swiftCode || null,
        iban: form.iban || null,
        accountName: form.accountName,
      });
      if (result.__kind__ === "err") {
        toast.error(result.err);
        return;
      }
      toast.success("Payment details saved");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="pd-country">Country</Label>
          <Input
            id="pd-country"
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
            }
            data-ocid="payment-country"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <Select
            value={form.method}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, method: v as AdSyncPaymentMethod }))
            }
          >
            <SelectTrigger data-ocid="payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {isIndiaForm ? (
                <>
                  <SelectItem value={AdSyncPaymentMethod.upi}>UPI</SelectItem>
                  <SelectItem value={AdSyncPaymentMethod.bank}>
                    Bank Transfer
                  </SelectItem>
                </>
              ) : (
                <SelectItem value={AdSyncPaymentMethod.swift}>
                  SWIFT / International
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pd-name">
          Account Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="pd-name"
          placeholder="As per bank records"
          value={form.accountName}
          onChange={(e) =>
            setForm((f) => ({ ...f, accountName: e.target.value }))
          }
          data-ocid="payment-account-name"
          required
        />
      </div>

      {form.method === AdSyncPaymentMethod.upi && (
        <div className="space-y-1.5">
          <Label htmlFor="pd-upi">UPI ID</Label>
          <Input
            id="pd-upi"
            placeholder="yourname@upi"
            value={form.upiId}
            onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
            data-ocid="payment-upi-id"
          />
        </div>
      )}
      {form.method === AdSyncPaymentMethod.bank && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pd-acc">Account Number</Label>
            <Input
              id="pd-acc"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountNumber: e.target.value }))
              }
              data-ocid="payment-account-number"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-ifsc">IFSC Code</Label>
            <Input
              id="pd-ifsc"
              value={form.ifsc}
              onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))}
              data-ocid="payment-ifsc"
            />
          </div>
        </div>
      )}
      {form.method === AdSyncPaymentMethod.swift && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pd-swift">SWIFT Code</Label>
            <Input
              id="pd-swift"
              value={form.swiftCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, swiftCode: e.target.value }))
              }
              data-ocid="payment-swift"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd-iban">IBAN</Label>
            <Input
              id="pd-iban"
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
              data-ocid="payment-iban"
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        data-ocid="payment-save"
      >
        {saving ? "Saving…" : "Save Payment Details"}
      </Button>
    </form>
  );
}

// ── KYC Tab ───────────────────────────────────────────────────────────────────
function KycTab({ syncId }: { syncId: string }) {
  const { data: kycRecord, refetch } = useGetAdSyncKycRecord(syncId);
  const submitKyc = useSubmitAdSyncKyc();
  const [idProof, setIdProof] = useState(false);
  const [pan, setPan] = useState(false);
  const [addressProof, setAddressProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idProof && !pan && !addressProof) {
      toast.error("Select at least one document to submit");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitKyc.mutateAsync({ syncId });
      if (result.__kind__ === "err") {
        toast.error(result.err);
        return;
      }
      toast.success("KYC documents submitted for review");
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "KYC submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-4">
        <span className="text-sm font-medium text-muted-foreground">
          Overall KYC Status:
        </span>
        {kycRecord ? (
          kycBadge(kycRecord.status)
        ) : (
          <Skeleton className="h-5 w-20" />
        )}
      </div>

      {kycRecord && (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {(
            [{ label: "KYC Status", status: kycRecord.status }] as {
              label: string;
              status: AdSyncKycStatus;
            }[]
          ).map(({ label, status }) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-foreground">{label}</span>
              <div className="flex items-center gap-2">
                {docStatusIcon(status)}
                <span className="text-xs text-muted-foreground capitalize">
                  {status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {kycRecord?.adminNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">
            Admin Notes
          </p>
          <p className="text-sm text-foreground">{kycRecord.adminNotes}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl p-5 space-y-4"
      >
        <h3 className="font-semibold text-foreground">Submit Documents</h3>
        <p className="text-sm text-muted-foreground">
          Select the documents you want to submit for KYC verification:
        </p>
        <div className="space-y-3">
          {[
            {
              id: "id-proof",
              label: "ID Proof (Aadhaar / Passport / Driving License)",
              checked: idProof,
              onChange: setIdProof,
            },
            {
              id: "pan-card",
              label: "PAN Card (India)",
              checked: pan,
              onChange: setPan,
            },
            {
              id: "address-proof",
              label: "Address Proof (Utility Bill / Bank Statement)",
              checked: addressProof,
              onChange: setAddressProof,
            },
          ].map(({ id, label, checked, onChange }) => (
            <label key={id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 accent-primary"
                data-ocid={`kyc-${id}`}
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
        <Button
          type="submit"
          disabled={submitting || (!idProof && !pan && !addressProof)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          data-ocid="kyc-submit"
        >
          {submitting ? "Submitting…" : "Submit for Verification"}
        </Button>
      </form>
    </div>
  );
}

// ── Tab definition ────────────────────────────────────────────────────────────
const TABS = [
  { value: "overview", label: "Overview" },
  { value: "wallet", label: "Wallet" },
  { value: "transactions", label: "Transactions" },
  { value: "payouts", label: "Payouts" },
  { value: "invoices", label: "Invoices" },
  { value: "tax", label: "Tax Settings" },
  { value: "payment", label: "Payment Details" },
  { value: "kyc", label: "KYC" },
  { value: "settings", label: "Settings" },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdSyncDashboardPage() {
  const navigate = useNavigate();
  const syncId = localStorage.getItem("aflino_adsync_syncId");
  const email = localStorage.getItem("aflino_adsync_email");

  useEffect(() => {
    if (!syncId || !email) void navigate({ to: "/adsync-register" });
  }, [syncId, email, navigate]);

  const { data: user, isLoading } = useGetAdSyncUser(email);
  const { data: wallet } = useGetAdSyncWallet(syncId);

  function handleLogout() {
    localStorage.removeItem("aflino_adsync_syncId");
    localStorage.removeItem("aflino_adsync_email");
    void navigate({ to: "/adsync-login" });
  }

  if (!syncId || !email) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                A
              </span>
            </div>
            <span className="font-bold text-foreground">Aflino AdSync</span>
            <span className="hidden sm:block text-xs text-muted-foreground font-mono border border-border rounded px-2 py-0.5 bg-muted/50">
              {syncId.slice(0, 18)}…
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            data-ocid="dashboard-logout"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !user ? (
          <div className="text-center py-16 text-muted-foreground">
            User data not found. Please{" "}
            <button
              type="button"
              onClick={handleLogout}
              className="text-primary underline"
            >
              logout
            </button>{" "}
            and sign in again.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome, {user.fullName}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your AdSync account, wallet, earnings, and compliance
              </p>
            </div>

            <Tabs
              defaultValue="overview"
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              {/* Scrollable tab bar */}
              <div className="overflow-x-auto">
                <TabsList className="flex w-max min-w-full rounded-none border-b border-border bg-muted/30 p-0 h-auto">
                  {TABS.map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary py-3 px-4 text-sm font-medium"
                      data-ocid={`tab-${value}`}
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab user={user} wallet={wallet} />
                </TabsContent>

                <TabsContent value="wallet" className="mt-0">
                  <WalletTab syncId={syncId} email={email} />
                </TabsContent>

                <TabsContent value="transactions" className="mt-0">
                  <TransactionsTab
                    syncId={syncId}
                    currency={wallet?.currency}
                  />
                </TabsContent>

                <TabsContent value="payouts" className="mt-0">
                  <PayoutsTab
                    syncId={syncId}
                    wallet={wallet}
                    kycStatus={user.kycStatus}
                  />
                </TabsContent>

                <TabsContent value="invoices" className="mt-0">
                  <InvoicesTab syncId={syncId} currency={wallet?.currency} />
                </TabsContent>

                <TabsContent value="tax" className="mt-0">
                  <TaxSettingsTab syncId={syncId} country={user.country} />
                </TabsContent>

                <TabsContent value="payment" className="mt-0">
                  <PaymentDetailsTab syncId={syncId} country={user.country} />
                </TabsContent>

                <TabsContent value="kyc" className="mt-0">
                  <KycTab syncId={syncId} />
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="font-medium">Settings coming soon</p>
                    <p className="text-sm mt-1">
                      Account preferences and advanced settings will appear here
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
