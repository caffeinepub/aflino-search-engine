import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  ExternalLink,
  Loader2,
  LogOut,
  Megaphone,
  Pause,
  Play,
  Plus,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  Campaign,
  Transaction,
  TransactionReason,
  TransactionType,
} from "../backend.d";
import { useAuth } from "../context/AuthContext";
import {
  useApplyForAdvertiser,
  useCreateCampaign,
  useCreateRazorpayOrder,
  useGetMyAdvertiserProfile,
  useGetMyCampaigns,
  useGetTransactions,
  useGetWallet,
  usePauseCampaign,
  useResumeCampaign,
  useVerifyRazorpayPayment,
} from "../hooks/useQueries";

// ── Razorpay global type ───────────────────────────────────────────────────────

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { email: string };
  theme: { color: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasKey(obj: unknown, key: string): boolean {
  return typeof obj === "object" && obj !== null && key in obj;
}

function formatCurrency(amount: bigint): string {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(tsBigint: bigint): string {
  const ms = Number(tsBigint) / 1_000_000;
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function txTypeBadge(type: TransactionType) {
  const isCredit = hasKey(type, "credit");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
        isCredit
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {isCredit ? "Credit" : "Debit"}
    </span>
  );
}

function txReasonLabel(reason: TransactionReason): string {
  if (hasKey(reason, "topup")) return "Top-up";
  if (hasKey(reason, "ad_click")) return "Ad Click";
  if (hasKey(reason, "refund")) return "Refund";
  return "—";
}

// ── Load Razorpay script ──────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}

// ── Add Funds Dialog ──────────────────────────────────────────────────────────

function AddFundsDialog({
  open,
  onClose,
  email,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
}) {
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyRazorpayPayment();

  const handleProceed = async () => {
    const rupees = Number.parseInt(amount, 10);
    if (Number.isNaN(rupees) || rupees < 1) {
      toast.error("Please enter a valid amount (minimum ₹1)");
      return;
    }

    setIsProcessing(true);
    try {
      // Load Razorpay SDK if not already loaded
      await loadRazorpayScript();

      // Step 1: Create order on backend
      const amountPaise = BigInt(rupees * 100);
      const order = await createOrder.mutateAsync({ email, amountPaise });

      // Step 2: Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: Number(order.amount),
          currency: "INR",
          order_id: order.orderId,
          name: "Aflino Ads",
          description: "Wallet Top-up",
          prefill: { email },
          theme: { color: "#006AFF" },
          handler: async (response) => {
            try {
              // Step 3: Verify payment signature on backend
              await verifyPayment.mutateAsync({
                email,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amountPaise,
              });
              toast.success(
                `₹${rupees.toLocaleString("en-IN")} added to your wallet!`,
              );
              setAmount("");
              onClose();
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("dismissed"));
            },
          },
        });
        rzp.open();
      });
    } catch (err) {
      if (err instanceof Error && err.message !== "dismissed") {
        toast.error(err.message || "Payment failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isProcessing) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" style={{ color: "#006AFF" }} />
            Add Funds
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Enter the amount you want to add to your Aflino Ads wallet. Payments
            are processed securely via Razorpay.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="add-funds-amount">Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                ₹
              </span>
              <Input
                id="add-funds-amount"
                type="number"
                min={1}
                placeholder="500"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
                data-ocid="add-funds.amount-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum: ₹1</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 font-semibold"
              style={{ background: "#006AFF" }}
              onClick={() => void handleProceed()}
              disabled={isProcessing || !amount}
              data-ocid="add-funds.proceed-button"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing…
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              data-ocid="add-funds.cancel-button"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Wallet Card ───────────────────────────────────────────────────────────────

function WalletCard({ email }: { email: string }) {
  const { data: wallet, isLoading: walletLoading } = useGetWallet(email);
  const { data: transactions = [], isLoading: txLoading } =
    useGetTransactions(email);
  const [showAddFunds, setShowAddFunds] = useState(false);

  return (
    <div className="space-y-6">
      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Current Balance
            </p>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold"
              style={{ background: "#006AFF" }}
              onClick={() => setShowAddFunds(true)}
              data-ocid="wallet.add-funds.button"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Add Funds
            </Button>
          </div>
          {walletLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p
              className="text-3xl font-bold text-foreground"
              data-ocid="wallet.balance"
            >
              {wallet ? formatCurrency(wallet.balance) : "₹0"}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Spent
          </p>
          {walletLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p
              className="text-3xl font-bold text-foreground"
              data-ocid="wallet.total_spent"
            >
              {wallet ? formatCurrency(wallet.totalSpent) : "₹0"}
            </p>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">Transaction History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest transactions first
          </p>
        </div>
        {txLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-14 text-center px-6"
            data-ocid="wallet.transactions.empty"
          >
            <Wallet className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No transactions yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Transactions will appear here after your first top-up or ad click.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-ocid="wallet.transactions.table">
                {(transactions as Transaction[]).map((tx) => (
                  <TableRow key={String(tx.id)}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </TableCell>
                    <TableCell>{txTypeBadge(tx.type)}</TableCell>
                    <TableCell className="text-sm">
                      {txReasonLabel(tx.reason)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      <span
                        className={
                          hasKey(tx.type, "credit")
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {hasKey(tx.type, "credit") ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AddFundsDialog
        open={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        email={email}
      />
    </div>
  );
}

// ── Campaign Status badge ─────────────────────────────────────────────────────

function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  if (hasKey(campaign.status, "active"))
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        Active
      </Badge>
    );
  if (hasKey(campaign.status, "paused"))
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        Paused
      </Badge>
    );
  return <Badge variant="secondary">Ended</Badge>;
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────

function CampaignsTab({ email }: { email: string }) {
  const { data: campaigns = [], isLoading } = useGetMyCampaigns(email);
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const createCampaignMutation = useCreateCampaign();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    budget: "",
    dailyBudget: "",
    bidAmount: "",
    keywords: "",
    destinationUrl: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.destinationUrl.trim()) {
      toast.error("Name and Destination URL are required");
      return;
    }
    const budget = Number.parseInt(form.budget, 10);
    const dailyBudget = Number.parseInt(form.dailyBudget, 10);
    const bidAmount = Number.parseInt(form.bidAmount, 10);
    if (Number.isNaN(budget) || budget < 100) {
      toast.error("Total budget must be at least ₹100");
      return;
    }
    try {
      await createCampaignMutation.mutateAsync({
        email,
        name: form.name.trim(),
        budget,
        dailyBudget: Number.isNaN(dailyBudget) ? budget : dailyBudget,
        bidAmount: Number.isNaN(bidAmount) ? 5 : bidAmount,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        destinationUrl: form.destinationUrl.trim(),
      });
      toast.success("Campaign created!");
      setForm({
        name: "",
        budget: "",
        dailyBudget: "",
        bidAmount: "",
        keywords: "",
        destinationUrl: "",
      });
      setShowCreate(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create campaign",
      );
    }
  };

  const handlePause = async (id: bigint) => {
    try {
      await pauseMutation.mutateAsync(id);
      toast.success("Campaign paused");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleResume = async (id: bigint) => {
    try {
      await resumeMutation.mutateAsync(id);
      toast.success("Campaign resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">My Campaigns</h3>
        <Button
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
          data-ocid="campaigns.create_button"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h4 className="font-semibold text-sm">Create Campaign</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g. Summer Sale 2026"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                data-ocid="campaign.form.name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Destination URL</Label>
              <Input
                placeholder="https://example.com"
                value={form.destinationUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destinationUrl: e.target.value }))
                }
                data-ocid="campaign.form.url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Total Budget (₹)</Label>
              <Input
                type="number"
                placeholder="1000"
                min={100}
                value={form.budget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget: e.target.value }))
                }
                data-ocid="campaign.form.budget"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Daily Budget (₹)</Label>
              <Input
                type="number"
                placeholder="200"
                min={50}
                value={form.dailyBudget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dailyBudget: e.target.value }))
                }
                data-ocid="campaign.form.daily_budget"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bid Amount (₹ per click)</Label>
              <Input
                type="number"
                placeholder="5"
                min={1}
                value={form.bidAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bidAmount: e.target.value }))
                }
                data-ocid="campaign.form.bid"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Keywords (comma-separated)</Label>
              <Input
                placeholder="buy shoes, sneakers, footwear"
                value={form.keywords}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywords: e.target.value }))
                }
                data-ocid="campaign.form.keywords"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              disabled={createCampaignMutation.isPending}
              data-ocid="campaign.form.submit"
            >
              {createCampaignMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Create
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border"
          data-ocid="campaigns.empty"
        >
          <Megaphone className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No campaigns yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create your first campaign to start showing ads.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody data-ocid="campaigns.table">
                {(campaigns as Campaign[]).map((c) => {
                  const ctr =
                    c.impressions > 0n
                      ? (
                          (Number(c.clicks) / Number(c.impressions)) *
                          100
                        ).toFixed(1)
                      : "0.0";
                  return (
                    <TableRow key={String(c.id)}>
                      <TableCell>
                        <div className="font-medium text-sm">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                          <a
                            href={c.destinationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline inline-flex items-center gap-0.5"
                          >
                            {c.destinationUrl}
                            <ExternalLink className="h-3 w-3 ml-0.5" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CampaignStatusBadge campaign={c} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(c.budget)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(c.spend)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {Number(c.clicks).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {Number(c.impressions).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {ctr}%
                      </TableCell>
                      <TableCell>
                        {hasKey(c.status, "active") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handlePause(c.id)}
                            disabled={pauseMutation.isPending}
                            data-ocid={`campaign.pause_${String(c.id)}`}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        ) : hasKey(c.status, "paused") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleResume(c.id)}
                            disabled={resumeMutation.isPending}
                            data-ocid={`campaign.resume_${String(c.id)}`}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Performance Tab ───────────────────────────────────────────────────────────

function PerformanceTab({ email }: { email: string }) {
  const { data: campaigns = [] } = useGetMyCampaigns(email);

  const totalClicks = (campaigns as Campaign[]).reduce(
    (acc, c) => acc + Number(c.clicks),
    0,
  );
  const totalImpressions = (campaigns as Campaign[]).reduce(
    (acc, c) => acc + Number(c.impressions),
    0,
  );
  const totalSpent = (campaigns as Campaign[]).reduce(
    (acc, c) => acc + Number(c.spend),
    0,
  );
  const avgCtr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-sm">Overall Performance</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Clicks",
            value: totalClicks.toLocaleString(),
            color: "text-[#006AFF]",
          },
          {
            label: "Impressions",
            value: totalImpressions.toLocaleString(),
            color: "text-foreground",
          },
          { label: "Avg CTR", value: `${avgCtr}%`, color: "text-green-600" },
          {
            label: "Total Spent",
            value: `₹${totalSpent.toLocaleString("en-IN")}`,
            color: "text-red-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-4 space-y-1"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border">
          <BarChart2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No data yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create a campaign and start getting impressions and clicks.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main AdsDashboardPage ─────────────────────────────────────────────────────

export default function AdsDashboardPage() {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout } = useAuth();
  const email = isAuthenticated && role === "user" ? user : null;

  const { data: advertiserProfile, isLoading: profileLoading } =
    useGetMyAdvertiserProfile(email);
  const applyMutation = useApplyForAdvertiser();

  const isApproved =
    advertiserProfile && hasKey(advertiserProfile.status, "approved");
  const isPending =
    advertiserProfile && hasKey(advertiserProfile.status, "pending");

  const handleSignOut = () => {
    logout();
    void navigate({ to: "/" });
  };

  const handleApply = async () => {
    if (!email) {
      toast.error("You must be logged in to apply");
      return;
    }
    try {
      await applyMutation.mutateAsync(email);
      toast.success("Application submitted! Awaiting admin approval.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply");
    }
  };

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (!email) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "#006AFF" }}
          >
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Aflino Ads</h1>
          <p className="text-sm text-muted-foreground">
            Please log in to access the advertiser dashboard.
          </p>
          <Link to="/login">
            <Button className="w-full" style={{ background: "#006AFF" }}>
              Log In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#006AFF]" />
      </div>
    );
  }

  // ── Not an advertiser yet ───────────────────────────────────────────────────
  if (!advertiserProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "#006AFF" }}
          >
            <Megaphone className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Become an Advertiser</h1>
          <p className="text-sm text-muted-foreground">
            Reach millions of users on Aflino Search. Apply to become an
            advertiser.
          </p>
          <Button
            className="w-full"
            style={{ background: "#006AFF" }}
            onClick={() => void handleApply()}
            disabled={applyMutation.isPending}
            data-ocid="apply.advertiser.button"
          >
            {applyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Apply Now
          </Button>
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:underline block"
          >
            ← Back to Aflino
          </Link>
        </div>
      </div>
    );
  }

  // ── Pending approval ────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto bg-amber-100">
            <Loader2 className="h-7 w-7 text-amber-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold">Application Pending</h1>
          <p className="text-sm text-muted-foreground">
            Your advertiser application is under review. We'll notify you once
            it's approved.
          </p>
          <Link to="/">
            <Button variant="outline" className="w-full">
              ← Back to Aflino
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Approved advertiser dashboard ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span
                className="font-bold text-base"
                style={{ color: "#006AFF" }}
              >
                Aflino
              </span>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm font-semibold">Ads Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">
              {email}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSignOut}
              data-ocid="ads.signout.button"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Approved badge */}
      {isApproved && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-center text-xs text-green-700 font-medium">
          ✓ Verified Advertiser — Your ads are live on Aflino Search
        </div>
      )}

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <Tabs defaultValue="wallet" className="space-y-6">
          <TabsList className="bg-muted/40 rounded-xl p-1 w-full sm:w-auto inline-flex">
            <TabsTrigger
              value="wallet"
              data-ocid="ads.tab.wallet"
              className="flex items-center gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5" />
              Wallet
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              data-ocid="ads.tab.campaigns"
              className="flex items-center gap-1.5"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              data-ocid="ads.tab.performance"
              className="flex items-center gap-1.5"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallet">
            <WalletCard email={email} />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignsTab email={email} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab email={email} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40 py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
