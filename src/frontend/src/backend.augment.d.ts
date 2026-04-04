// Type augmentation: adds Aflino API methods to the generated backend types.
// The Backend class delegates to its actor at runtime; we declare the methods
// here so TypeScript can type-check their call sites.
// NOTE: config.ts returns Backend as backendInterface — we augment both.
import type { Principal } from "@icp-sdk/core/principal";
import type {
  AdvertiserProfile,
  BlacklistEntry,
  Option,
  ReviewAction,
  SecurityLog,
  SeedEntry,
  Stats,
  Website,
} from "./backend.d";

declare module "./backend" {
  interface backendInterface {
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    getCallerUserRole(): Promise<
      { admin: null } | { user: null } | { guest: null }
    >;
    assignCallerUserRole(
      user: Principal,
      role: { admin: null } | { user: null } | { guest: null },
    ): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    searchWebsites(searchQuery: string): Promise<Website[]>;
    getStats(): Promise<Stats>;
    submitWebsite(
      url: string,
      title: string,
      description: string,
      keywords: string[],
    ): Promise<Website>;
    getMyWebsites(): Promise<Website[]>;
    getVerificationToken(websiteId: bigint): Promise<string>;
    verifyDomain(websiteId: bigint): Promise<boolean>;
    approveWebsite(websiteId: bigint): Promise<Website>;
    rejectWebsite(websiteId: bigint): Promise<Website>;
    editWebsite(
      websiteId: bigint,
      title: string,
      description: string,
      keywords: string[],
    ): Promise<Website>;
    deleteWebsite(websiteId: bigint): Promise<void>;
    getAllWebsites(): Promise<Website[]>;
    getPendingWebsites(): Promise<Website[]>;
    importSeedData(entries: SeedEntry[]): Promise<bigint>;

    // Security: logs
    getSecurityLogs(): Promise<SecurityLog[]>;

    // Security: blacklist
    addToBlacklist(domain: string, reason: string): Promise<void>;
    removeFromBlacklist(domain: string): Promise<void>;
    getBlacklist(): Promise<BlacklistEntry[]>;
    getFlaggedDomains(): Promise<BlacklistEntry[]>;
    reviewFlaggedDomain(domain: string, action: ReviewAction): Promise<void>;

    // Click tracking
    recordClick(url: string): Promise<void>;

    // Advertiser / Monetization
    applyForAdvertiser(email: string): Promise<void>;
    getMyAdvertiserProfile(email: string): Promise<[] | [AdvertiserProfile]>;
    getAllAdvertiserApplications(): Promise<AdvertiserProfile[]>;
    approveAdvertiser(email: string): Promise<void>;
    rejectAdvertiser(email: string): Promise<void>;
    addAdvertiserBalance(email: string, amount: bigint): Promise<void>;
  }

  // Augment the Backend class so config.ts's createActor return type is compatible
  interface Backend extends backendInterface {}
}
