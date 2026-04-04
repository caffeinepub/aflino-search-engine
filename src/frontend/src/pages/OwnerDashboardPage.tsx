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
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Website } from "../backend.d";
import StatusBadge from "../components/StatusBadge";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerRole,
  useGetMyWebsites,
  useGetVerificationToken,
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

type SidebarTab = "my-websites" | "submit" | "account";

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

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { identity, clear } = useInternetIdentity();
  const { data: role } = useGetCallerRole();
  const isAuthenticated = !!identity;

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

  const { data: websites = [], isLoading } = useGetMyWebsites();
  const submitMutation = useSubmitWebsite();

  if (!isAuthenticated) {
    void navigate({ to: "/register" });
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
      id: "account",
      label: "Account",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

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
            onClick={clear}
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
                        <TableHead>Verified</TableHead>
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
                            {site.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                                <ShieldCheck className="h-3.5 w-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Unverified
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!site.isVerified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setVerifyingWebsite(site)}
                                data-ocid={`dashboard.verify.button.${i + 1}`}
                              >
                                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                Verify
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
                    Principal
                  </p>
                  <code className="text-sm font-mono break-all">
                    {identity?.getPrincipal().toString()}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Role
                  </p>
                  <p className="text-sm font-medium">
                    {role && "admin" in role
                      ? "Administrator"
                      : role && "user" in role
                        ? "Website Owner"
                        : "Guest"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={clear}
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
