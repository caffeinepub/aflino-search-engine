import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  LogOut,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Campaign, Website } from "../backend.d";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
  useApplyForAdvertiser,
  useCreateCampaign,
  useGetCallerRole,
  useGetMyAdvertiserProfile,
  useGetMyCampaigns,
  useGetMyWebsites,
  useGetMyWebsitesByEmail,
  useGetVerificationToken,
  usePauseCampaign,
  useResumeCampaign,
  useSubmitWebsite,
  useVerifyDomain,
} from "../hooks/useQueries";
import {
  sanitizeText,
  validateDescription,
  validateKeywords,
  validateTitle,
  validateUrl,
} from "../utils/security";

// Helper: ICP runtime returns variant objects; cast for in-operator checks
function hasKey(obj: unknown, key: string): boolean {
  return typeof obj === "object" && obj !== null && key in obj;
}

// Helper: calculate days until expiry from nanosecond bigint timestamp
function getDaysUntilExpiry(expiryNs: bigint | undefined): number | null {
  if (!expiryNs) return null;
  const nowNs = BigInt(Date.now()) * BigInt(1_000_000);
  const diffNs = expiryNs - nowNs;
  if (diffNs <= 0n) return 0;
  return Math.floor(Number(diffNs / BigInt(86_400_000_000_000)));
}

// Helper: render expiry countdown badge
function ExpiryBadge({ expiryNs }: { expiryNs: bigint | undefined }) {
  const days = getDaysUntilExpiry(expiryNs);
  if (days === null) return null;
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
        <Clock className="h-3 w-3" /> Expired
      </span>
    );
  }
  const colorClass =
    days > 30
      ? "text-green-700 bg-green-50 border-green-200"
      : days > 7
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${colorClass}`}
    >
      <Clock className="h-3 w-3" /> Expires in {days}d
    </span>
  );
}

// Helper: ownership status badge
function OwnershipBadge({ website }: { website: Website }) {
  const ownershipStatus = website.ownershipStatus as unknown;
  if (hasKey(ownershipStatus, "active")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        Active
      </span>
    );
  }
  if (hasKey(ownershipStatus, "expired")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        Expired
      </span>
    );
  }
  if (hasKey(ownershipStatus, "reclaimed")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        Reclaimed
      </span>
    );
  }
  return null;
}

// Helper: verification status badge (V3)
function VerificationStatusBadge({ website }: { website: Website }) {
  const verificationStatus = website.verificationStatus as unknown;
  if (hasKey(verificationStatus, "verified")) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  if (hasKey(verificationStatus, "expired")) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3.5 w-3.5" /> Expired
      </span>
    );
  }
  // Fallback: use legacy isVerified
  if (website.isVerified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Pending</span>;
}

type SidebarTab = "my-websites" | "submit" | "account" | "monetization";

function VerificationDialog({
  website,
  onClose,
}: {
  website: Website | null;
  onClose: () => void;
}) {
  const { data: token = "", isLoading } = useGetVerificationToken(
    website ? website.id : null,
  );
  const verifyMutation = useVerifyDomain();

  const handleVerify = async () => {
    if (!website) return;
    try {
      const result = await verifyMutation.mutateAsync(website.id);
      if (result) {
        toast.success("Domain verified successfully!");
        onClose();
      } else {
        toast.error("Verification failed. Please check the token placement.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(token);
    toast.success("Token copied to clipboard");
  };

  return (
    <Dialog open={!!website} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="verification.dialog">
        <DialogHeader>
          <DialogTitle>Verify Domain Ownership</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div
            className="flex items-center gap-2 py-4"
            data-ocid="verification.loading_state"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Loading token…</span>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To verify ownership of <strong>{website?.url}</strong>, place the
              following token in a publicly accessible file:
            </p>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                File path:
              </p>
              <code className="text-xs font-mono">
                {website?.url}/.well-known/aflino-verification.txt
              </code>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Token value:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-foreground break-all">
                  {token}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                  data-ocid="verification.copy.button"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Alternatively, add a meta tag:{" "}
              <code className="bg-muted px-1 rounded">
                {`<meta name="aflino-verification" content="${token}">`}
              </code>
            </p>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="verification.cancel.button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleVerify()}
            disabled={verifyMutation.isPending || isLoading}
            data-ocid="verification.confirm.button"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Check Verification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Campaign Status Badge ────────────────────────────────────────────

function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  const isActive = hasKey(campaign.status, "active");
  const isPaused = hasKey(campaign.status, "paused");

  if (isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        Active
      </span>
    );
  }
  if (isPaused) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      Ended
    </span>
  );
}

// ── Create Campaign Form ────────────────────────────────────────────

function CreateCampaignForm({
  email,
  onSuccess,
  onCancel,
}: {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [keywords, setKeywords] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  const createMutation = useCreateCampaign();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    const budgetNum = Number.parseInt(budget, 10);
    const dailyNum = Number.parseInt(dailyBudget, 10);
    const bidNum = Number.parseInt(bidAmount, 10);
    if (Number.isNaN(budgetNum) || budgetNum <= 0) {
      toast.error("Valid budget is required");
      return;
    }
    if (Number.isNaN(dailyNum) || dailyNum <= 0) {
      toast.error("Valid daily budget is required");
      return;
    }
    if (Number.isNaN(bidNum) || bidNum < 1) {
      toast.error("CPC bid must be at least ₹1");
      return;
    }
    const kwList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (kwList.length === 0) {
      toast.error("At least one keyword is required");
      return;
    }
    if (!destinationUrl.trim()) {
      toast.error("Destination URL is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        email,
        name: name.trim(),
        budget: budgetNum,
        dailyBudget: dailyNum,
        bidAmount: bidNum,
        keywords: kwList,
        destinationUrl: destinationUrl.trim(),
      });
      toast.success("Campaign created successfully!");
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create campaign",
      );
    }
  };

  return (
    <div
      className="rounded-xl border border-border p-5 space-y-4 bg-white"
      data-ocid="campaign.create.panel"
    >
      <h3 className="text-sm font-semibold text-foreground">Create Campaign</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="campaign-name">Campaign Name</Label>
          <Input
            id="campaign-name"
            placeholder="My Product Campaign"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-ocid="campaign.name.input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-budget">Total Budget (₹)</Label>
          <Input
            id="campaign-budget"
            type="number"
            min="1"
            placeholder="5000"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            data-ocid="campaign.budget.input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-daily">Daily Budget (₹)</Label>
          <Input
            id="campaign-daily"
            type="number"
            min="1"
            placeholder="500"
            value={dailyBudget}
            onChange={(e) => setDailyBudget(e.target.value)}
            data-ocid="campaign.daily_budget.input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-bid">CPC Bid (₹)</Label>
          <Input
            id="campaign-bid"
            type="number"
            min="1"
            placeholder="10"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            data-ocid="campaign.bid.input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-keywords">Keywords</Label>
          <Input
            id="campaign-keywords"
            placeholder="shoes, running, sports"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            data-ocid="campaign.keywords.input"
          />
          <p className="text-xs text-muted-foreground">Comma-separated</p>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="campaign-url">Destination URL</Label>
          <Input
            id="campaign-url"
            type="url"
            placeholder="https://yourwebsite.com/landing"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            data-ocid="campaign.url.input"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={createMutation.isPending}
          data-ocid="campaign.create.submit_button"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            "Create Campaign"
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          data-ocid="campaign.create.cancel_button"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Campaigns Tab Content ────────────────────────────────────────────

function CampaignsSection({ email }: { email: string }) {
  const { data: campaigns = [], isLoading } = useGetMyCampaigns(email);
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handlePause = async (id: bigint) => {
    try {
      await pauseMutation.mutateAsync(id);
      toast.success("Campaign paused");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause");
    }
  };

  const handleResume = async (id: bigint) => {
    try {
      await resumeMutation.mutateAsync(id);
      toast.success("Campaign resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    }
  };

  return (
    <div className="space-y-4">
      {/* Coming soon notice */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <span className="text-base leading-5 flex-shrink-0">ℹ️</span>
        <p className="text-xs">
          Campaign ads will go live once the system is activated by admin. You
          can set up campaigns now and they will be ready when activated.
        </p>
      </div>

      {/* Create Campaign toggle */}
      {!showCreateForm && (
        <Button
          size="sm"
          onClick={() => setShowCreateForm(true)}
          className="gap-1.5"
          data-ocid="campaign.create.primary_button"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Campaign
        </Button>
      )}

      {/* Create Campaign form */}
      {showCreateForm && (
        <CreateCampaignForm
          email={email}
          onSuccess={() => setShowCreateForm(false)}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Campaign list */}
      {isLoading ? (
        <div
          className="flex items-center gap-2 py-4 text-muted-foreground"
          data-ocid="campaign.list.loading_state"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm">Loading campaigns…</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div
          className="rounded-xl border border-border p-8 text-center"
          data-ocid="campaign.list.empty_state"
        >
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium mb-0.5">No campaigns yet</p>
          <p className="text-xs text-muted-foreground">
            Create your first campaign above to get started
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border border-border overflow-hidden"
          data-ocid="campaign.list.table"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>CPC</TableHead>
                <TableHead>Impr / Clicks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign, i) => (
                <TableRow
                  key={campaign.id.toString()}
                  data-ocid={`campaign.item.${i + 1}`}
                >
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {campaign.destinationUrl
                          .replace(/^https?:\/\//, "")
                          .slice(0, 30)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge campaign={campaign} />
                  </TableCell>
                  <TableCell className="text-sm">
                    ₹{campaign.budget.toString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    ₹{campaign.bidAmount.toString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {campaign.impressions.toString()} /{" "}
                    {campaign.clicks.toString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasKey(campaign.status, "active") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handlePause(campaign.id)}
                        disabled={pauseMutation.isPending}
                        className="h-7 px-2 text-xs gap-1"
                        data-ocid={`campaign.pause.button.${i + 1}`}
                      >
                        <Pause className="h-3 w-3" />
                        Pause
                      </Button>
                    )}
                    {hasKey(campaign.status, "paused") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleResume(campaign.id)}
                        disabled={resumeMutation.isPending}
                        className="h-7 px-2 text-xs gap-1"
                        data-ocid={`campaign.resume.button.${i + 1}`}
                      >
                        <Play className="h-3 w-3" />
                        Resume
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const userEmail = auth.user;
  const { data: role } = useGetCallerRole();

  const [activeTab, setActiveTab] = useState<SidebarTab>("my-websites");
  const [verifyingWebsite, setVerifyingWebsite] = useState<Website | null>(
    null,
  );

  // Submit form state
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formKeywords, setFormKeywords] = useState("");

  // Field-level validation errors
  const [urlError, setUrlError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  const { data: websitesByEmail = [], isLoading: emailLoading } =
    useGetMyWebsitesByEmail(userEmail);
  const { data: websitesByPrincipal = [], isLoading: principalLoading } =
    useGetMyWebsites();
  // Prefer email-based results when email is available; fall back to principal
  const websites = userEmail
    ? websitesByEmail.length > 0
      ? websitesByEmail
      : websitesByPrincipal
    : websitesByPrincipal;
  const isLoading = userEmail ? emailLoading : principalLoading;
  const submitMutation = useSubmitWebsite();

  // Monetization
  const {
    data: advertiserProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useGetMyAdvertiserProfile(userEmail);
  const applyMutation = useApplyForAdvertiser();

  if (!auth.isAuthenticated) {
    void navigate({ to: "/login" });
    return null;
  }

  const handleSubmit = async () => {
    const urlErr = validateUrl(formUrl);
    const titleErr = validateTitle(formTitle);
    const descErr = validateDescription(formDescription);
    const kwErr = validateKeywords(formKeywords);

    setUrlError(urlErr);
    setTitleError(titleErr);
    setDescriptionError(descErr);
    setKeywordsError(kwErr);

    if (urlErr || titleErr || descErr || kwErr) return;

    const keywords = formKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      await submitMutation.mutateAsync({
        ownerId: userEmail ?? "",
        url: sanitizeText(formUrl),
        title: sanitizeText(formTitle),
        description: sanitizeText(formDescription),
        keywords,
      });
      toast.success("Website submitted for review!");
      setFormUrl("");
      setFormTitle("");
      setFormDescription("");
      setFormKeywords("");
      setUrlError(null);
      setTitleError(null);
      setDescriptionError(null);
      setKeywordsError(null);
      setActiveTab("my-websites");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    }
  };

  const handleApplyForAdvertiser = async () => {
    if (!userEmail) {
      toast.error("No email found. Please log in again.");
      return;
    }
    try {
      await applyMutation.mutateAsync(userEmail);
      toast.success("Application submitted! Admin will review soon.");
      void refetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Application failed");
    }
  };

  const sidebarLinks: {
    id: SidebarTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "my-websites",
      label: "My Websites",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      id: "submit",
      label: "Submit Website",
      icon: <Plus className="h-4 w-4" />,
    },
    {
      id: "monetization",
      label: "Monetization",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      id: "account",
      label: "Account",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  // Derive advertiser status
  const isApproved =
    advertiserProfile && hasKey(advertiserProfile.status, "approved");
  const isPending =
    advertiserProfile && hasKey(advertiserProfile.status, "pending");
  const isRejected =
    advertiserProfile && hasKey(advertiserProfile.status, "rejected");

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link
            to="/"
            className="flex items-center gap-2"
            data-ocid="nav.home.link"
          >
            <Globe className="h-5 w-5 text-sidebar-primary" />
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              aflino
            </span>
          </Link>
        </div>
        <nav
          className="flex-1 p-3 flex flex-col gap-1"
          aria-label="Dashboard navigation"
        >
          {sidebarLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
              data-ocid={`dashboard.${item.id}.tab`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            onClick={() => {
              auth.logout();
              void navigate({ to: "/login" });
            }}
            className="flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground text-sm transition-colors w-full px-3 py-2"
            data-ocid="dashboard.logout.button"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* My Websites Tab */}
          {activeTab === "my-websites" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="font-display text-2xl font-bold">
                    My Websites
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Manage your submitted websites
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab("submit")}
                  className="gap-1.5"
                  data-ocid="dashboard.submit.primary_button"
                >
                  <Plus className="h-4 w-4" />
                  Submit Website
                </Button>
              </div>

              {/* Expired ownership warning banners */}
              {websites.some(
                (s) =>
                  hasKey(s.ownershipStatus as unknown, "expired") ||
                  hasKey(s.verificationStatus as unknown, "expired"),
              ) && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-1"
                  data-ocid="dashboard.websites.error_state"
                >
                  <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    Ownership expired
                  </div>
                  {websites
                    .filter(
                      (s) =>
                        hasKey(s.ownershipStatus as unknown, "expired") ||
                        hasKey(s.verificationStatus as unknown, "expired"),
                    )
                    .map((s) => (
                      <p
                        key={s.id.toString()}
                        className="text-xs text-red-600 ml-6"
                      >
                        <strong>{new URL(s.url).hostname}</strong> — Your
                        ownership has expired. Please re-verify to keep your
                        site active.
                      </p>
                    ))}
                </div>
              )}

              {isLoading ? (
                <div
                  className="flex items-center gap-2 py-8 text-muted-foreground"
                  data-ocid="dashboard.websites.loading_state"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Loading your websites…</span>
                </div>
              ) : websites.length === 0 ? (
                <div
                  className="rounded-xl border border-border p-12 text-center"
                  data-ocid="dashboard.websites.empty_state"
                >
                  <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium mb-1">No websites yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Submit your first website to get indexed
                  </p>
                  <Button
                    onClick={() => setActiveTab("submit")}
                    data-ocid="dashboard.submit.secondary_button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Submit Website
                  </Button>
                </div>
              ) : (
                <div
                  className="rounded-xl border border-border overflow-hidden"
                  data-ocid="dashboard.websites.table"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Website</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ownership</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {websites.map((site, i) => (
                        <TableRow
                          key={site.id.toString()}
                          data-ocid={`dashboard.website.item.${i + 1}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">
                                {site.title}
                              </p>
                              <a
                                href={site.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-link hover:underline inline-flex items-center gap-1"
                              >
                                {site.url.slice(0, 40)}
                                {site.url.length > 40 ? "…" : ""}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={site.status}
                              isSeed={site.isSeed}
                              showVerified={false}
                            />
                          </TableCell>
                          <TableCell>
                            <OwnershipBadge website={site} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <VerificationStatusBadge website={site} />
                              {hasKey(
                                site.verificationStatus as unknown,
                                "verified",
                              ) && (
                                <ExpiryBadge
                                  expiryNs={site.verificationExpiryAt}
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {(!site.isVerified ||
                              hasKey(
                                site.verificationStatus as unknown,
                                "expired",
                              )) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setVerifyingWebsite(site)}
                                data-ocid={`dashboard.verify.button.${i + 1}`}
                              >
                                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                {hasKey(
                                  site.verificationStatus as unknown,
                                  "expired",
                                )
                                  ? "Re-verify"
                                  : "Verify"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          )}

          {/* Submit Website Tab */}
          {activeTab === "submit" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold">
                  Submit Website
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Submit your website for inclusion in Aflino&apos;s index
                </p>
              </div>

              <div
                className="max-w-xl space-y-5 rounded-xl border border-border p-6"
                data-ocid="submit.form"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="url">Website URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={formUrl}
                    onChange={(e) => {
                      setFormUrl(e.target.value);
                      setUrlError(null);
                    }}
                    data-ocid="submit.url.input"
                  />
                  {urlError && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="submit.url.error_state"
                    >
                      {urlError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="My Awesome Website"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      setTitleError(null);
                    }}
                    data-ocid="submit.title.input"
                  />
                  {titleError && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="submit.title.error_state"
                    >
                      {titleError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your website in 1-3 sentences…"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => {
                      setFormDescription(e.target.value);
                      setDescriptionError(null);
                    }}
                    data-ocid="submit.description.textarea"
                  />
                  {descriptionError && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="submit.description.error_state"
                    >
                      {descriptionError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    placeholder="technology, tools, productivity (comma-separated)"
                    value={formKeywords}
                    onChange={(e) => {
                      setFormKeywords(e.target.value);
                      setKeywordsError(null);
                    }}
                    data-ocid="submit.keywords.input"
                  />
                  {keywordsError && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="submit.keywords.error_state"
                    >
                      {keywordsError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Separate multiple keywords with commas
                  </p>
                </div>

                <Button
                  onClick={() => void handleSubmit()}
                  disabled={submitMutation.isPending}
                  className="w-full h-10"
                  data-ocid="submit.form.submit_button"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Monetization Tab */}
          {activeTab === "monetization" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold">
                  Monetization
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Become an advertiser and promote your products on Aflino
                </p>
              </div>

              <div className="max-w-2xl space-y-4">
                {/* Advertiser Status Card */}
                <div
                  className="rounded-xl border border-border p-6 space-y-5"
                  data-ocid="monetization.panel"
                >
                  {profileLoading ? (
                    <div
                      className="flex items-center gap-2 py-2"
                      data-ocid="monetization.loading_state"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Loading status…
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Status row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Advertiser Status
                          </p>
                          {!advertiserProfile && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-muted text-muted-foreground border-border">
                              Not an Advertiser
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-100 text-amber-800 border-amber-200">
                              Pending Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                              ✓ Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Balance — only for approved */}
                      {isApproved && advertiserProfile && (
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                              Balance
                            </p>
                            <p className="text-2xl font-bold text-foreground">
                              ₹{advertiserProfile.balance.toString()}
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-primary opacity-20" />
                        </div>
                      )}

                      {/* Status-specific notes */}
                      {isPending && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Your application is under review. Admin will approve
                          or reject it soon.
                        </p>
                      )}
                      {isRejected && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          Your application was rejected. Contact support for
                          more information.
                        </p>
                      )}

                      {/* Apply button — only if no application yet */}
                      {!advertiserProfile && (
                        <Button
                          onClick={() => void handleApplyForAdvertiser()}
                          disabled={applyMutation.isPending}
                          className="w-full"
                          data-ocid="monetization.apply.primary_button"
                        >
                          {applyMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting…
                            </>
                          ) : (
                            <>
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Become Advertiser
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Campaign Management — only for approved advertisers */}
                {isApproved && userEmail && (
                  <div className="space-y-3">
                    <h2 className="font-semibold text-base">
                      Campaign Management
                    </h2>
                    <CampaignsSection email={userEmail} />
                  </div>
                )}

                {/* How it works */}
                {!isApproved && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                    <p className="font-medium mb-0.5">How it works</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700 mt-1">
                      <li>Apply to become an advertiser</li>
                      <li>Admin reviews and approves your application</li>
                      <li>Admin adds balance to your account</li>
                      <li>Create campaigns and reach users</li>
                    </ol>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-bold">Account</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your identity and role details
                </p>
              </div>

              <div
                className="rounded-xl border border-border p-6 max-w-lg space-y-4"
                data-ocid="account.panel"
              >
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Email
                  </p>
                  <p className="text-sm font-medium">{userEmail ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Role
                  </p>
                  <p className="text-sm font-medium">
                    {auth.role === "admin"
                      ? "Administrator"
                      : auth.role === "advertiser"
                        ? "Advertiser"
                        : role === "admin"
                          ? "Administrator"
                          : role === "user"
                            ? "Website Owner"
                            : "User"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    auth.logout();
                    void navigate({ to: "/login" });
                  }}
                  className="gap-1.5 text-destructive hover:text-destructive"
                  data-ocid="account.logout.button"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <VerificationDialog
        website={verifyingWebsite}
        onClose={() => setVerifyingWebsite(null)}
      />
    </div>
  );
}
