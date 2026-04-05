# Aflino Search Engine

## Current State

The crawler system uses a flat `crawlQueue: [Nat]` (array of websiteIds). `runCrawler()` is admin-triggered and processes the queue in order with no priority. There is no `checkAndQueueRecrawl()` function. The `requestIndexing()` function adds websiteIds to the queue without any priority assignment.

## Requested Changes (Diff)

### Add
- `CrawlPriority` constants: New=100, Active=70, LowActivity=30
- `crawlQueueV2: [(Nat, Nat)]` stable var (priority, websiteId) replaces old flat queue
- `checkAndQueueRecrawl()` admin-only function: iterates all websites, computes crawl category (New/Active/LowActivity), compares `lastCrawledAt` against interval threshold, enqueues due websites with appropriate priority
- Helper `getCrawlPriority(site)` to classify New/Active/LowActivity and return priority value
- Helper `isDueCrawl(site, now)` to check if site needs re-crawl based on category interval
- `getCrawlQueueV2()` admin query returning `[(Nat, Nat)]`

### Modify
- `crawlQueue: [Nat]` replaced by `crawlQueueV2: [(Nat, Nat)]`
- `requestIndexing()`: when adding to queue, compute priority via `getCrawlPriority()` and insert sorted by priority descending
- `addToCrawlQueue()`: same priority logic
- `runCrawler()`: process from `crawlQueueV2`, sorted highest-priority first
- `getCrawlQueue()`: now returns `[(Nat, Nat)]` (renamed to `getCrawlQueueV2`)
- Migration: existing `crawlQueue: [Nat]` entries converted to `(70, websiteId)` (default Active priority) in `postupgrade()`
- Frontend `AdminPanelPage`: add "Check & Queue Re-crawl" button alongside "Run Crawler"

### Remove
- Old `crawlQueue: [Nat]` stable var (replaced by `crawlQueueV2`)

## Implementation Plan

1. In `main.mo`:
   - Add `crawlQueueV2: [(Nat, Nat)]` stable var
   - Add classification helpers: `getCrawlPriority()` and `isDueCrawl()`
   - Add `checkAndQueueRecrawl()` admin function
   - Update `requestIndexing()`, `addToCrawlQueue()`, `runCrawler()` to use `crawlQueueV2`
   - Add `postupgrade()` migration: migrate existing `crawlQueue` entries to `crawlQueueV2` with priority 70
   - Add `getCrawlQueueV2()` query

2. In `AdminPanelPage.tsx`:
   - Add `useCheckAndQueueRecrawl` mutation hook
   - Add "Check & Queue Re-crawl" button with loading state and success/error toast
   - Update queue display to show priority alongside websiteId
