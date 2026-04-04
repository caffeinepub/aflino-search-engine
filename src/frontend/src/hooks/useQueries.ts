import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BlacklistEntry,
  ReviewAction,
  SecurityLog,
  SeedEntry,
  Website,
} from "../backend.d";
import { useActor } from "./useActor";

export function useSearchWebsites(query: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      return actor.searchWebsites(query);
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
      return actor.getMyWebsites();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllWebsites() {
  const { actor, isFetching } = useActor();
  return useQuery<Website[]>({
    queryKey: ["allWebsites"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWebsites();
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
      return actor.getPendingWebsites();
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
      url: string;
      title: string;
      description: string;
      keywords: string[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitWebsite(
        data.url,
        data.title,
        data.description,
        data.keywords,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myWebsites"] });
    },
  });
}

export function useApproveWebsite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveWebsite(id);
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
      return actor.rejectWebsite(id);
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
      );
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
      const role =
        data.role === "admin"
          ? { admin: null as null }
          : data.role === "user"
            ? { user: null as null }
            : { guest: null as null };
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
    mutationFn: async (data: { domain: string; action: ReviewAction }) => {
      if (!actor) throw new Error("Not connected");
      return actor.reviewFlaggedDomain(data.domain, data.action);
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
