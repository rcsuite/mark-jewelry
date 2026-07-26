# Next steps (handoff for a new chat)

Snapshot after the storefront-editing + shop-search + session/upload hardening work.
Read this with `docs/ADMIN_EDITING.md`, `docs/ROADMAP.md`, and `.cursor/rules/`.

## What is done

- Server-side data fetching for `/`, `/shop`, `/workbench`
- Image crop + upload to Supabase Storage (`forge-images`, `shop-inventory`)
- `categories` + `reviews` tables; homepage editor at `/admin/homepage`
- Category pencil → cover photo + piece grid + reorder; piece editor for all fields
- Shop intelligent search + detailed filter overlay + Back to Homepage
- Long-lived admin cookies, PWA manifest (`start_url: /admin`), session refresh on
  visibility, uploads that refuse `blob:` URLs and refresh auth first

## Meaningful next steps (pick one)

### 1. Commerce (biggest product gap)
- Wire **Stripe** behind Acquire / Claim buttons
- **Claim current build** flow (workbench CTA currently promises this)
- Finish `/admin/clients` and `/admin/invoices` (still “Coming Soon” on the hub)

### 2. Admin polish (small, ethos-aligned)
- Confirm + delete category from homepage editor
- Drag-reorder sold strip
- Migrate remaining client `supabase.from().insert()` (add-piece / finalize) to
  Server Actions per `.cursor/rules/mutations-and-auth.mdc`

### 3. Mark’s device checklist (ops, not code)
After deploying this branch:
1. On Mark’s phone, open the live site (not a stale home-screen cache if possible)
2. Log in once at `/login`
3. Re-add Home Screen shortcut if the old one was from before the upload fix
4. Upload a test crop — confirm the URL is `…supabase.co/storage/v1/object/public/…`
5. In Supabase Dashboard → Auth → Sessions: ensure **no** inactivity timeout

## Rules the next chat must keep

| Rule | Why |
|---|---|
| `.cursor/rules/admin-editing-ethos.mdc` | Edits look like poking the real site |
| `.cursor/rules/admin-auth-uploads.mdc` | Long session + never save `blob:` |
| `.cursor/rules/data-fetching.mdc` | No Supabase in `useEffect` |
| `.cursor/rules/storefront-data.mdc` | Categories from DB; write `photos[]` |
| `docs/ADMIN_EDITING.md` | Full UI ethos for new sections |

## Suggested first prompt for the new chat

> Read `docs/NEXT_STEPS.md` and `.cursor/rules/admin-auth-uploads.mdc`. Next we
> should wire Stripe checkout for Acquire on `/shop`. Follow the admin-editing
> ethos for any new UI.
