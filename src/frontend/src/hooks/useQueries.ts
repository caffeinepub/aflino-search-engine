import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdResult,
  AdvertiserProfile,
  BlacklistEntry,
  Campaign,
  SecurityLog,
  SeedEntry,
  Variant_remove_approve_block,
  Website,
} from "../backend.d";
import { useActor } from "./useActor";

export function useSearchWebsites(query: string, email?: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["search", query, email ?? "guest"],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      const emailOpt: [string] | [] = email ? [email] : [];
      return actor.searchWebsites(query, emailOpt) as unknown as Website[];
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
  return useMutation({
    mutationFn: async (url: string) => {
      if (!actor) return;
      await actor.recordClick(url);
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
