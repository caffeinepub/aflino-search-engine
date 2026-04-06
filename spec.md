# Aflino Search Engine

## Current State
The Website model stores clicks and impressions as external `[(Text, Nat)]` arrays (`clickCounts`, `impressionCounts`) keyed by URL. `recordClick(url)` and `recordImpression(url)` mutate these arrays. Ranking reads them via `getClicks(url)` and `getImpressions(url)` helper functions. This creates a split source of truth.

## Requested Changes (Diff)

### Add
- `clicks : Nat` and `impressions : Nat` fields on the `Website` type
- `WebsiteV4Legacy` type (old Website shape, used as migration source)
- `websitesV4Legacy` stable var (renamed from `websitesV4`)
- `websitesV5` stable var (new live array)
- `migrateV4toV5()` migration function: maps `clickCounts[url]` → `website.clicks`, `impressionCounts[url]` → `website.impressions` (defaults to 0 if not found)
- V5 step in `postupgrade`

### Modify
- `recordClick(url)`: now increments `website.clicks` directly via `websitesV5.map()`
- `recordImpression(url)`: now increments `website.impressions` directly via `websitesV5.map()`
- `searchWebsites`: reads `site.clicks` and `site.impressions` instead of calling helper functions
- `submitWebsite` and `importSeedData`: new Website records include `clicks = 0; impressions = 0;`
- `getCrawlPriority`: uses `site.clicks` instead of `getClicks(site.url)`
- `postupgrade` Step 3: now writes into `websitesV4Legacy`
- `migrateV3toV4`: return type changed to `WebsiteV4Legacy`

### Remove
- `var clickCounts : [(Text, Nat)]` (kept as empty stable var for upgrade compatibility but no longer written to)
- `var impressionCounts : [(Text, Nat)]` (same)
- `getClicks(url)` helper function
- `getImpressions(url)` helper function

## Implementation Plan
1. Extend `Website` type with `clicks` and `impressions` fields
2. Add `WebsiteV4Legacy` type matching old shape
3. Rename `websitesV4` → `websitesV4Legacy`, add `websitesV5` as new live array
4. Add `migrateV4toV5` function
5. Update `postupgrade` chain: V3→V4 writes into `websitesV4Legacy`; new V5 step reads `websitesV4Legacy` + external arrays, populates `websitesV5`
6. Update `recordClick`, `recordImpression`, ranking, crawler priority, and all Website creation sites
7. Remove `getClicks`/`getImpressions` helpers
