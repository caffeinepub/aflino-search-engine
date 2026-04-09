import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart2,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Compass,
  DollarSign,
  Edit2,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  AdvertiserProfile,
  Campaign,
  SeedEntry,
  Website,
} from "../backend.d";

import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
  useAddAdvertiserBalance,
  useAddBalance,
  useAddToBlacklist,
  useApproveAdvertiser,
  useApproveWebsite,
  useAssignRole,
  useCheckAndQueueRecrawl,
  useDeleteWebsite,
  useEditWebsite,
  useGetAdsEnabled,
  useGetAllAdvertiserApplications,
  useGetAllCampaigns,
  useGetAllWebsites,
  useGetBlacklist,
  useGetCrawlQueue,
  useGetFlaggedDomains,
  useGetSecurityLogs,
  useGetStats,
  useImportSeedData,
  usePauseCampaign,
  useRecalculateAllSpamScores,
  useRecalculateSpamScore,
  useRejectAdvertiser,
  useRejectWebsite,
  useRemoveFromBlacklist,
  useResumeCampaign,
  useReviewFlaggedDomain,
  useRunCrawler,
  useRunOwnershipCleanup,
  useSetAdminBoost,
  useSetAdsEnabled,
} from "../hooks/useQueries";
import {
  validateDescription,
  validateKeywords,
  validateTitle,
} from "../utils/security";

// ── Local type aliases ─────────────────────────────────────────────

type ReviewAction = { approve: null } | { block: null } | { remove: null };
type AdvertiserStatusVariant = AdvertiserProfile["status"];

// Helper: ICP runtime returns variant objects; cast for in-operator checks
function hasKey(obj: unknown, key: string): boolean {
  return typeof obj === "object" && obj !== null && key in obj;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminSection =
  | "dashboard"
  | "websites"
  | "discover"
  | "users"
  | "security"
  | "analytics"
  | "search-control"
  | "branding"
  | "notifications"
  | "monetization";

type SecuritySubTab = "logs" | "blacklist" | "flagged";
type DiscoverSubTab = "categories" | "featured" | "trending";

interface DiscoverCategory {
  id: string;
  label: string;
  emoji: string;
}

interface DiscoverFeatured {
  id: string;
  title: string;
  source: string;
  imageUrl: string;
  link: string;
}

interface KeywordPriority {
  keyword: string;
  priority: number;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  recipient: string;
  sentAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(tsBigint: bigint): string {
  const ms = Number(tsBigint) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(tsBigint: bigint): string {
  const ms = Number(tsBigint) / 1_000_000;
  return new Date(ms).toLocaleString();
}

function truncateUrl(url: string, max = 40): string {
  return url.length > max ? `${url.slice(0, max)}…` : url;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function logTypeBadgeClass(logType: string): string {
  switch (logType) {
    case "RATE_LIMIT_EXCEEDED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "SUSPICIOUS_INPUT":
    case "AUTH_FAILURE":
    case "ABUSE_DETECTED":
      return "bg-red-100 text-red-800 border-red-200";
    case "DOMAIN_BLACKLISTED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "AUTO_FLAGGED":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

// ── EditWebsiteDialog ─────────────────────────────────────────────────────────

function EditWebsiteDialog({
  website,
  onClose,
}: {
  website: Website | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(website?.title ?? "");
  const [description, setDescription] = useState(website?.description ?? "");
  const [keywords, setKeywords] = useState(website?.keywords.join(", ") ?? "");
  const editMutation = useEditWebsite();

  const handleSave = async () => {
    if (!website) return;
    const titleErr = validateTitle(title);
    const descErr = validateDescription(description);
    const kwErr = validateKeywords(keywords);
    if (titleErr) {
      toast.error(titleErr);
      return;
    }
    if (descErr) {
      toast.error(descErr);
      return;
    }
    if (kwErr) {
      toast.error(kwErr);
      return;
    }
    try {
      await editMutation.mutateAsync({
        id: website.id,
        title: title.trim(),
        description: description.trim(),
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      });
      toast.success("Website updated successfully");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <Dialog open={!!website} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="edit.dialog">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-ocid="edit.title.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-ocid="edit.description.textarea"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Keywords (comma-separated)</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              data-ocid="edit.keywords.input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="edit.cancel.button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={editMutation.isPending}
            data-ocid="edit.save.button"
          >
            {editMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── DashboardSection ──────────────────────────────────────────────────────────

function DashboardSection() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: allWebsites = [], isLoading: sitesLoading } =
    useGetAllWebsites();

  const sorted = [...allWebsites].sort(
    (a, b) => Number(b.submittedAt) - Number(a.submittedAt),
  );
  const latestPending = sorted
    .filter((s) => hasKey(s.status, "pending"))
    .slice(0, 3);
  const recentApproved = sorted
    .filter((s) => hasKey(s.status, "approved"))
    .slice(0, 3);

  const statCards = [
    {
      label: "Total Websites",
      value: statsLoading ? "—" : (stats?.total.toString() ?? "0"),
      icon: Globe,
      color: "text-primary",
      bg: "bg-primary/10",
      ocid: "admin.dashboard.total_websites",
    },
    {
      label: "Pending Approvals",
      value: statsLoading ? "—" : (stats?.pending.toString() ?? "0"),
      icon: AlertCircle,
      color:
        Number(stats?.pending ?? 0) > 0
          ? "text-amber-600"
          : "text-muted-foreground",
      bg: Number(stats?.pending ?? 0) > 0 ? "bg-amber-100" : "bg-muted",
      ocid: "admin.dashboard.pending_approvals",
    },
    {
      label: "Total Searches",
      value: "12,450",
      icon: Search,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      ocid: "admin.dashboard.total_searches",
    },
    {
      label: "Active Users",
      value: "248",
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-100",
      ocid: "admin.dashboard.active_users",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your Aflino Search Engine
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card shadow-xs p-5"
            data-ocid={card.ocid}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {card.label}
                </p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Submissions */}
        <div className="rounded-xl border border-border bg-card shadow-xs p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            Latest Submissions
          </h2>
          {sitesLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : latestPending.length === 0 ? (
            <div
              className="py-6 text-center"
              data-ocid="dashboard.pending.empty_state"
            >
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No pending submissions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestPending.map((site, i) => (
                <div
                  key={site.id.toString()}
                  className="flex items-start gap-3"
                  data-ocid={`dashboard.pending.item.${i + 1}`}
                >
                  <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{site.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {extractDomain(site.url)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(site.submittedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Approvals */}
        <div className="rounded-xl border border-border bg-card shadow-xs p-5">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Recent Approvals
          </h2>
          {sitesLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : recentApproved.length === 0 ? (
            <div
              className="py-6 text-center"
              data-ocid="dashboard.approved.empty_state"
            >
              <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No approved websites yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApproved.map((site, i) => (
                <div
                  key={site.id.toString()}
                  className="flex items-start gap-3"
                  data-ocid={`dashboard.approved.item.${i + 1}`}
                >
                  <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{site.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {extractDomain(site.url)}
                    </p>
                  </div>
                  <StatusBadge
                    status={site.status}
                    showSeed={false}
                    showVerified={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── WebsitesSection ───────────────────────────────────────────────────────────

function WebsitesSection() {
  const { data: allWebsites = [], isLoading: allLoading } = useGetAllWebsites();
  const approveMutation = useApproveWebsite();
  const rejectMutation = useRejectWebsite();
  const deleteMutation = useDeleteWebsite();
  const importMutation = useImportSeedData();
  const cleanupMutation = useRunOwnershipCleanup();
  const crawlerMutation = useRunCrawler();
  const recrawlMutation = useCheckAndQueueRecrawl();
  const recalcSpamMutation = useRecalculateSpamScore();
  const recalcAllSpamMutation = useRecalculateAllSpamScores();
  const { data: crawlQueue = [] } = useGetCrawlQueue();

  const handleRecalcAllSpam = async () => {
    try {
      const count = await recalcAllSpamMutation.mutateAsync();
      toast.success(
        `Spam scores recalculated for ${count.toString()} websites.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recalculation failed");
    }
  };

  const handleRecalcSpam = async (id: bigint) => {
    try {
      const score = await recalcSpamMutation.mutateAsync(id);
      toast.success(`Spam score updated: ${score.toString()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recalculation failed");
    }
  };

  const handleRunCrawler = async () => {
    if (
      !confirm(
        `Run crawler on ${crawlQueue.length} queued site(s)? This will fetch each site via HTTP outcall and update the search index.`,
      )
    )
      return;
    try {
      const count = await crawlerMutation.mutateAsync();
      toast.success(
        `Crawler complete. ${count.toString()} site(s) successfully indexed.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Crawler failed");
    }
  };

  const handleCheckRecrawl = async () => {
    try {
      const count = await recrawlMutation.mutateAsync();
      toast.success(
        `${count.toString()} site(s) queued for re-crawl based on smart scheduling.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-crawl check failed");
    }
  };

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [spamFilter, setSpamFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedJson, setSeedJson] = useState("");
  const [seedError, setSeedError] = useState("");

  const handleOwnershipCleanup = async () => {
    if (
      !confirm(
        "This will mark all websites with expired verification (>90 days) as expired. Continue?",
      )
    )
      return;
    try {
      const count = await cleanupMutation.mutateAsync();
      toast.success(
        `Cleanup complete. ${count.toString()} sites marked as expired.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cleanup failed");
    }
  };

  const filtered = allWebsites
    .filter((s) => {
      if (statusFilter === "pending" && !hasKey(s.status, "pending"))
        return false;
      if (statusFilter === "approved" && !hasKey(s.status, "approved"))
        return false;
      if (statusFilter === "rejected" && !hasKey(s.status, "rejected"))
        return false;
      const spam = Number(s.spamScore ?? 0);
      if (spamFilter === "low" && spam > 30) return false;
      if (spamFilter === "medium" && (spam < 31 || spam > 70)) return false;
      if (spamFilter === "high" && spam <= 70) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) || s.url.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => Number(b.submittedAt) - Number(a.submittedAt));

  const handleApprove = async (id: bigint) => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Website approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleReject = async (id: bigint) => {
    try {
      await rejectMutation.mutateAsync(id);
      toast.success("Website rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this website permanently?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Website deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const setBoostMutation = useSetAdminBoost();
  const handleBoost = async (id: bigint) => {
    const score = prompt("Enter admin boost (0-500):");
    if (score === null) return;
    const n = Number.parseInt(score, 10);
    if (Number.isNaN(n) || n < 0 || n > 500) {
      toast.error("Enter a number 0-500");
      return;
    }
    try {
      await setBoostMutation.mutateAsync({ id, boost: BigInt(n) });
      toast.success(`Admin boost set to ${n}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set boost");
    }
  };

  const handleSeedImport = async () => {
    setSeedError("");
    try {
      const parsed: unknown = JSON.parse(seedJson);
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");
      const entries: SeedEntry[] = (parsed as Record<string, unknown>[]).map(
        (e) => ({
          url: String(e.url ?? ""),
          title: String(e.title ?? ""),
          description: String(e.description ?? ""),
          keywords: Array.isArray(e.keywords)
            ? (e.keywords as unknown[]).map(String)
            : String(e.keywords ?? "")
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
        }),
      );
      const count = await importMutation.mutateAsync(entries);
      toast.success(`Imported ${count.toString()} entries`);
      setSeedJson("");
      setSeedOpen(false);
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const statusTabs: { value: typeof statusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Websites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all submitted and indexed websites. Duplicate domains are
            automatically blocked by the backend.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleCheckRecrawl()}
              disabled={recrawlMutation.isPending}
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              title="Checks all approved websites and queues those due for re-crawl based on smart scheduling (New=6h, Active=24h, Low Activity=7 days)"
            >
              {recrawlMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Check &amp; Queue Re-crawl
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleRunCrawler()}
              disabled={crawlerMutation.isPending || crawlQueue.length === 0}
              className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
              data-ocid="websites.crawler.button"
            >
              {crawlerMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Crawling…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Run Crawler
                  {crawlQueue.length > 0 ? ` (${crawlQueue.length})` : ""}
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleRecalcAllSpam()}
              disabled={recalcAllSpamMutation.isPending}
              className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
              title="Recalculate spam scores for all websites"
              data-ocid="websites.recalc_spam.button"
            >
              {recalcAllSpamMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recalculating…
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  Recalc All Spam
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleOwnershipCleanup()}
              disabled={cleanupMutation.isPending}
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
              data-ocid="websites.cleanup.button"
            >
              {cleanupMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Run Ownership Cleanup
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground max-w-[300px] text-right">
            Smart scheduling: New=6h (🔴100), Active=24h (🟡70), Low=7d (🟢30).
            {crawlQueue.length > 0 && ` Queue: ${crawlQueue.length} site(s).`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 border border-border rounded-lg p-1 bg-muted/30">
            {statusTabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setStatusFilter(t.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === t.value
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid={`websites.filter.${t.value}.tab`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search by domain or title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
            data-ocid="websites.search_input"
          />
        </div>
        {/* Spam Score Filter */}
        <div className="flex gap-1 border border-border rounded-lg p-1 bg-muted/30 w-fit">
          {(["all", "low", "medium", "high"] as const).map((val) => {
            const labels = {
              all: "All Spam",
              low: "Low (0–30)",
              medium: "Med (31–70)",
              high: "High (71–100)",
            };
            const colors = {
              all: "",
              low: "text-green-700",
              medium: "text-yellow-700",
              high: "text-red-700",
            };
            return (
              <button
                key={val}
                type="button"
                onClick={() => setSpamFilter(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  spamFilter === val
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : `text-muted-foreground hover:text-foreground ${colors[val]}`
                }`}
                data-ocid={`websites.spam_filter.${val}.tab`}
              >
                {labels[val]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {allLoading ? (
        <div
          className="flex items-center gap-2 py-12 justify-center text-muted-foreground"
          data-ocid="websites.loading_state"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading websites…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border border-border p-12 text-center"
          data-ocid="websites.empty_state"
        >
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No websites found</p>
          <p className="text-sm text-muted-foreground">
            Try a different filter or import seed data
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border border-border overflow-hidden"
          data-ocid="websites.table"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>URL</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Spam</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((site, i) => (
                <TableRow
                  key={site.id.toString()}
                  data-ocid={`websites.item.${i + 1}`}
                >
                  <TableCell className="max-w-[160px]">
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono"
                      title={site.url}
                    >
                      {truncateUrl(extractDomain(site.url), 28)}
                    </a>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium truncate max-w-[140px]">
                      {site.title}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={site.status}
                      isSeed={site.isSeed}
                      showVerified={false}
                    />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const score = Number(site.spamScore ?? 0);
                      const cls =
                        score > 70
                          ? "bg-red-100 text-red-700 border-red-200"
                          : score > 30
                            ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                            : "bg-green-100 text-green-700 border-green-200";
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
                        >
                          {score}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(site.submittedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasKey(site.status, "pending") && (
                        <>
                          <button
                            type="button"
                            title="Approve"
                            onClick={() => void handleApprove(site.id)}
                            disabled={approveMutation.isPending}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-green-600 hover:bg-green-100 transition-colors"
                            data-ocid={`websites.approve.button.${i + 1}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Reject"
                            onClick={() => void handleReject(site.id)}
                            disabled={rejectMutation.isPending}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                            data-ocid={`websites.reject.button.${i + 1}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => setEditingWebsite(site)}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        data-ocid={`websites.edit.button.${i + 1}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Admin Boost: ${Number(site.adminBoost ?? 0)} (click to change)`}
                        onClick={() => void handleBoost(site.id)}
                        className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${Number(site.adminBoost ?? 0) > 0 ? "text-amber-600 bg-amber-50 hover:bg-amber-100" : "text-muted-foreground hover:text-amber-600 hover:bg-amber-100"}`}
                        data-ocid={`websites.boost.button.${i + 1}`}
                      >
                        <Rocket className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={`Spam Score: ${Number(site.spamScore ?? 0)} — click to recalculate`}
                        onClick={() => void handleRecalcSpam(site.id)}
                        disabled={recalcSpamMutation.isPending}
                        className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                          Number(site.spamScore ?? 0) > 70
                            ? "text-red-600 bg-red-50 hover:bg-red-100"
                            : Number(site.spamScore ?? 0) > 30
                              ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100"
                              : "text-green-600 hover:bg-green-50"
                        }`}
                        data-ocid={`websites.recalc_spam.button.${i + 1}`}
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => void handleDelete(site.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        data-ocid={`websites.delete.button.${i + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Seed Import Collapsible */}
      <Collapsible open={seedOpen} onOpenChange={setSeedOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="websites.seed_import.toggle"
          >
            {seedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Import Seed Data
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 rounded-xl border border-border p-5 space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste a JSON array of seed entries with fields: url, title,
              description, keywords[]
            </p>
            <Textarea
              rows={6}
              placeholder='[{"url":"https://example.com","title":"Example","description":"...","keywords":["example"]}]'
              value={seedJson}
              onChange={(e) => {
                setSeedJson(e.target.value);
                setSeedError("");
              }}
              className="font-mono text-xs"
              data-ocid="websites.seed_import.textarea"
            />
            {seedError && (
              <p
                className="text-xs text-destructive"
                data-ocid="websites.seed_import.error_state"
              >
                {seedError}
              </p>
            )}
            <Button
              size="sm"
              onClick={() => void handleSeedImport()}
              disabled={importMutation.isPending || !seedJson.trim()}
              data-ocid="websites.seed_import.submit_button"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <EditWebsiteDialog
        website={editingWebsite}
        onClose={() => setEditingWebsite(null)}
      />
    </motion.div>
  );
}

// ── DiscoverSection ───────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: DiscoverCategory[] = [
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "news", label: "News", emoji: "📰" },
  { id: "tools", label: "Tools", emoji: "🔧" },
];

const DEFAULT_TRENDING = [
  "AI tools 2026",
  "Best privacy browsers",
  "Free design resources",
  "How to build a website",
  "Open source software",
];

function useDiscoverStore<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = (newVal: T) => {
    setValue(newVal);
    localStorage.setItem(key, JSON.stringify(newVal));
  };

  return [value, set] as const;
}

function DiscoverSection() {
  const [subTab, setSubTab] = useState<DiscoverSubTab>("categories");
  const [categories, setCategories] = useDiscoverStore<DiscoverCategory[]>(
    "aflino_discover_categories",
    DEFAULT_CATEGORIES,
  );
  const [featured, setFeatured] = useDiscoverStore<DiscoverFeatured[]>(
    "aflino_discover_featured",
    [],
  );
  const [trending, setTrending] = useDiscoverStore<string[]>(
    "aflino_discover_trending",
    DEFAULT_TRENDING,
  );

  // Categories state
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("📌");
  const [editingCat, setEditingCat] = useState<DiscoverCategory | null>(null);

  // Featured state
  const [newFeatTitle, setNewFeatTitle] = useState("");
  const [newFeatSource, setNewFeatSource] = useState("");
  const [newFeatImage, setNewFeatImage] = useState("");
  const [newFeatLink, setNewFeatLink] = useState("");

  // Trending state
  const [newTrend, setNewTrend] = useState("");

  const addCategory = () => {
    if (!newCatLabel.trim()) {
      toast.error("Label required");
      return;
    }
    const cat: DiscoverCategory = {
      id: Date.now().toString(),
      label: newCatLabel.trim(),
      emoji: newCatEmoji,
    };
    setCategories([...categories, cat]);
    setNewCatLabel("");
    setNewCatEmoji("📌");
    toast.success("Category added");
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
  };

  const saveEditCat = () => {
    if (!editingCat) return;
    setCategories(
      categories.map((c) => (c.id === editingCat.id ? editingCat : c)),
    );
    setEditingCat(null);
    toast.success("Category updated");
  };

  const addFeatured = () => {
    if (!newFeatTitle.trim() || !newFeatLink.trim()) {
      toast.error("Title and link required");
      return;
    }
    const item: DiscoverFeatured = {
      id: Date.now().toString(),
      title: newFeatTitle.trim(),
      source: newFeatSource.trim() || "Unknown",
      imageUrl: newFeatImage.trim(),
      link: newFeatLink.trim(),
    };
    setFeatured([...featured, item]);
    setNewFeatTitle("");
    setNewFeatSource("");
    setNewFeatImage("");
    setNewFeatLink("");
    toast.success("Featured card added");
  };

  const deleteFeatured = (id: string) => {
    setFeatured(featured.filter((f) => f.id !== id));
  };

  const addTrending = () => {
    if (!newTrend.trim()) return;
    if (trending.includes(newTrend.trim())) {
      toast.error("Already in trending");
      return;
    }
    setTrending([...trending, newTrend.trim()]);
    setNewTrend("");
  };

  const moveTrending = (index: number, dir: -1 | 1) => {
    const arr = [...trending];
    const swap = index + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    setTrending(arr);
  };

  const subTabs: { id: DiscoverSubTab; label: string }[] = [
    { id: "categories", label: "Categories" },
    { id: "featured", label: "Featured Content" },
    { id: "trending", label: "Trending Searches" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Discover Control</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage homepage discover content (stored locally)
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              subTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-ocid={`discover.${t.id}.tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Categories */}
      {subTab === "categories" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 text-sm"
                data-ocid="discover.category.item.1"
              >
                <span>{cat.emoji}</span>
                <span className="font-medium">{cat.label}</span>
                <button
                  type="button"
                  onClick={() => setEditingCat({ ...cat })}
                  className="text-muted-foreground hover:text-foreground"
                  data-ocid="discover.category.edit_button"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id)}
                  className="text-muted-foreground hover:text-destructive"
                  data-ocid="discover.category.delete_button"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <p
                className="text-sm text-muted-foreground"
                data-ocid="discover.categories.empty_state"
              >
                No categories yet
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border p-4 space-y-3 max-w-sm">
            <p className="text-sm font-medium">Add Category</p>
            <div className="flex gap-2">
              <Input
                placeholder="Emoji"
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                className="w-20"
                data-ocid="discover.category.emoji.input"
              />
              <Input
                placeholder="Label"
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                data-ocid="discover.category.label.input"
              />
            </div>
            <Button
              size="sm"
              onClick={addCategory}
              className="gap-1.5"
              data-ocid="discover.category.add_button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Category
            </Button>
          </div>
        </div>
      )}

      {/* Edit Category Dialog */}
      <Dialog
        open={!!editingCat}
        onOpenChange={(o) => !o && setEditingCat(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="discover.category.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="space-y-1">
                <Label>Emoji</Label>
                <Input
                  value={editingCat?.emoji ?? ""}
                  onChange={(e) =>
                    setEditingCat(
                      editingCat
                        ? { ...editingCat, emoji: e.target.value }
                        : null,
                    )
                  }
                  className="w-20"
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label>Label</Label>
                <Input
                  value={editingCat?.label ?? ""}
                  onChange={(e) =>
                    setEditingCat(
                      editingCat
                        ? { ...editingCat, label: e.target.value }
                        : null,
                    )
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCat(null)}
              data-ocid="discover.category.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveEditCat}
              data-ocid="discover.category.edit.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Featured Content */}
      {subTab === "featured" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((item, i) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
                data-ocid={`discover.featured.item.${i + 1}`}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                {!item.imageUrl && (
                  <div className="w-full h-32 bg-muted flex items-center justify-center">
                    <Compass className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.source}</p>
                  <div className="flex items-center justify-between mt-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteFeatured(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                      data-ocid={`discover.featured.delete_button.${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {featured.length === 0 && (
              <div
                className="col-span-3 rounded-xl border border-border p-10 text-center"
                data-ocid="discover.featured.empty_state"
              >
                <Compass className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No featured cards yet
                </p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border p-5 space-y-3 max-w-md">
            <p className="text-sm font-medium">Add Featured Card</p>
            <Input
              placeholder="Title"
              value={newFeatTitle}
              onChange={(e) => setNewFeatTitle(e.target.value)}
              data-ocid="discover.featured.title.input"
            />
            <Input
              placeholder="Source (e.g. TechCrunch)"
              value={newFeatSource}
              onChange={(e) => setNewFeatSource(e.target.value)}
              data-ocid="discover.featured.source.input"
            />
            <Input
              placeholder="Image URL (optional)"
              value={newFeatImage}
              onChange={(e) => setNewFeatImage(e.target.value)}
              data-ocid="discover.featured.image.input"
            />
            <Input
              placeholder="Link URL"
              value={newFeatLink}
              onChange={(e) => setNewFeatLink(e.target.value)}
              data-ocid="discover.featured.link.input"
            />
            <Button
              size="sm"
              onClick={addFeatured}
              className="gap-1.5"
              data-ocid="discover.featured.add_button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Card
            </Button>
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {subTab === "trending" && (
        <div className="space-y-4">
          <div
            className="rounded-xl border border-border overflow-hidden max-w-lg"
            data-ocid="discover.trending.list"
          >
            {trending.map((term, i) => (
              <div
                key={term}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                data-ocid={`discover.trending.item.${i + 1}`}
              >
                <span className="text-xs text-muted-foreground font-mono w-5 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm">{term}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveTrending(i, -1)}
                    disabled={i === 0}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTrending(i, 1)}
                    disabled={i === trending.length - 1}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTrending(trending.filter((_, j) => j !== i))
                    }
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                    data-ocid={`discover.trending.delete_button.${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {trending.length === 0 && (
              <div
                className="p-8 text-center"
                data-ocid="discover.trending.empty_state"
              >
                <p className="text-sm text-muted-foreground">
                  No trending searches
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input
              placeholder="Add trending search…"
              value={newTrend}
              onChange={(e) => setNewTrend(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTrending();
              }}
              data-ocid="discover.trending.input"
            />
            <Button
              size="sm"
              onClick={addTrending}
              data-ocid="discover.trending.add_button"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── UsersSection ──────────────────────────────────────────────────────────────

const MOCK_USERS = [
  {
    id: "user-001",
    email: "alice@example.com",
    role: "User",
    status: "Active",
  },
  { id: "user-002", email: "bob@example.com", role: "User", status: "Active" },
  {
    id: "user-003",
    email: "carol@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: "user-004",
    email: "dave@example.com",
    role: "User",
    status: "Blocked",
  },
  { id: "user-005", email: "eve@example.com", role: "User", status: "Active" },
];

function UsersSection() {
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.status])),
  );
  const [principalInput, setPrincipalInput] = useState("");
  const [roleInput, setRoleInput] = useState<"admin" | "user" | "guest">(
    "user",
  );
  const assignRoleMutation = useAssignRole();

  const toggleBlock = (id: string) => {
    setUserStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "Blocked" ? "Active" : "Blocked",
    }));
    toast.success(
      userStatuses[id] === "Blocked" ? "User unblocked" : "User blocked",
    );
  };

  const handleAssignRole = async () => {
    if (!principalInput.trim()) {
      toast.error("Principal ID required");
      return;
    }
    try {
      await assignRoleMutation.mutateAsync({
        principal: principalInput.trim(),
        role: roleInput,
      });
      toast.success(`Role assigned: ${roleInput}`);
      setPrincipalInput("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Role assignment failed",
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage user roles and access
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        User listing API coming soon. This is a preview of the user management
        interface.
      </div>

      <div
        className="rounded-xl border border-border overflow-hidden"
        data-ocid="users.table"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_USERS.map((user, i) => (
              <TableRow key={user.id} data-ocid={`users.item.${i + 1}`}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {user.id}
                </TableCell>
                <TableCell className="text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      user.role === "Admin"
                        ? "bg-primary/10 text-primary border-primary/30 text-xs"
                        : "text-xs"
                    }
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      userStatuses[user.id] === "Active"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {userStatuses[user.id]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleBlock(user.id)}
                      className="h-7 text-xs"
                      data-ocid={`users.toggle.button.${i + 1}`}
                    >
                      {userStatuses[user.id] === "Blocked"
                        ? "Unblock"
                        : "Block"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toast.info("Activity log coming soon")}
                      className="h-7 text-xs text-muted-foreground"
                      data-ocid={`users.activity.button.${i + 1}`}
                    >
                      Activity
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        toast.info(
                          "Role assignment: use Settings > Assign Role with their Principal ID",
                        )
                      }
                      className="h-7 text-xs text-muted-foreground"
                      data-ocid={`users.promote.button.${i + 1}`}
                    >
                      Promote
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Role Assignment */}
      <Separator />
      <div className="rounded-xl border border-border p-5 space-y-4 max-w-md">
        <div>
          <h2 className="font-semibold text-sm">Assign Role by Principal ID</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign roles to users by their Principal ID
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="principal-input">Principal ID</Label>
          <Input
            id="principal-input"
            placeholder="aaaaa-aa…"
            value={principalInput}
            onChange={(e) => setPrincipalInput(e.target.value)}
            className="font-mono text-sm"
            data-ocid="users.assign_role.input"
          />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <div className="flex gap-2">
            {(["admin", "user", "guest"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleInput(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  roleInput === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                data-ocid={`users.role.${r}.toggle`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => void handleAssignRole()}
          disabled={assignRoleMutation.isPending || !principalInput.trim()}
          data-ocid="users.assign_role.submit_button"
        >
          {assignRoleMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Assigning…
            </>
          ) : (
            "Assign Role"
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ── SecuritySection ───────────────────────────────────────────────────────────

function SecuritySection() {
  const [subTab, setSubTab] = useState<SecuritySubTab>("logs");
  const [newDomain, setNewDomain] = useState("");
  const [newReason, setNewReason] = useState("");

  const { data: logs = [], isLoading: logsLoading } = useGetSecurityLogs();
  const { data: blacklist = [], isLoading: blacklistLoading } =
    useGetBlacklist();
  const { data: flagged = [], isLoading: flaggedLoading } =
    useGetFlaggedDomains();

  const addToBlacklistMutation = useAddToBlacklist();
  const removeFromBlacklistMutation = useRemoveFromBlacklist();
  const reviewFlaggedMutation = useReviewFlaggedDomain();

  const handleAddToBlacklist = async () => {
    if (!newDomain.trim()) {
      toast.error("Domain is required");
      return;
    }
    if (!newReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    try {
      await addToBlacklistMutation.mutateAsync({
        domain: newDomain.trim(),
        reason: newReason.trim(),
      });
      toast.success("Domain added to blacklist");
      setNewDomain("");
      setNewReason("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to blacklist domain",
      );
    }
  };

  const handleRemoveFromBlacklist = async (domain: string) => {
    try {
      await removeFromBlacklistMutation.mutateAsync(domain);
      toast.success("Domain removed from blacklist");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove domain",
      );
    }
  };

  const handleReview = async (domain: string, action: ReviewAction) => {
    try {
      await reviewFlaggedMutation.mutateAsync({ domain, action });
      const label = hasKey(action, "approve")
        ? "Approved"
        : hasKey(action, "block")
          ? "Blocked"
          : "Removed";
      toast.success(`${label} successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review action failed");
    }
  };

  const subTabs: { id: SecuritySubTab; label: string }[] = [
    { id: "logs", label: "Security Logs" },
    { id: "blacklist", label: "Blacklist" },
    { id: "flagged", label: "Flagged Domains" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Monitor threats, manage blacklist, and review flagged domains
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              subTab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-ocid={`security.${t.id}.tab`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "logs" && (
        <div>
          {logsLoading ? (
            <div
              className="flex items-center gap-2 py-8 text-muted-foreground"
              data-ocid="security.logs.loading_state"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Loading logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div
              className="rounded-xl border border-border p-12 text-center"
              data-ocid="security.logs.empty_state"
            >
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No security events</p>
              <p className="text-sm text-muted-foreground">
                All clear — no suspicious activity detected
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl border border-border overflow-hidden"
              data-ocid="security.logs.table"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow
                      key={log.id.toString()}
                      data-ocid={`security.log.item.${i + 1}`}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${logTypeBadgeClass(log.logType)}`}
                        >
                          {log.logType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono">
                          {log.principalText.slice(0, 12)}…
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {subTab === "blacklist" && (
        <div className="space-y-6">
          {blacklistLoading ? (
            <div
              className="flex items-center gap-2 py-8 text-muted-foreground"
              data-ocid="security.blacklist.loading_state"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Loading blacklist…</span>
            </div>
          ) : blacklist.length === 0 ? (
            <div
              className="rounded-xl border border-border p-8 text-center"
              data-ocid="security.blacklist.empty_state"
            >
              <p className="text-sm text-muted-foreground">
                No domains on the blacklist
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl border border-border overflow-hidden"
              data-ocid="security.blacklist.table"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blacklist.map((entry, i) => (
                    <TableRow
                      key={entry.domain}
                      data-ocid={`security.blacklist.item.${i + 1}`}
                    >
                      <TableCell>
                        <code className="text-xs font-mono">
                          {entry.domain}
                        </code>
                      </TableCell>
                      <TableCell>
                        {hasKey(entry.status, "flagged") ? (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"
                          >
                            Flagged
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-200 text-xs"
                          >
                            Blocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {entry.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(
                          Number(entry.addedAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleRemoveFromBlacklist(entry.domain)
                          }
                          disabled={removeFromBlacklistMutation.isPending}
                          className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                          data-ocid={`security.blacklist.delete_button.${i + 1}`}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="rounded-xl border border-border p-5 space-y-3 max-w-md">
            <p className="text-sm font-semibold">Add to Blacklist</p>
            <Input
              placeholder="Domain (e.g. spam.example.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              data-ocid="security.blacklist.domain.input"
            />
            <Input
              placeholder="Reason"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              data-ocid="security.blacklist.reason.input"
            />
            <Button
              size="sm"
              onClick={() => void handleAddToBlacklist()}
              disabled={addToBlacklistMutation.isPending}
              data-ocid="security.blacklist.submit_button"
            >
              {addToBlacklistMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Block Domain
            </Button>
          </div>
        </div>
      )}

      {subTab === "flagged" && (
        <div>
          {flaggedLoading ? (
            <div
              className="flex items-center gap-2 py-8 text-muted-foreground"
              data-ocid="security.flagged.loading_state"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Loading flagged domains…</span>
            </div>
          ) : flagged.length === 0 ? (
            <div
              className="rounded-xl border border-border p-12 text-center"
              data-ocid="security.flagged.empty_state"
            >
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="font-medium">No flagged domains</p>
              <p className="text-sm text-muted-foreground">
                No domains are awaiting review
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl border border-border overflow-hidden"
              data-ocid="security.flagged.table"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Domain</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagged.map((entry, i) => (
                    <TableRow
                      key={entry.domain}
                      data-ocid={`security.flagged.item.${i + 1}`}
                    >
                      <TableCell>
                        <code className="text-xs font-mono">
                          {entry.domain}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {entry.reason}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(
                          Number(entry.addedAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              void handleReview(entry.domain, { approve: null })
                            }
                            disabled={reviewFlaggedMutation.isPending}
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                            data-ocid={`security.flagged.confirm_button.${i + 1}`}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void handleReview(entry.domain, { block: null })
                            }
                            disabled={reviewFlaggedMutation.isPending}
                            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            data-ocid={`security.flagged.delete_button.${i + 1}`}
                          >
                            Block
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void handleReview(entry.domain, { remove: null })
                            }
                            disabled={reviewFlaggedMutation.isPending}
                            className="h-7 text-xs text-muted-foreground"
                            data-ocid={`security.flagged.cancel_button.${i + 1}`}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── AnalyticsSection ──────────────────────────────────────────────────────────

const WEEKLY_DATA = [320, 480, 390, 720, 650, 410, 510];
const WEEKLY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TOP_KEYWORDS = [
  "AI tools",
  "privacy browser",
  "free resources",
  "web design",
  "open source",
];

function TrafficChart() {
  const maxVal = Math.max(...WEEKLY_DATA);
  const svgH = 120;
  const barW = 32;
  const gap = 16;
  const totalW = WEEKLY_DATA.length * (barW + gap) - gap;
  const labelH = 20;
  const chartH = svgH - labelH;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW} ${svgH}`}
      preserveAspectRatio="xMidYMid meet"
      className="overflow-visible"
      role="img"
      aria-label="Weekly traffic bar chart"
    >
      <title>Weekly traffic bar chart</title>
      {WEEKLY_DATA.map((val, i) => {
        const barH = (val / maxVal) * (chartH - 8);
        const x = i * (barW + gap);
        const y = chartH - barH;
        return (
          <g key={WEEKLY_LABELS[i]}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill="#006AFF"
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={svgH}
              textAnchor="middle"
              fontSize={9}
              fill="#6B7280"
            >
              {WEEKLY_LABELS[i]}
            </text>
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize={8}
              fill="#374151"
            >
              {val}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AnalyticsSection() {
  const { data: stats } = useGetStats();
  const { data: allWebsites = [] } = useGetAllWebsites();

  const topSites = allWebsites
    .filter((s) => hasKey(s.status, "approved"))
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Traffic insights and search performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="rounded-xl border border-border bg-card p-5 shadow-xs"
          data-ocid="analytics.total_searches.card"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Total Searches Today
          </p>
          <p className="text-3xl font-bold text-primary mt-1">1,247</p>
        </div>
        <div
          className="rounded-xl border border-border bg-card p-5 shadow-xs"
          data-ocid="analytics.indexed_sites.card"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Indexed Sites
          </p>
          <p className="text-3xl font-bold mt-1">
            {stats?.approved.toString() ?? "—"}
          </p>
        </div>
        <div
          className="rounded-xl border border-border bg-card p-5 shadow-xs"
          data-ocid="analytics.weekly_searches.card"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Searches This Week
          </p>
          <p className="text-3xl font-bold mt-1">8,920</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <div
          className="rounded-xl border border-border bg-card p-5 shadow-xs"
          data-ocid="analytics.traffic.chart"
        >
          <h2 className="font-semibold text-sm mb-4">Traffic This Week</h2>
          <TrafficChart />
        </div>

        {/* Top Keywords */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="font-semibold text-sm mb-4">Top Searched Keywords</h2>
          <div className="space-y-2">
            {TOP_KEYWORDS.map((kw, i) => {
              const pct = Math.round(100 - i * 15);
              return (
                <div key={kw} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{kw}</span>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Clicked Sites */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
          <h2 className="font-semibold text-sm mb-4">Most Clicked Sites</h2>
          {topSites.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-ocid="analytics.sites.empty_state"
            >
              No approved sites yet
            </p>
          ) : (
            <div className="space-y-2">
              {topSites.map((site, i) => (
                <div
                  key={site.id.toString()}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{site.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {extractDomain(site.url)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(500 - i * 80)} clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── SearchControlSection ──────────────────────────────────────────────────────

function SearchControlSection() {
  const { data: allWebsites = [] } = useGetAllWebsites();
  const setBoostMutation = useSetAdminBoost();

  const [boostMap, setBoostMap] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("aflino_boost_map") ?? "{}",
      ) as Record<string, number>;
    } catch {
      return {};
    }
  });
  const [keywordPriorities, setKeywordPriorities] = useState<KeywordPriority[]>(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem("aflino_keyword_priority") ?? "[]",
        ) as KeywordPriority[];
      } catch {
        return [];
      }
    },
  );
  const [removedSites, setRemovedSites] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("aflino_removed_sites") ?? "[]",
      ) as string[];
    } catch {
      return [];
    }
  });

  const [boostId, setBoostId] = useState("");
  const [boostScore, setBoostScore] = useState("");
  const [newKw, setNewKw] = useState("");
  const [newKwPriority, setNewKwPriority] = useState("");
  const [removeId, setRemoveId] = useState("");

  const saveBoostMap = (map: Record<string, number>) => {
    setBoostMap(map);
    localStorage.setItem("aflino_boost_map", JSON.stringify(map));
  };
  const saveKeywords = (kws: KeywordPriority[]) => {
    setKeywordPriorities(kws);
    localStorage.setItem("aflino_keyword_priority", JSON.stringify(kws));
  };
  const saveRemovedSites = (ids: string[]) => {
    setRemovedSites(ids);
    localStorage.setItem("aflino_removed_sites", JSON.stringify(ids));
  };

  const addBoost = async () => {
    const n = Number.parseInt(boostScore, 10);
    if (!boostId.trim()) {
      toast.error("Website ID required");
      return;
    }
    if (Number.isNaN(n) || n < 0 || n > 500) {
      toast.error("Score must be 0-500");
      return;
    }
    try {
      await setBoostMutation.mutateAsync({
        id: BigInt(boostId.trim()),
        boost: BigInt(n),
      });
      saveBoostMap({ ...boostMap, [boostId.trim()]: n });
      setBoostId("");
      setBoostScore("");
      toast.success(`Admin boost set to ${n}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set boost");
    }
  };

  const removeBoost = (id: string) => {
    const m = { ...boostMap };
    delete m[id];
    saveBoostMap(m);
  };

  const addKeyword = () => {
    const n = Number.parseInt(newKwPriority, 10);
    if (!newKw.trim()) {
      toast.error("Keyword required");
      return;
    }
    if (Number.isNaN(n)) {
      toast.error("Priority must be a number");
      return;
    }
    saveKeywords([
      ...keywordPriorities,
      { keyword: newKw.trim(), priority: n },
    ]);
    setNewKw("");
    setNewKwPriority("");
    toast.success("Keyword priority added");
  };

  const removeKeyword = (kw: string) => {
    saveKeywords(keywordPriorities.filter((k) => k.keyword !== kw));
  };

  const addRemovedSite = () => {
    if (!removeId.trim()) {
      toast.error("Website ID required");
      return;
    }
    if (removedSites.includes(removeId.trim())) {
      toast.error("Already in removed list");
      return;
    }
    saveRemovedSites([...removedSites, removeId.trim()]);
    setRemoveId("");
    toast.success("Site marked as low-quality");
  };

  const boostedSites = allWebsites.filter(
    (s) => boostMap[s.id.toString()] !== undefined,
  );
  const removedWebsites = allWebsites.filter((s) =>
    removedSites.includes(s.id.toString()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Search Control</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manually control ranking, keyword priority, and result quality
        </p>
      </div>

      {/* A. Boosted Websites */}
      <div className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-amber-500" />
          Boosted Websites
        </h2>
        {boostedSites.length === 0 ? (
          <div
            className="rounded-xl border border-border p-8 text-center"
            data-ocid="search_control.boost.empty_state"
          >
            <Rocket className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No boosted websites yet
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-border overflow-hidden"
            data-ocid="search_control.boost.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Website</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Boost Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boostedSites.map((site, i) => (
                  <TableRow
                    key={site.id.toString()}
                    data-ocid={`search_control.boost.item.${i + 1}`}
                  >
                    <TableCell className="font-medium text-sm">
                      {site.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {extractDomain(site.url)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                        {boostMap[site.id.toString()]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBoost(site.id.toString())}
                        className="h-7 text-xs text-destructive"
                        data-ocid={`search_control.boost.delete_button.${i + 1}`}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="rounded-xl border border-border p-4 space-y-3 max-w-sm">
          <p className="text-xs font-medium text-muted-foreground">Add Boost</p>
          <Input
            placeholder="Website ID"
            value={boostId}
            onChange={(e) => setBoostId(e.target.value)}
            data-ocid="search_control.boost.id.input"
          />
          <Input
            placeholder="Boost score (1-100)"
            type="number"
            value={boostScore}
            onChange={(e) => setBoostScore(e.target.value)}
            data-ocid="search_control.boost.score.input"
          />
          <Button
            size="sm"
            onClick={addBoost}
            data-ocid="search_control.boost.add_button"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Boost
          </Button>
        </div>
      </div>

      <Separator />

      {/* B. Keyword Priority */}
      <div className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Keyword Priority
        </h2>
        {keywordPriorities.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-ocid="search_control.keyword.empty_state"
          >
            No keyword priorities set
          </p>
        ) : (
          <div
            className="rounded-xl border border-border overflow-hidden"
            data-ocid="search_control.keyword.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Keyword</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywordPriorities.map((kw, i) => (
                  <TableRow
                    key={kw.keyword}
                    data-ocid={`search_control.keyword.item.${i + 1}`}
                  >
                    <TableCell className="text-sm">{kw.keyword}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {kw.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeKeyword(kw.keyword)}
                        className="h-7 text-xs text-destructive"
                        data-ocid={`search_control.keyword.delete_button.${i + 1}`}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="rounded-xl border border-border p-4 space-y-3 max-w-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Add Keyword Priority
          </p>
          <Input
            placeholder="Keyword"
            value={newKw}
            onChange={(e) => setNewKw(e.target.value)}
            data-ocid="search_control.keyword.input"
          />
          <Input
            placeholder="Priority (number)"
            type="number"
            value={newKwPriority}
            onChange={(e) => setNewKwPriority(e.target.value)}
            data-ocid="search_control.keyword.priority.input"
          />
          <Button
            size="sm"
            onClick={addKeyword}
            data-ocid="search_control.keyword.add_button"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <Separator />

      {/* C. Low-Quality Removal */}
      <div className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          Low-Quality Removal
        </h2>
        {removedWebsites.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-ocid="search_control.removed.empty_state"
          >
            No sites marked as low-quality
          </p>
        ) : (
          <div
            className="rounded-xl border border-border overflow-hidden"
            data-ocid="search_control.removed.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Website</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {removedWebsites.map((site, i) => (
                  <TableRow
                    key={site.id.toString()}
                    data-ocid={`search_control.removed.item.${i + 1}`}
                  >
                    <TableCell className="text-sm">{site.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {extractDomain(site.url)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          saveRemovedSites(
                            removedSites.filter(
                              (id) => id !== site.id.toString(),
                            ),
                          )
                        }
                        className="h-7 text-xs"
                        data-ocid={`search_control.removed.delete_button.${i + 1}`}
                      >
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="rounded-xl border border-border p-4 space-y-3 max-w-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Mark as Low Quality
          </p>
          <Input
            placeholder="Website ID"
            value={removeId}
            onChange={(e) => setRemoveId(e.target.value)}
            data-ocid="search_control.removed.input"
          />
          <Button
            size="sm"
            onClick={addRemovedSite}
            variant="destructive"
            data-ocid="search_control.removed.add_button"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Mark Low Quality
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── BrandingSection ───────────────────────────────────────────────────────────

function BrandingSection() {
  const [headerLogoUrl, setHeaderLogoUrl] = useState(
    () => localStorage.getItem("aflino_header_logo_url") ?? "",
  );
  const [searchBarIconUrl, setSearchBarIconUrl] = useState(
    () => localStorage.getItem("aflino_searchbar_icon_url") ?? "",
  );
  const [adminLogoUrl, setAdminLogoUrl] = useState(
    () => localStorage.getItem("aflino_admin_logo_url") ?? "",
  );
  const [themeColor, setThemeColor] = useState(
    () => localStorage.getItem("aflino_theme_color") ?? "#006AFF",
  );

  const handleSave = () => {
    localStorage.setItem("aflino_header_logo_url", headerLogoUrl.trim());
    localStorage.setItem("aflino_searchbar_icon_url", searchBarIconUrl.trim());
    localStorage.setItem("aflino_admin_logo_url", adminLogoUrl.trim());
    localStorage.setItem("aflino_theme_color", themeColor);
    toast.success("Branding settings saved");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Branding</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure logos and visual identity (stored locally)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Settings */}
        <div
          className="rounded-xl border border-border bg-card p-6 space-y-5"
          data-ocid="branding.logos.panel"
        >
          <h2 className="font-semibold text-sm">Logo Configuration</h2>
          <div className="space-y-2">
            <Label htmlFor="header-logo">Header Logo URL</Label>
            <Input
              id="header-logo"
              placeholder="https://example.com/logo.png"
              value={headerLogoUrl}
              onChange={(e) => setHeaderLogoUrl(e.target.value)}
              data-ocid="branding.header_logo.input"
            />
            <p className="text-xs text-muted-foreground">
              Replaces the default Aflino icon in the top header bar
            </p>
            {headerLogoUrl && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <img
                  src={headerLogoUrl}
                  alt="Header logo preview"
                  className="h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="searchbar-icon">Search Bar Icon URL</Label>
            <Input
              id="searchbar-icon"
              placeholder="https://example.com/icon.png"
              value={searchBarIconUrl}
              onChange={(e) => setSearchBarIconUrl(e.target.value)}
              data-ocid="branding.searchbar_icon.input"
            />
            <p className="text-xs text-muted-foreground">
              Small icon displayed on the left side inside the search bar
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-logo">Admin Panel Logo URL</Label>
            <Input
              id="admin-logo"
              placeholder="https://example.com/admin-logo.png"
              value={adminLogoUrl}
              onChange={(e) => setAdminLogoUrl(e.target.value)}
              data-ocid="branding.admin_logo.input"
            />
            <p className="text-xs text-muted-foreground">
              Custom logo shown in the admin panel sidebar
            </p>
          </div>
        </div>

        {/* Theme Color */}
        <div
          className="rounded-xl border border-border bg-card p-6 space-y-5"
          data-ocid="branding.theme.panel"
        >
          <h2 className="font-semibold text-sm">Theme Color</h2>
          <div className="space-y-3">
            <Label htmlFor="theme-color">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="theme-color"
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-border p-1"
                data-ocid="branding.theme_color.input"
              />
              <div
                className="h-10 flex-1 rounded-lg border border-border flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: themeColor }}
              >
                {themeColor}
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Theme color customization coming soon — currently for preview
              only.
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        className="gap-2"
        data-ocid="branding.save.button"
      >
        Save Branding Settings
      </Button>
    </motion.div>
  );
}

// ── NotificationsSection ──────────────────────────────────────────────────────

const APPROVAL_MSG =
  "Your website has been approved and is now live on Aflino Search.";
const REJECTION_MSG =
  "Your website submission has been reviewed and rejected. Please ensure your site meets our quality guidelines.";

function NotificationsSection() {
  const [notifLog, setNotifLog] = useState<Notification[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("aflino_notifications") ?? "[]",
      ) as Notification[];
    } catch {
      return [];
    }
  });
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("All Users");
  const [notifType, setNotifType] = useState("Custom");

  const saveLog = (log: Notification[]) => {
    setNotifLog(log);
    localStorage.setItem("aflino_notifications", JSON.stringify(log));
  };

  const fillApproval = () => {
    setMessage(APPROVAL_MSG);
    setNotifType("Approval");
  };
  const fillRejection = () => {
    setMessage(REJECTION_MSG);
    setNotifType("Rejection");
  };

  const sendNotification = () => {
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    const notif: Notification = {
      id: Date.now().toString(),
      type: notifType,
      message: message.trim(),
      recipient: recipient.trim() || "All Users",
      sentAt: new Date().toLocaleString(),
    };
    saveLog([notif, ...notifLog]);
    toast.success("Notification sent");
    setMessage("");
    setNotifType("Custom");
  };

  const clearAll = () => {
    if (!confirm("Clear all notifications?")) return;
    saveLog([]);
    toast.success("Notification log cleared");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Send system messages and view notification history
        </p>
      </div>

      {/* Compose Panel */}
      <div
        className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl"
        data-ocid="notifications.compose.panel"
      >
        <h2 className="font-semibold text-sm">Compose Notification</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fillApproval}
            className="text-green-700 border-green-300 hover:bg-green-50"
            data-ocid="notifications.approval.button"
          >
            ✓ Approval Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={fillRejection}
            className="text-red-700 border-red-300 hover:bg-red-50"
            data-ocid="notifications.rejection.button"
          >
            ✗ Rejection Template
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notif-recipient">Recipient</Label>
          <Input
            id="notif-recipient"
            placeholder="All Users or specific user ID"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            data-ocid="notifications.recipient.input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notif-message">Message</Label>
          <Textarea
            id="notif-message"
            rows={4}
            placeholder="Enter your notification message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            data-ocid="notifications.message.textarea"
          />
        </div>
        <Button
          onClick={sendNotification}
          className="gap-2"
          data-ocid="notifications.send.button"
        >
          <Bell className="h-4 w-4" />
          Send Notification
        </Button>
      </div>

      {/* Notification Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Notification Log</h2>
          {notifLog.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearAll}
              className="h-7 text-xs text-muted-foreground"
              data-ocid="notifications.clear.button"
            >
              Clear All
            </Button>
          )}
        </div>
        {notifLog.length === 0 ? (
          <div
            className="rounded-xl border border-border p-12 text-center"
            data-ocid="notifications.log.empty_state"
          >
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No notifications sent</p>
            <p className="text-sm text-muted-foreground">
              Sent notifications will appear here
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-border overflow-hidden"
            data-ocid="notifications.log.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifLog.map((notif, i) => (
                  <TableRow
                    key={notif.id}
                    data-ocid={`notifications.log.item.${i + 1}`}
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          notif.type === "Approval"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : notif.type === "Rejection"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {notif.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                      {notif.message}
                    </TableCell>
                    <TableCell className="text-xs">{notif.recipient}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {notif.sentAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Monetization Section ────────────────────────────────────────────

function MonetizationSection() {
  const { data: applications = [], isLoading } =
    useGetAllAdvertiserApplications();
  const { data: allCampaigns = [], isLoading: campaignsLoading } =
    useGetAllCampaigns();
  const { data: adsEnabled = false, isLoading: adsEnabledLoading } =
    useGetAdsEnabled();
  const approveMutation = useApproveAdvertiser();
  const rejectMutation = useRejectAdvertiser();
  const addBalanceMutation = useAddAdvertiserBalance();
  const addWalletBalanceMutation = useAddBalance();
  const setAdsEnabledMutation = useSetAdsEnabled();
  const pauseCampaignMutation = usePauseCampaign();
  const resumeCampaignMutation = useResumeCampaign();

  const [balanceEmail, setBalanceEmail] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");

  const handleToggleAds = async () => {
    try {
      await setAdsEnabledMutation.mutateAsync(!adsEnabled);
      toast.success(adsEnabled ? "Ad Engine disabled" : "Ad Engine enabled");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle ad engine",
      );
    }
  };

  const handlePauseCampaign = async (id: bigint) => {
    try {
      await pauseCampaignMutation.mutateAsync(id);
      toast.success("Campaign paused");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause");
    }
  };

  const handleResumeCampaign = async (id: bigint) => {
    try {
      await resumeCampaignMutation.mutateAsync(id);
      toast.success("Campaign resumed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    }
  };

  const getCampaignStatusBadge = (campaign: Campaign) => {
    if (hasKey(campaign.status, "active")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Active
        </span>
      );
    }
    if (hasKey(campaign.status, "paused")) {
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
  };

  const handleApprove = async (email: string) => {
    try {
      await approveMutation.mutateAsync(email);
      toast.success(`${email} approved as advertiser`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleReject = async (email: string) => {
    try {
      await rejectMutation.mutateAsync(email);
      toast.success(`${email} rejected`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    }
  };

  const handleAddBalance = async () => {
    const amount = Number.parseInt(balanceAmount, 10);
    if (!balanceEmail.trim()) {
      toast.error("Email required");
      return;
    }
    if (Number.isNaN(amount) || amount < 500) {
      toast.error("Minimum ₹500");
      return;
    }
    try {
      await addBalanceMutation.mutateAsync({
        email: balanceEmail.trim(),
        amount,
      });
      // Also top up the wallet (new wallet system)
      await addWalletBalanceMutation.mutateAsync({
        email: balanceEmail.trim(),
        amount,
      });
      toast.success(`₹${amount} added to ${balanceEmail}`);
      setBalanceEmail("");
      setBalanceAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const getStatusInfo = (status: AdvertiserStatusVariant) => {
    if ("pending" in status)
      return {
        label: "Pending",
        cls: "bg-amber-100 text-amber-800 border-amber-200",
      };
    if ("approved" in status)
      return {
        label: "Approved",
        cls: "bg-green-100 text-green-800 border-green-200",
      };
    return { label: "Rejected", cls: "bg-red-100 text-red-800 border-red-200" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="font-display text-2xl font-bold">
          Monetization Control
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage advertiser applications and balances
        </p>
      </div>

      {/* ── Ad Engine Control ── */}
      <div className="space-y-4">
        <h2 className="font-semibold text-base">
          Ad Campaigns &amp; Engine Control
        </h2>

        {/* Global Ads Toggle */}
        <div
          className="rounded-xl border border-border p-5 max-w-md flex items-center justify-between gap-4"
          data-ocid="monetization.ads_engine.panel"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              Ad Engine Status
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {adsEnabled
                ? "Ads are live on search results"
                : "Ads are hidden — showing “Coming Soon” placeholder"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleToggleAds()}
            disabled={setAdsEnabledMutation.isPending || adsEnabledLoading}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#006AFF] focus:ring-offset-2 ${
              adsEnabled ? "bg-[#006AFF]" : "bg-gray-200"
            } disabled:opacity-50`}
            aria-checked={adsEnabled}
            role="switch"
            data-ocid="monetization.ads_engine.toggle"
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                adsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* All Campaigns Table */}
        {campaignsLoading ? (
          <div
            className="flex items-center gap-2 py-4 text-muted-foreground"
            data-ocid="monetization.campaigns.loading_state"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Loading campaigns…</span>
          </div>
        ) : allCampaigns.length === 0 ? (
          <div
            className="rounded-xl border border-border p-8 text-center"
            data-ocid="monetization.campaigns.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No campaigns created yet
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-border overflow-hidden"
            data-ocid="monetization.campaigns.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Advertiser</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Bid</TableHead>
                  <TableHead>Impr</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCampaigns.map((campaign, i) => (
                  <TableRow
                    key={campaign.id.toString()}
                    data-ocid={`monetization.campaign.item.${i + 1}`}
                  >
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {campaign.advertiserEmail}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[140px] truncate">
                      {campaign.name}
                    </TableCell>
                    <TableCell>{getCampaignStatusBadge(campaign)}</TableCell>
                    <TableCell className="text-sm">
                      ₹{campaign.budget.toString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      ₹{campaign.bidAmount.toString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.impressions.toString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.clicks.toString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      ₹{campaign.spend.toString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasKey(campaign.status, "active") && (
                          <button
                            type="button"
                            title="Pause"
                            onClick={() =>
                              void handlePauseCampaign(campaign.id)
                            }
                            disabled={pauseCampaignMutation.isPending}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-100 transition-colors"
                            data-ocid={`monetization.campaign.pause.button.${i + 1}`}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {hasKey(campaign.status, "paused") && (
                          <button
                            type="button"
                            title="Resume"
                            onClick={() =>
                              void handleResumeCampaign(campaign.id)
                            }
                            disabled={resumeCampaignMutation.isPending}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-green-600 hover:bg-green-100 transition-colors"
                            data-ocid={`monetization.campaign.resume.button.${i + 1}`}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      {/* Advertiser Applications Table */}
      <div className="space-y-3">
        <h2 className="font-semibold text-base">Advertiser Applications</h2>
        {isLoading ? (
          <div
            className="flex items-center gap-2 py-8 text-muted-foreground"
            data-ocid="monetization.loading_state"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Loading applications…</span>
          </div>
        ) : applications.length === 0 ? (
          <div
            className="rounded-xl border border-border p-10 text-center"
            data-ocid="monetization.applications.empty_state"
          >
            <p className="text-sm text-muted-foreground">
              No advertiser applications yet
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-border overflow-hidden"
            data-ocid="monetization.applications.table"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app, i) => {
                  const { label, cls } = getStatusInfo(app.status);
                  return (
                    <TableRow
                      key={app.email}
                      data-ocid={`monetization.application.item.${i + 1}`}
                    >
                      <TableCell className="text-sm font-medium">
                        {app.email}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
                        >
                          {label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        ₹{app.balance.toString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(
                          Number(app.appliedAt) / 1_000_000,
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {hasKey(app.status, "pending") && (
                            <>
                              <button
                                type="button"
                                title="Approve"
                                onClick={() => void handleApprove(app.email)}
                                disabled={approveMutation.isPending}
                                className="h-7 w-7 flex items-center justify-center rounded-md text-green-600 hover:bg-green-100 transition-colors"
                                data-ocid={`monetization.approve.button.${i + 1}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Reject"
                                onClick={() => void handleReject(app.email)}
                                disabled={rejectMutation.isPending}
                                className="h-7 w-7 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                                data-ocid={`monetization.reject.button.${i + 1}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Balance */}
      <Separator />
      <div className="space-y-3">
        <h2 className="font-semibold text-base">Add Balance</h2>
        <p className="text-xs text-muted-foreground">Minimum top-up: ₹500</p>
        <div
          className="rounded-xl border border-border p-5 max-w-md space-y-3"
          data-ocid="monetization.balance.panel"
        >
          <div className="space-y-1.5">
            <Label>Advertiser Email</Label>
            <Input
              placeholder="advertiser@example.com"
              value={balanceEmail}
              onChange={(e) => setBalanceEmail(e.target.value)}
              data-ocid="monetization.balance.email.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              placeholder="500"
              min={500}
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              data-ocid="monetization.balance.amount.input"
            />
          </div>
          <Button
            size="sm"
            onClick={() => void handleAddBalance()}
            disabled={
              addBalanceMutation.isPending || addWalletBalanceMutation.isPending
            }
            data-ocid="monetization.balance.submit_button"
          >
            {addBalanceMutation.isPending ||
            addWalletBalanceMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Adding…
              </>
            ) : (
              "Add Balance (Wallet)"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Sidebar Nav Item ──────────────────────────────────────────────────────────

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function SidebarContent({
  activeSection,
  onNavigate,
  pendingCount,
  onSignOut,
  adminLogoUrl,
  onClose,
}: {
  activeSection: AdminSection;
  onNavigate: (s: AdminSection) => void;
  pendingCount: number;
  onSignOut: () => void;
  adminLogoUrl: string;
  onClose: () => void;
}) {
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "websites",
      label: "Websites",
      icon: Globe,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: "discover", label: "Discover Control", icon: Compass },
    { id: "users", label: "Users", icon: Users },
    { id: "security", label: "Security", icon: Shield },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "search-control", label: "Search Control", icon: Search },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "monetization", label: "Monetization Control", icon: DollarSign },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header: Aflino Admin branding + close button */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {adminLogoUrl ? (
            <img
              src={adminLogoUrl}
              alt="Aflino Admin"
              className="h-8 object-contain"
            />
          ) : (
            <>
              <div className="h-8 w-8 rounded-lg bg-[#006AFF] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div>
                <p className="text-[#111827] font-bold text-sm leading-tight">
                  Aflino Admin
                </p>
                <p className="text-gray-400 text-xs">Control Panel</p>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Close sidebar"
          data-ocid="admin.sidebar.close_button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[9px] text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#006AFF] text-white"
                    : "text-[#111827] hover:bg-[#F1F5F9]"
                }`}
                data-ocid={`sidebar.${item.id}.link`}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400"}`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="flex-shrink-0 bg-amber-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Sign Out */}
      <div className="px-3 py-3 border-t border-gray-200 flex-shrink-0">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[9px] text-sm font-medium text-[#111827] hover:text-red-600 hover:bg-red-50 transition-colors"
          data-ocid="admin.signout.button"
        >
          <LogOut className="h-4 w-4 text-gray-400" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Main AdminPanelPage ───────────────────────────────────────────────────────

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const { data: stats } = useGetStats();
  const { role: authRole, logout: authLogout } = useAuth();

  // Access is granted purely from local admin login (no II required)
  const canAccess = authRole === "admin";

  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const adminLogoUrl = localStorage.getItem("aflino_admin_logo_url") ?? "";
  const pendingCount = Number(stats?.pending ?? 0);

  // Access guard
  useEffect(() => {
    if (!canAccess) {
      void navigate({ to: "/" });
    }
  }, [canAccess, navigate]);

  const handleSignOut = () => {
    authLogout();
    void navigate({ to: "/" });
  };

  const handleNavigate = (section: AdminSection) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="font-display text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have admin privileges.
          </p>
          <Button onClick={() => void navigate({ to: "/" })} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const sectionLabels: Record<AdminSection, string> = {
    dashboard: "Dashboard",
    websites: "Websites",
    discover: "Discover Control",
    users: "Users",
    security: "Security",
    analytics: "Analytics",
    "search-control": "Search Control",
    branding: "Branding",
    notifications: "Notifications",
    monetization: "Monetization Control",
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Drawer Overlay — shown on all screen sizes */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              ref={overlayRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
              data-ocid="admin.sidebar.overlay"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 h-full z-50 shadow-xl w-[50vw] md:w-[300px]"
              data-ocid="admin.sidebar.panel"
            >
              <SidebarContent
                activeSection={activeSection}
                onNavigate={handleNavigate}
                pendingCount={pendingCount}
                onSignOut={handleSignOut}
                adminLogoUrl={adminLogoUrl}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Area — always full width */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar — always visible on all screen sizes */}
        <header
          className="flex-shrink-0 h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3"
          data-ocid="admin.topbar"
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-[#111827] hover:bg-[#F1F5F9] transition-colors"
            data-ocid="admin.menu.button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-bold text-[#111827]">Admin Panel</p>
            <p className="text-xs text-gray-500">
              {sectionLabels[activeSection]}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {activeSection === "dashboard" && <DashboardSection />}
                {activeSection === "websites" && <WebsitesSection />}
                {activeSection === "discover" && <DiscoverSection />}
                {activeSection === "users" && <UsersSection />}
                {activeSection === "security" && <SecuritySection />}
                {activeSection === "analytics" && <AnalyticsSection />}
                {activeSection === "search-control" && <SearchControlSection />}
                {activeSection === "branding" && <BrandingSection />}
                {activeSection === "notifications" && <NotificationsSection />}
                {activeSection === "monetization" && <MonetizationSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-border bg-background px-6 py-3">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
