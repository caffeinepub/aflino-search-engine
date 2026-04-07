# Aflino Search Engine

## Current State

- Website model is at V6 with fields: `clicks`, `impressions`, `spamScore` (plus all prior fields)
- `calculateSpamScore()` is the pattern for stored per-website quality scores
- `searchWebsites()` ranking ends with `score += site.adminBoost`
- No `seoScore` field exists on the Website type
- Migration chain: V1 → V2 → V3 → V4 → V5 → V6 (all in `postupgrade`)

## Requested Changes (Diff)

### Add
- `seoScore : Nat` field on the `Website` type (V7 migration, existing sites default to 0)
- `calculateSeoScore(url, title, description, keywords, approvedAt, isSeed)` private function — returns 0–100
- SEO ranking signal: `finalScore += seoScore / 5` (integer math equivalent of `* 0.2`)
- `WebsiteV6Legacy` type alias for migration
- V7 migration step in `postupgrade`

### Modify
- `submitWebsite` — compute and store `seoScore` on creation
- `approveWebsite` — recompute `seoScore` at approval time
- `editWebsite` (if exists) — recompute `seoScore` on content update
- `updateSitemap` (if exists) — recompute `seoScore` on sitemap update
- `recalculateSpamScore` — also recompute `seoScore` at same time (admin-triggered)
- `recalculateAllSpamScores` — also recompute all `seoScore`s
- All Website construction sites — add `seoScore = 0` default
- `backend.d.ts` / `backend.ts` — add `seoScore` to `Website` interface

### Remove
- Nothing

## Implementation Plan

1. Add `WebsiteV6Legacy` type (alias of current `Website` minus `seoScore`)
2. Add `seoScore : Nat` to `Website` type
3. Update `websitesV6` stable var reference to `websitesV7`
4. Implement `calculateSeoScore()` with 5 signals:
   - Title length optimal (30–60 chars) → +20
   - Description present (>= 50 chars) → +20
   - Keywords relevant (>= 3 keywords) → +20
   - HTTPS enabled (url starts with https://) → +20
   - Page freshness (approved within last 90 days) → +20
   - Seed sites get 100 (fully trusted)
5. Call `calculateSeoScore()` in: `submitWebsite`, `approveWebsite`, `editWebsite`, `updateSitemap`, `recalculateSpamScore`, `recalculateAllSpamScores`, seed website creation
6. Add `score += site.seoScore / 5` to `searchWebsites` scoring loop after adminBoost
7. Add V7 migration step in `postupgrade`
8. Update `backend.d.ts` and `backend.ts` to include `seoScore` on the Website interface
