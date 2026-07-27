# Next steps (handoff for a new chat)

Snapshot after messaging + pricing + Know Mark + admin hub work.
Read with `docs/MESSAGING.md`, `docs/ADMIN_EDITING.md`, `docs/ROADMAP.md`, and `.cursor/rules/`.

## What is done

- Server-side data fetching for `/`, `/shop`, `/workbench`
- Image crop + upload to Supabase Storage; long-lived admin session / PWA / no `blob:` URLs
- Homepage editor ethos (`/admin/homepage`), categories, reviews, featured, sold strip
- Shop search + filters; multi-category pieces; formula pricing + silver spot on admin hub
- **Visitor chat / Contact popup / Inquire about piece** — see `docs/MESSAGING.md`
  - Piece questions store `@Title` in the message body so both sides see context
  - 2‑min unread email reminder (needs Resend env — often still unset)
  - Admin messages inbox + top-bar badge + incoming popup
- **Know Mark** — `/mark` + `/admin/mark` (`mark_moments`)

## Still needs ops (not code)

Email alerts for Mark **do not send** until these exist in `.env.local` / Vercel:

1. `RESEND_API_KEY` — from [resend.com](https://resend.com)
2. `MARK_NOTIFY_EMAIL` — Mark’s inbox
3. Optional `MARK_NOTIFY_FROM` (verify a domain in Resend for production From)
4. For offline cron: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` on Vercel

## Meaningful next steps (pick one)

### 1. Finish Mark notify email (ops)
Walk through Resend + env + send a test inquire while Mark is not in admin.

### 2. Commerce (biggest product gap)
- Wire **Stripe** behind Acquire / Claim
- Claim current build flow
- Finish `/admin/clients` and `/admin/invoices`

### 3. Admin polish
- Confirm + delete category; drag-reorder sold strip
- Migrate leftover client inserts to Server Actions

## Rules the next chat must keep

| Rule / doc | Why |
|---|---|
| `.cursor/rules/admin-editing-ethos.mdc` | Edits look like poking the real site |
| `.cursor/rules/admin-auth-uploads.mdc` | Long session + never save `blob:` |
| `.cursor/rules/messaging.mdc` / `docs/MESSAGING.md` | Chat cookies ≠ Supabase Auth; `@piece` in body |
| `.cursor/rules/data-fetching.mdc` | No Supabase in `useEffect` for page data |
| `.cursor/rules/storefront-data.mdc` | Categories from DB; write `photos[]` |

## Suggested first prompt for the new chat

> Read `docs/NEXT_STEPS.md` and `docs/MESSAGING.md`. Help finish Resend email notify
> for Mark, or wire Stripe checkout for Acquire on `/shop`.
