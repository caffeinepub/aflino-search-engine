import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdResult,
  AdSyncKycRecord,
  AdSyncPaymentDetails,
  AdSyncPaymentMethod,
  AdSyncUser,
  AdSyncWallet,
  AdvertiserProfile,
  AdvertiserWallet,
  BlacklistEntry,
  Campaign,
  DiscoverFeed,
  Result_1,
  Result_2,
  Result_3,
  Result_4,
  Result_6,
  SecurityLog,
  SeedEntry,
  Transaction,
  Variant_remove_approve_block,
  Website,
} from "../backend.d";
import type {
  AdSyncInvoice,
  AdSyncPayoutLog,
  AdSyncTaxProfile,
  AdSyncTaxProfileResult,
  AdSyncTextResult,
  AdSyncTransaction,
} from "../types/adsync-financial";
import { useActor } from "./useActor";

export function useSearchWebsites(query: string, email?: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["search", query, email ?? "guest"],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      return actor.searchWebsites(query, email ?? null) as unknown as Website[];
    },
    enabled: !!actor && !isFetching && !!query.trim(),
  });
}

export function useGetStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      if (!actor)
        return { total: BigInt(0), approved: BigInt(0), pending: BigInt(0) };
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyWebsites() {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["myWebsites"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyWebsites() as unknown as Website[];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyWebsitesByEmail(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["myWebsitesByEmail", email],
    queryFn: async () => {
      if (!actor || !email) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getMyWebsitesByEmail(email) as Website[];
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useGetAllWebsites() {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["allWebsites"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWebsites() as unknown as Website[];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPendingWebsites() {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["pendingWebsites"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingWebsites() as unknown as Website[];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerRole() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) return { guest: null } as { guest: null };
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitWebsite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      ownerId: string;
      url: string;
      title: string;
      description: string;
      keywords: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).submitWebsite(
        data.ownerId,
        data.url,
        data.title,
        data.description,
        data.keywords,
      ) as Website;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["myWebsitesByEmail"] });
    },
  });
}

export function useApproveWebsite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveWebsite(id) as unknown as Website;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pendingWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useRejectWebsite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectWebsite(id) as unknown as Website;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pendingWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
    },
  });
}

export function useDeleteWebsite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteWebsite(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["pendingWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useSetAdminBoost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: bigint; boost: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setAdminBoost(data.id, data.boost);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
    },
  });
}

export function useEditWebsite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      title: string;
      description: string;
      keywords: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.editWebsite(
        data.id,
        data.title,
        data.description,
        data.keywords,
      ) as unknown as Website;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
    },
  });
}

export function useImportSeedData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: SeedEntry[]) => {
      if (!actor) throw new Error("Not connected");
      return actor.importSeedData(entries);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useGetVerificationToken(websiteId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["verificationToken", websiteId?.toString()],
    queryFn: async () => {
      if (!actor || !websiteId) return "";
      return actor.getVerificationToken(websiteId);
    },
    enabled: !!actor && !isFetching && websiteId !== null,
  });
}

export function useVerifyDomain() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.verifyDomain(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["myWebsitesByEmail"] });
    },
  });
}

export function useAssignRole() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: {
      principal: string;
      role: "admin" | "user" | "guest";
    }) => {
      if (!actor) throw new Error("Not connected");
      const { Principal } = await import("@dfinity/principal");
      const p = Principal.fromText(data.principal);
      const { UserRole } = await import("../backend.d");
      const role =
        data.role === "admin"
          ? UserRole.admin
          : data.role === "user"
            ? UserRole.user
            : UserRole.guest;
      return actor.assignCallerUserRole(p, role);
    },
  });
}

// ── Security hooks ────────────────────────────────────────────

export function useGetSecurityLogs() {
  const { actor, isFetching } = useActor();
  return useQuery<SecurityLog[]>({
    queryKey: ["securityLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSecurityLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetBlacklist() {
  const { actor, isFetching } = useActor();
  return useQuery<BlacklistEntry[]>({
    queryKey: ["blacklist"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBlacklist();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFlaggedDomains() {
  const { actor, isFetching } = useActor();
  return useQuery<BlacklistEntry[]>({
    queryKey: ["flaggedDomains"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFlaggedDomains();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddToBlacklist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { domain: string; reason: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addToBlacklist(data.domain, data.reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      void queryClient.invalidateQueries({ queryKey: ["flaggedDomains"] });
    },
  });
}

export function useRemoveFromBlacklist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (domain: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.removeFromBlacklist(domain);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      void queryClient.invalidateQueries({ queryKey: ["flaggedDomains"] });
    },
  });
}

export function useReviewFlaggedDomain() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      domain: string;
      action: { remove: null } | { approve: null } | { block: null };
    }) => {
      if (!actor) throw new Error("Not connected");
      // Cast to the backend enum type - runtime values match
      const action = data.action as unknown as Variant_remove_approve_block;
      return actor.reviewFlaggedDomain(data.domain, action);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blacklist"] });
      void queryClient.invalidateQueries({ queryKey: ["flaggedDomains"] });
    },
  });
}

// ── Click tracking ─────────────────────────────────────────────

export function useRecordClick() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      if (!actor) return;
      await actor.recordClick(url);
    },
    onSuccess: async (_data, url) => {
      // Threshold-based discover feed invalidation (Option B)
      // We don't have the exact click count here, so invalidate on every click
      // but React Query's staleTime (5 min) will prevent unnecessary refetches
      // unless the data is actually stale.
      // For precise threshold enforcement, fetch the site's click count:
      try {
        const allSites = queryClient.getQueryData<Website[]>(["allWebsites"]);
        const site = allSites?.find((s) => s.url === url);
        if (site) {
          const newClicks = Number(site.clicks) + 1;
          // Invalidate discover feed at thresholds: 50, 100, 500
          if (newClicks === 50 || newClicks === 100 || newClicks === 500) {
            void queryClient.invalidateQueries({ queryKey: ["discoverFeed"] });
          }
        } else {
          // Unknown site — safe to invalidate discover feed (staleTime guards refetch)
          void queryClient.invalidateQueries({ queryKey: ["discoverFeed"] });
        }
      } catch {
        // Non-critical: ignore errors in threshold check
      }
    },
  });
}

export function useRecordImpression() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (url: string) => {
      if (!actor) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any).recordImpression(url);
    },
  });
}

// ── Advertiser / Monetization hooks ───────────────────────────

export function useApplyForAdvertiser() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.applyForAdvertiser(email);
    },
  });
}

export function useGetMyAdvertiserProfile(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdvertiserProfile | null>({
    queryKey: ["advertiserProfile", email],
    queryFn: async () => {
      if (!actor || !email) return null;
      const result = await actor.getMyAdvertiserProfile(email);
      // Handle both optional array form and direct null form
      if (Array.isArray(result))
        return ((result as unknown[])[0] as AdvertiserProfile | null) ?? null;
      return result ?? null;
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useGetAllAdvertiserApplications() {
  const { actor, isFetching } = useActor();
  return useQuery<AdvertiserProfile[]>({
    queryKey: ["advertiserApplications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAdvertiserApplications();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveAdvertiser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveAdvertiser(email);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["advertiserApplications"],
      });
    },
  });
}

export function useRejectAdvertiser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectAdvertiser(email);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["advertiserApplications"],
      });
    },
  });
}

export function useAddAdvertiserBalance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; amount: number }) => {
      if (!actor) throw new Error("Not connected");
      if (data.amount < 500) throw new Error("Minimum top-up is ₹500");
      return actor.addAdvertiserBalance(data.email, BigInt(data.amount));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["advertiserApplications"],
      });
    },
  });
}

// ── Ad Engine hooks ────────────────────────────────────────────

export function useGetAdsForSearch(query: string) {
  const { actor, isFetching } = useActor();
  return useQuery<AdResult[]>({
    queryKey: ["adsForSearch", query],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      return actor.getAdsForSearch(query);
    },
    enabled: !!actor && !isFetching && !!query.trim(),
  });
}

export function useGetAllCampaigns() {
  const { actor, isFetching } = useActor();
  return useQuery<Campaign[]>({
    queryKey: ["allCampaigns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCampaigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMyCampaigns(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Campaign[]>({
    queryKey: ["myCampaigns", email],
    queryFn: async () => {
      if (!actor || !email) return [];
      return actor.getMyCampaigns(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useCreateCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      name: string;
      budget: number;
      dailyBudget: number;
      bidAmount: number;
      keywords: string[];
      destinationUrl: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createCampaign(
        data.email,
        data.name,
        BigInt(data.budget),
        BigInt(data.dailyBudget),
        BigInt(data.bidAmount),
        data.keywords,
        data.destinationUrl,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["myCampaigns", variables.email],
      });
      void queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
    },
  });
}

export function usePauseCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.pauseCampaign(campaignId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myCampaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
    },
  });
}

export function useResumeCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.resumeCampaign(campaignId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myCampaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["allCampaigns"] });
    },
  });
}

export function useRecordAdImpression() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (campaignId: bigint) => {
      if (!actor) return;
      await actor.recordAdImpression(campaignId);
    },
  });
}

export function useRecordAdClick() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { campaignId: bigint; userSession: string }) => {
      if (!actor) return null;
      return actor.recordAdClick(data.campaignId, data.userSession);
    },
  });
}

export function useGetAdsEnabled() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["adsEnabled"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.getAdsEnabled();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetAdsEnabled() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!actor) throw new Error("Not connected");
      return actor.setAdsEnabled(enabled);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["adsEnabled"] });
    },
  });
}

// ── Ownership & Reclaim hooks ─────────────────────────────────

export function useReclaimDomain() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { websiteId: bigint; newOwnerEmail: string }) => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).reclaimDomain(
        data.websiteId,
        data.newOwnerEmail,
      ) as Website;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["myWebsitesByEmail"] });
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
    },
  });
}

export function useRunOwnershipCleanup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).runOwnershipCleanup() as Promise<bigint>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["myWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["myWebsitesByEmail"] });
    },
  });
}

export function useGetCrawlQueue() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["crawlQueue"],
    queryFn: async () => {
      if (!actor) return [] as [bigint, bigint][];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getCrawlQueue() as Promise<[bigint, bigint][]>;
    },
    enabled: !!actor,
  });
}

export function useRunCrawler() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).runCrawler() as Promise<bigint>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
      void queryClient.invalidateQueries({ queryKey: ["crawlQueue"] });
      void queryClient.invalidateQueries({ queryKey: ["myWebsites"] });
    },
  });
}

export function useAddToCrawlQueue() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (websiteId: bigint) => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).addToCrawlQueue(websiteId) as Promise<void>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crawlQueue"] });
    },
  });
}

export function useCheckAndQueueRecrawl() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).checkAndQueueRecrawl() as Promise<bigint>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crawlQueue"] });
    },
  });
}

// ── User Behavior hooks ────────────────────────────────────────

export function useRecordUserSearch() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { email: string; query: string }) => {
      if (!actor || !data.email) return;
      await actor.recordUserSearch(data.email, data.query);
    },
  });
}

export function useRecordUserClick() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { email: string; url: string }) => {
      if (!actor || !data.email) return;
      await actor.recordUserClick(data.email, data.url);
    },
  });
}

export function useGetUserSearchHistory(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["userSearchHistory", email],
    queryFn: async () => {
      if (!actor || !email) return [];
      return actor.getUserSearchHistory(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useGetUserClickHistory(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["userClickHistory", email],
    queryFn: async () => {
      if (!actor || !email) return [];
      return actor.getUserClickHistory(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useGetUserInterests(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["userInterests", email],
    queryFn: async () => {
      if (!actor || !email) return [];
      return actor.getUserInterests(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useRefreshUserInterests() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      if (!actor) return;
      await actor.refreshUserInterests(data.email);
    },
  });
}

// ── Discover Feed ─────────────────────────────────────────────────────────────

export function useGetDiscoverFeed(email?: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<DiscoverFeed>({
    queryKey: ["discoverFeed", email ?? "guest"],
    queryFn: async () => {
      const empty: DiscoverFeed = {
        trending: [],
        recentlyIndexed: [],
        popularDomains: [],
        recommendedForYou: [],
      };
      if (!actor) return empty;
      try {
        return await actor.getDiscoverFeed(email ?? null);
      } catch (err) {
        console.error("[DiscoverFeed] Failed to load:", err);
        return empty;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 5 * 60 * 1000, // 5 minutes — React Query refresh strategy (Option B)
  });
}

// ── Spam Score hooks ──────────────────────────────────────────────────────────

export function useRecalculateSpamScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).recalculateSpamScore(id) as Promise<bigint>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
    },
  });
}

export function useRecalculateAllSpamScores() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).recalculateAllSpamScores() as Promise<bigint>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["allWebsites"] });
    },
  });
}

// ── Ad Ranking V2 types ───────────────────────────────────────────────────────

export type MatchType = { broad: null } | { phrase: null } | { exact: null };

export interface AdV2 {
  id: bigint;
  adGroupId: bigint;
  title: string;
  description: string;
  destinationUrl: string;
  keywords: string[];
  negativeKeywords: string[];
  matchType: MatchType;
  bidAmount: bigint;
  clicks: bigint;
  impressions: bigint;
  createdAt: bigint;
}

export interface AdMatchResult {
  ad: AdV2;
  keywordScore: bigint;
}

// ── Ad Ranking V2 hooks ───────────────────────────────────────────────────────

export function useRankAds(query: string) {
  const { actor, isFetching } = useActor();
  return useQuery<AdMatchResult[]>({
    queryKey: ["rankAds", query],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (actor as any).rankAds(query)) as AdMatchResult[];
      } catch (err) {
        console.error("[rankAds] Failed:", err);
        return [];
      }
    },
    enabled: !!actor && !isFetching && query.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useRecordAdImpressionV2() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (adId: bigint) => {
      if (!actor) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (actor as any).recordAdImpressionV2(adId);
      } catch (err) {
        console.error("[recordAdImpressionV2] Failed:", err);
      }
    },
  });
}

export function useRecordAdClickV2() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { adId: bigint; userSession: string }) => {
      if (!actor) return null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (actor as any).recordAdClickV2(
          data.adId,
          data.userSession,
        );
      } catch (err) {
        console.error("[recordAdClickV2] Failed:", err);
        return null;
      }
    },
  });
}

// ── Wallet hooks ──────────────────────────────────────────────────────────────

export function useGetWallet(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdvertiserWallet | null>({
    queryKey: ["wallet", email],
    queryFn: async () => {
      if (!actor || !email) return null;
      return actor.getWallet(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useGetTransactions(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ["transactions", email],
    queryFn: async () => {
      if (!actor || !email) return [];
      return actor.getTransactions(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useAddBalance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; amount: number }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addBalance(data.email, BigInt(data.amount));
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["wallet", variables.email],
      });
      void queryClient.invalidateQueries({
        queryKey: ["transactions", variables.email],
      });
      void queryClient.invalidateQueries({
        queryKey: ["advertiserApplications"],
      });
    },
  });
}

export function useCreateRazorpayOrder() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: { email: string; amountPaise: bigint }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.createRazorpayOrder(
        data.email,
        data.amountPaise,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
  });
}

export function useVerifyRazorpayPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      orderId: string;
      paymentId: string;
      signature: string;
      amountPaise: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.verifyRazorpayPayment(
        data.email,
        data.orderId,
        data.paymentId,
        data.signature,
        data.amountPaise,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["wallet", variables.email],
      });
      void queryClient.invalidateQueries({
        queryKey: ["transactions", variables.email],
      });
    },
  });
}

// ── AdSync hooks ──────────────────────────────────────────────────────────────

export function useGetAdSyncUser(email: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncUser | null>({
    queryKey: ["adSyncUser", email],
    queryFn: async () => {
      if (!actor || !email) return null;
      return actor.getAdSyncUser(email);
    },
    enabled: !!actor && !isFetching && !!email,
  });
}

export function useGetAdSyncWallet(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncWallet | null>({
    queryKey: ["adSyncWallet", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return null;
      return actor.getAdSyncWallet(syncId);
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useGetAdSyncKycRecord(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncKycRecord | null>({
    queryKey: ["adSyncKyc", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return null;
      return actor.getAdSyncKycRecord(syncId);
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useGetAdSyncPaymentDetails(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncPaymentDetails | null>({
    queryKey: ["adSyncPaymentDetails", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return null;
      return actor.getAdSyncPaymentDetails(syncId);
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useSetAdSyncPaymentDetails() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      syncId: string;
      country: string;
      method: AdSyncPaymentMethod;
      upiId: string | null;
      accountNumber: string | null;
      ifsc: string | null;
      swiftCode: string | null;
      iban: string | null;
      accountName: string;
    }): Promise<Result_3> => {
      if (!actor) throw new Error("Not connected");
      return actor.setAdSyncPaymentDetails(
        data.syncId,
        data.country,
        data.method,
        data.upiId,
        data.accountNumber,
        data.ifsc,
        data.swiftCode,
        data.iban,
        data.accountName,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["adSyncPaymentDetails", variables.syncId],
      });
    },
  });
}

export function useSubmitAdSyncKyc() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      syncId: string;
    }): Promise<Result_2> => {
      if (!actor) throw new Error("Not connected");
      return actor.submitAdSyncKyc(data.syncId);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["adSyncKyc", variables.syncId],
      });
      void queryClient.invalidateQueries({ queryKey: ["adSyncUser"] });
    },
  });
}

export function useRegisterAdSyncUser() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      fullName: string;
      mobile: string;
      passwordHash: string;
      accountType: import("../backend.d").AdSyncAccountType;
      role: import("../backend.d").AdSyncRole;
      country: string;
      state: string;
      city: string;
      address: string;
    }): Promise<Result_4> => {
      if (!actor) throw new Error("Not connected");
      return actor.registerAdSyncUser(
        data.email,
        data.fullName,
        data.mobile,
        data.passwordHash,
        data.accountType,
        data.role,
        data.country,
        data.state,
        data.city,
        data.address,
      );
    },
  });
}

export function useLoginAdSyncUser() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      passwordHash: string;
    }): Promise<Result_4> => {
      if (!actor) throw new Error("Not connected");
      return actor.loginAdSyncUser(data.email, data.passwordHash);
    },
  });
}

export function useCreateAdSyncRazorpayOrder() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (data: {
      syncId: string;
      amountPaise: bigint;
    }): Promise<Result_6> => {
      if (!actor) throw new Error("Not connected");
      return actor.createAdSyncRazorpayOrder(data.syncId, data.amountPaise);
    },
  });
}

export function useVerifyAdSyncRazorpayPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      syncId: string;
      orderId: string;
      paymentId: string;
      signature: string;
      amountPaise: bigint;
    }): Promise<Result_1> => {
      if (!actor) throw new Error("Not connected");
      return actor.verifyAdSyncRazorpayPayment(
        data.syncId,
        data.orderId,
        data.paymentId,
        data.signature,
        data.amountPaise,
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["adSyncWallet", variables.syncId],
      });
    },
  });
}

// ── AdSync Financial Hooks (Billing + Earnings + Payouts + Tax + Invoices) ───

export function useGetAdSyncTransactions(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncTransaction[]>({
    queryKey: ["adSyncTransactions", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (actor as any).getAdSyncTransactions(
          syncId,
        )) as AdSyncTransaction[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useGetAdSyncPayoutLogs(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncPayoutLog[]>({
    queryKey: ["adSyncPayoutLogs", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (actor as any).getAdSyncPayoutLogs(
          syncId,
        )) as AdSyncPayoutLog[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useGetAdSyncInvoices(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncInvoice[]>({
    queryKey: ["adSyncInvoices", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (actor as any).getAdSyncInvoices(
          syncId,
        )) as AdSyncInvoice[];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useGetAdSyncTaxProfile(syncId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AdSyncTaxProfile | null>({
    queryKey: ["adSyncTaxProfile", syncId],
    queryFn: async () => {
      if (!actor || !syncId) return null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (await (actor as any).getAdSyncTaxProfile(
          syncId,
        )) as AdSyncTaxProfileResult;
        if (result.__kind__ === "ok") return result.ok;
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!syncId,
  });
}

export function useSetAdSyncTaxProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      syncId: string;
      country: string;
      panNumber: string;
      gstNumber: string;
      taxRate: bigint;
    }): Promise<AdSyncTextResult> => {
      if (!actor) throw new Error("Not connected");
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (actor as any).setAdSyncTaxProfile(
          data.syncId,
          data.country,
          data.panNumber,
          data.gstNumber,
          data.taxRate,
        )) as AdSyncTextResult;
      } catch (e) {
        return {
          __kind__: "err",
          err: e instanceof Error ? e.message : "Unknown error",
        };
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["adSyncTaxProfile", variables.syncId],
      });
    },
  });
}

export function useGetAdSyncRevenueShare() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["adSyncRevenueShare"],
    queryFn: async () => {
      if (!actor) return BigInt(70);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await (actor as any).getAdSyncRevenueShare()) as bigint;
      } catch {
        return BigInt(70);
      }
    },
    enabled: !!actor && !isFetching,
  });
}
