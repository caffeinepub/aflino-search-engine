import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export type WebsiteStatus = { pending: null } | { approved: null } | { rejected: null };

export interface Website {
    id: bigint;
    url: string;
    title: string;
    description: string;
    keywords: string[];
    status: WebsiteStatus;
    ownerPrincipal: Principal;
    verificationToken: string;
    isVerified: boolean;
    isSeed: boolean;
    submittedAt: bigint;
    approvedAt: Option<bigint>;
}

export interface SeedEntry {
    url: string;
    title: string;
    description: string;
    keywords: string[];
}

export interface Stats {
    total: bigint;
    approved: bigint;
    pending: bigint;
}

export interface SecurityLog {
    id: bigint;
    timestamp: bigint;
    logType: string;
    principalText: string;
    details: string;
}

export type BlacklistStatusVariant = { flagged: null } | { blocked: null };

export interface BlacklistEntry {
    domain: string;
    status: BlacklistStatusVariant;
    reason: string;
    addedAt: bigint;
    reviewedBy: Option<string>;
}

export type ReviewAction = { approve: null } | { block: null } | { remove: null };

export interface AccessControlUserRole {
    // from authorization mixin
}

export interface backendInterface {
    // Authorization (from mixin)
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    getCallerUserRole(): Promise<{ admin: null } | { user: null } | { guest: null }>;
    assignCallerUserRole(user: Principal, role: { admin: null } | { user: null } | { guest: null }): Promise<void>;
    isCallerAdmin(): Promise<boolean>;

    // Search (public)
    searchWebsites(searchQuery: string): Promise<Website[]>;
    getStats(): Promise<Stats>;

    // Website submission
    submitWebsite(url: string, title: string, description: string, keywords: string[]): Promise<Website>;
    getMyWebsites(): Promise<Website[]>;

    // Domain verification
    getVerificationToken(websiteId: bigint): Promise<string>;
    verifyDomain(websiteId: bigint): Promise<boolean>;

    // Admin: manage websites
    approveWebsite(websiteId: bigint): Promise<Website>;
    rejectWebsite(websiteId: bigint): Promise<Website>;
    editWebsite(websiteId: bigint, title: string, description: string, keywords: string[]): Promise<Website>;
    deleteWebsite(websiteId: bigint): Promise<void>;
    getAllWebsites(): Promise<Website[]>;
    getPendingWebsites(): Promise<Website[]>;

    // Admin: seed data
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
}
