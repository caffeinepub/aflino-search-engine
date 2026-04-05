# Aflino Search Engine — Domain Ownership, Expiry & Re-Claim System

## Current State

- Backend (main.mo) has `Website` (V2) type with fields: id, url, title, description, keywords, status, ownerPrincipal, verificationToken, isVerified, isSeed, submittedAt, approvedAt, indexStatus, sitemapUrl, lastCheckedAt, lastCrawledAt
- No ownership tracking beyond `ownerPrincipal: Principal`
- No expiry/reclaim logic
- Search returns all `#approved` sites without ownership/verification filtering
- `submitWebsite` does a global duplicate domain check (any non-rejected site blocks re-submission)
- `isVerified: Bool` is the only verification state field
- Seed/admin sites are treated the same as user sites for verification
- No `ownerId: Text` (email-based) field exists
- No `ownerHistory` field exists
- Frontend: `OwnerDashboardPage` shows websites with basic status badges; no ownership/expiry UI

## Requested Changes (Diff)

### Add

**Backend types:**
- `OwnershipStatus = { #active; #expired; #reclaimed }` type
- `VerificationStatus = { #pending; #verified; #expired }` type

**Website model fields (V3 migration):**
- `ownerId: Text` — email-based primary owner identifier
- `ownerPrincipal: ?Principal` — kept as optional for future upgrade (change from required to optional)
- `ownershipStatus: OwnershipStatus` — defaults to `#active` on submission
- `verificationStatus: VerificationStatus` — defaults to `#pending` on submission
- `lastVerifiedAt: ?Int` — set when domain is verified
- `verificationExpiryAt: ?Int` — set to `lastVerifiedAt + 90 days` (in nanoseconds)
- `ownerHistory: [Text]` — list of previous owner emails (not Principals, since email-based)

**Backend functions:**
- `submitWebsiteByEmail(ownerId, url, title, description, keywords)` — email-based submit function with ownership-aware duplicate logic:
  - If domain exists and `ownershipStatus == #active && verificationStatus == #verified` → reject with "This domain is already registered and actively verified."
  - If domain exists and `ownershipStatus == #expired || verificationStatus == #expired` → allow re-claim (return special response or allow overwrite on verify)
- `verifyDomainByEmail(websiteId, ownerEmail)` — email-based verification; on success: sets `verificationStatus = #verified`, `ownershipStatus = #active`, `lastVerifiedAt`, `verificationExpiryAt`, syncs `isVerified = true`
- `reclaimDomain(websiteId, newOwnerEmail)` — called when new owner verifies an expired domain: moves old ownerId to ownerHistory, sets new ownerId, sets ownershipStatus = #reclaimed then #active, sets new verificationExpiryAt
- `runOwnershipCleanup()` — admin-only: iterates all websitesV2, checks if `verificationExpiryAt < now` for non-seed sites, sets `verificationStatus = #expired` and `ownershipStatus = #expired`; also syncs `isVerified = false`
- `getMyWebsitesByEmail(email)` — email-based alternative to getMyWebsites (which uses caller Principal)
- `checkAndExpireSite(websiteId)` — internal helper: if non-seed and past expiry, mark expired

**Seed site behavior:**
- In `importSeedData`: set `ownershipStatus = #active`, `verificationStatus = #verified`, `ownerId = "aflino_admin"`
- In `runOwnershipCleanup`: skip sites where `isSeed == true`
- In search: seed sites always pass the ownership filter

**Search filter update:**
- `searchWebsites` must filter: only show sites where `(isSeed == true) OR (verificationStatus == #verified AND ownershipStatus != #expired)`

**Backward compatibility:**
- V3 migration: existing V2 records get `ownerId = ownerPrincipal.toText()`, `ownershipStatus = #active`, `verificationStatus = if isVerified then #verified else #pending`, `lastVerifiedAt = null`, `verificationExpiryAt = null`, `ownerHistory = []`
- Keep `isVerified: Bool` in sync: when `verificationStatus` changes, update `isVerified` accordingly

### Modify

- `Website` type: promote to V3 (add 6 new fields, change ownerPrincipal to `?Principal`)
- `submitWebsite`: update duplicate domain logic to check ownership/verification status before blocking
- `verifyDomain`: after success, set `verificationStatus = #verified`, `ownershipStatus = #active`, `lastVerifiedAt`, `verificationExpiryAt = now + 90 days in nanoseconds`, sync `isVerified = true`
- `searchWebsites`: add ownership/verification filter (skip expired non-seed sites)
- `getMyWebsites`: update to support email-based lookup (new function)
- `approveWebsite` (admin): when approving, if not seed and not verified, set `ownershipStatus = #active`

### Remove

- Nothing is removed. No destructive deletes. V2 records are migrated to V3 safely.

## Implementation Plan

1. **Define new types** `OwnershipStatus` and `VerificationStatus` in main.mo
2. **Define Website V3** type with all new fields; keep `WebsiteV1` and `WebsiteV2` for migration chain
3. **Write `migrateV2toV3` helper** — converts existing V2 records to V3 with safe defaults
4. **Update `postupgrade`** — run V2→V3 migration after V1→V2 migration
5. **Update `submitWebsite`** — add `ownerId: Text` param, update duplicate domain logic with ownership status check
6. **Update `verifyDomain`** — set all new verification fields on success; handle reclaim case
7. **Add `reclaimDomain`** function — swap owner, update ownerHistory, reset verification timestamps
8. **Add `runOwnershipCleanup`** — admin-only, iterates all sites, marks expired ones (skips seeds)
9. **Add `getMyWebsitesByEmail`** — returns websites for a given email (ownerId match)
10. **Update `searchWebsites`** — filter out expired non-seed sites
11. **Update `importSeedData`** — set ownership/verification fields correctly
12. **Update `approveWebsite`** — sync ownership status
13. **Frontend: OwnerDashboardPage** — show Ownership Status badge, Verification Status badge, expiry countdown per website; expired warning; use email-based backend calls
14. **Frontend: Search Center** — show ownership/verification badges with expiry countdown
