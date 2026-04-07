# rank-it — Admin Panel Backlog

This file tracks everything that needs an admin/moderator interface.
The admin app will live at `apps/admin` in the monorepo and share `@workspace/ui` components.

---

## 1. Custom Category Review

**Status:** Backend ready, admin UI not built yet

**How it works today:**
- When a user picks "+ Add a custom one" on the create board form, they type a free-text category
- The category is saved to the `boards.category` column with a `custom:` prefix (e.g. `custom:Coworking Spaces`)
- The board is live immediately but the category is unverified

**What admin needs to do:**
- [ ] Dashboard view: list all boards where `category LIKE 'custom:%'`, ordered by `created_at DESC`
- [ ] For each custom category, admin can:
  - **Approve** → strip the `custom:` prefix, optionally remap to an existing standard category
  - **Rename** → correct typos before approving (e.g. "Coworking Spaecs" → "Coworking Spaces")
  - **Reject** → delete or nullify the category (board stays, category removed)
- [ ] Notification to admin when a new custom category board is created
  - Channel: email (Resend) or Slack webhook
  - Trigger: Supabase database webhook on `boards` INSERT where `category LIKE 'custom:%'`

**DB query to find pending custom categories:**
```sql
SELECT id, slug, title, category, created_at
FROM boards
WHERE category LIKE 'custom:%'
ORDER BY created_at DESC;
```

---

## 2. Board Moderation

**Status:** Not built

- [ ] View all boards with flag counts (once flagging is added)
- [ ] Soft-delete / hide a board (`is_hidden` column, add to migration)
- [ ] Edit board title / description / category / location
- [ ] Transfer board ownership

---

## 3. Item Moderation

**Status:** Not built

- [ ] View flagged items across all boards
- [ ] Remove an item from a board (soft delete)
- [ ] Merge duplicate items that slipped past fuzzy matching
- [ ] Override vote count (for fixing abuse)

---

## 4. Abuse / Bot Detection

**Status:** Data being collected, no UI yet

- [ ] Dashboard showing submissions where GPS coordinates cluster within 50m in < 1 hour for same item
  - Query: group `submissions` by `item_id`, compare `gps_lat/gps_lng` within time window
- [ ] Flag user accounts with suspicious phone number patterns
- [ ] Bulk-invalidate votes from a flagged user (set `submissions.is_flagged = true`, exclude from `vote_count`)
- [ ] IP/phone hash search — look up all submissions from a given hash

---

## 5. Notifications to Admin (Services to integrate)

| Trigger | Service | Status |
|---|---|---|
| New custom category submitted | Supabase DB webhook → Resend email OR Slack | ⬜ Not built |
| Item flagged by user | Supabase DB webhook → Slack | ⬜ Not built |
| Suspicious location cluster detected | Cron job → Slack alert | ⬜ Not built |
| New board created | Optional digest email (daily) | ⬜ Not built |

**Recommended stack for notifications:**
- **Resend** — transactional email (free tier: 3k emails/month)
- **Slack webhook** — fastest for real-time admin alerts
- **Supabase DB webhooks** — trigger on INSERT/UPDATE without extra infra

---

## 6. Admin App Setup (apps/admin)

**Status:** Not created yet

When ready, scaffold with:
```bash
cd rank-it-web
# Copy apps/web structure, strip public pages, add admin auth guard
```

- Admin auth: Supabase Auth with email + restrict to `@rank-it.com` domain or specific user IDs
- All admin routes protected by middleware checking `user.role = 'admin'` (stored in `auth.users.raw_app_meta_data`)
- Shares `@workspace/ui` components with the web app
