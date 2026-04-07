# Aflino Search Engine

## Current State
- `getAdsForSearch()` uses a simple formula: `adScore = bidAmount * keywordMatchCount`
- No CTR component in ad scoring
- Relevance is keyword-only (token overlap with campaign.keywords)
- Ad badge displays `"Ad"` in a grey pill
- `adsEnabled = false` by default (admin-controlled)
- Max 2 ads returned and shown

## Requested Changes (Diff)

### Add
- CTR signal in ad scoring: `(clicks * 1000) / impressions` (integer math, zero-safe)
- URL relevance signal: check if any query token appears in `destinationUrl`
- Name relevance signal: check if any query token appears in campaign `name`
- Combined `keywordMatches` = keyword token matches + url matches + name matches
- `"Sponsored"` badge (blue #006AFF) replacing the `"Ad"` grey badge in frontend

### Modify
- `getAdsForSearch()` backend function: replace `score = bidAmount * keywordMatchScore` with:
  `adScore = (bidAmount * 10) + (CTR * 1000) + (keywordMatches * 50)`
  where CTR = `(clicks * 1000) / impressions` (integer math, impressions=0 → CTR=0)
  and keywordMatches = keyword + URL + name token matches
- `SponsoredSection` component in `SearchResultsPage.tsx`: replace grey `"Ad"` badge with blue `"Sponsored"` badge (#006AFF)

### Remove
- Old simple `score = bidAmount * keywordMatchScore` formula
- Grey `"Ad"` badge styling

## Implementation Plan
1. Update `getAdsForSearch()` in `main.mo`:
   - Compute `keywordMatches` from 3 sources: campaign.keywords, destinationUrl, campaign.name
   - Compute CTR as `(c.clicks * 1000) / c.impressions` (guard impressions == 0)
   - Apply formula: `adScore = (c.bidAmount * 10) + ctr + (keywordMatches * 50)`
   - Keep `adsEnabled` guard unchanged (FALSE by default)
   - Keep max 2 ads cap unchanged
2. Update `SponsoredSection` in `SearchResultsPage.tsx`:
   - Replace `"Ad"` grey badge with `"Sponsored"` badge styled with `color: #006AFF`, `border: 1px solid #006AFF`
   - No structural changes to the component
