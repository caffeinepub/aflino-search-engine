import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Outcall "mo:caffeineai-http-outcalls/outcall";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

import Array "mo:core/Array";
import Iter "mo:core/Iter";


actor {

  // ─── Authorization Mixin ──────────────────────────────────────────────────

  var accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ─── Types ────────────────────────────────────────────────────────────────

  public type Result<A,B> = { #ok : A; #err : B };

  public type WebsiteStatus = { #pending; #approved; #rejected };

  public type IndexStatus = { #notIndexed; #pending; #indexed; #error };

  public type OwnershipStatus = { #active; #expired; #reclaimed };

  public type VerificationStatus = { #pending; #verified; #expired };

  // ─── Legacy type (V1) ────────────────────────────────────────────────────
  type WebsiteV1 = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    ownerPrincipal : Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
  };

  // ─── V2 type ─────────────────────────────────────────────────────────────
  type WebsiteV2 = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    ownerPrincipal : Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
    indexStatus : IndexStatus;
    sitemapUrl : ?Text;
    lastCheckedAt : ?Int;
    lastCrawledAt : ?Int;
  };

  // ─── Legacy type (V3) - used for stable var migration ───────────────────
  type WebsiteV3Legacy = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    ownerId : Text;
    ownerPrincipal : ?Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
    indexStatus : IndexStatus;
    sitemapUrl : ?Text;
    lastCheckedAt : ?Int;
    lastCrawledAt : ?Int;
    ownershipStatus : OwnershipStatus;
    verificationStatus : VerificationStatus;
    lastVerifiedAt : ?Int;
    verificationExpiryAt : ?Int;
    ownerHistory : [Text];
  };

  // ─── Legacy type (V4) - used for V5 migration ───────────────────────────
  type WebsiteV4Legacy = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    ownerId : Text;
    ownerPrincipal : ?Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
    indexStatus : IndexStatus;
    sitemapUrl : ?Text;
    lastCheckedAt : ?Int;
    lastCrawledAt : ?Int;
    ownershipStatus : OwnershipStatus;
    verificationStatus : VerificationStatus;
    lastVerifiedAt : ?Int;
    verificationExpiryAt : ?Int;
    ownerHistory : [Text];
    adminBoost : Nat;
  };

  // ─── Legacy Website type (V5) - used for V6 migration ───────────────────
  type WebsiteV5Legacy = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    ownerId : Text;
    ownerPrincipal : ?Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
    indexStatus : IndexStatus;
    sitemapUrl : ?Text;
    lastCheckedAt : ?Int;
    lastCrawledAt : ?Int;
    ownershipStatus : OwnershipStatus;
    verificationStatus : VerificationStatus;
    lastVerifiedAt : ?Int;
    verificationExpiryAt : ?Int;
    ownerHistory : [Text];
    adminBoost : Nat;
    clicks : Nat;
    impressions : Nat;
  };


  // ─── Legacy Website type (V6) - used for V7 migration ───────────────────
  type WebsiteV6Legacy = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    ownerId : Text;
    ownerPrincipal : ?Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
    indexStatus : IndexStatus;
    sitemapUrl : ?Text;
    lastCheckedAt : ?Int;
    lastCrawledAt : ?Int;
    ownershipStatus : OwnershipStatus;
    verificationStatus : VerificationStatus;
    lastVerifiedAt : ?Int;
    verificationExpiryAt : ?Int;
    ownerHistory : [Text];
    adminBoost : Nat;
    clicks : Nat;
    impressions : Nat;
    spamScore : Nat;
  };

  // ─── Current Website type (V7) ────────────────────────────────────────────
  public type Website = {
    id : Nat;
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
    status : WebsiteStatus;
    // V3: email-based owner identifier (primary)
    ownerId : Text;
    // V3: optional Principal for future Internet Identity upgrade
    ownerPrincipal : ?Principal;
    verificationToken : Text;
    isVerified : Bool;
    isSeed : Bool;
    submittedAt : Int;
    approvedAt : ?Int;
    // Search Center fields (V2)
    indexStatus : IndexStatus;
    sitemapUrl : ?Text;
    lastCheckedAt : ?Int;
    lastCrawledAt : ?Int;
    // Ownership & Expiry fields (V3)
    ownershipStatus : OwnershipStatus;
    verificationStatus : VerificationStatus;
    lastVerifiedAt : ?Int;
    verificationExpiryAt : ?Int;
    ownerHistory : [Text];
    // Ranking boost set by admin
    adminBoost : Nat;
    // Analytics (V5)
    clicks : Nat;
    impressions : Nat;
    // Spam Detection (V6)
    spamScore : Nat;
    // SEO Score (V7)
    seoScore : Nat;
  };

  public type PageStatus = { #pending; #indexed; #error };

  public type Page = {
    id : Nat;
    websiteId : Nat;
    url : Text;
    status : PageStatus;
    addedAt : Int;
  };

  public type SeedEntry = {
    url : Text;
    title : Text;
    description : Text;
    keywords : [Text];
  };

  public type Stats = {
    total : Nat;
    approved : Nat;
    pending : Nat;
  };

  public type SecurityLog = {
    id : Nat;
    timestamp : Int;
    logType : Text;
    principalText : Text;
    details : Text;
  };

  public type BlacklistStatus = { #flagged; #blocked };

  public type BlacklistEntry = {
    domain : Text;
    status : BlacklistStatus;
    reason : Text;
    addedAt : Int;
    reviewedBy : ?Text;
  };

  public type AdvertiserStatus = { #pending; #approved; #rejected };

  public type AdvertiserProfile = {
    email : Text;
    status : AdvertiserStatus;
    balance : Nat;
    appliedAt : Int;
    reviewedAt : ?Int;
  };

  public type CampaignStatus = { #active; #paused; #ended };

  public type Campaign = {
    id : Nat;
    advertiserEmail : Text;
    name : Text;
    budget : Nat;
    dailyBudget : Nat;
    bidAmount : Nat;
    keywords : [Text];
    destinationUrl : Text;
    status : CampaignStatus;
    impressions : Nat;
    clicks : Nat;
    spend : Nat;
    createdAt : Int;
  };

  public type AdResult = {
    campaignId : Nat;
    name : Text;
    destinationUrl : Text;
    bidAmount : Nat;
    score : Nat;
  };

  // ─── New Ad Ranking Types (V2 Ad System) ─────────────────────────────────

  public type CampaignStatusV2 = { #active; #paused };

  public type CampaignV2 = {
    id : Nat;
    advertiserEmail : Text;
    name : Text;
    status : CampaignStatusV2;
    dailyBudget : Nat;
    totalBudget : Nat;
    spent : Nat;
    createdAt : Int;
  };

  public type MatchType = { #broad; #phrase; #exact };

  public type AdGroup = {
    id : Nat;
    campaignId : Nat;
    name : Text;
  };

  public type Ad = {
    id : Nat;
    adGroupId : Nat;
    title : Text;
    description : Text;
    destinationUrl : Text;
    keywords : [Text];
    negativeKeywords : [Text];
    matchType : MatchType;
    bidAmount : Nat;
    clicks : Nat;
    impressions : Nat;
    createdAt : Int;
  };

  public type AdMatchResult = {
    ad : Ad;
    keywordScore : Nat;
  };

  public type UserProfile = {
    email : Text;
  };

  // ─── Wallet System Types ──────────────────────────────────────────────────

  public type AdvertiserWallet = {
    email : Text;
    balance : Nat;
    totalSpent : Nat;
    createdAt : Int;
  };

  public type TransactionType = { #credit; #debit };

  public type TransactionReason = { #topup; #ad_click; #refund };

  public type Transaction = {
    id : Nat;
    email : Text;
    amount : Nat;
    type_ : TransactionType;
    reason : TransactionReason;
    createdAt : Int;
  };

  // ─── Stable State ─────────────────────────────────────────────────────────

  var nextId : Nat = 1;

  // V1 stable var — read-only after migration
  var websites : [WebsiteV1] = [];

  // V2 stable var — intermediate migration storage
  var websitesV2 : [WebsiteV2] = [];

  // V3 stable var — legacy (migration only)
  var websitesV3 : [WebsiteV3Legacy] = [];

  // V4 stable var — legacy (migration only, renamed for V5 migration)
  var websitesV4 : [WebsiteV4Legacy] = [];

  // V5 stable var — legacy (migration only; type is WebsiteV5Legacy for canister compatibility)
  var websitesV5 : [WebsiteV5Legacy] = [];

  // V6 stable var — legacy (migration only)
  var websitesV6 : [WebsiteV6Legacy] = [];

  // V7 stable var — live array used by all runtime logic (Website with seoScore)
  var websitesV7 : [Website] = [];

  var indexTerms : [(Text, [Nat])] = [];

  // Search Center: pages
  var pages : [Page] = [];
  var nextPageId : Nat = 1;

  // Security state
  var securityLogs : [SecurityLog] = [];
  var nextLogId : Nat = 1;
  var blacklist : [BlacklistEntry] = [];
  var abuseCounter : [(Text, Nat)] = [];
  var rateLimitData : [(Text, [Int])] = [];

  var clickCounts : [(Text, Nat)] = [];
  var impressionCounts : [(Text, Nat)] = [];

  var advertiserProfiles : [AdvertiserProfile] = [];
  var campaigns : [Campaign] = [];
  var campaignIdCounter : Nat = 1;
  var adsEnabled : Bool = false;
  var adClickCooldowns : [(Text, Int)] = [];

  // ─── V2 Ad System State ───────────────────────────────────────────────────
  var campaignsV2 : [CampaignV2] = [];
  var adGroups : [AdGroup] = [];
  var ads : [Ad] = [];
  var _campaignV2Counter : Nat = 1;
  var _adGroupCounter : Nat = 1;
  var _adCounter : Nat = 1;
  // Cooldown store for V2 ad clicks (key = userSession_adId)
  var adClickCooldownsV2 : [(Text, Int)] = [];

  var userProfiles : [(Principal, UserProfile)] = [];

  // Crawler queue V1 (legacy, migrated on postupgrade)
  var crawlQueue : [Nat] = [];

  // Crawler queue V2: priority-based queue [(priority, websiteId)]
  // Priority: New=100, Active=70, LowActivity=30
  var crawlQueueV2 : [(Nat, Nat)] = [];

  // ─── User Search History ─────────────────────────────────────────────────
  // Stores last 20 search queries per user (keyed by email)
  stable var userSearchHistory : [(Text, [Text])] = [];

  // ─── User Click History ──────────────────────────────────────────────────
  // Stores last 30 clicked URLs per user (keyed by email)
  stable var userClickHistory : [(Text, [Text])] = [];

  // ─── User Interest Profile ────────────────────────────────────────────────
  // Top-10 keywords per user, recomputed on click or every 4th search
  stable var userInterests : [(Text, [Text])] = [];

  // ─── User Search Count ────────────────────────────────────────────────────
  // Tracks cumulative search count per user for throttled recomputation
  stable var userSearchCount : [(Text, Nat)] = [];

  // ─── Wallet System State ──────────────────────────────────────────────────
  // Keyed by email; balance is the single source of truth for ad billing.
  var wallets : [(Text, AdvertiserWallet)] = [];
  var walletTransactions : [Transaction] = [];
  var nextTransactionId : Nat = 1;

  // ─── Razorpay Deduplication Store ─────────────────────────────────────────
  // Stores processed Razorpay order IDs to prevent double-spend.
  // MUST be stable so IDs survive canister upgrades — prevents replay attacks.
  stable var processedOrderIds : [Text] = [];

  // ─── Migration helpers ────────────────────────────────────────────────────

  func migrateV1toV2(w : WebsiteV1) : WebsiteV2 {
    {
      id             = w.id;
      url            = w.url;
      title          = w.title;
      description    = w.description;
      keywords       = w.keywords;
      status         = w.status;
      ownerPrincipal = w.ownerPrincipal;
      verificationToken = w.verificationToken;
      isVerified     = w.isVerified;
      isSeed         = w.isSeed;
      submittedAt    = w.submittedAt;
      approvedAt     = w.approvedAt;
      indexStatus    = #notIndexed;
      sitemapUrl     = null;
      lastCheckedAt  = null;
      lastCrawledAt  = null;
    }
  };

  func migrateV2toV3(w : WebsiteV2) : WebsiteV3Legacy {
    {
      id             = w.id;
      url            = w.url;
      title          = w.title;
      description    = w.description;
      keywords       = w.keywords;
      status         = w.status;
      ownerId        = w.ownerPrincipal.toText();
      ownerPrincipal = ?w.ownerPrincipal;
      verificationToken = w.verificationToken;
      isVerified     = w.isVerified;
      isSeed         = w.isSeed;
      submittedAt    = w.submittedAt;
      approvedAt     = w.approvedAt;
      indexStatus    = w.indexStatus;
      sitemapUrl     = w.sitemapUrl;
      lastCheckedAt  = w.lastCheckedAt;
      lastCrawledAt  = w.lastCrawledAt;
      ownershipStatus    = #active;
      verificationStatus = if (w.isVerified) { #verified } else { #pending };
      lastVerifiedAt     = null;
      verificationExpiryAt = null;
      ownerHistory       = [];
    }
  };


  func migrateV3toV4(w : WebsiteV3Legacy) : WebsiteV4Legacy {
    {
      id                  = w.id;
      url                 = w.url;
      title               = w.title;
      description         = w.description;
      keywords            = w.keywords;
      status              = w.status;
      ownerId             = w.ownerId;
      ownerPrincipal      = w.ownerPrincipal;
      verificationToken   = w.verificationToken;
      isVerified          = w.isVerified;
      isSeed              = w.isSeed;
      submittedAt         = w.submittedAt;
      approvedAt          = w.approvedAt;
      indexStatus         = w.indexStatus;
      sitemapUrl          = w.sitemapUrl;
      lastCheckedAt       = w.lastCheckedAt;
      lastCrawledAt       = w.lastCrawledAt;
      ownershipStatus     = w.ownershipStatus;
      verificationStatus  = w.verificationStatus;
      lastVerifiedAt      = w.lastVerifiedAt;
      verificationExpiryAt = w.verificationExpiryAt;
      ownerHistory        = w.ownerHistory;
      adminBoost          = 0;
    }
  };

  func migrateV4toV5Legacy(w : WebsiteV4Legacy, clicks : Nat, impressions : Nat) : WebsiteV5Legacy {
    {
      id                   = w.id;
      url                  = w.url;
      title                = w.title;
      description          = w.description;
      keywords             = w.keywords;
      status               = w.status;
      ownerId              = w.ownerId;
      ownerPrincipal       = w.ownerPrincipal;
      verificationToken    = w.verificationToken;
      isVerified           = w.isVerified;
      isSeed               = w.isSeed;
      submittedAt          = w.submittedAt;
      approvedAt           = w.approvedAt;
      indexStatus          = w.indexStatus;
      sitemapUrl           = w.sitemapUrl;
      lastCheckedAt        = w.lastCheckedAt;
      lastCrawledAt        = w.lastCrawledAt;
      ownershipStatus      = w.ownershipStatus;
      verificationStatus   = w.verificationStatus;
      lastVerifiedAt       = w.lastVerifiedAt;
      verificationExpiryAt = w.verificationExpiryAt;
      ownerHistory         = w.ownerHistory;
      adminBoost           = w.adminBoost;
      clicks               = clicks;
      impressions          = impressions;
    }
  };

  func migrateV5toV6(w : WebsiteV5Legacy) : WebsiteV6Legacy {
    {
      id                   = w.id;
      url                  = w.url;
      title                = w.title;
      description          = w.description;
      keywords             = w.keywords;
      status               = w.status;
      ownerId              = w.ownerId;
      ownerPrincipal       = w.ownerPrincipal;
      verificationToken    = w.verificationToken;
      isVerified           = w.isVerified;
      isSeed               = w.isSeed;
      submittedAt          = w.submittedAt;
      approvedAt           = w.approvedAt;
      indexStatus          = w.indexStatus;
      sitemapUrl           = w.sitemapUrl;
      lastCheckedAt        = w.lastCheckedAt;
      lastCrawledAt        = w.lastCrawledAt;
      ownershipStatus      = w.ownershipStatus;
      verificationStatus   = w.verificationStatus;
      lastVerifiedAt       = w.lastVerifiedAt;
      verificationExpiryAt = w.verificationExpiryAt;
      ownerHistory         = w.ownerHistory;
      adminBoost           = w.adminBoost;
      clicks               = w.clicks;
      impressions          = w.impressions;
      spamScore            = 0; // default 0 for existing sites
    }
  };

  // Run full migration chain on upgrade
  system func postupgrade() {
    // Step 1: V1 -> V2
    if (websitesV2.size() == 0 and websites.size() > 0) {
      websitesV2 := websites.map(migrateV1toV2);
      websites := [];
    };
    // Step 2: V2 -> V3
    if (websitesV3.size() == 0 and websitesV2.size() > 0) {
      websitesV3 := websitesV2.map(migrateV2toV3);
      websitesV2 := [];
    };
    // Step 3: V3 -> V4 (adds adminBoost field)
    if (websitesV4.size() == 0 and websitesV3.size() > 0) {
      websitesV4 := websitesV3.map(migrateV3toV4);
      websitesV3 := [];
    };
    // Step 4: Migrate crawlQueue [Nat] -> crawlQueueV2 [(Nat, Nat)]
    if (crawlQueueV2.size() == 0 and crawlQueue.size() > 0) {
      crawlQueueV2 := Array.tabulate<(Nat, Nat)>(crawlQueue.size(), func(i : Nat) : (Nat, Nat) { (70, crawlQueue[i]) });
      crawlQueue := [];
    };
    // Step 5: V4 -> V5 (adds clicks and impressions fields, migrates from external arrays)
    if (websitesV5.size() == 0 and websitesV4.size() > 0) {
      websitesV5 := websitesV4.map(func(w : WebsiteV4Legacy) : WebsiteV5Legacy {
        var clicks : Nat = 0;
        var impressions : Nat = 0;
        for ((u, c) in clickCounts.vals()) {
          if (u == w.url) { clicks := c };
        };
        for ((u, c) in impressionCounts.vals()) {
          if (u == w.url) { impressions := c };
        };
        migrateV4toV5Legacy(w, clicks, impressions)
      });
      websitesV4 := [];
    };
    // Step 6: V5 (WebsiteV5Legacy) -> V6 (WebsiteV6Legacy with spamScore)
    if (websitesV6.size() == 0 and websitesV5.size() > 0) {
      websitesV6 := websitesV5.map(migrateV5toV6);
      websitesV5 := [];
    };
    // Step 7: V6 (WebsiteV6Legacy) -> V7 (Website with seoScore)
    if (websitesV7.size() == 0 and websitesV6.size() > 0) {
      websitesV7 := websitesV6.map(func(w : WebsiteV6Legacy) : Website {
        {
          id                   = w.id;
          url                  = w.url;
          title                = w.title;
          description          = w.description;
          keywords             = w.keywords;
          status               = w.status;
          ownerId              = w.ownerId;
          ownerPrincipal       = w.ownerPrincipal;
          verificationToken    = w.verificationToken;
          isVerified           = w.isVerified;
          isSeed               = w.isSeed;
          submittedAt          = w.submittedAt;
          approvedAt           = w.approvedAt;
          indexStatus          = w.indexStatus;
          sitemapUrl           = w.sitemapUrl;
          lastCheckedAt        = w.lastCheckedAt;
          lastCrawledAt        = w.lastCrawledAt;
          ownershipStatus      = w.ownershipStatus;
          verificationStatus   = w.verificationStatus;
          lastVerifiedAt       = w.lastVerifiedAt;
          verificationExpiryAt = w.verificationExpiryAt;
          ownerHistory         = w.ownerHistory;
          adminBoost           = w.adminBoost;
          clicks               = w.clicks;
          impressions          = w.impressions;
          spamScore            = w.spamScore;
          seoScore             = 0; // default for existing sites
        }
      });
      websitesV6 := [];
    };
    // AdSync KYC migration: migrate legacy records (with proof-status fields) into V2 (simplified)
    if (adSyncKycRecordsV2.size() == 0 and adSyncKycRecords.size() > 0) {
      adSyncKycRecordsV2 := adSyncKycRecords.map<(Text, AdSyncKycRecordLegacy), (Text, AdSyncKycRecord)>(
        func(entry) {
          let r = entry.1;
          (entry.0, {
            syncId        = r.syncId;
            status        = r.status;
            submittedAt   = r.submittedAt;
            verifiedAt    = r.verifiedAt;
            adminNotes    = r.adminNotes;
            lastUpdatedAt = r.lastUpdatedAt;
          })
        }
      );
      adSyncKycRecords := [];
    };
  };

  // ─── Auto-expiry helper ───────────────────────────────────────────────────

  // Check if a site's verification has expired (used before critical actions)
  func checkAndExpireSite(siteId : Nat) {
    let now = Time.now();
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == siteId and not w.isSeed) {
        switch (w.verificationExpiryAt) {
          case (?expiry) {
            if (now > expiry) {
              { w with
                ownershipStatus    = #expired;
                verificationStatus = #expired;
                isVerified         = false;
              }
            } else { w }
          };
          case (null) { w };
        };
      } else { w }
    });
  };

  // ─── User Profile Management ──────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.find(func(entry : (Principal, UserProfile)) : Bool { entry.0 == caller }).map(func(entry) : UserProfile { entry.1 });
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.find(func(entry : (Principal, UserProfile)) : Bool { entry.0 == user }).map(func(entry) : UserProfile { entry.1 });
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    var found = false;
    userProfiles := userProfiles.map<(Principal, UserProfile), (Principal, UserProfile)>(
      func(entry) {
        if (entry.0 == caller) {
          found := true;
          (caller, profile);
        } else {
          entry;
        };
      }
    );
    if (not found) {
      userProfiles := userProfiles.concat([(caller, profile)]);
    };
  };

  // ─── Security Logging ─────────────────────────────────────────────────────

  func addLog(logType : Text, principalText : Text, details : Text) {
    let entry : SecurityLog = {
      id = nextLogId;
      timestamp = Time.now();
      logType;
      principalText;
      details;
    };
    nextLogId += 1;
    if (securityLogs.size() >= 1000) {
      let keepFrom = nextLogId / 2;
      securityLogs := securityLogs.filter(func(e : SecurityLog) : Bool { e.id >= keepFrom });
    };
    securityLogs := securityLogs.concat([entry]);
  };

  // ─── Rate Limiting ────────────────────────────────────────────────────────

  func getRateLimitTimestamps(key : Text) : [Int] {
    for ((k, ts) in rateLimitData.vals()) {
      if (k == key) return ts;
    };
    [];
  };

  func setRateLimitTimestamps(key : Text, timestamps : [Int]) {
    var found = false;
    rateLimitData := rateLimitData.map<(Text, [Int]), (Text, [Int])>(
      func(entry) {
        if (entry.0 == key) { found := true; (entry.0, timestamps) } else { entry };
      }
    );
    if (not found) {
      rateLimitData := rateLimitData.concat([(key, timestamps)]);
    };
  };

  func checkRateLimit(callerPrincipal : Text, bucket : Text, limit : Nat, windowSecs : Int) {
    let key = callerPrincipal # ":" # bucket;
    let now = Time.now();
    let windowNs = windowSecs * 1_000_000_000;
    let cutoff = now - windowNs;
    let existing = getRateLimitTimestamps(key);
    let recent = existing.filter(func(t : Int) : Bool { t > cutoff });
    if (recent.size() >= limit) {
      addLog("RATE_LIMIT_EXCEEDED", callerPrincipal, "Bucket: " # bucket # " limit: " # limit.toText());
      Runtime.trap("Rate limit exceeded. Please wait before trying again.");
    };
    setRateLimitTimestamps(key, recent.concat([now]));
  };

  // ─── Domain Extraction ────────────────────────────────────────────────────

  func extractDomain(url : Text) : Text {
    var stripped = url;
    if (stripped.startsWith(#text "https://") or stripped.startsWith(#text "http://")) {
      let schemeIter = stripped.split(#text "://");
      ignore schemeIter.next();
      switch (schemeIter.next()) {
        case (?rest) { stripped := rest };
        case null {};
      };
    };
    let parts = stripped.split(#char '/');
    switch (parts.next()) {
      case (?domain) { domain.toLower() };
      case null { stripped.toLower() };
    }
  };

  // ─── Input Validation & Sanitization ─────────────────────────────────────

  let INJECTION_PATTERNS : [Text] = [
    "<script", "</script", "eval(", "javascript:", "<iframe",
    "</iframe", "drop table", "select * from", "insert into",
    "union select", "<img ", "onerror=", "onload=", "onclick=",
    "alert(", "document.cookie", "window.location",
  ];

  func containsInjection(text : Text) : Bool {
    let lower = text.toLower();
    for (pattern in INJECTION_PATTERNS.vals()) {
      if (lower.contains(#text pattern)) return true;
    };
    false
  };

  func validateUrl(url : Text, caller : Text) {
    if (url.size() == 0 or url.size() > 500) {
      addLog("SUSPICIOUS_INPUT", caller, "Invalid URL length: " # url.size().toText());
      Runtime.trap("Invalid input");
    };
    if (not url.startsWith(#text "http://") and not url.startsWith(#text "https://")) {
      addLog("SUSPICIOUS_INPUT", caller, "URL missing scheme");
      Runtime.trap("Invalid input");
    };
    if (containsInjection(url)) {
      addLog("SUSPICIOUS_INPUT", caller, "Injection attempt in URL");
      Runtime.trap("Invalid input");
    };
  };

  func validateTitle(title : Text, caller : Text) {
    if (title.size() == 0 or title.size() > 200) {
      addLog("SUSPICIOUS_INPUT", caller, "Invalid title length");
      Runtime.trap("Invalid input");
    };
    if (containsInjection(title)) {
      addLog("SUSPICIOUS_INPUT", caller, "Injection attempt in title");
      Runtime.trap("Invalid input");
    };
  };

  func validateDescription(desc : Text, caller : Text) {
    if (desc.size() > 2000) {
      addLog("SUSPICIOUS_INPUT", caller, "Description too long");
      Runtime.trap("Invalid input");
    };
    if (containsInjection(desc)) {
      addLog("SUSPICIOUS_INPUT", caller, "Injection attempt in description");
      Runtime.trap("Invalid input");
    };
  };

  func validateKeywords(kws : [Text], caller : Text) {
    if (kws.size() > 20) {
      addLog("SUSPICIOUS_INPUT", caller, "Too many keywords: " # kws.size().toText());
      Runtime.trap("Invalid input");
    };
    for (kw in kws.vals()) {
      if (kw.size() > 50 or containsInjection(kw)) {
        addLog("SUSPICIOUS_INPUT", caller, "Invalid keyword");
        Runtime.trap("Invalid input");
      };
    };
  };

  func countOccurrences(haystack : Text, needle : Text) : Nat {
    if (needle.size() == 0) return 0;
    var count = 0;
    var remaining = haystack;
    label scan loop {
      if (remaining.contains(#text needle)) {
        count += 1;
        let parts = remaining.split(#text needle);
        ignore parts.next();
        switch (parts.next()) {
          case (?tail) { remaining := tail };
          case null { break scan };
        };
      } else {
        break scan;
      };
    };
    count
  };

  func detectKeywordStuffing(title : Text, description : Text, keywords : [Text], caller : Text) {
    if (keywords.size() > 15) {
      addLog("ABUSE_DETECTED", caller, "Keyword stuffing: " # keywords.size().toText() # " keywords");
      Runtime.trap("Invalid input");
    };
    let combined = (title # " " # description).toLower();
    for (kw in keywords.vals()) {
      let lkw = kw.toLower();
      if (lkw.size() > 0) {
        if (countOccurrences(combined, lkw) >= 5) {
          addLog("ABUSE_DETECTED", caller, "Keyword stuffing detected for: " # kw);
          Runtime.trap("Invalid input");
        };
      };
    };
  };

  // ─── Blacklist ────────────────────────────────────────────────────────────

  func getDomainAbuse(domain : Text) : Nat {
    for ((d, count) in abuseCounter.vals()) {
      if (d == domain) return count;
    };
    0
  };

  func incrementDomainAbuse(domain : Text) {
    var found = false;
    abuseCounter := abuseCounter.map<(Text, Nat), (Text, Nat)>(
      func(entry) {
        if (entry.0 == domain) { found := true; (entry.0, entry.1 + 1) } else { entry };
      }
    );
    if (not found) {
      abuseCounter := abuseCounter.concat([(domain, 1)]);
    };
  };

  func isDomainBlocked(domain : Text) : Bool {
    for (entry in blacklist.vals()) {
      if (entry.domain == domain) {
        switch (entry.status) {
          case (#blocked) return true;
          case (_) return false;
        };
      };
    };
    false
  };

  func isDomainInBlacklist(domain : Text) : Bool {
    for (entry in blacklist.vals()) {
      if (entry.domain == domain) return true;
    };
    false
  };

  func autoFlagDomain(domain : Text, caller : Text) {
    let count = getDomainAbuse(domain);
    if (count >= 3 and not isDomainInBlacklist(domain)) {
      let entry : BlacklistEntry = {
        domain;
        status = #flagged;
        reason = "Auto-flagged: repeated abuse (" # count.toText() # " violations)";
        addedAt = Time.now();
        reviewedBy = null;
      };
      blacklist := blacklist.concat([entry]);
      addLog("AUTO_FLAGGED", caller, "Domain auto-flagged: " # domain);
    };
  };

  func checkBlacklist(url : Text, caller : Text) {
    let domain = extractDomain(url);
    if (isDomainBlocked(domain)) {
      addLog("DOMAIN_BLACKLISTED", caller, "Blocked domain access attempt: " # domain);
      Runtime.trap("Domain is blocked");
    };
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  func generateToken(id : Nat) : Text {
    "aflino-verify-" # id.toText() # "-" # Time.now().toText()
  };

  func tokenize(text : Text) : [Text] {
    let lower = text.toLower();
    let parts = lower.split(#predicate(func(c : Char) : Bool {
      c == ' ' or c == ',' or c == '.' or c == '-' or c == '_' or c == '/' or c == ':'
    }));
    parts.toArray().filter(func(t : Text) : Bool { t.size() > 1 })
  };

  func getIndexMap() : Map.Map<Text, [Nat]> {
    let m = Map.empty<Text, [Nat]>();
    for ((term, ids) in indexTerms.vals()) {
      m.add(term, ids);
    };
    m
  };

  func addToIndex(site : Website) {
    let m = getIndexMap();
    func addTerms(terms : [Text]) {
      for (term in terms.vals()) {
        let existing = m.get(term).get([]);
        if (not existing.any(func(id : Nat) : Bool { id == site.id })) {
          m.add(term, existing.concat([site.id]));
        };
      };
    };
    addTerms(tokenize(site.title));
    addTerms(tokenize(site.description));
    for (kw in site.keywords.vals()) { addTerms(tokenize(kw)) };
    indexTerms := m.entries().toArray();
  };

  func removeFromIndex(siteId : Nat) {
    let updated = indexTerms.map(
      func(entry) {
        (entry.0, entry.1.filter(func(id : Nat) : Bool { id != siteId }))
      }
    );
    indexTerms := updated.filter(func(entry) : Bool { entry.1.size() > 0 });
  };

  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      addLog("AUTH_FAILURE", caller.toText(), "Unauthorized admin access attempt");
      Runtime.trap("Unauthorized");
    };
  };

  func requireRegistered(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Must be logged in");
    };
    switch (AccessControl.getUserRole(accessControlState, caller)) {
      case (#guest) { Runtime.trap("User is not registered") };
      case (_) {};
    };
  };

  // ─── Wallet Helpers ───────────────────────────────────────────────────────

  func getWalletInternal(email : Text) : ?AdvertiserWallet {
    for ((k, w) in wallets.vals()) {
      if (k == email) { return ?w };
    };
    null
  };

  func createWalletInternal(email : Text) : AdvertiserWallet {
    switch (getWalletInternal(email)) {
      case (?existing) { return existing };
      case (null) {};
    };
    let wallet : AdvertiserWallet = {
      email;
      balance = 0;
      totalSpent = 0;
      createdAt = Time.now();
    };
    wallets := wallets.concat([(email, wallet)]);
    wallet
  };

  func appendTransaction(email : Text, amount : Nat, type_ : TransactionType, reason : TransactionReason) {
    let tx : Transaction = {
      id = nextTransactionId;
      email;
      amount;
      type_;
      reason;
      createdAt = Time.now();
    };
    nextTransactionId += 1;
    walletTransactions := walletTransactions.concat([tx]);
  };

  // Private: deduct bidAmount from wallet; auto-creates wallet with balance=0 if missing.
  // Returns #err if balance < bidAmount or amount == 0.
  func deductOnClick(email : Text, bidAmount : Nat) : Result<(), Text> {
    if (bidAmount == 0) { return #err("Invalid deduction amount") };
    // Auto-create wallet if not found (with balance=0)
    let wallet : AdvertiserWallet = switch (getWalletInternal(email)) {
      case (?w) { w };
      case (null) { createWalletInternal(email) };
    };
    if (wallet.balance < bidAmount) {
      return #err("Insufficient balance");
    };
    let updated : AdvertiserWallet = {
      wallet with
      balance    = wallet.balance - bidAmount;
      totalSpent = wallet.totalSpent + bidAmount;
    };
    var found = false;
    wallets := wallets.map<(Text, AdvertiserWallet), (Text, AdvertiserWallet)>(
      func(entry) {
        if (entry.0 == email) {
          found := true;
          (email, updated)
        } else { entry }
      }
    );
    if (not found) {
      wallets := wallets.concat([(email, updated)]);
    };
    appendTransaction(email, bidAmount, #debit, #ad_click);
    #ok(())
  };

  // ─── Wallet Public API ────────────────────────────────────────────────────

  // Returns existing wallet or null (does NOT auto-create on read).
  public query func getWallet(email : Text) : async ?AdvertiserWallet {
    getWalletInternal(email)
  };

  // Creates wallet if not exists and returns it.
  public shared func createWallet(email : Text) : async AdvertiserWallet {
    if (email.size() == 0 or email.size() > 200) {
      Runtime.trap("Invalid email");
    };
    createWalletInternal(email)
  };

  // Admin-only: top up wallet, creates it if missing, records credit transaction.
  public shared ({ caller }) func addBalance(email : Text, amount : Nat) : async Result<AdvertiserWallet, Text> {
    requireAdmin(caller);
    if (amount == 0) { return #err("Amount must be greater than 0") };
    if (email.size() == 0 or email.size() > 200) { return #err("Invalid email") };
    // Auto-create wallet if not found
    ignore createWalletInternal(email);
    var updated : ?AdvertiserWallet = null;
    wallets := wallets.map<(Text, AdvertiserWallet), (Text, AdvertiserWallet)>(
      func(entry) {
        if (entry.0 == email) {
          let w : AdvertiserWallet = {
            entry.1 with
            balance = entry.1.balance + amount;
          };
          updated := ?w;
          (email, w)
        } else { entry }
      }
    );
    switch (updated) {
      case (null) { #err("Wallet not found") };
      case (?w) {
        appendTransaction(email, amount, #credit, #topup);
        #ok(w)
      };
    };
  };

  // Returns all transactions for a given email, sorted by createdAt descending.
  public query func getTransactions(email : Text) : async [Transaction] {
    let txs = walletTransactions.filter(func(tx : Transaction) : Bool { tx.email == email });
    txs.sort(func(a : Transaction, b : Transaction) : { #less; #equal; #greater } {
      if (a.createdAt > b.createdAt) #less
      else if (a.createdAt < b.createdAt) #greater
      else #equal
    })
  };

  // ─── Razorpay Config ──────────────────────────────────────────────────────
  // Key Secret is NEVER logged, returned in responses, or exposed anywhere.
  let RAZORPAY_KEY_ID     : Text = "rzp_test_xxxxxxxx";
  let RAZORPAY_KEY_SECRET : Text = "rzp_secret_xxxxxxxx";
  let RAZORPAY_ORDERS_URL : Text = "https://api.razorpay.com/v1/orders";

  // ─── Base64 Encoding (for Basic Auth header) ──────────────────────────────
  // Standard Base64 alphabet
  let BASE64_CHARS : [Char] = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P',
    'Q','R','S','T','U','V','W','X','Y','Z',
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p',
    'q','r','s','t','u','v','w','x','y','z',
    '0','1','2','3','4','5','6','7','8','9','+','/'
  ];

  func base64Encode(input : [Nat8]) : Text {
    var result = "";
    let len = input.size();
    var i = 0;
    while (i + 2 < len) {
      let b0 = Nat.fromNat8(input[i]);
      let b1 = Nat.fromNat8(input[i + 1]);
      let b2 = Nat.fromNat8(input[i + 2]);
      let idx0 = b0 / 4;
      let idx1 = ((b0 % 4) * 16) + (b1 / 16);
      let idx2 = ((b1 % 16) * 4) + (b2 / 64);
      let idx3 = b2 % 64;
      result := result # Text.fromChar(BASE64_CHARS[idx0])
                       # Text.fromChar(BASE64_CHARS[idx1])
                       # Text.fromChar(BASE64_CHARS[idx2])
                       # Text.fromChar(BASE64_CHARS[idx3]);
      i += 3;
    };
    let rem = len - i;
    if (rem == 1) {
      let b0 = Nat.fromNat8(input[i]);
      result := result # Text.fromChar(BASE64_CHARS[b0 / 4])
                       # Text.fromChar(BASE64_CHARS[(b0 % 4) * 16])
                       # "==";
    } else if (rem == 2) {
      let b0 = Nat.fromNat8(input[i]);
      let b1 = Nat.fromNat8(input[i + 1]);
      result := result # Text.fromChar(BASE64_CHARS[b0 / 4])
                       # Text.fromChar(BASE64_CHARS[((b0 % 4) * 16) + (b1 / 16)])
                       # Text.fromChar(BASE64_CHARS[(b1 % 16) * 4])
                       # "=";
    };
    result
  };

  func textToBytes(t : Text) : [Nat8] {
    let blob = t.encodeUtf8();
    blob.toArray()
  };

  func base64EncodeText(t : Text) : Text {
    base64Encode(textToBytes(t))
  };

  // ─── SHA-256 Implementation (pure Motoko) ─────────────────────────────────
  // Standard SHA-256 per FIPS 180-4.
  // Uses Nat32 for all word operations to match SHA-256 word size.

  let SHA256_K : [Nat32] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  func rotr32(x : Nat32, n : Nat32) : Nat32 {
    (x >> n) | (x << (32 - n))
  };

  func sha256Compress(h : [var Nat32], w : [var Nat32]) {
    var a = h[0]; var b = h[1]; var c = h[2]; var d = h[3];
    var e = h[4]; var f = h[5]; var g = h[6]; var hh = h[7];
    var i : Nat = 0;
    while (i < 64) {
      let s1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      let ch = (e & f) ^ ((^e) & g);
      let temp1 = hh +% s1 +% ch +% SHA256_K[i] +% w[i];
      let s0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      let maj = (a & b) ^ (a & c) ^ (b & c);
      let temp2 = s0 +% maj;
      hh := g; g := f; f := e; e := d +% temp1;
      d := c; c := b; b := a; a := temp1 +% temp2;
      i += 1;
    };
    h[0] +%= a; h[1] +%= b; h[2] +%= c; h[3] +%= d;
    h[4] +%= e; h[5] +%= f; h[6] +%= g; h[7] +%= hh;
  };

  func sha256Pad(msgBytes : [Nat8]) : [[Nat8]] {
    let msgLen = msgBytes.size();
    // bit length as 8-byte big-endian
    let bitLen : Nat = msgLen * 8;
    // Padding: 1 byte 0x80, then zeros, then 8-byte length
    // Total padded length must be multiple of 64
    let padLen : Nat = if ((msgLen + 9) % 64 == 0) { 0 } else { 64 - ((msgLen + 9) % 64) };
    let totalLen : Nat = msgLen + 1 + padLen + 8;
    let padded = Array.tabulate(totalLen, func(i : Nat) : Nat8 {
      if (i < msgLen) { msgBytes[i] }
      else if (i == msgLen) { 0x80 }
      else if (i < msgLen + 1 + padLen) { 0x00 }
      else {
        // 8-byte big-endian bit length
        // offset 0 = most-significant byte (bits 56-63 of bitLen)
        let byteOffset = i - (msgLen + 1 + padLen);
        let shift : Nat = (7 - byteOffset) * 8;
        // Extract byte at given shift position
        let divisor = Nat.pow(2, shift);
        Nat8.fromNat((bitLen / divisor) % 256)
      }
    });
    // Split into 64-byte chunks
    let numChunks = totalLen / 64;
    Array.tabulate<[Nat8]>(numChunks, func(ci : Nat) : [Nat8] {
      Array.tabulate<Nat8>(64, func(j : Nat) : Nat8 { padded[ci * 64 + j] })
    })
  };

  func sha256(msgBytes : [Nat8]) : [Nat8] {
    let h : [var Nat32] = [var
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    let chunks = sha256Pad(msgBytes);
    for (chunk in chunks.vals()) {
      // Build message schedule
      let w : [var Nat32] = [var
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
      ];
      var wi : Nat = 0;
      while (wi < 16) {
        let j = wi * 4;
        w[wi] := (Nat32.fromNat(chunk[j].toNat())     << 24) |
                 (Nat32.fromNat(chunk[j + 1].toNat()) << 16) |
                 (Nat32.fromNat(chunk[j + 2].toNat()) << 8)  |
                  Nat32.fromNat(chunk[j + 3].toNat());
        wi += 1;
      };
      while (wi < 64) {
        let s0 = rotr32(w[wi - 15], 7) ^ rotr32(w[wi - 15], 18) ^ (w[wi - 15] >> 3);
        let s1 = rotr32(w[wi - 2],  17) ^ rotr32(w[wi - 2],  19) ^ (w[wi - 2]  >> 10);
        w[wi] := w[wi - 16] +% s0 +% w[wi - 7] +% s1;
        wi += 1;
      };
      sha256Compress(h, w);
    };
    // Convert hash words to bytes (big-endian)
    Array.tabulate<Nat8>(32, func(i : Nat) : Nat8 {
      let word = h[i / 4];
      let shift : Nat32 = Nat32.fromNat((3 - (i % 4)) * 8);
      Nat8.fromNat(((word >> shift) & 0xff).toNat())
    })
  };

  // ─── HMAC-SHA256 Implementation (pure Motoko) ─────────────────────────────
  // Standard HMAC per RFC 2104. Block size = 64 bytes, hash output = 32 bytes.

  func hmacSha256(keyBytes : [Nat8], msgBytes : [Nat8]) : [Nat8] {
    let blockSize = 64;

    // Step 1: Normalize key to exactly blockSize bytes
    var key : [Nat8] = if (keyBytes.size() > blockSize) {
      // Key longer than block: hash it first
      let hashed = sha256(keyBytes);
      Array.tabulate<Nat8>(blockSize, func(i : Nat) : Nat8 {
        if (i < hashed.size()) { hashed[i] } else { 0x00 }
      })
    } else {
      // Key shorter or equal: pad with zeros
      Array.tabulate<Nat8>(blockSize, func(i : Nat) : Nat8 {
        if (i < keyBytes.size()) { keyBytes[i] } else { 0x00 }
      })
    };

    // Step 2: ipad = key XOR 0x36 (repeated)
    let ipad : [Nat8] = Array.tabulate<Nat8>(blockSize, func(i : Nat) : Nat8 {
      key[i] ^ 0x36
    });

    // Step 3: opad = key XOR 0x5C (repeated)
    let opad : [Nat8] = Array.tabulate<Nat8>(blockSize, func(i : Nat) : Nat8 {
      key[i] ^ 0x5c
    });

    // Step 4: inner = SHA256(ipad || message)
    let innerInput : [Nat8] = ipad.concat(msgBytes);
    let innerHash  : [Nat8] = sha256(innerInput);

    // Step 5: outer = SHA256(opad || inner)
    let outerInput : [Nat8] = opad.concat(innerHash);
    sha256(outerInput)
  };

  // ─── Hex Encoding ─────────────────────────────────────────────────────────
  let HEX_CHARS : [Char] = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];

  func toHex(bytes : [Nat8]) : Text {
    var result = "";
    for (b in bytes.vals()) {
      let hi = Nat.fromNat8(b) / 16;
      let lo = Nat.fromNat8(b) % 16;
      result := result # Text.fromChar(HEX_CHARS[hi]) # Text.fromChar(HEX_CHARS[lo]);
    };
    result
  };

  // Constant-time comparison: iterates ALL bytes regardless of early mismatch.
  // Prevents timing attacks on signature verification.
  func constantTimeEqual(a : Text, b : Text) : Bool {
    let aBytes = textToBytes(a);
    let bBytes = textToBytes(b);
    if (aBytes.size() != bBytes.size()) { return false };
    var diff : Nat8 = 0;
    var i = 0;
    while (i < aBytes.size()) {
      diff := diff | (aBytes[i] ^ bBytes[i]);
      i += 1;
    };
    diff == 0
  };

  // ─── Razorpay: Create Order ───────────────────────────────────────────────
  // Creates a Razorpay order via HTTP outcall.
  // Amount in paise (100 = ₹1). Min 100, max 100_000_000.
  // Returns { orderId, keyId, amount } on success.
  public shared func createRazorpayOrder(email : Text, amount : Nat) : async Result<{ orderId : Text; keyId : Text; amount : Nat }, Text> {
    // ── Validate amount ──────────────────────────────────────────────────────
    if (amount < 100) { return #err("Minimum amount is 100 paise (₹1)") };
    if (amount > 100_000_000) { return #err("Maximum amount is 100000000 paise (₹10,00,000)") };
    if (email.size() == 0 or email.size() > 200) { return #err("Invalid email") };

    // ── Build Basic Auth header (Key ID:Key Secret as Base64) ────────────────
    // Secret is used internally here only — never returned or logged.
    let credentials = base64EncodeText(RAZORPAY_KEY_ID # ":" # RAZORPAY_KEY_SECRET);
    let authHeader = "Basic " # credentials;

    // ── Build JSON body ──────────────────────────────────────────────────────
    let receipt = email # "_" # Time.now().toText();
    let requestBody = "{\"amount\":" # amount.toText()
      # ",\"currency\":\"INR\",\"receipt\":\""
      # receipt # "\"}";

    let headers : [Outcall.Header] = [
      { name = "Authorization";  value = authHeader },
      { name = "Content-Type";   value = "application/json" },
    ];

    try {
      let responseText = await Outcall.httpPostRequest(
        RAZORPAY_ORDERS_URL,
        headers,
        requestBody,
        transform
      );

      // ── Parse orderId from JSON response ─────────────────────────────────
      // Response format: {"id":"order_xxx","entity":"order","amount":...,...}
      // Extract the "id" field value
      if (not responseText.contains(#text "\"id\":\"")) {
        return #err("Failed to create order: " # responseText.size().toText() # " bytes returned");
      };
      let afterId = responseText.split(#text "\"id\":\"");
      ignore afterId.next();
      switch (afterId.next()) {
        case (null) { return #err("Could not parse order ID") };
        case (?rest) {
          let parts = rest.split(#text "\"");
          switch (parts.next()) {
            case (null) { return #err("Could not parse order ID value") };
            case (?orderId) {
              if (orderId.size() == 0) { return #err("Empty order ID returned") };
              #ok({ orderId; keyId = RAZORPAY_KEY_ID; amount })
            };
          }
        };
      }
    } catch (_) {
      #err("HTTP outcall failed — check network or Razorpay credentials")
    }
  };

  // ─── Razorpay: Verify Payment ─────────────────────────────────────────────
  // Verifies HMAC-SHA256 signature and credits wallet ONLY after verification.
  // Signature = HMAC-SHA256(orderId | "|" | paymentId, KEY_SECRET).
  // Deduplicates by orderId to prevent double-spend.
  public shared func verifyRazorpayPayment(
    email     : Text,
    orderId   : Text,
    paymentId : Text,
    signature : Text,
    amount    : Nat
  ) : async Result<AdvertiserWallet, Text> {
    // ── Input validation ─────────────────────────────────────────────────────
    if (email.size() == 0 or email.size() > 200) { return #err("Invalid email") };
    if (orderId.size() == 0 or orderId.size() > 100) { return #err("Invalid order ID") };
    if (paymentId.size() == 0 or paymentId.size() > 100) { return #err("Invalid payment ID") };
    if (signature.size() == 0 or signature.size() > 200) { return #err("Invalid signature") };
    if (amount < 100) { return #err("Minimum amount is 100 paise") };
    if (amount > 100_000_000) { return #err("Amount out of range") };

    // ── Deduplication: reject already-processed order IDs ────────────────────
    for (oid in processedOrderIds.vals()) {
      if (oid == orderId) { return #err("Order already processed") };
    };

    // ── HMAC-SHA256 signature verification ───────────────────────────────────
    // Razorpay signature = HMAC_SHA256(orderId + "|" + paymentId, KEY_SECRET)
    let message     : Text  = orderId # "|" # paymentId;
    let keyBytes    : [Nat8] = textToBytes(RAZORPAY_KEY_SECRET);
    let msgBytes    : [Nat8] = textToBytes(message);
    let computedHmac : [Nat8] = hmacSha256(keyBytes, msgBytes);
    let computedHex  : Text   = toHex(computedHmac);

    // Constant-time comparison — never short-circuits on mismatch
    if (not constantTimeEqual(computedHex, signature)) {
      return #err("Invalid payment signature");
    };

    // ── Mark order as processed (deduplication) ────────────────────────────
    processedOrderIds := processedOrderIds.concat([orderId]);

    // ── Credit wallet ─────────────────────────────────────────────────────────
    ignore createWalletInternal(email);
    var updated : ?AdvertiserWallet = null;
    wallets := wallets.map<(Text, AdvertiserWallet), (Text, AdvertiserWallet)>(
      func(entry) {
        if (entry.0 == email) {
          let w : AdvertiserWallet = {
            entry.1 with
            balance = entry.1.balance + amount;
          };
          updated := ?w;
          (email, w)
        } else { entry }
      }
    );
    switch (updated) {
      case (null) { return #err("Wallet update failed") };
      case (?wallet) {
        // Record credit transaction (reason = #topup, reusing existing variant)
        appendTransaction(email, amount, #credit, #topup);
        #ok(wallet)
      };
    }
  };

  // ─── Ranking Helpers ─────────────────────────────────────────────────────

  // Integer log base-2 approximation (floor): log2(n+1)
  // Used for click popularity: approximates log(clicks+1)*10 in integer math
  func logApprox(n : Nat) : Nat {
    if (n == 0) return 0;
    var v = n;
    var bits : Nat = 0;
    while (v > 0) { v /= 2; bits += 1 };
    // log2(n+1) * 10, scaled to approximate natural log * 10
    // ln(x) ≈ log2(x) / 1.4427 → multiply log2 by ~7 to approximate ln * 10
    bits * 7
  };

  // Spam detection: returns true if any single keyword appears 3+ times in combined text
  func isSpammy(title : Text, description : Text, keywords : [Text]) : Bool {
    let combined = (title # " " # description).toLower();
    for (kw in keywords.vals()) {
      let lkw = kw.toLower();
      if (lkw.size() > 1 and countOccurrences(combined, lkw) >= 3) {
        return true;
      };
    };
    false
  };

  // ─── Spam Score Calculation (0-100) ──────────────────────────────────────
  // Future-ready: designed for ML signal integration and user spam reports.
  // Score components:
  //   +30: keyword stuffing (3+ keyword occurrences in title+description)
  //   +25: suspicious URL (length > 100 OR high ratio of non-alpha chars)
  //   +20: low-quality content (description empty or < 20 chars)
  //   +25: repeated domain submissions (same domain 3+ times in websitesV7)
  // Seed sites always return 0 (trusted).
  func calculateSpamScore(url : Text, title : Text, description : Text, keywords : [Text], isSeed : Bool) : Nat {
    if (isSeed) { return 0 }; // Seed/admin sites are always trusted
    var score : Nat = 0;

    // Signal 1: Keyword stuffing (+30)
    if (isSpammy(title, description, keywords)) {
      score += 30;
    };

    // Signal 2: Suspicious URL (+25)
    // Too long OR high proportion of non-alphanumeric chars (random strings)
    let urlLen = url.size();
    if (urlLen > 100) {
      score += 25;
    } else {
      // Count non-alpha chars in URL (excluding common safe chars: :/.-_~?=#@%)
      let urlLower = url.toLower();
      var nonAlpha : Nat = 0;
      var total : Nat = 0;
      for (c in urlLower.chars()) {
        total += 1;
        let isAlphaNum = (c >= 'a' and c <= 'z') or (c >= '0' and c <= '9');
        let isSafe = c == ':' or c == '/' or c == '.' or c == '-' or c == '_' or c == '~' or c == '?' or c == '=' or c == '#' or c == '@' or c == '%';
        if (not isAlphaNum and not isSafe) {
          nonAlpha += 1;
        };
      };
      // If more than 20% of URL chars are non-alpha/non-safe → suspicious
      if (total > 0 and (nonAlpha * 100) / total > 20) {
        score += 25;
      };
    };

    // Signal 3: Low-quality content (+20)
    let descSize = description.trim(#char ' ').size();
    if (descSize < 20) {
      score += 20;
    };

    // Signal 4: Repeated domain submissions (+25)
    // Count how many times this domain has been submitted (any status except seed)
    let domain = extractDomain(url);
    var domainCount : Nat = 0;
    for (site in websitesV7.vals()) {
      if (not site.isSeed and extractDomain(site.url) == domain) {
        domainCount += 1;
      };
    };
    if (domainCount >= 3) {
      score += 25;
    };

    // Cap at 100
    if (score > 100) { 100 } else { score }
  };
  // ─── SEO Score Calculation (0–100) ────────────────────────────────────────
  // Score components (each worth 20 points):
  //   +20: Title length optimal (30–60 chars)
  //   +20: Description present and meaningful (>= 50 chars)
  //   +20: Keywords relevant (>= 3 keywords provided)
  //   +20: HTTPS enabled (URL starts with https://)
  //   +20: Page freshness (approved within last 90 days)
  // Seed sites always return 100 (fully trusted, no SEO concerns).
  func calculateSeoScore(url : Text, title : Text, description : Text, keywords : [Text], approvedAt : ?Int, isSeed : Bool) : Nat {
    if (isSeed) { return 100 };
    var score : Nat = 0;

    // Signal 1: Title length optimal (30–60 chars) → +20
    let titleLen = title.trim(#char ' ').size();
    if (titleLen >= 30 and titleLen <= 60) {
      score += 20;
    };

    // Signal 2: Description present and meaningful (>= 50 chars) → +20
    let descLen = description.trim(#char ' ').size();
    if (descLen >= 50) {
      score += 20;
    };

    // Signal 3: Keywords relevant (>= 3 keywords) → +20
    if (keywords.size() >= 3) {
      score += 20;
    };

    // Signal 4: HTTPS enabled → +20
    if (url.startsWith(#text "https://")) {
      score += 20;
    };

    // Signal 5: Page freshness (approved within last 90 days) → +20
    let ninetyDaysNs : Int = 90 * 24 * 60 * 60 * 1_000_000_000;
    let now = Time.now();
    switch (approvedAt) {
      case (?at) {
        if (now - at < ninetyDaysNs) {
          score += 20;
        };
      };
      case (null) {};
    };

    score
  };





  // ─── Query Intent Classification ─────────────────────────────────────────

  type QueryIntent = {
    #transactional;
    #informational;
    #navigational;
    #general;
  };

  func classifyIntent(qLower : Text, sites : [Website]) : QueryIntent {
    // Transactional keywords
    let transactionalWords : [Text] = ["buy", "price", "cheap", "order", "shop", "deal"];
    for (w in transactionalWords.vals()) {
      if (qLower.contains(#text w)) { return #transactional };
    };
    // Informational keywords
    let informationalWords : [Text] = ["how", "what", "why", "when", "where", "guide", "tutorial"];
    for (w in informationalWords.vals()) {
      if (qLower.contains(#text w)) { return #informational };
    };
    // Navigational: query matches a site title or is contained in a site URL
    for (site in sites.vals()) {
      if (site.title.toLower() == qLower) { return #navigational };
      if (site.url.toLower().contains(#text qLower)) { return #navigational };
    };
    #general
  };

  // ─── Search (Algorithm-Based Ranking) ─────────────────────────────────────

  public query func searchWebsites(searchQuery : Text, emailOpt : ?Text) : async [Website] {
    // ── Resolve user interests for personalization ───────────────────────
    let userInterestKeywords : [Text] = switch (emailOpt) {
      case (null) { [] };
      case (?email) {
        var found : [Text] = [];
        for (entry in userInterests.vals()) {
          if (entry.0 == email) { found := entry.1 };
        };
        found
      };
    };
    let trimmed = searchQuery.trim(#char ' ');
    if (trimmed.size() == 0) { return [] };
    if (trimmed.size() > 200) { return [] };
    if (containsInjection(trimmed)) { return [] };

    let qLower = trimmed.toLower();
    let terms = tokenize(trimmed);
    let now = Time.now();
    // 30 days in nanoseconds for freshness boost
    let thirtyDaysNs : Int = 2_592_000_000_000_000;

    // ── 1. Filter eligible sites (approved + active/verified + not expired + not extreme spam) ───
    let eligibleSites = websitesV7.filter(func(w : Website) : Bool {
      if (w.status != #approved) return false;
      if (w.isSeed) return true; // seed sites always shown
      // Exclude extreme spam (spamScore > 90) from all results
      if (w.spamScore > 90) return false;
      switch (w.verificationStatus) {
        case (#verified) {
          switch (w.ownershipStatus) {
            case (#expired) false;
            case (_) true;
          };
        };
        case (_) false;
      };
    });

    // ── 2. Classify query intent ─────────────────────────────────────────────
    let intent : QueryIntent = classifyIntent(qLower, eligibleSites);

    // ── 3. Score each eligible site ───────────────────────────────────────────
    let scoreMap = Map.empty<Nat, Int>();

    for (site in eligibleSites.vals()) {
      var score : Int = 0;
      let titleLower = site.title.toLower();
      let descLower  = site.description.toLower();
      let urlLower   = site.url.toLower();

      // ── Title scoring (Navigational: 2x) ─────────────────────────────────
      if (titleLower == qLower) {
        let base = 50;
        score += (if (intent == #navigational) base * 2 else base);
      } else if (titleLower.contains(#text qLower)) {
        let base = 30;
        score += (if (intent == #navigational) base * 2 else base);
      } else {
        var titleTermMatch = false;
        for (term in terms.vals()) {
          if (titleLower.contains(#text term)) { titleTermMatch := true };
        };
        if (titleTermMatch) { score += 15 };
      };

      // ── Description scoring (Informational: 2x) ───────────────────────────
      var descMatch = false;
      if (descLower.contains(#text qLower)) {
        descMatch := true;
      } else {
        for (term in terms.vals()) {
          if (descLower.contains(#text term)) { descMatch := true };
        };
      };
      if (descMatch) {
        let base = 20;
        score += (if (intent == #informational) base * 2 else base);
      };

      // ── URL keyword scoring (Transactional: 2x, Navigational: 2x) ─────────
      var urlMatch = false;
      if (urlLower.contains(#text qLower)) {
        urlMatch := true;
      } else {
        for (term in terms.vals()) {
          if (urlLower.contains(#text term)) { urlMatch := true };
        };
      };
      if (urlMatch) {
        let base = 25;
        score += (if (intent == #transactional or intent == #navigational) base * 2 else base);
      };

      // ── Keywords field scoring (Transactional: 2x) ────────────────────────
      var kwMatch = false;
      for (kw in site.keywords.vals()) {
        let kwLower = kw.toLower();
        if (kwLower.contains(#text qLower) or qLower.contains(#text kwLower)) {
          kwMatch := true;
        } else {
          for (term in terms.vals()) {
            if (kwLower.contains(#text term)) { kwMatch := true };
          };
        };
      };
      if (kwMatch) {
        let base = 15;
        score += (if (intent == #transactional) base * 2 else base);
      };

      // ── Freshness boost (+10 if approved within last 30 days) ─────────────
      switch (site.approvedAt) {
        case (?approvedAt) {
          if (now - approvedAt < thirtyDaysNs) { score += 10 };
        };
        case (null) {};
      };

      // ── Click popularity: score += log(clicks + 1) * 10 ──────────────────
      let clicks = site.clicks;
      score += logApprox(clicks);

      // ── CTR boost: score += (clicks / impressions) * 20 ──────────────────
      let impressions = site.impressions;
      if (impressions > 0) {
        // Integer math: CTR * 20 = (clicks * 20) / impressions
        score += (clicks * 20) / impressions;
      };

      // ── Trust factors ──────────────────────────────────────────────────────
      if (site.isVerified) { score += 20 };
      switch (site.ownershipStatus) {
        case (#active) { score += 10 };
        case (_) {};
      };

      // ── Spam penalty (stored spamScore, recalculated at submission/approval/edit) ─
      // spamScore > 70: strong penalty (-50); spamScore > 90: excluded above
      if (site.spamScore > 70) {
        score -= 50;
      };

      // ── Interest-based personalization ────────────────────────────────────
      if (userInterestKeywords.size() > 0) {
        var matchCount : Nat = 0;
        for (interestKw in userInterestKeywords.vals()) {
          if (interestKw.size() > 0) {
            let ikwLower = interestKw.toLower();
            for (siteKw in site.keywords.vals()) {
              if (siteKw.toLower() == ikwLower) {
                matchCount += 1;
              };
            };
          };
        };
        if (matchCount >= 3) {
          // Strong match: 3 or more interest keywords match site keywords
          score += 25;
        } else if (matchCount >= 1) {
          // Match: at least 1 interest keyword matches
          score += 15;
        };
      };

      // ── Admin boost ────────────────────────────────────────────────────────
      score += site.adminBoost;

      // ── SEO score boost (V7): finalScore += seoScore * 0.2 ──────────────
      // Integer math: seoScore * 0.2 = seoScore / 5
      score += site.seoScore / 5;

      // Only include sites with a positive relevance signal
      if (score > 0) {
        scoreMap.add(site.id, score);
      };
    };

    // ── 4-6. Collect, deduplicate by domain, and sort ─────────────────────────
    // Use mutable arrays for deduplication to avoid tuple-lambda inference issues
    var dedupDomains : [var Text] = [var];
    var dedupSitesArr : [var Website] = [var];
    var dedupScoresArr : [var Int] = [var];
    var dedupCount : Nat = 0;

    for (site in eligibleSites.vals()) {
      switch (scoreMap.get(site.id)) {
        case (null) {};
        case (?siteScore) {
          let domain = extractDomain(site.url);
          var found = false;
          var foundIdx = 0;
          var i = 0;
          while (i < dedupCount) {
            if (dedupDomains[i] == domain) { found := true; foundIdx := i };
            i += 1;
          };
          if (not found) {
            // Grow arrays by one slot
            let newDomains  = Array.tabulate(dedupCount + 1, func(j : Nat) : Text    { if (j < dedupCount) dedupDomains[j]   else domain });
            let newSites    = Array.tabulate(dedupCount + 1, func(j : Nat) : Website { if (j < dedupCount) dedupSitesArr[j]  else site });
            let newScores   = Array.tabulate(dedupCount + 1, func(j : Nat) : Int     { if (j < dedupCount) dedupScoresArr[j] else siteScore });
            dedupDomains    := newDomains.toVarArray();
            dedupSitesArr   := newSites.toVarArray();
            dedupScoresArr  := newScores.toVarArray();
            dedupCount += 1;
          } else {
            if (siteScore > dedupScoresArr[foundIdx]) {
              dedupSitesArr[foundIdx]  := site;
              dedupScoresArr[foundIdx] := siteScore;
            };
          };
        };
      };
    };

    // Build immutable arrays from mutable
    let finalSites  : [Website] = Array.tabulate(dedupCount, func(i : Nat) : Website { dedupSitesArr[i] });
    let finalScores : [Int]     = Array.tabulate(dedupCount, func(i : Nat) : Int     { dedupScoresArr[i] });

    // Sort by score descending using index array
    var idxArr : [Nat] = Array.tabulate(dedupCount, func(i : Nat) : Nat { i });
    let sortedIdx = idxArr.sort(func(a : Nat, b : Nat) : { #less; #equal; #greater } {
      if (finalScores[a] > finalScores[b]) #less
      else if (finalScores[a] < finalScores[b]) #greater
      else #equal
    });
    sortedIdx.map(func(idx : Nat) : Website { finalSites[idx] })
  };

  // ─── Website Submission (Ownership-Aware) ─────────────────────────────────

  public shared ({ caller }) func submitWebsite(
    ownerId : Text,
    url : Text,
    title : Text,
    description : Text,
    keywords : [Text]
  ) : async Website {
    requireRegistered(caller);
    let callerText = caller.toText();

    checkRateLimit(callerText, "submit", 5, 60);

    if (ownerId.size() == 0 or ownerId.size() > 200) {
      Runtime.trap("Invalid owner identifier");
    };

    validateUrl(url, callerText);
    validateTitle(title, callerText);
    validateDescription(description, callerText);
    validateKeywords(keywords, callerText);
    detectKeywordStuffing(title, description, keywords, callerText);

    checkBlacklist(url, callerText);

    let domain = extractDomain(url);

    // Ownership-aware duplicate domain check
    for (site in websitesV7.vals()) {
      if (extractDomain(site.url) == domain and site.status != #rejected) {
        let isActiveAndVerified = switch (site.ownershipStatus) {
          case (#active) {
            switch (site.verificationStatus) {
              case (#verified) { true };
              case (_) { false };
            };
          };
          case (_) { false };
        };
        let isExpired = switch (site.ownershipStatus) {
          case (#expired) { true };
          case (_) {
            switch (site.verificationStatus) {
              case (#expired) { true };
              case (_) { false };
            };
          };
        };
        if (isActiveAndVerified) {
          incrementDomainAbuse(domain);
          autoFlagDomain(domain, callerText);
          Runtime.trap("This domain is already registered and actively verified.");
        };
        if (isExpired) {
          Runtime.trap("This domain was previously registered. Please verify ownership to claim it.");
        };
        // If pending/unverified — block to prevent duplicate pending entries
        incrementDomainAbuse(domain);
        autoFlagDomain(domain, callerText);
        Runtime.trap("This domain is already registered by another user");
      };
    };

    let id = nextId;
    nextId += 1;
    let spam = calculateSpamScore(url, title, description, keywords, false);
    let seo = calculateSeoScore(url, title, description, keywords, null, false);
    let site : Website = {
      id;
      url;
      title;
      description;
      keywords;
      status = #pending;
      ownerId;
      ownerPrincipal = ?caller;
      verificationToken = generateToken(id);
      isVerified = false;
      isSeed = false;
      submittedAt = Time.now();
      approvedAt = null;
      indexStatus = #notIndexed;
      sitemapUrl = null;
      lastCheckedAt = null;
      lastCrawledAt = null;
      ownershipStatus = #active;
      verificationStatus = #pending;
      lastVerifiedAt = null;
      verificationExpiryAt = null;
      ownerHistory = [];
      adminBoost = 0;
      clicks = 0;
      impressions = 0;
      spamScore = spam;
      seoScore = seo;
    };
    websitesV7 := websitesV7.concat([site]);
    site
  };

  public query ({ caller }) func getMyWebsites() : async [Website] {
    requireRegistered(caller);
    websitesV7.filter(func(w : Website) : Bool {
      switch (w.ownerPrincipal) {
        case (?p) { p == caller };
        case (null) { false };
      }
    })
  };

  // Email-based website lookup (V3 primary method)
  public query ({ caller }) func getMyWebsitesByEmail(email : Text) : async [Website] {
    requireRegistered(caller);
    websitesV7.filter(func(w : Website) : Bool { w.ownerId == email })
  };

  // ─── Domain Verification ──────────────────────────────────────────────────

  public query ({ caller }) func getVerificationToken(websiteId : Nat) : async Text {
    requireRegistered(caller);
    checkAndExpireSite(websiteId);
    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Not found") };
      case (?site) {
        let isOwner = switch (site.ownerPrincipal) {
          case (?p) { p == caller };
          case (null) { false };
        };
        if (not isOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
        site.verificationToken
      };
    }
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input)
  };

  // 90 days in nanoseconds
  let NINETY_DAYS_NS : Int = 7_776_000_000_000_000;

  public shared ({ caller }) func verifyDomain(websiteId : Nat) : async Bool {
    requireRegistered(caller);
    let callerText = caller.toText();
    checkAndExpireSite(websiteId);
    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Not found") };
      case (?site) {
        let isOwner = switch (site.ownerPrincipal) {
          case (?p) { p == caller };
          case (null) { false };
        };
        if (not isOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
        validateUrl(site.url, callerText);
        let verifyUrl = site.url # "/.well-known/aflino-verification.txt";
        try {
          let body = await Outcall.httpGetRequest(verifyUrl, [], transform);
          let token = site.verificationToken;
          let verified = body.contains(#text token);
          if (verified) {
            let now = Time.now();
            websitesV7 := websitesV7.map(func(w : Website) : Website {
              if (w.id == websiteId) {
                { w with
                  isVerified = true;
                  verificationStatus = #verified;
                  ownershipStatus = #active;
                  lastVerifiedAt = ?now;
                  verificationExpiryAt = ?(now + NINETY_DAYS_NS);
                }
              } else w
            });
          };
          verified
        } catch (_) {
          false
        }
      };
    }
  };

  // ─── Re-Claim Ownership ───────────────────────────────────────────────────

  public shared ({ caller }) func reclaimDomain(websiteId : Nat, newOwnerEmail : Text) : async Website {
    requireRegistered(caller);
    let callerText = caller.toText();

    if (newOwnerEmail.size() == 0 or newOwnerEmail.size() > 200) {
      Runtime.trap("Invalid email");
    };

    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) {
        // Only allow reclaim if ownership/verification is expired
        let canReclaim = switch (site.ownershipStatus) {
          case (#expired) { true };
          case (_) {
            switch (site.verificationStatus) {
              case (#expired) { true };
              case (_) { false };
            };
          };
        };
        if (not canReclaim) {
          Runtime.trap("Cannot reclaim: domain is actively owned and verified.");
        };
        let _now = Time.now();
        let newHistory = site.ownerHistory.concat([site.ownerId]);
        var updatedSite : ?Website = null;
        websitesV7 := websitesV7.map(func(w : Website) : Website {
          if (w.id == websiteId) {
            let updated = { w with
              ownerId        = newOwnerEmail;
              ownerPrincipal = ?caller;
              ownershipStatus    = #reclaimed;
              verificationStatus = #pending;
              isVerified         = false;
              lastVerifiedAt     = null;
              verificationExpiryAt = null;
              ownerHistory       = newHistory;
            };
            updatedSite := ?updated;
            updated
          } else w
        });
        switch (updatedSite) {
          case (null) { Runtime.trap("Website not found") };
          case (?s) {
            addLog("DOMAIN_RECLAIMED", callerText, "Website " # websiteId.toText() # " reclaimed by " # newOwnerEmail);
            s
          };
        };
      };
    }
  };

  // ─── Ownership Cleanup (Admin-triggered) ──────────────────────────────────

  public shared ({ caller }) func runOwnershipCleanup() : async Nat {
    requireAdmin(caller);
    let now = Time.now();
    var count = 0;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.isSeed) {
        // Seed sites bypass expiry system
        w
      } else {
        switch (w.verificationExpiryAt) {
          case (?expiry) {
            if (now > expiry) {
              count += 1;
              { w with
                ownershipStatus    = #expired;
                verificationStatus = #expired;
                isVerified         = false;
              }
            } else { w }
          };
          case (null) { w };
        };
      }
    });
    addLog("OWNERSHIP_CLEANUP", caller.toText(), "Marked " # count.toText() # " sites expired");
    count
  };

  // ─── Search Center: Sitemap Update ────────────────────────────────────────

  public shared ({ caller }) func updateSitemap(websiteId : Nat, sitemapUrl : Text) : async Website {
    requireRegistered(caller);
    let callerText = caller.toText();
    checkAndExpireSite(websiteId);

    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) {
        let isOwner = switch (site.ownerPrincipal) {
          case (?p) { p == caller };
          case (null) { false };
        };
        if (not isOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this website");
        };
        // Also check ownerId for email-based access
        ignore site;
      };
    };

    if (sitemapUrl.size() == 0 or sitemapUrl.size() > 500) {
      Runtime.trap("Invalid sitemap URL length");
    };
    if (not sitemapUrl.startsWith(#text "http://") and not sitemapUrl.startsWith(#text "https://")) {
      Runtime.trap("Sitemap URL must start with http:// or https://");
    };
    if (not sitemapUrl.endsWith(#text ".xml")) {
      Runtime.trap("Sitemap URL must end with .xml");
    };
    if (containsInjection(sitemapUrl)) {
      addLog("SUSPICIOUS_INPUT", callerText, "Injection attempt in sitemap URL");
      Runtime.trap("Invalid input");
    };

    var updatedSite : ?Website = null;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        // Recalculate spamScore and seoScore when sitemap is updated
        let spam = calculateSpamScore(w.url, w.title, w.description, w.keywords, w.isSeed);
        let seo = calculateSeoScore(w.url, w.title, w.description, w.keywords, w.approvedAt, w.isSeed);
        let updated = { w with sitemapUrl = ?sitemapUrl; spamScore = spam; seoScore = seo };
        updatedSite := ?updated;
        updated
      } else w
    });
    switch (updatedSite) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) { site };
    };
  };

  // ─── Search Center: URL Inspection & Request Indexing ─────────────────────

  public shared ({ caller }) func requestIndexing(websiteId : Nat, pageUrl : Text) : async Website {
    requireRegistered(caller);
    let callerText = caller.toText();
    checkAndExpireSite(websiteId);

    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) {
        let isOwner = switch (site.ownerPrincipal) {
          case (?p) { p == caller };
          case (null) { false };
        };
        if (not isOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You do not own this website");
        };
      };
    };

    validateUrl(pageUrl, callerText);

    let now = Time.now();
    var pageExists = false;
    pages := pages.map(func(p : Page) : Page {
      if (p.websiteId == websiteId and p.url == pageUrl) {
        pageExists := true;
        { p with status = #pending }
      } else p
    });
    if (not pageExists) {
      let newPage : Page = {
        id = nextPageId;
        websiteId;
        url = pageUrl;
        status = #pending;
        addedAt = now;
      };
      nextPageId += 1;
      pages := pages.concat([newPage]);
    };

    var updatedSite : ?Website = null;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with indexStatus = #pending; lastCheckedAt = ?now };
        updatedSite := ?updated;
        updated
      } else w
    });
    // Add websiteId to crawlQueueV2 with appropriate priority
    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (?site) { enqueueWithPriority(websiteId, getCrawlPriority(site)) };
      case (null) { enqueueWithPriority(websiteId, PRIORITY_NEW) };
    };

    switch (updatedSite) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) { site };
    };
  };

  public query ({ caller }) func getPagesForWebsite(websiteId : Nat) : async [Page] {
    requireRegistered(caller);
    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) {
        let isOwner = switch (site.ownerPrincipal) {
          case (?p) { p == caller };
          case (null) { false };
        };
        if (not isOwner and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
      };
    };
    pages.filter(func(p : Page) : Bool { p.websiteId == websiteId })
  };

  public shared ({ caller }) func updatePageStatus(pageId : Nat, status : PageStatus) : async () {
    requireAdmin(caller);
    var found = false;
    pages := pages.map(func(p : Page) : Page {
      if (p.id == pageId) { found := true; { p with status } } else p
    });
    if (not found) { Runtime.trap("Page not found") };
  };

  public shared ({ caller }) func updateLastCrawledAt(websiteId : Nat) : async () {
    requireAdmin(caller);
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) { { w with lastCrawledAt = ?Time.now() } } else w
    });
  };

  // ─── Admin: Manage Websites ───────────────────────────────────────────────

  public shared ({ caller }) func approveWebsite(websiteId : Nat) : async Website {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    var approvedSite : ?Website = null;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        // Recalculate spamScore and seoScore at approval time
        let approvedTime = Time.now();
        let spam = calculateSpamScore(w.url, w.title, w.description, w.keywords, w.isSeed);
        let seo = calculateSeoScore(w.url, w.title, w.description, w.keywords, ?approvedTime, w.isSeed);
        let updated = { w with
          status = #approved;
          approvedAt = ?approvedTime;
          ownershipStatus = #active;
          spamScore = spam;
          seoScore = seo;
        };
        approvedSite := ?updated;
        updated
      } else w
    });
    switch (approvedSite) {
      case (null) { Runtime.trap("Not found") };
      case (?site) { addToIndex(site); site };
    }
  };

  public shared ({ caller }) func rejectWebsite(websiteId : Nat) : async Website {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    var rejectedSite : ?Website = null;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with status = #rejected };
        rejectedSite := ?updated;
        updated
      } else w
    });
    removeFromIndex(websiteId);
    switch (rejectedSite) {
      case (null) { Runtime.trap("Not found") };
      case (?site) { site };
    }
  };

  public shared ({ caller }) func editWebsite(
    websiteId : Nat,
    title : Text,
    description : Text,
    keywords : [Text]
  ) : async Website {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    let callerText = caller.toText();
    validateTitle(title, callerText);
    validateDescription(description, callerText);
    validateKeywords(keywords, callerText);
    var editedSite : ?Website = null;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        // Recalculate spamScore and seoScore when title/description/keywords change
        let spam = calculateSpamScore(w.url, title, description, keywords, w.isSeed);
        let seo = calculateSeoScore(w.url, title, description, keywords, w.approvedAt, w.isSeed);
        let updated = { w with title; description; keywords; spamScore = spam; seoScore = seo };
        editedSite := ?updated;
        updated
      } else w
    });
    switch (editedSite) {
      case (null) { Runtime.trap("Not found") };
      case (?site) {
        if (site.status == #approved) {
          removeFromIndex(site.id);
          addToIndex(site);
        };
        site
      };
    }
  };

  public shared ({ caller }) func deleteWebsite(websiteId : Nat) : async () {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    websitesV7 := websitesV7.filter(func(w : Website) : Bool { w.id != websiteId });
    removeFromIndex(websiteId);
  };

  public shared ({ caller }) func setAdminBoost(websiteId : Nat, boost : Nat) : async Website {
    requireAdmin(caller);
    if (boost > 500) { Runtime.trap("Admin boost cannot exceed 500") };
    var updatedSite : ?Website = null;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with adminBoost = boost };
        updatedSite := ?updated;
        updated
      } else w
    });
    switch (updatedSite) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) {
        addLog("ADMIN_BOOST_SET", caller.toText(), "Website " # websiteId.toText() # " boost set to " # boost.toText());
        site
      };
    }
  };

  // ─── Spam Score: Admin recalculation ─────────────────────────────────────

  public shared ({ caller }) func recalculateSpamScore(websiteId : Nat) : async Nat {
    requireAdmin(caller);
    var newScore : Nat = 0;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let spam = calculateSpamScore(w.url, w.title, w.description, w.keywords, w.isSeed);
        let seo = calculateSeoScore(w.url, w.title, w.description, w.keywords, w.approvedAt, w.isSeed);
        newScore := spam;
        { w with spamScore = spam; seoScore = seo }
      } else w
    });
    addLog("SPAM_RECALC", caller.toText(), "Website " # websiteId.toText() # " spamScore recalculated: " # newScore.toText());
    newScore
  };

  public shared ({ caller }) func recalculateAllSpamScores() : async Nat {
    requireAdmin(caller);
    var count : Nat = 0;
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      let spam = calculateSpamScore(w.url, w.title, w.description, w.keywords, w.isSeed);
      let seo = calculateSeoScore(w.url, w.title, w.description, w.keywords, w.approvedAt, w.isSeed);
      count += 1;
      { w with spamScore = spam; seoScore = seo }
    });
    addLog("SPAM_RECALC_ALL", caller.toText(), "All " # count.toText() # " websites spamScore recalculated");
    count
  };

  public query ({ caller }) func getAllWebsites() : async [Website] {
    requireAdmin(caller);
    websitesV7
  };

  public query ({ caller }) func getPendingWebsites() : async [Website] {
    requireAdmin(caller);
    websitesV7.filter(func(w : Website) : Bool { w.status == #pending })
  };

  // ─── Admin: Seed Data Import ──────────────────────────────────────────────

  public shared ({ caller }) func importSeedData(entries : [SeedEntry]) : async Nat {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    var count = 0;
    for (entry in entries.vals()) {
      let id = nextId;
      nextId += 1;
      let now = Time.now();
      let site : Website = {
        id;
        url = entry.url;
        title = entry.title;
        description = entry.description;
        keywords = entry.keywords;
        status = #approved;
        ownerId = "aflino_admin";
        ownerPrincipal = ?caller;
        verificationToken = "seed-" # id.toText();
        isVerified = true;
        isSeed = true;
        submittedAt = now;
        approvedAt = ?now;
        indexStatus = #notIndexed;
        sitemapUrl = null;
        lastCheckedAt = null;
        lastCrawledAt = null;
        ownershipStatus = #active;
        verificationStatus = #verified;
        lastVerifiedAt = ?now;
        verificationExpiryAt = null;  // seed sites never expire
        ownerHistory = [];
        adminBoost = 0;
        clicks = 0;
        impressions = 0;
        spamScore = 0; // seed sites are always trusted
        seoScore = 100; // seed sites are fully trusted for SEO
      };
      websitesV7 := websitesV7.concat([site]);
      addToIndex(site);
      count += 1;
    };
    count
  };

  // ─── Click Tracking ─────────────────────────────────────────────────────

  public func recordClick(url : Text) : async () {
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.url == url) { { w with clicks = w.clicks + 1 } } else w
    });
  };

  // ─── Impression Tracking ────────────────────────────────────────────────

  public func recordImpression(url : Text) : async () {
    websitesV7 := websitesV7.map(func(w : Website) : Website {
      if (w.url == url) { { w with impressions = w.impressions + 1 } } else w
    });
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  public query func getStats() : async Stats {
    {
      total = websitesV7.size();
      approved = websitesV7.filter(func(w : Website) : Bool { w.status == #approved }).size();
      pending = websitesV7.filter(func(w : Website) : Bool { w.status == #pending }).size();
    }
  };

  // ─── Security: Logs ───────────────────────────────────────────────────────

  public query ({ caller }) func getSecurityLogs() : async [SecurityLog] {
    requireAdmin(caller);
    securityLogs.reverse()
  };

  // ─── Security: Blacklist ──────────────────────────────────────────────────

  public shared ({ caller }) func addToBlacklist(domain : Text, reason : Text) : async () {
    requireAdmin(caller);
    blacklist := blacklist.filter(func(e : BlacklistEntry) : Bool { e.domain != domain });
    let entry : BlacklistEntry = {
      domain;
      status = #blocked;
      reason;
      addedAt = Time.now();
      reviewedBy = ?caller.toText();
    };
    blacklist := blacklist.concat([entry]);
    addLog("DOMAIN_BLACKLISTED", caller.toText(), "Admin blocked domain: " # domain);
  };

  public shared ({ caller }) func removeFromBlacklist(domain : Text) : async () {
    requireAdmin(caller);
    blacklist := blacklist.filter(func(e : BlacklistEntry) : Bool { e.domain != domain });
    abuseCounter := abuseCounter.filter(func(entry) : Bool { entry.0 != domain });
  };

  public query ({ caller }) func getBlacklist() : async [BlacklistEntry] {
    requireAdmin(caller);
    blacklist
  };

  public query ({ caller }) func getFlaggedDomains() : async [BlacklistEntry] {
    requireAdmin(caller);
    blacklist.filter(func(e : BlacklistEntry) : Bool {
      switch (e.status) {
        case (#flagged) true;
        case (_) false;
      }
    })
  };

  public shared ({ caller }) func reviewFlaggedDomain(
    domain : Text,
    action : { #approve; #block; #remove }
  ) : async () {
    requireAdmin(caller);
    let actionText = switch (action) {
      case (#approve) "approve";
      case (#block)   "block";
      case (#remove)  "remove";
    };
    switch (action) {
      case (#approve) {
        blacklist    := blacklist.filter(func(e : BlacklistEntry) : Bool { e.domain != domain });
        abuseCounter := abuseCounter.filter(func(entry) : Bool { entry.0 != domain });
      };
      case (#block) {
        blacklist := blacklist.map(func(e : BlacklistEntry) : BlacklistEntry {
          if (e.domain == domain) {
            { e with status = #blocked; reviewedBy = ?caller.toText() }
          } else e
        });
      };
      case (#remove) {
        blacklist := blacklist.filter(func(e : BlacklistEntry) : Bool { e.domain != domain });
      };
    };
    addLog("DOMAIN_BLACKLISTED", caller.toText(),
      "Domain reviewed: " # domain # " action: " # actionText);
  };

  // ─── Advertiser / Monetization System ─────────────────────────────────────

  public func applyForAdvertiser(email : Text) : async () {
    if (email.size() == 0 or email.size() > 200) {
      Runtime.trap("Invalid email");
    };
    for (p in advertiserProfiles.vals()) {
      if (p.email == email) {
        Runtime.trap("Already applied");
      };
    };
    let profile : AdvertiserProfile = {
      email;
      status = #pending;
      balance = 0;
      appliedAt = Time.now();
      reviewedAt = null;
    };
    advertiserProfiles := advertiserProfiles.concat([profile]);
  };

  public query func getMyAdvertiserProfile(email : Text) : async ?AdvertiserProfile {
    advertiserProfiles.find(func(p : AdvertiserProfile) : Bool { p.email == email })
  };

  public query ({ caller }) func getAllAdvertiserApplications() : async [AdvertiserProfile] {
    requireAdmin(caller);
    advertiserProfiles
  };

  public shared ({ caller }) func approveAdvertiser(email : Text) : async () {
    requireAdmin(caller);
    var found = false;
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == email) {
        found := true;
        { p with status = #approved; reviewedAt = ?Time.now() }
      } else p
    });
    if (not found) { Runtime.trap("Advertiser not found") };
  };

  public shared ({ caller }) func rejectAdvertiser(email : Text) : async () {
    requireAdmin(caller);
    var found = false;
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == email) {
        found := true;
        { p with status = #rejected; reviewedAt = ?Time.now() }
      } else p
    });
    if (not found) { Runtime.trap("Advertiser not found") };
  };

  public shared ({ caller }) func addAdvertiserBalance(email : Text, amount : Nat) : async () {
    requireAdmin(caller);
    if (amount < 500) { Runtime.trap("Minimum top-up is Rs. 500") };
    var found = false;
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == email) {
        found := true;
        { p with balance = p.balance + amount }
      } else p
    });
    if (not found) { Runtime.trap("Advertiser not found") };
    // Also credit the wallet (auto-create if missing)
    ignore createWalletInternal(email);
    var walletFound = false;
    wallets := wallets.map<(Text, AdvertiserWallet), (Text, AdvertiserWallet)>(
      func(entry) {
        if (entry.0 == email) {
          walletFound := true;
          (email, { entry.1 with balance = entry.1.balance + amount })
        } else { entry }
      }
    );
    if (not walletFound) {
      let w : AdvertiserWallet = { email; balance = amount; totalSpent = 0; createdAt = Time.now() };
      wallets := wallets.concat([(email, w)]);
    };
    appendTransaction(email, amount, #credit, #topup);
  };

  // ─── Ad Engine ────────────────────────────────────────────────────────────

  func getAdvertiser(email : Text) : ?AdvertiserProfile {
    advertiserProfiles.find(func(p : AdvertiserProfile) : Bool { p.email == email })
  };

  func requireApprovedAdvertiser(email : Text) {
    switch (getAdvertiser(email)) {
      case (?profile) {
        switch (profile.status) {
          case (#approved) {
            if (profile.balance == 0) { Runtime.trap("Advertiser has no balance") };
          };
          case (_) { Runtime.trap("Advertiser not approved") };
        };
      };
      case (null) { Runtime.trap("Advertiser not found") };
    };
  };

  func getCampaignOwnerEmail(campaignId : Nat) : ?Text {
    switch (campaigns.find(func(c : Campaign) : Bool { c.id == campaignId })) {
      case (?campaign) { ?campaign.advertiserEmail };
      case (null) { null };
    };
  };

  func requireCampaignOwnership(caller : Principal, campaignId : Nat) {
    if (AccessControl.isAdmin(accessControlState, caller)) { return };
    switch (userProfiles.find(func(entry : (Principal, UserProfile)) : Bool { entry.0 == caller })) {
      case (?profile) {
        let userEmail = profile.1.email;
        switch (getCampaignOwnerEmail(campaignId)) {
          case (?ownerEmail) {
            if (userEmail != ownerEmail) { Runtime.trap("Unauthorized: Not campaign owner") };
          };
          case (null) { Runtime.trap("Campaign not found") };
        };
      };
      case (null) { Runtime.trap("User profile not found") };
    };
  };

  public shared ({ caller }) func createCampaign(
    email : Text,
    name : Text,
    budget : Nat,
    dailyBudget : Nat,
    bidAmount : Nat,
    keywords : [Text],
    destinationUrl : Text
  ) : async Campaign {
    requireRegistered(caller);
    switch (userProfiles.find(func(entry : (Principal, UserProfile)) : Bool { entry.0 == caller })) {
      case (?profile) {
        if (profile.1.email != email) { Runtime.trap("Unauthorized: Email does not match caller profile") };
      };
      case (null) { Runtime.trap("User profile not found") };
    };
    requireApprovedAdvertiser(email);
    if (name.size() == 0 or name.size() > 100) { Runtime.trap("Invalid campaign name") };
    if (budget < 500) { Runtime.trap("Minimum campaign budget is 500") };
    if (bidAmount < 5 or bidAmount > 500) { Runtime.trap("Bid amount must be between 5 and 500") };
    if (keywords.size() == 0 or keywords.size() > 15) { Runtime.trap("Invalid keywords array size") };
    for (kw in keywords.vals()) {
      if (kw.size() == 0 or kw.size() > 50) { Runtime.trap("Invalid keyword") };
    };
    let id = campaignIdCounter;
    campaignIdCounter += 1;
    let campaign : Campaign = {
      id; advertiserEmail = email; name; budget; dailyBudget; bidAmount; keywords; destinationUrl;
      status = #active; impressions = 0; clicks = 0; spend = 0; createdAt = Time.now();
    };
    campaigns := campaigns.concat([campaign]);
    campaign;
  };

  public shared ({ caller }) func updateCampaign(
    campaignId : Nat, name : Text, budget : Nat, dailyBudget : Nat,
    bidAmount : Nat, keywords : [Text], destinationUrl : Text
  ) : async Campaign {
    requireRegistered(caller);
    requireCampaignOwnership(caller, campaignId);
    var found = false;
    var updatedCampaign : ?Campaign = null;
    campaigns := campaigns.map(func(c : Campaign) : Campaign {
      if (c.id == campaignId) {
        found := true;
        let updated = { c with name; budget; dailyBudget; bidAmount; keywords; destinationUrl };
        updatedCampaign := ?updated;
        updated;
      } else { c };
    });
    if (not found) { Runtime.trap("Campaign not found") };
    switch (updatedCampaign) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?campaign) { campaign };
    };
  };

  public shared ({ caller }) func pauseCampaign(campaignId : Nat) : async () {
    requireRegistered(caller);
    requireCampaignOwnership(caller, campaignId);
    var found = false;
    campaigns := campaigns.map(func(c : Campaign) : Campaign {
      if (c.id == campaignId) { found := true; { c with status = #paused } } else { c };
    });
    if (not found) { Runtime.trap("Campaign not found") };
  };

  public shared ({ caller }) func resumeCampaign(campaignId : Nat) : async () {
    requireRegistered(caller);
    requireCampaignOwnership(caller, campaignId);
    var found = false;
    campaigns := campaigns.map(func(c : Campaign) : Campaign {
      if (c.id == campaignId) { found := true; { c with status = #active } } else { c };
    });
    if (not found) { Runtime.trap("Campaign not found") };
  };

  public shared ({ caller }) func getMyCampaigns(email : Text) : async [Campaign] {
    requireRegistered(caller);
    switch (userProfiles.find(func(entry : (Principal, UserProfile)) : Bool { entry.0 == caller })) {
      case (?profile) {
        if (profile.1.email != email and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Email does not match caller profile");
        };
      };
      case (null) {
        if (not AccessControl.isAdmin(accessControlState, caller)) { Runtime.trap("User profile not found") };
      };
    };
    campaigns.filter(func(c : Campaign) : Bool { c.advertiserEmail == email });
  };

  public query ({ caller }) func getAllCampaigns() : async [Campaign] {
    requireAdmin(caller);
    campaigns;
  };

  public func getAdsForSearch(searchQuery : Text) : async [AdResult] {
    if (not adsEnabled) { return [] };
    let trimmed = searchQuery.trim(#char ' ');
    if (trimmed.size() == 0) { return [] };
    let queryTokens = tokenize(trimmed);
    var results : [AdResult] = [];
    for (c in campaigns.vals()) {
      switch (c.status) {
        case (#active) {
          switch (getAdvertiser(c.advertiserEmail)) {
            case (?advertiser) {
              // Check both legacy profile balance AND wallet balance
              let walletBalance : Nat = switch (getWalletInternal(c.advertiserEmail)) {
                case (?w) { w.balance };
                case (null) { 0 };
              };
              if (advertiser.balance > 0 and walletBalance > 0) {
                // ── Advanced relevance: keyword + URL + name matches ────────────
                var keywordMatches = 0;
                let urlLower = c.destinationUrl.toLower();
                let nameLower = c.name.toLower();
                for (token in queryTokens.vals()) {
                  // Primary: campaign keyword match
                  for (kw in c.keywords.vals()) {
                    if (kw.toLower().contains(#text token)) { keywordMatches += 1 };
                  };
                  // Partial boost: destination URL match
                  if (urlLower.contains(#text token)) { keywordMatches += 1 };
                  // Extra boost: campaign name match
                  if (nameLower.contains(#text token)) { keywordMatches += 1 };
                };
                if (keywordMatches > 0) {
                  // ── adScore = (bidAmount * 10) + (CTR * 1000) + (keywordMatches * 50) ──
                  let ctr = if (c.impressions > 0) { (c.clicks * 1000) / c.impressions } else { 0 };
                  let score = (c.bidAmount * 10) + ctr + (keywordMatches * 50);
                  results := results.concat([{ campaignId = c.id; name = c.name; destinationUrl = c.destinationUrl; bidAmount = c.bidAmount; score }]);
                };
              };
            };
            case (null) {};
          };
        };
        case (_) {};
      };
    };
    let sorted = results.sort(func(a : AdResult, b : AdResult) : { #less; #equal; #greater } {
      if (a.score > b.score) #less else if (a.score < b.score) #greater else #equal
    });
    if (sorted.size() > 2) { [sorted[0], sorted[1]] } else { sorted };
  };

  public func recordAdImpression(campaignId : Nat) : async () {
    var found = false;
    campaigns := campaigns.map(func(c : Campaign) : Campaign {
      if (c.id == campaignId) { found := true; { c with impressions = c.impressions + 1 } } else { c };
    });
    if (not found) { Runtime.trap("Campaign not found") };
  };

  public func recordAdClick(campaignId : Nat, userSession : Text) : async Result<(), Text> {
    let key = userSession # "_" # campaignId.toText();
    let now = Time.now();
    let cooldownNs = 30_000_000_000;
    var lastClick : ?Int = null;
    var foundCooldown = false;
    adClickCooldowns := adClickCooldowns.map<(Text, Int), (Text, Int)>(
      func(entry) {
        if (entry.0 == key) {
          foundCooldown := true;
          lastClick := ?entry.1;
          (key, now);
        } else { entry };
      }
    );
    if (not foundCooldown) {
      adClickCooldowns := adClickCooldowns.concat([(key, now)]);
    } else {
      switch (lastClick) {
        case (?timestamp) {
          if (now - timestamp < cooldownNs) { return #err("Cooldown active") };
        };
        case (null) {};
      };
    };
    var found = false;
    var bidAmount : Nat = 0;
    var advertiserEmail : Text = "";
    campaigns := campaigns.map(func(c : Campaign) : Campaign {
      if (c.id == campaignId) {
        found := true;
        bidAmount := c.bidAmount;
        advertiserEmail := c.advertiserEmail;
        { c with clicks = c.clicks + 1; spend = c.spend + c.bidAmount };
      } else { c };
    });
    if (not found) { return #err("Campaign not found") };
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == advertiserEmail) {
        { p with balance = if (p.balance >= bidAmount) { p.balance - bidAmount } else { 0 } };
      } else { p };
    });
    #ok(());
  };

  // ─── Crawler Helpers ─────────────────────────────────────────────────────

  // Extract text between two tags, e.g. <title>...</title>
  func extractBetween(html : Text, openTag : Text, closeTag : Text) : ?Text {
    let lower = html.toLower();
    let openLower = openTag.toLower();
    let _closeLower = closeTag.toLower();
    if (not lower.contains(#text openLower)) return null;
    // Find start position by splitting
    let afterOpen = lower.split(#text openLower);
    ignore afterOpen.next(); // skip before openTag
    switch (afterOpen.next()) {
      case (null) { null };
      case (?rest) {
        // Extract same slice from original html (preserve case)
        let openIdx : Nat = if (html.size() >= rest.size()) { html.size() - rest.size() } else { 0 };
        ignore openIdx;
        // Use rest as slice of html at same offset
        let htmlRest = html.split(#text openTag);
        ignore htmlRest.next();
        switch (htmlRest.next()) {
          case (null) { null };
          case (?segment) {
            let parts = segment.split(#text closeTag);
            switch (parts.next()) {
              case (null) { null };
              case (?value) {
                let trimmed = value.trim(#char ' ').trim(#char '\n').trim(#char '\r').trim(#char '\t');
                if (trimmed.size() == 0) { null } else { ?trimmed }
              };
            }
          };
        }
      };
    }
  };

  // Extract <title>...</title> from HTML
  func extractHtmlTitle(html : Text) : ?Text {
    extractBetween(html, "<title>", "</title>")
  };

  // Extract meta description content value from HTML
  // Handles both name="description" and name='description' variants
  func extractMetaDesc(html : Text) : ?Text {
    let lower = html.toLower();
    // Find the segment after name="description" or name='description'
    let afterNameDesc : ?Text = if (lower.contains(#text "name=\"description\"")) {
      let sp = lower.split(#text "name=\"description\"");
      ignore sp.next();
      sp.next()
    } else if (lower.contains(#text "name='description'")) {
      let sp = lower.split(#text "name='description'");
      ignore sp.next();
      sp.next()
    } else {
      null
    };
    switch (afterNameDesc) {
      case (null) { null };
      case (?seg) {
        if (seg.contains(#text "content=\"")) {
          let afterContent = seg.split(#text "content=\"");
          ignore afterContent.next();
          switch (afterContent.next()) {
            case (null) { null };
            case (?valueAndRest) {
              let valueParts = valueAndRest.split(#text "\"");
              switch (valueParts.next()) {
                case (null) { null };
                case (?val) {
                  let trimmed = val.trim(#char ' ');
                  if (trimmed.size() == 0) { null } else { ?trimmed }
                };
              }
            };
          }
        } else if (seg.contains(#text "content='")) {
          let afterContent = seg.split(#text "content='");
          ignore afterContent.next();
          switch (afterContent.next()) {
            case (null) { null };
            case (?valueAndRest) {
              let valueParts = valueAndRest.split(#text "'");
              switch (valueParts.next()) {
                case (null) { null };
                case (?val) {
                  let trimmed = val.trim(#char ' ');
                  if (trimmed.size() == 0) { null } else { ?trimmed }
                };
              }
            };
          }
        } else { null }
      };
    }
  };

    // Extract same-domain href links from HTML
  func extractSameDomainLinks(html : Text, baseDomain : Text) : [Text] {
    var links : [Text] = [];
    let lower = html.toLower();
    // Split on href=" to find link values
    let parts = lower.split(#text "href=\"");
    ignore parts.next(); // skip before first href
    label linkLoop for (segment in parts) {
      let closingParts = segment.split(#text "\"");
      switch (closingParts.next()) {
        case (null) {};
        case (?href) {
          let trimmed = href.trim(#char ' ');
          // Only include same-domain links (contain the baseDomain)
          if (trimmed.startsWith(#text "http://") or trimmed.startsWith(#text "https://")) {
            if (trimmed.contains(#text baseDomain)) {
              // Avoid duplicates
              if (not links.any(func(l : Text) : Bool { l == trimmed })) {
                if (links.size() < 50) { // cap at 50 links per page
                  links := links.concat([trimmed]);
                };
              };
            };
          };
        };
      };
    };
    links
  };

  // Extract <loc>...</loc> URLs from sitemap XML
  func extractSitemapUrls(xml : Text) : [Text] {
    var urls : [Text] = [];
    let parts = xml.split(#text "<loc>");
    ignore parts.next(); // skip before first <loc>
    for (segment in parts) {
      let closingParts = segment.split(#text "</loc>");
      switch (closingParts.next()) {
        case (null) {};
        case (?url) {
          let trimmed = url.trim(#char ' ').trim(#char '\n').trim(#char '\r');
          if (trimmed.size() > 0 and trimmed.size() <= 500
              and (trimmed.startsWith(#text "http://") or trimmed.startsWith(#text "https://"))) {
            if (not urls.any(func(u : Text) : Bool { u == trimmed })) {
              if (urls.size() < 200) { // cap at 200 sitemap URLs
                urls := urls.concat([trimmed]);
              };
            };
          };
        };
      };
    };
    urls
  };

  // Helper: upsert a page record
  func upsertPage(websiteId : Nat, url : Text, status : PageStatus) {
    var found = false;
    pages := pages.map(func(p : Page) : Page {
      if (p.websiteId == websiteId and p.url == url) {
        found := true;
        { p with status }
      } else p
    });
    if (not found) {
      let newPage : Page = {
        id = nextPageId;
        websiteId;
        url;
        status;
        addedAt = Time.now();
      };
      nextPageId += 1;
      pages := pages.concat([newPage]);
    };
  };

  // ─── Crawl Priority Helpers ─────────────────────────────────────────────────

  // Intervals in nanoseconds
  let SIX_HOURS_NS   : Int = 21_600_000_000_000;    // 6 hours
  let ONE_DAY_NS     : Int = 86_400_000_000_000;     // 24 hours
  let SEVEN_DAYS_NS  : Int = 604_800_000_000_000;    // 7 days
  let ONE_DAY_NS_INT : Int = 86_400_000_000_000;     // 24 hours (for "new site" check)

  // Priority values
  let PRIORITY_NEW          : Nat = 100;
  let PRIORITY_ACTIVE       : Nat = 70;
  let PRIORITY_LOW_ACTIVITY : Nat = 30;

  // Classify a site and return its crawl priority
  func getCrawlPriority(site : Website) : Nat {
    let now = Time.now();
    // Never crawled OR submitted within last 24 hours → NEW
    switch (site.lastCrawledAt) {
      case (null) { return PRIORITY_NEW };
      case (?_) {};
    };
    let submittedRecently = (now - site.submittedAt) < ONE_DAY_NS_INT;
    if (submittedRecently) { return PRIORITY_NEW };
    // Active if site.clicks >= 10
    if (site.clicks >= 10) { return PRIORITY_ACTIVE };
    PRIORITY_LOW_ACTIVITY
  };

  // Returns the crawl interval for a given priority
  func getCrawlInterval(priority : Nat) : Int {
    if (priority >= PRIORITY_NEW) { return SIX_HOURS_NS };
    if (priority >= PRIORITY_ACTIVE) { return ONE_DAY_NS };
    SEVEN_DAYS_NS
  };

  // Returns true if the site is due for a re-crawl
  func isDueCrawl(site : Website, now : Int) : Bool {
    let priority = getCrawlPriority(site);
    let interval = getCrawlInterval(priority);
    switch (site.lastCrawledAt) {
      case (null) { true };  // never crawled → always due
      case (?lastCrawled) {
        (now - lastCrawled) >= interval
      };
    };
  };

  // Insert a (priority, websiteId) pair into the queue, sorted descending by priority
  // Deduplicates by websiteId
  func enqueueWithPriority(websiteId : Nat, priority : Nat) {
    // Remove existing entry for this websiteId (update priority)
    let filtered = crawlQueueV2.filter(func(entry : (Nat, Nat)) : Bool { entry.1 != websiteId });
    // Insert in sorted position (descending priority)
    var inserted = false;
    var result : [(Nat, Nat)] = [];
    for (entry in filtered.vals()) {
      if (not inserted and priority > entry.0) {
        result := result.concat([(priority, websiteId)]);
        inserted := true;
      };
      result := result.concat([entry]);
    };
    if (not inserted) {
      result := result.concat([(priority, websiteId)]);
    };
    crawlQueueV2 := result;
  };

  // ─── Admin: Crawler Queue & Runner ────────────────────────────────────────

  public query ({ caller }) func getCrawlQueue() : async [(Nat, Nat)] {
    requireAdmin(caller);
    crawlQueueV2
  };

  // Admin can manually add a websiteId to the crawl queue
  public shared ({ caller }) func addToCrawlQueue(websiteId : Nat) : async () {
    requireAdmin(caller);
    switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) {
        let priority = getCrawlPriority(site);
        enqueueWithPriority(websiteId, priority);
      };
    };
  };

  // Check all websites and enqueue those due for re-crawl based on smart scheduling
  // Classification: New (priority 100, 6h interval), Active >=10 clicks (priority 70, 24h),
  // Low Activity (priority 30, 7 days)
  public shared ({ caller }) func checkAndQueueRecrawl() : async Nat {
    requireAdmin(caller);
    let now = Time.now();
    var queued : Nat = 0;
    for (site in websitesV7.vals()) {
      // Only process approved sites
      if (site.status == #approved) {
        if (isDueCrawl(site, now)) {
          let priority = getCrawlPriority(site);
          enqueueWithPriority(site.id, priority);
          queued += 1;
        };
      };
    };
    addLog("RECRAWL_CHECK", caller.toText(),
      "checkAndQueueRecrawl: " # queued.toText() # " sites queued");
    queued
  };

  // Main crawler function — admin-only, processes the crawl queue (priority order)
  // Fetches each queued website, extracts title/description/links, updates index
  public shared ({ caller }) func runCrawler() : async Nat {
    requireAdmin(caller);

    // Process highest-priority first (queue is already sorted descending)
    let queueSnapshot = crawlQueueV2;
    var processedCount : Nat = 0;
    var remainingQueue : [(Nat, Nat)] = [];

    for (entry in queueSnapshot.vals()) {
      let websiteId = entry.1;
      // Find website
      switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
        case (null) {
          // Website deleted — drop from queue silently
        };
        case (?site) {
          let now = Time.now();
          try {
            // ── 1. Fetch homepage ───────────────────────────────────────────
            let html = await Outcall.httpGetRequest(site.url, [], transform);

            // ── 2. Extract title & description ─────────────────────────────
            let extractedTitle = switch (extractHtmlTitle(html)) {
              case (?t) { if (t.size() > 0 and t.size() <= 200) { t } else { site.title } };
              case (null) { site.title };
            };
            let extractedDesc = switch (extractMetaDesc(html)) {
              case (?d) { if (d.size() > 0 and d.size() <= 2000) { d } else { site.description } };
              case (null) { site.description };
            };

            // ── 3. Extract same-domain links ────────────────────────────────
            let baseDomain = extractDomain(site.url);
            let links = extractSameDomainLinks(html, baseDomain);

            // Store homepage page as indexed
            upsertPage(websiteId, site.url, #indexed);

            // Store extracted links as pending pages
            for (link in links.vals()) {
              upsertPage(websiteId, link, #pending);
            };

            // ── 4. Sitemap support ──────────────────────────────────────────
            switch (site.sitemapUrl) {
              case (null) {};
              case (?sitemapUrl) {
                try {
                  let sitemapXml = await Outcall.httpGetRequest(sitemapUrl, [], transform);
                  let sitemapUrls = extractSitemapUrls(sitemapXml);
                  for (url in sitemapUrls.vals()) {
                    upsertPage(websiteId, url, #pending);
                  };
                } catch (_) {
                  // Sitemap fetch failed — not critical, continue
                };
              };
            };

            // ── 5. Update website record ────────────────────────────────────
            websitesV7 := websitesV7.map(func(w : Website) : Website {
              if (w.id == websiteId) {
                { w with
                  title = extractedTitle;
                  description = extractedDesc;
                  indexStatus = #indexed;
                  lastCrawledAt = ?now;
                }
              } else w
            });

            // Re-index with updated title/description
            removeFromIndex(websiteId);
            switch (websitesV7.find(func(w : Website) : Bool { w.id == websiteId })) {
              case (?updated) { addToIndex(updated) };
              case (null) {};
            };

            processedCount += 1;
            // Successfully processed — do NOT add back to remainingQueue

          } catch (_) {
            // ── Fetch failed: mark as error, keep in queue for retry ────────
            websitesV7 := websitesV7.map(func(w : Website) : Website {
              if (w.id == websiteId) {
                { w with indexStatus = #error; lastCrawledAt = ?now }
              } else w
            });
            upsertPage(websiteId, site.url, #error);
            addLog("CRAWLER_ERROR", caller.toText(), "Failed to crawl website " # websiteId.toText() # ": " # site.url);
            remainingQueue := remainingQueue.concat([entry]);
          };
        };
      };
    };

    // Clean queue: only keep sites that failed (for retry)
    crawlQueueV2 := remainingQueue;
    addLog("CRAWLER_RUN", caller.toText(),
      "Crawled " # processedCount.toText() # " sites. " # remainingQueue.size().toText() # " failed (queued for retry).");
    processedCount
  };

  public query func getAdsEnabled() : async Bool { adsEnabled };

  public shared ({ caller }) func setAdsEnabled(enabled : Bool) : async () {
    requireAdmin(caller);
    adsEnabled := enabled;
  };

  // ─── User Search History ──────────────────────────────────────────────────

  public shared func recordUserSearch(email : Text, searchQuery : Text) : async () {
    let trimmed = searchQuery.trim(#char ' ');
    if (trimmed.size() == 0) return;

    var found = false;
    userSearchHistory := userSearchHistory.map<(Text, [Text]), (Text, [Text])>(
      func(entry : (Text, [Text])) : (Text, [Text]) {
        if (entry.0 == email) {
          found := true;
          // Prepend query, remove duplicates, cap at 20
          var newQueries : [Text] = [trimmed];
          for (q in entry.1.vals()) {
            if (q != trimmed and newQueries.size() < 20) {
              newQueries := newQueries.concat([q]);
            };
          };
          (email, newQueries)
        } else {
          entry
        }
      }
    );

    if (not found) {
      userSearchHistory := userSearchHistory.concat([(email, [trimmed])]);
    };

    // ── Throttled interest refresh: every 4th search ──────────────────────
    var countFound = false;
    var newCount : Nat = 1;
    userSearchCount := userSearchCount.map<(Text, Nat), (Text, Nat)>(
      func(entry : (Text, Nat)) : (Text, Nat) {
        if (entry.0 == email) {
          countFound := true;
          newCount := entry.1 + 1;
          (email, newCount)
        } else { entry }
      }
    );
    if (not countFound) {
      userSearchCount := userSearchCount.concat([(email, 1)]);
      newCount := 1;
    };
    if (newCount % 4 == 0) {
      refreshUserInterestsInternal(email);
    };
  };

  public query func getUserSearchHistory(email : Text) : async [Text] {
    for (entry in userSearchHistory.vals()) {
      if (entry.0 == email) { return entry.1 };
    };
    []
  };

  // ─── User Click History ──────────────────────────────────────────────────

  public shared func recordUserClick(email : Text, url : Text) : async () {
    let trimmed = url.trim(#char ' ');
    if (trimmed.size() == 0) return;

    var found = false;
    userClickHistory := userClickHistory.map<(Text, [Text]), (Text, [Text])>(
      func(entry : (Text, [Text])) : (Text, [Text]) {
        if (entry.0 == email) {
          found := true;
          // Prepend URL, remove duplicates, cap at 30
          var newUrls : [Text] = [trimmed];
          for (u in entry.1.vals()) {
            if (u != trimmed and newUrls.size() < 30) {
              newUrls := newUrls.concat([u]);
            };
          };
          (email, newUrls)
        } else {
          entry
        }
      }
    );

    if (not found) {
      userClickHistory := userClickHistory.concat([(email, [trimmed])]);
    };

    // ── Refresh interests on every new click ──────────────────────────────
    refreshUserInterestsInternal(email);
  };

  public query func getUserClickHistory(email : Text) : async [Text] {
    for (entry in userClickHistory.vals()) {
      if (entry.0 == email) { return entry.1 };
    };
    []
  };

  // ─── User Interest Scoring ────────────────────────────────────────────────
  // Efficient hybrid approach:
  //   - Recomputed after every click
  //   - Recomputed after every 4th search (not every search)
  // Stores top 10 keywords per user in stable storage.

  func refreshUserInterestsInternal(email : Text) {
    var freq : [(Text, Nat)] = [];

    func addKeyword(raw : Text) {
      let kw = raw.toLower().trim(#char ' ');
      if (kw.size() < 3) return;
      // Skip common English stopwords
      let stopwords = ["the", "and", "for", "are", "but", "not", "you", "all",
        "can", "was", "one", "our", "out", "get", "has", "how", "its", "new",
        "now", "see", "who", "did", "let", "say", "she", "too", "use", "www",
        "com", "org", "net", "http", "https"];
      for (sw in stopwords.vals()) {
        if (kw == sw) return;
      };
      var found = false;
      freq := freq.map<(Text, Nat), (Text, Nat)>(
        func(e : (Text, Nat)) : (Text, Nat) {
          if (e.0 == kw) { found := true; (kw, e.1 + 1) } else e
        }
      );
      if (not found) { freq := freq.concat([(kw, 1)]) };
    };

    // 1. Tokens from user's search queries
    for (entry in userSearchHistory.vals()) {
      if (entry.0 == email) {
        for (q in entry.1.vals()) {
          for (t in tokenize(q).vals()) { addKeyword(t) };
        };
      };
    };

    // 2. Keywords from websites the user clicked
    for (entry in userClickHistory.vals()) {
      if (entry.0 == email) {
        for (url in entry.1.vals()) {
          for (site in websitesV7.vals()) {
            // Match on exact URL or URL prefix (handles trailing slashes)
            // Check if the clicked URL matches this site's base URL (exact match only)
            if (site.url == url) {
              for (kw in site.keywords.vals()) {
                for (t in tokenize(kw).vals()) { addKeyword(t) };
              };
            };
          };
        };
      };
    };

    // 3. Sort by frequency descending using a simple selection approach
    //    (freq is at most a few hundred entries -- fast enough)
    var remaining = freq;
    var sorted : [Text] = [];
    var i = 0;
    while (i < 10 and remaining.size() > 0) {
      // Find max
      var maxIdx = 0;
      var maxVal : Nat = 0;
      var j = 0;
      for (e in remaining.vals()) {
        if (e.1 > maxVal) { maxVal := e.1; maxIdx := j };
        j += 1;
      };
      sorted := sorted.concat([remaining[maxIdx].0]);
      // Remove selected entry
      let finalMaxIdx = maxIdx;
      // Remove selected entry by rebuilding array without that index
      let prevRemaining = remaining;
      remaining := Array.tabulate<(Text, Nat)>(
        if (prevRemaining.size() > 0) { prevRemaining.size() - 1 } else { 0 },
        func(k : Nat) : (Text, Nat) {
          if (k < finalMaxIdx) { prevRemaining[k] } else { prevRemaining[k + 1] }
        }
      );
      i += 1;
    };

    // 4. Persist
    var stored = false;
    userInterests := userInterests.map<(Text, [Text]), (Text, [Text])>(
      func(entry : (Text, [Text])) : (Text, [Text]) {
        if (entry.0 == email) { stored := true; (email, sorted) } else entry
      }
    );
    if (not stored) { userInterests := userInterests.concat([(email, sorted)]) };
  };

  // Public: manually trigger interest refresh from frontend
  public shared func refreshUserInterests(email : Text) : async () {
    refreshUserInterestsInternal(email);
  };

  // Public query: return stored top-10 interest keywords for a user
  public query func getUserInterests(email : Text) : async [Text] {
    for (entry in userInterests.vals()) {
      if (entry.0 == email) { return entry.1 };
    };
    []
  };

  // ─── Discover Feed ────────────────────────────────────────────────────────

  public type DiscoverFeed = {
    trending          : [Website];
    recentlyIndexed   : [Website];
    popularDomains    : [Website];
    recommendedForYou : [Website];
  };

  public query func getDiscoverFeed(emailOpt : ?Text) : async DiscoverFeed {
    // ── Eligibility filter (same as searchWebsites) ──────────────────────────
    let eligible = websitesV7.filter(func(w : Website) : Bool {
      if (w.status != #approved) return false;
      if (w.isSeed) return true;
      switch (w.verificationStatus) {
        case (#verified) {
          switch (w.ownershipStatus) {
            case (#expired) false;
            case (_) true;
          };
        };
        case (_) false;
      };
    });

    // ── Trending: weighted by clicks with threshold multipliers ──────────────
    // Thresholds: 500+ x3, 100-499 x2, 50-99 x1.5, <50 x1
    // Use Array.tabulate to build scored pairs — avoids tuple return type inference issue
    let trendingCount = eligible.size();
    let trendingScores : [Int] = Array.tabulate<Int>(trendingCount, func(i : Nat) : Int {
      let c : Int = eligible[i].clicks;
      if (c >= 500) { c * 3 }
      else if (c >= 100) { c * 2 }
      else if (c >= 50)  { (c * 3) / 2 }
      else               { c }
    });
    var trendingIdx : [Nat] = Array.tabulate(trendingCount, func(i : Nat) : Nat { i });
    let trendingSorted = trendingIdx.sort(func(a : Nat, b : Nat) : { #less; #equal; #greater } {
      let sa = trendingScores[a];
      let sb = trendingScores[b];
      if (sa > sb) #less else if (sa < sb) #greater else #equal
    });
    let trending : [Website] = Array.tabulate(
      if (trendingSorted.size() < 10) trendingSorted.size() else 10,
      func(i : Nat) : Website { eligible[trendingSorted[i]] }
    );

    // ── Recently Indexed: sort by approvedAt descending ──────────────────────
    var recentIdx : [Nat] = Array.tabulate(eligible.size(), func(i : Nat) : Nat { i });
    let recentSorted = recentIdx.sort(func(a : Nat, b : Nat) : { #less; #equal; #greater } {
      let ta : Int = switch (eligible[a].approvedAt) { case (?t) t; case (null) 0 };
      let tb : Int = switch (eligible[b].approvedAt) { case (?t) t; case (null) 0 };
      if (ta > tb) #less else if (ta < tb) #greater else #equal
    });
    let recentlyIndexed : [Website] = Array.tabulate(
      if (recentSorted.size() < 10) recentSorted.size() else 10,
      func(i : Nat) : Website { eligible[recentSorted[i]] }
    );

    // ── Popular Domains: deduplicate by domain, sort by clicks desc ──────────
    var domainArr   : [var Text]    = [var];
    var domainSites : [var Website] = [var];
    var domainCount : Nat = 0;

    for (site in eligible.vals()) {
      let domain = extractDomain(site.url);
      var found = false;
      var foundIdx = 0;
      var i = 0;
      while (i < domainCount) {
        if (domainArr[i] == domain) { found := true; foundIdx := i };
        i += 1;
      };
      if (not found) {
        let newDomains = Array.tabulate(domainCount + 1, func(j : Nat) : Text    { if (j < domainCount) domainArr[j]   else domain });
        let newSites   = Array.tabulate(domainCount + 1, func(j : Nat) : Website { if (j < domainCount) domainSites[j] else site });
        domainArr   := newDomains.toVarArray();
        domainSites := newSites.toVarArray();
        domainCount += 1;
      } else {
        if (site.clicks > domainSites[foundIdx].clicks) {
          domainSites[foundIdx] := site;
        };
      };
    };
    let allDomainSites : [Website] = Array.tabulate(domainCount, func(i : Nat) : Website { domainSites[i] });
    var popIdx : [Nat] = Array.tabulate(domainCount, func(i : Nat) : Nat { i });
    let popSorted = popIdx.sort(func(a : Nat, b : Nat) : { #less; #equal; #greater } {
      let ca : Int = allDomainSites[a].clicks;
      let cb : Int = allDomainSites[b].clicks;
      if (ca > cb) #less else if (ca < cb) #greater else #equal
    });
    let popularDomains : [Website] = Array.tabulate(
      if (popSorted.size() < 10) popSorted.size() else 10,
      func(i : Nat) : Website { allDomainSites[popSorted[i]] }
    );

    // ── Recommended For You: interest-matched + clicks ────────────────────────
    let recommendedForYou : [Website] = switch (emailOpt) {
      case (null) { [] };
      case (?email) {
        var interests : [Text] = [];
        for (entry in userInterests.vals()) {
          if (entry.0 == email) { interests := entry.1 };
        };
        if (interests.size() == 0) { [] } else {
          type ScoredSite = { site : Website; score : Int };
          var scored : [ScoredSite] = [];
          for (site in eligible.vals()) {
            var matchCount : Nat = 0;
            for (interestKw in interests.vals()) {
              if (interestKw.size() > 0) {
                let ikwLower = interestKw.toLower();
                for (siteKw in site.keywords.vals()) {
                  if (siteKw.toLower() == ikwLower) {
                    matchCount += 1;
                  };
                };
              };
            };
            if (matchCount >= 1) {
              let sc : Int = (matchCount * 20) + site.clicks;
              scored := scored.concat([{ site; score = sc }]);
            };
          };
          var recIdx : [Nat] = Array.tabulate(scored.size(), func(i : Nat) : Nat { i });
          let recSorted = recIdx.sort(func(a : Nat, b : Nat) : { #less; #equal; #greater } {
            if (scored[a].score > scored[b].score) #less
            else if (scored[a].score < scored[b].score) #greater
            else #equal
          });
          Array.tabulate(
            if (recSorted.size() < 10) recSorted.size() else 10,
            func(i : Nat) : Website { scored[recSorted[i]].site }
          )
        }
      };
    };

    { trending; recentlyIndexed; popularDomains; recommendedForYou }
  };

  // ─── V2 Ad Matching & Ranking ─────────────────────────────────────────────

  // Private: keyword matching engine for ads
  // Exact match → score 100, Phrase match → score 70, Broad match → score 40
  // Negative keywords block the ad entirely.
  func getMatchingAds(searchQuery : Text) : [AdMatchResult] {
    if (not adsEnabled) { return [] };
    let trimmed = searchQuery.trim(#char ' ');
    if (trimmed.size() == 0) { return [] };
    let qLower = trimmed.toLower();
    let queryTokens = tokenize(trimmed);

    var results : [AdMatchResult] = [];

    for (ad in ads.vals()) {
      // ── 1. Negative keyword check: block ad if query contains any neg keyword ──
      var blocked = false;
      for (negKw in ad.negativeKeywords.vals()) {
        let negKwLower = negKw.toLower();
        if (negKw.size() > 0 and qLower.contains(#text negKwLower)) {
          blocked := true;
        };
      };
      if (not blocked) {
        // ── 2. Keyword match by matchType ────────────────────────────────────
        var keywordScore : Nat = 0;
        switch (ad.matchType) {
          case (#exact) {
            // All keywords joined form exact query (order-insensitive single-keyword check)
            var anyExact = false;
            for (kw in ad.keywords.vals()) {
              if (kw.toLower() == qLower) { anyExact := true };
            };
            if (anyExact) { keywordScore := 100 };
          };
          case (#phrase) {
            // All ad keywords appear as substrings inside query
            var allPresent = ad.keywords.size() > 0;
            for (kw in ad.keywords.vals()) {
              let kwLower = kw.toLower();
              if (kw.size() > 0 and not qLower.contains(#text kwLower)) {
                allPresent := false;
              };
            };
            if (allPresent and ad.keywords.size() > 0) { keywordScore := 70 };
          };
          case (#broad) {
            // Any keyword token matches any query token
            var anyMatch = false;
            for (kw in ad.keywords.vals()) {
              for (kwToken in tokenize(kw).vals()) {
                for (qt in queryTokens.vals()) {
                  if (kwToken == qt) { anyMatch := true };
                };
              };
            };
            if (anyMatch) { keywordScore := 40 };
          };
        };
        if (keywordScore > 0) {
          results := results.concat([{ ad; keywordScore }]);
        };
      };
    };
    results
  };

  // Public query: rank ads for a search query using the ad ranking formula
  // adScore = (bidAmount * 10) + (CTR * 1000) + keywordScore
  // Filters out ads whose parent campaign has exhausted its budget.
  // Returns [] when adsEnabled == false.
  public query func rankAds(searchQuery : Text) : async [AdMatchResult] {
    if (not adsEnabled) { return [] };
    let matches = getMatchingAds(searchQuery);
    if (matches.size() == 0) { return [] };

    // Score each match and filter by budget
    type ScoredMatch = { match : AdMatchResult; adScore : Int };
    var scored : [ScoredMatch] = [];

    for (m in matches.vals()) {
      let ad = m.ad;
      // Find parent AdGroup
      let parentGroupOpt = adGroups.find(func(g : AdGroup) : Bool { g.id == ad.adGroupId });
      switch (parentGroupOpt) {
        case (null) {}; // orphaned ad — skip
        case (?group) {
          // Find parent CampaignV2
          let parentCampaignOpt = campaignsV2.find(func(c : CampaignV2) : Bool { c.id == group.campaignId });
          switch (parentCampaignOpt) {
            case (null) {}; // orphaned group — skip
            case (?campaign) {
              // Only active campaigns
              switch (campaign.status) {
                case (#paused) {}; // skip paused
                case (#active) {
                  // Budget enforcement
                  if (campaign.spent >= campaign.totalBudget) {}
                  else if (campaign.dailyBudget > 0 and campaign.spent >= campaign.dailyBudget) {}
                  else {
                    // Additional wallet balance guard: stop ads if wallet is empty
                    let walletBalance : Nat = switch (getWalletInternal(campaign.advertiserEmail)) {
                      case (?w) { w.balance };
                      case (null) { 0 };
                    };
                    if (walletBalance > 0) {
                      // Compute adScore
                      let ctr : Int = if (ad.impressions > 0) {
                        (ad.clicks * 1000) / ad.impressions
                      } else { 0 };
                      let adScore : Int = (ad.bidAmount * 10) + ctr + m.keywordScore;
                      scored := scored.concat([{ match = m; adScore }]);
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    // Sort by adScore descending
    let sortedScored = scored.sort(
      func(a : ScoredMatch, b : ScoredMatch) : { #less; #equal; #greater } {
        if (a.adScore > b.adScore) #less
        else if (a.adScore < b.adScore) #greater
        else #equal
      }
    );
    sortedScored.map(func(s : ScoredMatch) : AdMatchResult { s.match })
  };

  // Public update: record an ad click (V2), deduct CPC from advertiser balance
  // Enforces 30s cooldown per (userSession_adId) to prevent self-clicks.
  public shared func recordAdClickV2(adId : Nat, userSession : Text) : async Result<(), Text> {
    let key = userSession # "_" # adId.toText();
    let now = Time.now();
    let cooldownNs : Int = 30_000_000_000;

    // ── Cooldown check ────────────────────────────────────────────────────────
    var lastClick : ?Int = null;
    var foundCooldown = false;
    adClickCooldownsV2 := adClickCooldownsV2.map<(Text, Int), (Text, Int)>(
      func(entry) {
        if (entry.0 == key) {
          foundCooldown := true;
          lastClick := ?entry.1;
          (key, now)
        } else { entry }
      }
    );
    if (not foundCooldown) {
      adClickCooldownsV2 := adClickCooldownsV2.concat([(key, now)]);
    } else {
      switch (lastClick) {
        case (?timestamp) {
          if (now - timestamp < cooldownNs) { return #err("Cooldown active") };
        };
        case (null) {};
      };
    };

    // ── Find the ad ───────────────────────────────────────────────────────────
    let adOpt = ads.find(func(a : Ad) : Bool { a.id == adId });
    switch (adOpt) {
      case (null) { return #err("Ad not found") };
      case (?ad) {
        // Find parent AdGroup
        let groupOpt = adGroups.find(func(g : AdGroup) : Bool { g.id == ad.adGroupId });
        switch (groupOpt) {
          case (null) { return #err("AdGroup not found") };
          case (?group) {
            // Find parent CampaignV2
            let campaignOpt = campaignsV2.find(func(c : CampaignV2) : Bool { c.id == group.campaignId });
            switch (campaignOpt) {
              case (null) { return #err("Campaign not found") };
              case (?campaign) {
                // Budget checks
                if (campaign.spent >= campaign.totalBudget) {
                  return #err("Budget exhausted");
                };
                if (campaign.dailyBudget > 0 and campaign.spent >= campaign.dailyBudget) {
                  return #err("Daily budget reached");
                };
                // Find advertiser profile
                let advertiserOpt = advertiserProfiles.find(
                  func(p : AdvertiserProfile) : Bool { p.email == campaign.advertiserEmail }
                );
                switch (advertiserOpt) {
                  case (null) { return #err("Advertiser not found") };
                  case (?advertiser) {
                    if (advertiser.balance < ad.bidAmount) {
                      return #err("Insufficient balance");
                    };
                    // ── Apply deductions ──────────────────────────────────────
                    // Update ad: clicks += 1
                    ads := ads.map(func(a : Ad) : Ad {
                      if (a.id == adId) { { a with clicks = a.clicks + 1 } } else { a }
                    });
                    // Update campaign: spent += bidAmount
                    let costPerClick = ad.bidAmount;
                    campaignsV2 := campaignsV2.map(func(c : CampaignV2) : CampaignV2 {
                      if (c.id == campaign.id) {
                        { c with spent = c.spent + costPerClick }
                      } else { c }
                    });
                    // Deduct from wallet (single source of truth for billing)
                    switch (deductOnClick(campaign.advertiserEmail, costPerClick)) {
                      case (#err(msg)) { return #err(msg) };
                      case (#ok(())) {};
                    };
                    // Keep legacy advertiserProfiles balance in sync
                    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
                      if (p.email == campaign.advertiserEmail) {
                        { p with balance = if (p.balance >= costPerClick) { p.balance - costPerClick } else { 0 } }
                      } else { p }
                    });
                    #ok(())
                  };
                };
              };
            };
          };
        };
      };
    };
  };

  // Public update: record an ad impression (V2)
  public shared func recordAdImpressionV2(adId : Nat) : async () {
    ads := ads.map(func(a : Ad) : Ad {
      if (a.id == adId) { { a with impressions = a.impressions + 1 } } else { a }
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── AFLINO ADSYNC CORE ACCOUNT SYSTEM ─────────────────────────────────────
  // ADDITIVE — does not touch any existing types or stable vars above.
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── AdSync Types ─────────────────────────────────────────────────────────

  public type AdSyncAccountType = { #individual; #business };

  public type AdSyncRole = { #advertiser; #publisher; #both };

  public type AdSyncKycStatus = { #none; #pending; #verified };

  public type AdSyncCurrency = { #INR; #USD; #EUR };

  public type AdSyncUser = {
    email       : Text;
    fullName    : Text;
    mobile      : Text;
    passwordHash : Text;
    syncId      : Text;
    accountType : AdSyncAccountType;
    role        : AdSyncRole;
    country     : Text;
    state       : Text;
    city        : Text;
    address     : Text;
    createdAt   : Int;
    kycStatus   : AdSyncKycStatus;
  };

  public type AdSyncWallet = {
    syncId       : Text;
    balance      : Nat;
    totalSpent   : Nat;
    totalEarned  : Nat;
    currency     : AdSyncCurrency;
    createdAt    : Int;
  };

  public type AdSyncPaymentMethod = { #upi; #bank; #swift };

  public type AdSyncPaymentDetails = {
    syncId        : Text;
    country       : Text;
    method        : AdSyncPaymentMethod;
    upiId         : ?Text;
    accountNumber : ?Text;
    ifsc          : ?Text;
    swiftCode     : ?Text;
    iban          : ?Text;
    accountName   : Text;
  };

  public type AdSyncKycRecord = {
    syncId        : Text;
    status        : AdSyncKycStatus;
    submittedAt   : ?Int;
    verifiedAt    : ?Int;
    adminNotes    : Text;
    lastUpdatedAt : Int;
  };

  // ─── AdSync Billing & Earnings Types ─────────────────────────────────────

  public type AdSyncTransactionType = { #credit; #debit };

  public type AdSyncTransactionReason = { #ad_click; #earning; #topup; #payout; #refund };

  public type AdSyncTransaction = {
    id              : Nat;
    syncId          : Text;
    transactionType : AdSyncTransactionType;
    amount          : Nat;
    reason          : AdSyncTransactionReason;
    createdAt       : Int;
  };

  public type AdSyncClickLog = {
    clickId           : Text;
    advertiserSyncId  : Text;
    publisherSyncId   : Text;
    ipAddress         : Text;
    timestamp         : Int;
  };

  public type AdSyncPayoutStatus = { #processing; #completed; #failed };

  public type AdSyncPayoutLog = {
    id            : Nat;
    syncId        : Text;
    amount        : Nat;
    status        : AdSyncPayoutStatus;
    paymentMethod : Text;
    createdAt     : Int;
    completedAt   : ?Int;
  };

  public type AdSyncTaxProfile = {
    syncId        : Text;
    country       : Text;
    panNumber     : Text;
    gstNumber     : Text;
    taxRate       : Nat;
    lastUpdatedAt : Int;
  };

  public type AdSyncInvoice = {
    id          : Nat;
    syncId      : Text;
    amount      : Nat;
    taxAmount   : Nat;
    finalAmount : Nat;
    invoiceType : { #earning; #payout };
    reference   : Text;
    createdAt   : Int;
  };

  // Legacy type for migration (had extra proof-status fields)
  type AdSyncKycRecordLegacy = {
    syncId              : Text;
    status              : AdSyncKycStatus;
    idProofStatus       : AdSyncKycStatus;
    panStatus           : AdSyncKycStatus;
    addressProofStatus  : AdSyncKycStatus;
    submittedAt         : ?Int;
    verifiedAt          : ?Int;
    adminNotes          : Text;
    lastUpdatedAt       : Int;
  };

  // ─── AdSync Stable State ──────────────────────────────────────────────────

  stable var adSyncUsers          : [(Text, AdSyncUser)]           = []; // keyed by email
  stable var adSyncWallets        : [(Text, AdSyncWallet)]         = []; // keyed by syncId
  stable var adSyncPaymentDetails : [(Text, AdSyncPaymentDetails)] = []; // keyed by syncId
  // adSyncKycRecords uses legacy type to maintain stable compatibility with previous deployment.
  // Migration in postupgrade strips the extra proof-status fields into adSyncKycRecordsV2.
  stable var adSyncKycRecords     : [(Text, AdSyncKycRecordLegacy)] = []; // legacy, keyed by syncId
  stable var adSyncKycRecordsV2   : [(Text, AdSyncKycRecord)]       = []; // current, keyed by syncId
  stable var adSyncProcessedOrderIds : [Text]                       = []; // Razorpay dedup for AdSync

  // ─── AdSync Billing & Payout Stable State ─────────────────────────────────
  stable var adSyncTransactions      : [(Nat, AdSyncTransaction)]   = []; // keyed by id
  stable var adSyncNextTransactionId : Nat                          = 1;
  stable var adSyncClickLogs         : [AdSyncClickLog]             = [];
  stable var adSyncPayoutLogs        : [(Nat, AdSyncPayoutLog)]     = []; // keyed by id
  stable var adSyncNextPayoutId      : Nat                          = 1;
  stable var adSyncTaxProfiles       : [(Text, AdSyncTaxProfile)]   = []; // keyed by syncId
  stable var adSyncInvoices          : [(Nat, AdSyncInvoice)]       = []; // keyed by id
  stable var adSyncNextInvoiceId     : Nat                          = 1;
  stable var adSyncRevenueShare      : Nat                          = 70; // 70%
  stable var adSyncMinPayout         : Nat                          = 500;

  // ─── AdSync Private Helpers ───────────────────────────────────────────────

  // Generates a unique "afl_sync_" + 20 random alphanumeric characters syncId.
  // Uses Time.now() as entropy source; retries until unique.
  func generateSyncId() : Text {
    let ALPHA_NUM : [Char] = [
      'a','b','c','d','e','f','g','h','i','j','k','l','m',
      'n','o','p','q','r','s','t','u','v','w','x','y','z',
      'A','B','C','D','E','F','G','H','I','J','K','L','M',
      'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
      '0','1','2','3','4','5','6','7','8','9'
    ];
    let alphaLen = ALPHA_NUM.size(); // 62

    // Build a 20-char random suffix using bits from Time.now()
    func buildCandidate(seed : Int) : Text {
      var s = "afl_sync_";
      var n : Nat = if (seed < 0) { Int.abs(seed) } else { seed.toNat() };
      // Mix in array size for additional entropy
      n := n + adSyncUsers.size() * 1_000_000_007;
      var i = 0;
      while (i < 20) {
        let idx = n % alphaLen;
        s := s # Text.fromChar(ALPHA_NUM[idx]);
        // LCG-style mixing
        n := (n * 6364136223846793005 + 1442695040888963407) % 18446744073709551615;
        i += 1;
      };
      s
    };

    var attempt = 0;
    var candidate = buildCandidate(Time.now() + attempt);
    while (syncIdExists(candidate) and attempt < 100) {
      attempt += 1;
      candidate := buildCandidate(Time.now() + attempt * 999_983);
    };
    candidate
  };

  // Assigns currency based on user's country (auto-assignment, not user-selected)
  func assignCurrencyByCountry(country : Text) : AdSyncCurrency {
    let c = country.toLower();
    if (c == "india") { return #INR };
    if (c == "united states" or c == "usa" or c == "us") { return #USD };
    // European countries → EUR
    let europeanCountries : [Text] = [
      "germany", "france", "italy", "spain", "netherlands", "belgium",
      "sweden", "norway", "denmark", "finland", "austria", "portugal",
      "greece", "poland", "czech republic", "hungary", "romania", "croatia",
      "bulgaria", "slovakia", "slovenia", "estonia", "latvia", "lithuania",
      "luxembourg", "malta", "cyprus"
    ];
    for (ec in europeanCountries.vals()) {
      if (c == ec) { return #EUR };
    };
    #USD // default for all other countries
  };

  func isValidEmail(email : Text) : Bool {
    if (not email.contains(#char '@')) { return false };
    let parts = email.split(#char '@');
    ignore parts.next(); // local part
    switch (parts.next()) {
      case (null) { false };
      case (?domain) { domain.contains(#char '.') };
    }
  };

  func syncIdExists(syncId : Text) : Bool {
    for ((_, user) in adSyncUsers.vals()) {
      if (user.syncId == syncId) { return true };
    };
    false
  };

  func getAdSyncUserInternal(email : Text) : ?AdSyncUser {
    for ((k, u) in adSyncUsers.vals()) {
      if (k == email) { return ?u };
    };
    null
  };

  func getAdSyncWalletInternal(syncId : Text) : ?AdSyncWallet {
    for ((k, w) in adSyncWallets.vals()) {
      if (k == syncId) { return ?w };
    };
    null
  };

  func getAdSyncKycRecordInternal(syncId : Text) : ?AdSyncKycRecord {
    for ((k, r) in adSyncKycRecordsV2.vals()) {
      if (k == syncId) { return ?r };
    };
    null
  };

  // Private implementation for adding balance (reused by verify and public func)
  func addAdSyncBalanceInternal(syncId : Text, amount : Nat) : Result<AdSyncWallet, Text> {
    switch (getAdSyncWalletInternal(syncId)) {
      case (null) { #err("Wallet not found for syncId") };
      case (?wallet) {
        let updated : AdSyncWallet = {
          wallet with
          balance     = wallet.balance + amount;
          totalEarned = wallet.totalEarned + amount;
        };
        adSyncWallets := adSyncWallets.map<(Text, AdSyncWallet), (Text, AdSyncWallet)>(
          func(entry) {
            if (entry.0 == syncId) { (syncId, updated) } else { entry }
          }
        );
        #ok(updated)
      };
    }
  };

  // ─── AdSync Public Functions ──────────────────────────────────────────────

  // 1. Register a new AdSync user
  public shared func registerAdSyncUser(
    email       : Text,
    fullName    : Text,
    mobile      : Text,
    passwordHash : Text,
    accountType : AdSyncAccountType,
    role        : AdSyncRole,
    country     : Text,
    state_      : Text,
    city        : Text,
    address     : Text
  ) : async Result<AdSyncUser, Text> {
    // ── Input validation ─────────────────────────────────────────────────────
    if (not isValidEmail(email))      { return #err("Invalid email format") };
    if (fullName.trim(#char ' ').size() == 0) { return #err("Full name is required") };
    if (mobile.trim(#char ' ').size() == 0)   { return #err("Mobile number is required") };
    if (country.trim(#char ' ').size() == 0)  { return #err("Country is required") };
    if (state_.trim(#char ' ').size() == 0)   { return #err("State is required") };
    if (city.trim(#char ' ').size() == 0)     { return #err("City is required") };

    // ── Email uniqueness (within adSyncUsers only) ────────────────────────────
    switch (getAdSyncUserInternal(email)) {
      case (?_) { return #err("Email already registered") };
      case (null) {};
    };

    // ── Generate unique syncId ────────────────────────────────────────────────
    let syncId = generateSyncId();

    // ── Create user ───────────────────────────────────────────────────────────
    let now = Time.now();
    let user : AdSyncUser = {
      email;
      fullName;
      mobile;
      passwordHash;
      syncId;
      accountType;
      role;
      country;
      state  = state_;
      city;
      address;
      createdAt = now;
      kycStatus = #none;
    };
    adSyncUsers := adSyncUsers.concat([(email, user)]);

    // ── Auto-create AdSyncWallet ──────────────────────────────────────────────
    let walletCurrency = assignCurrencyByCountry(country);
    let wallet : AdSyncWallet = {
      syncId;
      balance     = 0;
      totalSpent  = 0;
      totalEarned = 0;
      currency    = walletCurrency;
      createdAt = now;
    };
    adSyncWallets := adSyncWallets.concat([(syncId, wallet)]);

    // ── Auto-create initial KYC record ────────────────────────────────────────
    let kycRecord : AdSyncKycRecord = {
      syncId;
      status        = #none;
      submittedAt   = null;
      verifiedAt    = null;
      adminNotes    = "";
      lastUpdatedAt = now;
    };
    adSyncKycRecordsV2 := adSyncKycRecordsV2.concat([(syncId, kycRecord)]);

    #ok(user)
  };

  // 2. Login (compare passwordHash)
  public shared func loginAdSyncUser(email : Text, passwordHash : Text) : async Result<AdSyncUser, Text> {
    switch (getAdSyncUserInternal(email)) {
      case (null) { #err("User not found") };
      case (?user) {
        if (user.passwordHash != passwordHash) {
          #err("Invalid credentials")
        } else {
          #ok(user)
        }
      };
    }
  };

  // 3. Get user by email (query)
  public query func getAdSyncUser(email : Text) : async ?AdSyncUser {
    getAdSyncUserInternal(email)
  };

  // 4. Get user by syncId (query)
  public query func getAdSyncUserBySyncId(syncId : Text) : async ?AdSyncUser {
    for ((_, user) in adSyncUsers.vals()) {
      if (user.syncId == syncId) { return ?user };
    };
    null
  };

  // 5. Get wallet by syncId (query)
  public query func getAdSyncWallet(syncId : Text) : async ?AdSyncWallet {
    getAdSyncWalletInternal(syncId)
  };

  // 6. Get KYC record by syncId (query)
  public query func getAdSyncKycRecord(syncId : Text) : async ?AdSyncKycRecord {
    getAdSyncKycRecordInternal(syncId)
  };

  // 7. Set payment details (with country-based method validation)
  public shared func setAdSyncPaymentDetails(
    syncId        : Text,
    country       : Text,
    method        : AdSyncPaymentMethod,
    upiId         : ?Text,
    accountNumber : ?Text,
    ifsc          : ?Text,
    swiftCode     : ?Text,
    iban          : ?Text,
    accountName   : Text
  ) : async Result<AdSyncPaymentDetails, Text> {
    // Verify syncId exists
    switch (getAdSyncWalletInternal(syncId)) {
      case (null) { return #err("Wallet not found for syncId") };
      case (?_) {};
    };

    if (accountName.trim(#char ' ').size() == 0) {
      return #err("Account name is required");
    };

    // Country-based method validation
    let countryLower = country.toLower();
    let isIndia = countryLower == "india";

    // India: method must be #upi or #bank
    if (isIndia) {
      switch (method) {
        case (#swift) { return #err("India accounts must use UPI or Bank transfer") };
        case (_) {};
      };
    } else {
      // International: method must be #swift
      switch (method) {
        case (#upi)  { return #err("International accounts must use SWIFT") };
        case (#bank) { return #err("International accounts must use SWIFT") };
        case (#swift) {};
      };
    };

    // Required fields per method
    switch (method) {
      case (#upi) {
        switch (upiId) {
          case (null) { return #err("UPI ID is required for UPI method") };
          case (?id) {
            if (id.trim(#char ' ').size() == 0) {
              return #err("UPI ID cannot be empty");
            };
          };
        };
      };
      case (#bank) {
        switch (accountNumber) {
          case (null) { return #err("Account number is required for Bank method") };
          case (?acc) {
            if (acc.trim(#char ' ').size() == 0) {
              return #err("Account number cannot be empty");
            };
          };
        };
        switch (ifsc) {
          case (null) { return #err("IFSC code is required for Bank method") };
          case (?code) {
            if (code.trim(#char ' ').size() == 0) {
              return #err("IFSC code cannot be empty");
            };
          };
        };
      };
      case (#swift) {
        switch (swiftCode) {
          case (null) { return #err("SWIFT code is required for SWIFT method") };
          case (?code) {
            if (code.trim(#char ' ').size() == 0) {
              return #err("SWIFT code cannot be empty");
            };
          };
        };
      };
    };

    let details : AdSyncPaymentDetails = {
      syncId;
      country;
      method;
      upiId;
      accountNumber;
      ifsc;
      swiftCode;
      iban;
      accountName;
    };

    // Upsert payment details
    var found = false;
    adSyncPaymentDetails := adSyncPaymentDetails.map<(Text, AdSyncPaymentDetails), (Text, AdSyncPaymentDetails)>(
      func(entry) {
        if (entry.0 == syncId) {
          found := true;
          (syncId, details)
        } else { entry }
      }
    );
    if (not found) {
      adSyncPaymentDetails := adSyncPaymentDetails.concat([(syncId, details)]);
    };

    #ok(details)
  };

  // 8. Get payment details by syncId (query)
  public query func getAdSyncPaymentDetails(syncId : Text) : async ?AdSyncPaymentDetails {
    for ((k, d) in adSyncPaymentDetails.vals()) {
      if (k == syncId) { return ?d };
    };
    null
  };

  // 9. Submit KYC (sets status to #pending)
  public shared func submitAdSyncKyc(syncId : Text) : async Result<AdSyncKycRecord, Text> {
    switch (getAdSyncKycRecordInternal(syncId)) {
      case (null) { return #err("KYC record not found for syncId") };
      case (?record) {
        let now = Time.now();
        let updated : AdSyncKycRecord = {
          record with
          status        = #pending;
          submittedAt   = ?now;
          lastUpdatedAt = now;
        };
        adSyncKycRecordsV2 := adSyncKycRecordsV2.map<(Text, AdSyncKycRecord), (Text, AdSyncKycRecord)>(
          func(entry) {
            if (entry.0 == syncId) { (syncId, updated) } else { entry }
          }
        );
        // Update kycStatus on AdSyncUser
        adSyncUsers := adSyncUsers.map<(Text, AdSyncUser), (Text, AdSyncUser)>(
          func(entry) {
            if (entry.1.syncId == syncId) {
              (entry.0, { entry.1 with kycStatus = #pending })
            } else { entry }
          }
        );
        #ok(updated)
      };
    }
  };

  // 10. Admin: update KYC status
  public shared ({ caller }) func adminUpdateAdSyncKycStatus(
    syncId     : Text,
    status     : AdSyncKycStatus,
    adminNotes : Text
  ) : async Result<AdSyncKycRecord, Text> {
    requireAdmin(caller);
    switch (getAdSyncKycRecordInternal(syncId)) {
      case (null) { return #err("KYC record not found") };
      case (?record) {
        let now = Time.now();
        let updated : AdSyncKycRecord = {
          record with
          status;
          adminNotes;
          lastUpdatedAt = now;
          verifiedAt    = if (status == #verified) { ?now } else { record.verifiedAt };
        };
        adSyncKycRecordsV2 := adSyncKycRecordsV2.map<(Text, AdSyncKycRecord), (Text, AdSyncKycRecord)>(
          func(entry) {
            if (entry.0 == syncId) { (syncId, updated) } else { entry }
          }
        );
        // Update kycStatus on AdSyncUser
        adSyncUsers := adSyncUsers.map<(Text, AdSyncUser), (Text, AdSyncUser)>(
          func(entry) {
            if (entry.1.syncId == syncId) {
              (entry.0, { entry.1 with kycStatus = status })
            } else { entry }
          }
        );
        #ok(updated)
      };
    }
  };

  // 11. Create Razorpay order for AdSync wallet top-up
  public shared func createAdSyncRazorpayOrder(
    syncId : Text,
    amount : Nat
  ) : async Result<{ orderId : Text; keyId : Text; amount : Nat }, Text> {
    // Validate syncId has a wallet and that it is INR (India only)
    switch (getAdSyncWalletInternal(syncId)) {
      case (null) { return #err("Wallet not found for syncId") };
      case (?wallet) {
        switch (wallet.currency) {
          case (#INR) {}; // allowed
          case (_) { return #err("Razorpay is only available for INR wallets (India accounts)") };
        };
      };
    };

    if (amount < 100) { return #err("Minimum amount is 100 paise (₹1)") };
    if (amount > 100_000_000) { return #err("Maximum amount is 100000000 paise") };

    let credentials = base64EncodeText(RAZORPAY_KEY_ID # ":" # RAZORPAY_KEY_SECRET);
    let authHeader  = "Basic " # credentials;
    let receipt     = "adsync_" # syncId;
    let requestBody = "{\"amount\":" # amount.toText()
      # ",\"currency\":\"INR\",\"receipt\":\""
      # receipt # "\"}";

    let headers : [Outcall.Header] = [
      { name = "Authorization"; value = authHeader },
      { name = "Content-Type";  value = "application/json" },
    ];

    try {
      let responseText = await Outcall.httpPostRequest(
        RAZORPAY_ORDERS_URL,
        headers,
        requestBody,
        transform
      );

      if (not responseText.contains(#text "\"id\":\"")) {
        return #err("Failed to create order: " # responseText.size().toText() # " bytes returned");
      };
      let afterId = responseText.split(#text "\"id\":\"");
      ignore afterId.next();
      switch (afterId.next()) {
        case (null) { return #err("Could not parse order ID") };
        case (?rest) {
          let parts = rest.split(#text "\"");
          switch (parts.next()) {
            case (null) { return #err("Could not parse order ID value") };
            case (?orderId) {
              if (orderId.size() == 0) { return #err("Empty order ID returned") };
              #ok({ orderId; keyId = RAZORPAY_KEY_ID; amount })
            };
          }
        };
      }
    } catch (_) {
      #err("HTTP outcall failed — check network or Razorpay credentials")
    }
  };

  // 12. Verify Razorpay payment for AdSync and credit wallet
  public shared func verifyAdSyncRazorpayPayment(
    syncId            : Text,
    razorpayOrderId   : Text,
    razorpayPaymentId : Text,
    razorpaySignature : Text,
    amount            : Nat
  ) : async Result<AdSyncWallet, Text> {
    // Input validation
    if (syncId.size() == 0 or syncId.size() > 100)             { return #err("Invalid syncId") };
    if (razorpayOrderId.size() == 0 or razorpayOrderId.size() > 100) { return #err("Invalid order ID") };
    if (razorpayPaymentId.size() == 0 or razorpayPaymentId.size() > 100) { return #err("Invalid payment ID") };
    if (razorpaySignature.size() == 0 or razorpaySignature.size() > 200) { return #err("Invalid signature") };
    if (amount < 100) { return #err("Minimum amount is 100 paise") };
    if (amount > 100_000_000) { return #err("Amount out of range") };

    // Deduplication: reject already-processed order IDs
    for (oid in adSyncProcessedOrderIds.vals()) {
      if (oid == razorpayOrderId) { return #err("Order already processed") };
    };

    // HMAC-SHA256 signature verification
    let message      : Text   = razorpayOrderId # "|" # razorpayPaymentId;
    let keyBytes     : [Nat8] = textToBytes(RAZORPAY_KEY_SECRET);
    let msgBytes     : [Nat8] = textToBytes(message);
    let computedHmac : [Nat8] = hmacSha256(keyBytes, msgBytes);
    let computedHex  : Text   = toHex(computedHmac);

    if (not constantTimeEqual(computedHex, razorpaySignature)) {
      return #err("Invalid payment signature");
    };

    // Mark order as processed
    adSyncProcessedOrderIds := adSyncProcessedOrderIds.concat([razorpayOrderId]);

    // Credit wallet
    addAdSyncBalanceInternal(syncId, amount)
  };

  // 13. Add balance to AdSync wallet (public wrapper)
  public shared func addAdSyncBalance(syncId : Text, amount : Nat) : async Result<AdSyncWallet, Text> {
    addAdSyncBalanceInternal(syncId, amount)
  };

  // ─── AdSync Billing & Earnings Private Helpers ────────────────────────────

  // Append a transaction record and return its id
  func appendAdSyncTransaction(
    syncId : Text,
    txType : AdSyncTransactionType,
    amount : Nat,
    reason : AdSyncTransactionReason
  ) : Nat {
    let id = adSyncNextTransactionId;
    adSyncNextTransactionId += 1;
    let tx : AdSyncTransaction = {
      id;
      syncId;
      transactionType = txType;
      amount;
      reason;
      createdAt = Time.now();
    };
    adSyncTransactions := adSyncTransactions.concat([(id, tx)]);
    id
  };

  // Get tax profile for a syncId (returns null if not found)
  func getAdSyncTaxProfileInternal(syncId : Text) : ?AdSyncTaxProfile {
    for ((k, p) in adSyncTaxProfiles.vals()) {
      if (k == syncId) { return ?p };
    };
    null
  };

  // Calculate tax amount: (amount * taxRate) / 100; returns 0 if no tax profile
  func calculateAdSyncTax(syncId : Text, amount : Nat) : Nat {
    switch (getAdSyncTaxProfileInternal(syncId)) {
      case (null) { 0 };
      case (?profile) { (amount * profile.taxRate) / 100 };
    }
  };

  // Append an invoice and return its id
  func appendAdSyncInvoice(
    syncId      : Text,
    amount      : Nat,
    taxAmount   : Nat,
    invoiceType : { #earning; #payout },
    reference   : Text
  ) : Nat {
    let id = adSyncNextInvoiceId;
    adSyncNextInvoiceId += 1;
    let invoice : AdSyncInvoice = {
      id;
      syncId;
      amount;
      taxAmount;
      finalAmount = amount + taxAmount;
      invoiceType;
      reference;
      createdAt = Time.now();
    };
    adSyncInvoices := adSyncInvoices.concat([(id, invoice)]);
    id
  };

  // Generate a deterministic click id from timestamp + syncIds
  func generateClickId(advertiserSyncId : Text, publisherSyncId : Text) : Text {
    let ts = Time.now();
    let seed : Int = ts + adSyncClickLogs.size().toInt();
    "clk_" # advertiserSyncId.size().toText()
      # "_" # publisherSyncId.size().toText()
      # "_" # (Int.abs(seed) % 999_999_999).toText()
      # "_" # ts.toText()
  };

  // ─── 14. CPC Billing: deductOnAdClick ─────────────────────────────────────

  public shared func deductOnAdClick(
    advertiserSyncId : Text,
    publisherSyncId  : Text,
    bidAmount        : Nat,
    ipAddress        : Text
  ) : async Result<Text, Text> {
    // 1. Self-click check
    if (advertiserSyncId == publisherSyncId) {
      return #err("self_click_rejected");
    };

    // 2. Rate limit: max 5 clicks from publisher in last 60 seconds
    let nowNs   = Time.now();
    let windowNs : Int = 60_000_000_000; // 60 seconds in nanoseconds
    let cutoff  = nowNs - windowNs;
    var recentClicks : Nat = 0;
    for (log in adSyncClickLogs.vals()) {
      if (log.publisherSyncId == publisherSyncId and log.timestamp > cutoff) {
        recentClicks += 1;
      };
    };
    if (recentClicks >= 5) {
      return #err("rate_limit_exceeded");
    };

    // 3. Check advertiser wallet balance
    switch (getAdSyncWalletInternal(advertiserSyncId)) {
      case (null) { return #err("advertiser_wallet_not_found") };
      case (?advWallet) {
        if (advWallet.balance < bidAmount) {
          return #err("insufficient_balance");
        };

        // 4. Deduct from advertiser
        let advUpdated : AdSyncWallet = {
          advWallet with
          balance    = advWallet.balance - bidAmount;
          totalSpent = advWallet.totalSpent + bidAmount;
        };
        adSyncWallets := adSyncWallets.map<(Text, AdSyncWallet), (Text, AdSyncWallet)>(
          func(entry) {
            if (entry.0 == advertiserSyncId) { (advertiserSyncId, advUpdated) } else { entry }
          }
        );
        ignore appendAdSyncTransaction(advertiserSyncId, #debit, bidAmount, #ad_click);

        // 5. Credit publisher
        let earning : Nat = (bidAmount * adSyncRevenueShare) / 100;
        switch (getAdSyncWalletInternal(publisherSyncId)) {
          case (null) { return #err("publisher_wallet_not_found") };
          case (?pubWallet) {
            let pubUpdated : AdSyncWallet = {
              pubWallet with
              balance     = pubWallet.balance + earning;
              totalEarned = pubWallet.totalEarned + earning;
            };
            adSyncWallets := adSyncWallets.map<(Text, AdSyncWallet), (Text, AdSyncWallet)>(
              func(entry) {
                if (entry.0 == publisherSyncId) { (publisherSyncId, pubUpdated) } else { entry }
              }
            );
            ignore appendAdSyncTransaction(publisherSyncId, #credit, earning, #earning);

            // 6. Auto-generate invoice for publisher earning
            let taxAmt = calculateAdSyncTax(publisherSyncId, earning);
            let txRef  = "earn_" # advertiserSyncId # "_" # publisherSyncId;
            ignore appendAdSyncInvoice(publisherSyncId, earning, taxAmt, #earning, txRef);

            // 7. Log click
            let clickLog : AdSyncClickLog = {
              clickId          = generateClickId(advertiserSyncId, publisherSyncId);
              advertiserSyncId;
              publisherSyncId;
              ipAddress;
              timestamp        = nowNs;
            };
            adSyncClickLogs := adSyncClickLogs.concat([clickLog]);

            #ok("success")
          };
        };
      };
    };
  };

  // ─── 15. Auto Payout: processPayouts ──────────────────────────────────────

  public shared ({ caller }) func processPayouts() : async [AdSyncPayoutLog] {
    requireAdmin(caller);
    var created : [AdSyncPayoutLog] = [];

    for ((syncId, wallet) in adSyncWallets.vals()) {
      if (wallet.balance >= adSyncMinPayout) {
        // Check KYC
        switch (getAdSyncKycRecordInternal(syncId)) {
          case (null) { /* skip: no KYC record */ };
          case (?kyc) {
            if (kyc.status == #verified) {
              let payoutAmount = wallet.balance;

              // Determine payment method label
              let methodLabel : Text = switch (getAdSyncPaymentDetailsInternal(syncId)) {
                case (null)    { "unknown" };
                case (?details) {
                  switch (details.method) {
                    case (#upi)   { "upi" };
                    case (#bank)  { "bank" };
                    case (#swift) { "swift" };
                  }
                };
              };

              // Create payout log (status = #processing)
              let payoutId = adSyncNextPayoutId;
              adSyncNextPayoutId += 1;
              let payoutLog : AdSyncPayoutLog = {
                id            = payoutId;
                syncId;
                amount        = payoutAmount;
                status        = #processing;
                paymentMethod = methodLabel;
                createdAt     = Time.now();
                completedAt   = null;
              };
              adSyncPayoutLogs := adSyncPayoutLogs.concat([(payoutId, payoutLog)]);

              // Zero out wallet balance
              adSyncWallets := adSyncWallets.map<(Text, AdSyncWallet), (Text, AdSyncWallet)>(
                func(entry) {
                  if (entry.0 == syncId) {
                    (syncId, { entry.1 with balance = 0 })
                  } else { entry }
                }
              );

              // Log debit transaction
              ignore appendAdSyncTransaction(syncId, #debit, payoutAmount, #payout);

              // Auto-generate payout invoice
              let taxAmt = calculateAdSyncTax(syncId, payoutAmount);
              let txRef  = "payout_" # payoutId.toText();
              ignore appendAdSyncInvoice(syncId, payoutAmount, taxAmt, #payout, txRef);

              created := created.concat([payoutLog]);
            };
          };
        };
      };
    };
    created
  };

  // ─── 16. Tax Profile Functions ────────────────────────────────────────────

  public shared func setAdSyncTaxProfile(
    syncId    : Text,
    country   : Text,
    panNumber : Text,
    gstNumber : Text,
    taxRate   : Nat
  ) : async Result<Text, Text> {
    if (syncId.trim(#char ' ').size() == 0)    { return #err("syncId required") };
    if (taxRate > 100)                          { return #err("taxRate must be 0-100") };

    let now = Time.now();
    let profile : AdSyncTaxProfile = {
      syncId;
      country;
      panNumber;
      gstNumber;
      taxRate;
      lastUpdatedAt = now;
    };

    var found = false;
    adSyncTaxProfiles := adSyncTaxProfiles.map<(Text, AdSyncTaxProfile), (Text, AdSyncTaxProfile)>(
      func(entry) {
        if (entry.0 == syncId) { found := true; (syncId, profile) } else { entry }
      }
    );
    if (not found) {
      adSyncTaxProfiles := adSyncTaxProfiles.concat([(syncId, profile)]);
    };
    #ok("Tax profile saved")
  };

  public query func getAdSyncTaxProfile(syncId : Text) : async Result<AdSyncTaxProfile, Text> {
    switch (getAdSyncTaxProfileInternal(syncId)) {
      case (null)     { #err("Tax profile not found") };
      case (?profile) { #ok(profile) };
    }
  };

  // ─── 17. Payout Log Functions ─────────────────────────────────────────────

  public query func getAdSyncPayoutLogs(syncId : Text) : async [AdSyncPayoutLog] {
    adSyncPayoutLogs
      .filter(func((_, log) : (Nat, AdSyncPayoutLog)) : Bool { log.syncId == syncId })
      .map<(Nat, AdSyncPayoutLog), AdSyncPayoutLog>(func((_, log)) { log })
  };

  public shared ({ caller }) func adminUpdatePayoutStatus(
    payoutId : Nat,
    status   : AdSyncPayoutStatus
  ) : async Result<Text, Text> {
    requireAdmin(caller);
    var found = false;
    adSyncPayoutLogs := adSyncPayoutLogs.map<(Nat, AdSyncPayoutLog), (Nat, AdSyncPayoutLog)>(
      func(entry) {
        if (entry.0 == payoutId) {
          found := true;
          let now = Time.now();
          let updated : AdSyncPayoutLog = {
            entry.1 with
            status;
            completedAt = if (status == #completed) { ?now } else { entry.1.completedAt };
          };
          (payoutId, updated)
        } else { entry }
      }
    );
    if (found) { #ok("Payout status updated") } else { #err("Payout log not found") }
  };

  // ─── 18. Invoice Functions ────────────────────────────────────────────────

  public query func getAdSyncInvoices(syncId : Text) : async [AdSyncInvoice] {
    let filtered = adSyncInvoices
      .filter(func((_, inv) : (Nat, AdSyncInvoice)) : Bool { inv.syncId == syncId })
      .map(func((_, inv)) { inv });
    // Sort by createdAt descending
    filtered.sort(func(a : AdSyncInvoice, b : AdSyncInvoice) : { #less; #equal; #greater } {
      if (a.createdAt > b.createdAt) { #less }
      else if (a.createdAt < b.createdAt) { #greater }
      else { #equal }
    })
  };

  // ─── 19. Transaction Log Functions ───────────────────────────────────────

  public query func getAdSyncTransactions(syncId : Text) : async [AdSyncTransaction] {
    let filtered = adSyncTransactions
      .filter(func((_, tx) : (Nat, AdSyncTransaction)) : Bool { tx.syncId == syncId })
      .map(func((_, tx)) { tx });
    // Sort by createdAt descending
    filtered.sort(func(a : AdSyncTransaction, b : AdSyncTransaction) : { #less; #equal; #greater } {
      if (a.createdAt > b.createdAt) { #less }
      else if (a.createdAt < b.createdAt) { #greater }
      else { #equal }
    })
  };

  // ─── 20. Revenue Share Admin Functions ───────────────────────────────────

  public shared ({ caller }) func setAdSyncRevenueShare(share : Nat) : async Result<Text, Text> {
    requireAdmin(caller);
    if (share > 100) { return #err("Revenue share must be 0-100") };
    adSyncRevenueShare := share;
    #ok("Revenue share updated to " # share.toText() # "%")
  };

  public query func getAdSyncRevenueShare() : async Nat {
    adSyncRevenueShare
  };

  // ─── Private helper: get payment details by syncId ────────────────────────
  func getAdSyncPaymentDetailsInternal(syncId : Text) : ?AdSyncPaymentDetails {
    for ((k, d) in adSyncPaymentDetails.vals()) {
      if (k == syncId) { return ?d };
    };
    null
  };

};
