import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Ad {
    id: bigint;
    matchType: MatchType;
    clicks: bigint;
    title: string;
    createdAt: bigint;
    impressions: bigint;
    description: string;
    bidAmount: bigint;
    keywords: Array<string>;
    adGroupId: bigint;
    destinationUrl: string;
    negativeKeywords: Array<string>;
}
export type Result_2 = {
    __kind__: "ok";
    ok: {
        orderId: string;
        amount: bigint;
        keyId: string;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface AdvertiserWallet {
    balance: bigint;
    createdAt: bigint;
    email: string;
    totalSpent: bigint;
}
export interface AdvertiserProfile {
    status: AdvertiserStatus;
    appliedAt: bigint;
    balance: bigint;
    reviewedAt?: bigint;
    email: string;
}
export interface Stats {
    total: bigint;
    pending: bigint;
    approved: bigint;
}
export type Result_1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface Transaction {
    id: bigint;
    createdAt: bigint;
    type: TransactionType;
    email: string;
    amount: bigint;
    reason: TransactionReason;
}
export interface SecurityLog {
    id: bigint;
    logType: string;
    timestamp: bigint;
    details: string;
    principalText: string;
}
export interface Page {
    id: bigint;
    url: string;
    status: PageStatus;
    websiteId: bigint;
    addedAt: bigint;
}
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
export interface BlacklistEntry {
    status: BlacklistStatus;
    domain: string;
    reviewedBy?: string;
    addedAt: bigint;
    reason: string;
}
export interface Website {
    id: bigint;
    url: string;
    status: WebsiteStatus;
    clicks: bigint;
    title: string;
    indexStatus: IndexStatus;
    spamScore: bigint;
    ownerId: string;
    ownerPrincipal?: Principal;
    approvedAt?: bigint;
    verificationToken: string;
    lastVerifiedAt?: bigint;
    ownershipStatus: OwnershipStatus;
    impressions: bigint;
    submittedAt: bigint;
    description: string;
    verificationExpiryAt?: bigint;
    isSeed: boolean;
    keywords: Array<string>;
    seoScore: bigint;
    isVerified: boolean;
    lastCheckedAt?: bigint;
    lastCrawledAt?: bigint;
    ownerHistory: Array<string>;
    verificationStatus: VerificationStatus;
    adminBoost: bigint;
    sitemapUrl?: string;
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
export interface AdMatchResult {
    ad: Ad;
    keywordScore: bigint;
}
export type Result = {
    __kind__: "ok";
    ok: AdvertiserWallet;
} | {
    __kind__: "err";
    err: string;
};
export interface DiscoverFeed {
    popularDomains: Array<Website>;
    recentlyIndexed: Array<Website>;
    trending: Array<Website>;
    recommendedForYou: Array<Website>;
}
export interface UserProfile {
    email: string;
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
export enum IndexStatus {
    pending = "pending",
    error = "error",
    notIndexed = "notIndexed",
    indexed = "indexed"
}
export enum MatchType {
    exact = "exact",
    broad = "broad",
    phrase = "phrase"
}
export enum OwnershipStatus {
    active = "active",
    expired = "expired",
    reclaimed = "reclaimed"
}
export enum PageStatus {
    pending = "pending",
    error = "error",
    indexed = "indexed"
}
export enum TransactionReason {
    topup = "topup",
    ad_click = "ad_click",
    refund = "refund"
}
export enum TransactionType {
    credit = "credit",
    debit = "debit"
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
export enum VerificationStatus {
    verified = "verified",
    expired = "expired",
    pending = "pending"
}
export enum WebsiteStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export interface backendInterface {
    addAdvertiserBalance(email: string, amount: bigint): Promise<void>;
    addBalance(email: string, amount: bigint): Promise<Result>;
    addToBlacklist(domain: string, reason: string): Promise<void>;
    addToCrawlQueue(websiteId: bigint): Promise<void>;
    applyForAdvertiser(email: string): Promise<void>;
    approveAdvertiser(email: string): Promise<void>;
    approveWebsite(websiteId: bigint): Promise<Website>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkAndQueueRecrawl(): Promise<bigint>;
    createCampaign(email: string, name: string, budget: bigint, dailyBudget: bigint, bidAmount: bigint, keywords: Array<string>, destinationUrl: string): Promise<Campaign>;
    createRazorpayOrder(email: string, amount: bigint): Promise<Result_2>;
    createWallet(email: string): Promise<AdvertiserWallet>;
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
    getCrawlQueue(): Promise<Array<[bigint, bigint]>>;
    getDiscoverFeed(emailOpt: string | null): Promise<DiscoverFeed>;
    getFlaggedDomains(): Promise<Array<BlacklistEntry>>;
    getMyAdvertiserProfile(email: string): Promise<AdvertiserProfile | null>;
    getMyCampaigns(email: string): Promise<Array<Campaign>>;
    getMyWebsites(): Promise<Array<Website>>;
    getMyWebsitesByEmail(email: string): Promise<Array<Website>>;
    getPagesForWebsite(websiteId: bigint): Promise<Array<Page>>;
    getPendingWebsites(): Promise<Array<Website>>;
    getSecurityLogs(): Promise<Array<SecurityLog>>;
    getStats(): Promise<Stats>;
    getTransactions(email: string): Promise<Array<Transaction>>;
    getUserClickHistory(email: string): Promise<Array<string>>;
    getUserInterests(email: string): Promise<Array<string>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSearchHistory(email: string): Promise<Array<string>>;
    getVerificationToken(websiteId: bigint): Promise<string>;
    getWallet(email: string): Promise<AdvertiserWallet | null>;
    importSeedData(entries: Array<SeedEntry>): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    pauseCampaign(campaignId: bigint): Promise<void>;
    rankAds(searchQuery: string): Promise<Array<AdMatchResult>>;
    recalculateAllSpamScores(): Promise<bigint>;
    recalculateSpamScore(websiteId: bigint): Promise<bigint>;
    reclaimDomain(websiteId: bigint, newOwnerEmail: string): Promise<Website>;
    recordAdClick(campaignId: bigint, userSession: string): Promise<Result_1>;
    recordAdClickV2(adId: bigint, userSession: string): Promise<Result_1>;
    recordAdImpression(campaignId: bigint): Promise<void>;
    recordAdImpressionV2(adId: bigint): Promise<void>;
    recordClick(url: string): Promise<void>;
    recordImpression(url: string): Promise<void>;
    recordUserClick(email: string, url: string): Promise<void>;
    recordUserSearch(email: string, searchQuery: string): Promise<void>;
    refreshUserInterests(email: string): Promise<void>;
    rejectAdvertiser(email: string): Promise<void>;
    rejectWebsite(websiteId: bigint): Promise<Website>;
    removeFromBlacklist(domain: string): Promise<void>;
    requestIndexing(websiteId: bigint, pageUrl: string): Promise<Website>;
    resumeCampaign(campaignId: bigint): Promise<void>;
    reviewFlaggedDomain(domain: string, action: Variant_remove_approve_block): Promise<void>;
    runCrawler(): Promise<bigint>;
    runOwnershipCleanup(): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchWebsites(searchQuery: string, emailOpt: string | null): Promise<Array<Website>>;
    setAdminBoost(websiteId: bigint, boost: bigint): Promise<Website>;
    setAdsEnabled(enabled: boolean): Promise<void>;
    submitWebsite(ownerId: string, url: string, title: string, description: string, keywords: Array<string>): Promise<Website>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCampaign(campaignId: bigint, name: string, budget: bigint, dailyBudget: bigint, bidAmount: bigint, keywords: Array<string>, destinationUrl: string): Promise<Campaign>;
    updateLastCrawledAt(websiteId: bigint): Promise<void>;
    updatePageStatus(pageId: bigint, status: PageStatus): Promise<void>;
    updateSitemap(websiteId: bigint, sitemapUrl: string): Promise<Website>;
    verifyDomain(websiteId: bigint): Promise<boolean>;
    verifyRazorpayPayment(email: string, orderId: string, paymentId: string, signature: string, amount: bigint): Promise<Result>;
}
