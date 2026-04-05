import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";
import Outcall "./http-outcalls/outcall";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
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

  // ─── Current Website type (V3) ────────────────────────────────────────────
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

  public type UserProfile = {
    email : Text;
  };

  // ─── Stable State ─────────────────────────────────────────────────────────

  var nextId : Nat = 1;

  // V1 stable var — read-only after migration
  var websites : [WebsiteV1] = [];

  // V2 stable var — intermediate migration storage
  var websitesV2 : [WebsiteV2] = [];

  // V3 stable var — live array used by all runtime logic
  var websitesV3 : [Website] = [];

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

  var advertiserProfiles : [AdvertiserProfile] = [];
  var campaigns : [Campaign] = [];
  var campaignIdCounter : Nat = 1;
  var adsEnabled : Bool = false;
  var adClickCooldowns : [(Text, Int)] = [];

  var userProfiles : [(Principal, UserProfile)] = [];

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

  func migrateV2toV3(w : WebsiteV2) : Website {
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
  };

  // ─── Auto-expiry helper ───────────────────────────────────────────────────

  // Check if a site's verification has expired (used before critical actions)
  func checkAndExpireSite(siteId : Nat) {
    let now = Time.now();
    websitesV3 := websitesV3.map(func(w : Website) : Website {
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

  // ─── Search (Ownership-Filtered) ──────────────────────────────────────────

  public query func searchWebsites(searchQuery : Text) : async [Website] {
    let trimmed = searchQuery.trim(#char ' ');
    if (trimmed.size() == 0) { return [] };
    if (trimmed.size() > 200) { return [] };
    if (containsInjection(trimmed)) { return [] };
    let terms = tokenize(trimmed);
    let m = getIndexMap();
    let scoreMap = Map.empty<Nat, Nat>();
    for (term in terms.vals()) {
      switch (m.get(term)) {
        case (null) {};
        case (?ids) {
          for (id in ids.vals()) {
            let current = scoreMap.get(id).get(0);
            scoreMap.add(id, current + 1);
          };
        };
      };
    };
    // Filter: only approved sites that pass ownership check
    let eligibleSites = websitesV3.filter(func(w : Website) : Bool {
      if (w.status != #approved) return false;
      // Seed sites always shown
      if (w.isSeed) return true;
      // Non-seed: must be verified and not expired
      switch (w.verificationStatus) {
        case (#verified) {
          switch (w.ownershipStatus) {
            case (#expired) { false };
            case (_) { true };
          };
        };
        case (_) { false };
      };
    });
    let qLower = trimmed.toLower();
    for (site in eligibleSites.vals()) {
      let titleLower = site.title.toLower();
      if (titleLower.contains(#text qLower)) {
        let current = scoreMap.get(site.id).get(0);
        scoreMap.add(site.id, current + 5);
      };
    };
    let scored = eligibleSites.map(func(w) : (Website, Nat) {
      (w, scoreMap.get(w.id).get(0))
    });
    let filtered = scored.filter(func(entry) : Bool { entry.1 > 0 });
    let sorted = filtered.sort(func(a : (Website, Nat), b : (Website, Nat)) : { #less; #equal; #greater } {
      if (a.1 > b.1) #less else if (a.1 < b.1) #greater else #equal
    });
    sorted.map(func(entry) : Website { entry.0 })
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
    for (site in websitesV3.vals()) {
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
    };
    websitesV3 := websitesV3.concat([site]);
    site
  };

  public query ({ caller }) func getMyWebsites() : async [Website] {
    requireRegistered(caller);
    websitesV3.filter(func(w : Website) : Bool {
      switch (w.ownerPrincipal) {
        case (?p) { p == caller };
        case (null) { false };
      }
    })
  };

  // Email-based website lookup (V3 primary method)
  public query ({ caller }) func getMyWebsitesByEmail(email : Text) : async [Website] {
    requireRegistered(caller);
    websitesV3.filter(func(w : Website) : Bool { w.ownerId == email })
  };

  // ─── Domain Verification ──────────────────────────────────────────────────

  public query ({ caller }) func getVerificationToken(websiteId : Nat) : async Text {
    requireRegistered(caller);
    checkAndExpireSite(websiteId);
    switch (websitesV3.find(func(w : Website) : Bool { w.id == websiteId })) {
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
    switch (websitesV3.find(func(w : Website) : Bool { w.id == websiteId })) {
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
            websitesV3 := websitesV3.map(func(w : Website) : Website {
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

    switch (websitesV3.find(func(w : Website) : Bool { w.id == websiteId })) {
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
        let now = Time.now();
        let newHistory = site.ownerHistory.concat([site.ownerId]);
        var updatedSite : ?Website = null;
        websitesV3 := websitesV3.map(func(w : Website) : Website {
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
    websitesV3 := websitesV3.map(func(w : Website) : Website {
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

    switch (websitesV3.find(func(w : Website) : Bool { w.id == websiteId })) {
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
    websitesV3 := websitesV3.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with sitemapUrl = ?sitemapUrl };
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

    switch (websitesV3.find(func(w : Website) : Bool { w.id == websiteId })) {
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
    websitesV3 := websitesV3.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with indexStatus = #pending; lastCheckedAt = ?now };
        updatedSite := ?updated;
        updated
      } else w
    });
    switch (updatedSite) {
      case (null) { Runtime.trap("Website not found") };
      case (?site) { site };
    };
  };

  public query ({ caller }) func getPagesForWebsite(websiteId : Nat) : async [Page] {
    requireRegistered(caller);
    switch (websitesV3.find(func(w : Website) : Bool { w.id == websiteId })) {
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
    websitesV3 := websitesV3.map(func(w : Website) : Website {
      if (w.id == websiteId) { { w with lastCrawledAt = ?Time.now() } } else w
    });
  };

  // ─── Admin: Manage Websites ───────────────────────────────────────────────

  public shared ({ caller }) func approveWebsite(websiteId : Nat) : async Website {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    var approvedSite : ?Website = null;
    websitesV3 := websitesV3.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with
          status = #approved;
          approvedAt = ?Time.now();
          ownershipStatus = #active;
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
    websitesV3 := websitesV3.map(func(w : Website) : Website {
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
    websitesV3 := websitesV3.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with title; description; keywords };
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
    websitesV3 := websitesV3.filter(func(w : Website) : Bool { w.id != websiteId });
    removeFromIndex(websiteId);
  };

  public query ({ caller }) func getAllWebsites() : async [Website] {
    requireAdmin(caller);
    websitesV3
  };

  public query ({ caller }) func getPendingWebsites() : async [Website] {
    requireAdmin(caller);
    websitesV3.filter(func(w : Website) : Bool { w.status == #pending })
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
      };
      websitesV3 := websitesV3.concat([site]);
      addToIndex(site);
      count += 1;
    };
    count
  };

  // ─── Click Tracking ─────────────────────────────────────────────────────

  public func recordClick(url : Text) : async () {
    var found = false;
    clickCounts := clickCounts.map(func(entry) {
      if (entry.0 == url) { found := true; (entry.0, entry.1 + 1) } else entry
    });
    if (not found) {
      clickCounts := clickCounts.concat([(url, 1)]);
    };
  };

  // ─── Stats ────────────────────────────────────────────────────────────────

  public query func getStats() : async Stats {
    {
      total = websitesV3.size();
      approved = websitesV3.filter(func(w : Website) : Bool { w.status == #approved }).size();
      pending = websitesV3.filter(func(w : Website) : Bool { w.status == #pending }).size();
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
              if (advertiser.balance > 0) {
                var keywordMatchScore = 0;
                for (token in queryTokens.vals()) {
                  for (kw in c.keywords.vals()) {
                    if (kw.toLower().contains(#text token)) { keywordMatchScore += 1 };
                  };
                };
                if (keywordMatchScore > 0) {
                  let score = c.bidAmount * keywordMatchScore;
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

  public query func getAdsEnabled() : async Bool { adsEnabled };

  public shared ({ caller }) func setAdsEnabled(enabled : Bool) : async () {
    requireAdmin(caller);
    adsEnabled := enabled;
  };
};
