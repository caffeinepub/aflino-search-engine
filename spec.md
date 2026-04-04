# Aflino Search Engine - Core Monetization System

## Current State
- Roles: user, admin (stored in localStorage via AuthContext)
- AuthRole type is: "admin" | "user" | "guest"
- /dashboard is OwnerDashboardPage with tabs: My Websites, Submit Website, Account
- Admin panel has 9 sections; no monetization section exists
- Backend (main.mo) has no advertiser-related types or functions
- No advertiser application or balance system anywhere

## Requested Changes (Diff)

### Add
- Backend: `AdvertiserStatus` type: `pending | approved | rejected`
- Backend: `AdvertiserProfile` type: `{ email, status, balance, appliedAt }`
- Backend: stable `var advertiserProfiles` map keyed by email
- Backend: `applyForAdvertiser(email)` -- creates pending application
- Backend: `getAllAdvertiserApplications()` -- admin only, returns all profiles
- Backend: `approveAdvertiser(email)` -- admin only, sets status=approved, upgrades role tracking
- Backend: `rejectAdvertiser(email)` -- admin only, sets status=rejected
- Backend: `addBalance(email, amount)` -- admin only, adds balance (min ₹500 rule enforced)
- Backend: `getMyAdvertiserProfile(email)` -- returns profile for given email
- AuthContext: add "advertiser" to AuthRole type; update readStorage/loginAsUser to persist/restore advertiser role
- backend.d.ts: add AdvertiserProfile, AdvertiserStatus types and new function signatures
- useQueries.ts: add hooks for applyForAdvertiser, getAllAdvertiserApplications, approveAdvertiser, rejectAdvertiser, addBalance, getMyAdvertiserProfile
- OwnerDashboardPage: add "Monetization" tab to sidebar
  - Show status card: Not an Advertiser / Pending / Approved
  - Show balance: ₹0 (or actual balance)
  - "Become Advertiser" button (only when not yet applied)
  - On click: calls applyForAdvertiser, sets status=pending
- AdminPanelPage: add "Monetization Control" as 10th sidebar section
  - List all advertiser applications (email, status)
  - Approve / Reject actions per application
  - On approval: updates backend status; admin then sets role to advertiser in localStorage if needed
  - Add Balance input: email + amount (min ₹500 validation)

### Modify
- AuthRole in AuthContext.tsx: "admin" | "advertiser" | "user" | "guest"
- AdminSection type in AdminPanelPage: add `"monetization"` variant
- Sidebar items in AdminPanelPage: add Monetization Control item (DollarSign icon)
- OwnerDashboard SidebarTab type: add `"monetization"`
- OwnerDashboard sidebarLinks: add Monetization item (TrendingUp icon)

### Remove
- Nothing removed

## Implementation Plan
1. Update main.mo: add AdvertiserProfile type, stable state, and 6 new functions
2. Update backend.d.ts: add new types and function signatures
3. Update AuthContext.tsx: add "advertiser" to AuthRole
4. Update useQueries.ts: add 6 new query/mutation hooks
5. Update OwnerDashboardPage.tsx: add Monetization tab UI
6. Update AdminPanelPage.tsx: add Monetization Control section (10th section)
