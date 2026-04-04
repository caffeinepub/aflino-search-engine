import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    email: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface AdvertiserProfile {
    status: AdvertiserStatus;
    appliedAt: bigint;
    balance: bigint;
    reviewedAt?: bigint;
    email: string;
}
export interface BlacklistEntry {
    status: BlacklistStatus;
    domain: string;
    reviewedBy?: string;
    addedAt: bigint;
    reason: string;
}
export interface Stats {
    total: bigint;
    pending: bigint;
    approved: bigint;
}
export interface Website {
    id: bigint;
    url: string;
    status: WebsiteStatus;
    title: string;
    ownerPrincipal: Principal;
    approvedAt?: bigint;
    verificationToken: string;
    submittedAt: bigint;
    description: string;
    isSeed: boolean;
    keywords: Array<string>;
    isVerified: boolean;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface SecurityLog {
    id: bigint;
    logType: string;
    timestamp: bigint;
    details: string;
    principalText: string;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Campaign {
    id: bigint;
    status: CampaignStatus;
    clicks: bigint;
    name: string;
    createdAt: bigint;
    advertiserEmail: string;
    impressions: bigint;
    bidAmount: bigint;
    keywords: Array<string>;
    spend: bigint;
    dailyBudget: bigint;
    destinationUrl: string;
    budget: bigint;
}
export interface AdResult {
    name: string;
    campaignId: bigint;
    score: bigint;
    bidAmount: bigint;
    destinationUrl: string;
}
export interface SeedEntry {
    url: string;
    title: string;
    description: string;
    keywords: Array<string>;
}
export enum BlacklistStatus {
    blocked = "blocked",
    flagged = "flagged"
}
export enum CampaignStatus {
    active = "active",
    ended = "ended",
    paused = "paused"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_remove_approve_block {
    remove = "remove",
    approve = "approve",
    block = "block"
}
export enum WebsiteStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    addAdvertiserBalance(email: string, amount: bigint): Promise<void>;
    addToBlacklist(domain: string, reason: string): Promise<void>;
    applyForAdvertiser(email: string): Promise<void>;
    approveAdvertiser(email: string): Promise<void>;
    approveWebsite(websiteId: bigint): Promise<Website>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCampaign(email: string, name: string, budget: bigint, dailyBudget: bigint, bidAmount: bigint, keywords: Array<string>, destinationUrl: string): Promise<Campaign>;
    deleteWebsite(websiteId: bigint): Promise<void>;
    editWebsite(websiteId: bigint, title: string, description: string, keywords: Array<string>): Promise<Website>;
    getAdsEnabled(): Promise<boolean>;
    getAdsForSearch(searchQuery: string): Promise<Array<AdResult>>;
    getAllAdvertiserApplications(): Promise<Array<AdvertiserProfile>>;
    getAllCampaigns(): Promise<Array<Campaign>>;
    getAllWebsites(): Promise<Array<Website>>;
    getBlacklist(): Promise<Array<BlacklistEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFlaggedDomains(): Promise<Array<BlacklistEntry>>;
    getMyAdvertiserProfile(email: string): Promise<AdvertiserProfile | null>;
    getMyCampaigns(email: string): Promise<Array<Campaign>>;
    getMyWebsites(): Promise<Array<Website>>;
    getPendingWebsites(): Promise<Array<Website>>;
    getSecurityLogs(): Promise<Array<SecurityLog>>;
    getStats(): Promise<Stats>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVerificationToken(websiteId: bigint): Promise<string>;
    importSeedData(entries: Array<SeedEntry>): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    pauseCampaign(campaignId: bigint): Promise<void>;
    recordAdClick(campaignId: bigint, userSession: string): Promise<Result>;
    recordAdImpression(campaignId: bigint): Promise<void>;
    recordClick(url: string): Promise<void>;
    rejectAdvertiser(email: string): Promise<void>;
    rejectWebsite(websiteId: bigint): Promise<Website>;
    removeFromBlacklist(domain: string): Promise<void>;
    resumeCampaign(campaignId: bigint): Promise<void>;
    reviewFlaggedDomain(domain: string, action: Variant_remove_approve_block): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchWebsites(searchQuery: string): Promise<Array<Website>>;
    setAdsEnabled(enabled: boolean): Promise<void>;
    submitWebsite(url: string, title: string, description: string, keywords: Array<string>): Promise<Website>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCampaign(campaignId: bigint, name: string, budget: bigint, dailyBudget: bigint, bidAmount: bigint, keywords: Array<string>, destinationUrl: string): Promise<Campaign>;
    verifyDomain(websiteId: bigint): Promise<boolean>;
}
