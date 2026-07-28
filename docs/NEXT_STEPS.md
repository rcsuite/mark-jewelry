# Next steps (handoff for a new chat)

Snapshot after **Git ↔ Vercel production breakthrough** (Jul 2026) plus messaging /
pricing / Know Mark / admin hub work.

Read with `docs/MESSAGING.md`, `docs/ADMIN_EDITING.md`, `docs/ROADMAP.md`, and
`.cursor/rules/`.

## Deploy / Git / Vercel (critical — do not re-break)

### Canonical mapping

| Piece | Correct value |
|---|---|
| **GitHub repo** | [`rscheetz-ui/mark-jewelry`](https://github.com/rscheetz-ui/mark-jewelry) (`main`) |
| **Vercel project (live site)** | **`earthenminersdesigns`** → https://earthenminersdesigns.vercel.app |
| **Custom domains** | `earthenminersdesigns.com` + `www` → attached to **`earthenminersdesigns`** |
| **Local `origin`** | `https://github.com/rscheetz-ui/mark-jewelry.git` |

### What went wrong before (so we don’t repeat it)

- There were **two** Vercel projects for the same app: `earthenminersdesigns` (active)
  and **`mark-jewelry`** (stale June build). Domains were stuck on the old
  **`mark-jewelry`** project, so `.vercel.app` looked new while the custom domain
  served ancient code.
- Git lived under **`rcsuite/mark-jewelry`** (a *user* account, not an org). Vercel’s
  GitHub App was on **`rscheetz-ui`**, so Git auto-deploy never hooked up. Repo was
  **transferred** to `rscheetz-ui/mark-jewelry`.
- “3 productions” in the Vercel UI = **deployment history**, not three live sites.
  Only the latest Production on **`earthenminersdesigns`** is live.

### Preferred workflow (Riley owns push)

**Riley commits and pushes from VS / Cursor** to `main` on
`rscheetz-ui/mark-jewelry`. That triggers Vercel production on
**`earthenminersdesigns`** and updates the custom domain. He is fine owning push —
that was the path that finally worked. Agents should:

- Make the code / docs changes
- **Commit + push only when Riley asks** (or he pushes himself after the change)
- Prefer **not** relying on `npx vercel --prod` unless Git is broken again
- Never reattach domains to the unused **`mark-jewelry`** Vercel project; safe to
  **delete** that Vercel project when convenient

### Cron

- **Vercel Cron** is back: `vercel.json` → `GET /api/cron/chat-reminders` every
  minute (`* * * * *`). Needs Pro (team is on Pro).
- Auth: `Authorization: Bearer CRON_SECRET` (set on Vercel + `.env.local`).
- Also needs `SUPABASE_SERVICE_ROLE_KEY` + Resend vars on Vercel.
- A temporary Supabase Cron job on the **OneCity** Pro DB (`earthen-chat-reminders`)
  was **unscheduled** when Vercel Cron returned — don’t recreate both or emails
  double-fire.

## What is done

- Server-side data fetching for `/`, `/shop`, `/workbench`
- Image crop + upload to Supabase Storage; long-lived admin session / PWA / no `blob:` URLs
- Homepage editor ethos (`/admin/homepage`), categories, reviews, featured, sold strip
- Shop search + filters; multi-category pieces; formula pricing + silver spot on admin hub
- **Visitor chat / Contact popup / Inquire about piece** — see `docs/MESSAGING.md`
  - Piece questions store `@Title` in the message body so both sides see context
  - 2‑min unread email reminder via Vercel Cron + admin poll when Mark is online
  - Admin messages inbox + top-bar badge + incoming popup (opens Messages in new tab)
- **Know Mark** — `/mark` + `/admin/mark` (`mark_moments`)
- **Production pipeline** — GitHub `rscheetz-ui/mark-jewelry` → Vercel
  `earthenminersdesigns` → custom domain

## Still needs ops (verify on Vercel if unsure)

Email / offline reminders need these on **Vercel → earthenminersdesigns** (and
optionally `.env.local`):

1. `RESEND_API_KEY`
2. `MARK_NOTIFY_EMAIL`
3. Optional `MARK_NOTIFY_FROM` (verified domain From)
4. `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
5. Optional `NEXT_PUBLIC_SITE_URL=https://earthenminersdesigns.com`

## Meaningful next steps (pick one)

### 1. Finish Mark notify email (ops)
Confirm Resend + cron env on Vercel; test inquire while Mark is not in `/admin`.

### 2. Commerce (biggest product gap)
- Wire **Stripe** behind Acquire / Claim
- Claim current build flow
- Finish `/admin/clients` and `/admin/invoices`

### 3. Admin polish
- Confirm + delete category; drag-reorder sold strip
- Migrate leftover client inserts to Server Actions

### 4. Cleanup
- Delete unused Vercel project **`mark-jewelry`** (domains already moved off it)

## Rules the next chat must keep

| Rule / doc | Why |
|---|---|
| `.cursor/rules/admin-editing-ethos.mdc` | Edits look like poking the real site |
| `.cursor/rules/admin-auth-uploads.mdc` | Long session + never save `blob:` |
| `.cursor/rules/messaging.mdc` / `docs/MESSAGING.md` | Chat cookies ≠ Supabase Auth; `@piece` in body |
| `.cursor/rules/data-fetching.mdc` | No Supabase in `useEffect` for page data |
| `.cursor/rules/storefront-data.mdc` | Categories from DB; write `photos[]` |
| This file’s **Deploy / Git / Vercel** section | Don’t reconnect the wrong project or domain |

## Suggested first prompt for the new chat

> Read `docs/NEXT_STEPS.md` (especially Deploy / Git / Vercel). Help finish Resend
> email notify for Mark, or wire Stripe checkout for Acquire on `/shop`. I’ll push
> commits from VS myself unless I ask you to push.
