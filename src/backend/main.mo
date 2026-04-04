import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";
import Outcall "./http-outcalls/outcall";
import Map "mo:core/Map";
import Option "mo:core/Option";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";

actor {

  // ─── Authorization Mixin ──────────────────────────────────────────────────

  var accessControlState : AccessControl.AccessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // ─── Types ────────────────────────────────────────────────────────────────

  public type WebsiteStatus = { #pending; #approved; #rejected };

  public type Website = {
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

  // ─── Stable State ─────────────────────────────────────────────────────────

  var nextId : Nat = 1;
  var websites : [Website] = [];
  var indexTerms : [(Text, [Nat])] = [];

  // Security state
  var securityLogs : [SecurityLog] = [];
  var nextLogId : Nat = 1;
  var blacklist : [BlacklistEntry] = [];
  var abuseCounter : [(Text, Nat)] = [];
  var rateLimitData : [(Text, [Int])] = [];
  var clickCounts : [(Text, Nat)] = [];

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
      // Keep entries with id > (nextLogId - 501), i.e. the newest 500
      // Keep the newest ~500 entries: drop any entry whose id is in the first half
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
    rateLimitData := rateLimitData.map(func(entry) : (Text, [Int]) {
      if (entry.0 == key) { found := true; (entry.0, timestamps) } else entry
    });
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
    // Strip scheme by splitting on "://" and taking the part after it
    var stripped = url;
    if (stripped.startsWith(#text "https://") or stripped.startsWith(#text "http://")) {
      let schemeIter = stripped.split(#text "://");
      ignore schemeIter.next(); // skip scheme part
      switch (schemeIter.next()) {
        case (?rest) { stripped := rest };
        case null {};
      };
    };
    // Take everything before the first '/'
    let parts = stripped.split(#char '/');
    switch (parts.next()) {
      case (?domain) { domain.toLower() };
      case null { stripped.toLower() };
    }
  };

  // ─── Input Validation & Sanitization ─────────────────────────────────────

  // All patterns are pre-lowercased; we lowercase the input before checking.
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

  // Count non-overlapping occurrences of needle in haystack (both pre-lowercased).
  func countOccurrences(haystack : Text, needle : Text) : Nat {
    if (needle.size() == 0) return 0;
    var count = 0;
    var remaining = haystack;
    label scan loop {
      if (remaining.contains(#text needle)) {
        count += 1;
        // Advance past the needle: split on first occurrence and take the tail.
        let parts = remaining.split(#text needle);
        ignore parts.next(); // skip the part before the needle
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
    abuseCounter := abuseCounter.map(func(entry) : (Text, Nat) {
      if (entry.0 == domain) { found := true; (entry.0, entry.1 + 1) } else entry
    });
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
    let updated = indexTerms.map(func(entry) : (Text, [Nat]) {
      (entry.0, entry.1.filter(func(id : Nat) : Bool { id != siteId }))
    });
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

  // ─── Public Search ────────────────────────────────────────────────────────

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
    let approvedSites = websites.filter(func(w : Website) : Bool { w.status == #approved });
    let qLower = trimmed.toLower();
    for (site in approvedSites.vals()) {
      let titleLower = site.title.toLower();
      if (titleLower.contains(#text qLower)) {
        let current = scoreMap.get(site.id).get(0);
        scoreMap.add(site.id, current + 5);
      };
    };
    let scored = approvedSites.map(func(w) : (Website, Nat) {
      (w, scoreMap.get(w.id).get(0))
    });
    let filtered = scored.filter(func(entry) : Bool { entry.1 > 0 });
    let sorted = filtered.sort(func(a : (Website, Nat), b : (Website, Nat)) : { #less; #equal; #greater } {
      if (a.1 > b.1) #less else if (a.1 < b.1) #greater else #equal
    });
    sorted.map(func(entry) : Website { entry.0 })
  };

  // ─── Website Submission ───────────────────────────────────────────────────

  public shared ({ caller }) func submitWebsite(
    url : Text,
    title : Text,
    description : Text,
    keywords : [Text]
  ) : async Website {
    requireRegistered(caller);
    let callerText = caller.toText();

    checkRateLimit(callerText, "submit", 5, 60);

    validateUrl(url, callerText);
    validateTitle(title, callerText);
    validateDescription(description, callerText);
    validateKeywords(keywords, callerText);
    detectKeywordStuffing(title, description, keywords, callerText);

    checkBlacklist(url, callerText);

    let domain = extractDomain(url);
    for (site in websites.vals()) {
      if (extractDomain(site.url) == domain and site.status != #rejected) {
        incrementDomainAbuse(domain);
        autoFlagDomain(domain, callerText);
        Runtime.trap("Domain already submitted");
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
      ownerPrincipal = caller;
      verificationToken = generateToken(id);
      isVerified = false;
      isSeed = false;
      submittedAt = Time.now();
      approvedAt = null;
    };
    websites := websites.concat([site]);
    site
  };

  public query ({ caller }) func getMyWebsites() : async [Website] {
    requireRegistered(caller);
    websites.filter(func(w : Website) : Bool { w.ownerPrincipal == caller })
  };

  // ─── Domain Verification ──────────────────────────────────────────────────

  public query ({ caller }) func getVerificationToken(websiteId : Nat) : async Text {
    requireRegistered(caller);
    switch (websites.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Not found") };
      case (?site) {
        if (site.ownerPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
        site.verificationToken
      };
    }
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input)
  };

  public shared ({ caller }) func verifyDomain(websiteId : Nat) : async Bool {
    requireRegistered(caller);
    let callerText = caller.toText();
    switch (websites.find(func(w : Website) : Bool { w.id == websiteId })) {
      case (null) { Runtime.trap("Not found") };
      case (?site) {
        if (site.ownerPrincipal != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized");
        };
        validateUrl(site.url, callerText);
        let verifyUrl = site.url # "/.well-known/aflino-verification.txt";
        try {
          let body = await Outcall.httpGetRequest(verifyUrl, [], transform);
          let token = site.verificationToken;
          let verified = body.contains(#text token);
          websites := websites.map(func(w : Website) : Website {
            if (w.id == websiteId) { { w with isVerified = verified } } else w
          });
          verified
        } catch (_) {
          false
        }
      };
    }
  };

  // ─── Admin: Manage Websites ───────────────────────────────────────────────

  public shared ({ caller }) func approveWebsite(websiteId : Nat) : async Website {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    var approvedSite : ?Website = null;
    websites := websites.map(func(w : Website) : Website {
      if (w.id == websiteId) {
        let updated = { w with status = #approved; approvedAt = ?Time.now() };
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
    websites := websites.map(func(w : Website) : Website {
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
    websites := websites.map(func(w : Website) : Website {
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
    websites := websites.filter(func(w : Website) : Bool { w.id != websiteId });
    removeFromIndex(websiteId);
  };

  public query ({ caller }) func getAllWebsites() : async [Website] {
    requireAdmin(caller);
    websites
  };

  public query ({ caller }) func getPendingWebsites() : async [Website] {
    requireAdmin(caller);
    websites.filter(func(w : Website) : Bool { w.status == #pending })
  };

  // ─── Admin: Seed Data Import ──────────────────────────────────────────────

  public shared ({ caller }) func importSeedData(entries : [SeedEntry]) : async Nat {
    requireAdmin(caller);
    checkRateLimit(caller.toText(), "admin", 30, 60);
    var count = 0;
    for (entry in entries.vals()) {
      let id = nextId;
      nextId += 1;
      let site : Website = {
        id;
        url = entry.url;
        title = entry.title;
        description = entry.description;
        keywords = entry.keywords;
        status = #approved;
        ownerPrincipal = caller;
        verificationToken = "seed-" # id.toText();
        isVerified = false;
        isSeed = true;
        submittedAt = Time.now();
        approvedAt = ?Time.now();
      };
      websites := websites.concat([site]);
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
      total = websites.size();
      approved = websites.filter(func(w : Website) : Bool { w.status == #approved }).size();
      pending = websites.filter(func(w : Website) : Bool { w.status == #pending }).size();
    }
  };

  // ─── Security: Logs ───────────────────────────────────────────────────────

  public query ({ caller }) func getSecurityLogs() : async [SecurityLog] {
    requireAdmin(caller);
    // Return newest-first by reversing the array
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

  public type AdvertiserStatus = { #pending; #approved; #rejected };

  public type AdvertiserProfile = {
    email : Text;
    status : AdvertiserStatus;
    balance : Nat;
    appliedAt : Int;
    reviewedAt : ?Int;
  };

  var advertiserProfiles : [AdvertiserProfile] = [];

  // Apply to become an advertiser (called with user email)
  public func applyForAdvertiser(email : Text) : async () {
    if (email.size() == 0 or email.size() > 200) {
      Runtime.trap("Invalid email");
    };
    // If already applied, do nothing (idempotent)
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

  // Get profile for a given email (user calls this with their own email)
  public query func getMyAdvertiserProfile(email : Text) : async ?AdvertiserProfile {
    advertiserProfiles.find(func(p : AdvertiserProfile) : Bool { p.email == email })
  };

  // Admin: get all advertiser applications
  public query ({ caller }) func getAllAdvertiserApplications() : async [AdvertiserProfile] {
    requireAdmin(caller);
    advertiserProfiles
  };

  // Admin: approve an advertiser application
  public shared ({ caller }) func approveAdvertiser(email : Text) : async () {
    requireAdmin(caller);
    var found = false;
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == email) {
        found := true;
        { p with status = #approved; reviewedAt = ?Time.now() }
      } else p
    });
    if (not found) {
      Runtime.trap("Advertiser not found");
    };
  };

  // Admin: reject an advertiser application
  public shared ({ caller }) func rejectAdvertiser(email : Text) : async () {
    requireAdmin(caller);
    var found = false;
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == email) {
        found := true;
        { p with status = #rejected; reviewedAt = ?Time.now() }
      } else p
    });
    if (not found) {
      Runtime.trap("Advertiser not found");
    };
  };

  // Admin: manually add balance to an advertiser (minimum ₹500)
  public shared ({ caller }) func addAdvertiserBalance(email : Text, amount : Nat) : async () {
    requireAdmin(caller);
    if (amount < 500) {
      Runtime.trap("Minimum top-up is Rs. 500");
    };
    var found = false;
    advertiserProfiles := advertiserProfiles.map(func(p : AdvertiserProfile) : AdvertiserProfile {
      if (p.email == email) {
        found := true;
        { p with balance = p.balance + amount }
      } else p
    });
    if (not found) {
      Runtime.trap("Advertiser not found");
    };
  };

};

