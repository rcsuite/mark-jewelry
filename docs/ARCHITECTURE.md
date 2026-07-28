# Architecture

How Earthen Miners Designs is put together, and the rules that keep the public site
and the admin panel in sync.

## The core idea

Mark forges one piece at a time. The site is built around that single "current build":

1. A build is **active**. The homepage hero scrolls its progress photos, `/workbench`
   shows the full timeline plus livestream sessions, and the CTA invites a visitor to
   claim the piece before it is finished.
2. The build is **finalized**. It becomes a row in `shop_inventory`, the live feed is
   cleared, and `status` flips to `complete`.
3. With no active build, the homepage shows a standby state and sends visitors to the
   shop.

Everything a visitor sees is data. The admin panel owns it; page components only render
it.

## Stack

- **Next.js 16**, App Router. Note that Middleware is called **Proxy** in 16 — the
  root file is `proxy.ts`, not `middleware.ts`.
- **React 19**, TypeScript, **Tailwind v4**.
- **Supabase** via `@supabase/ssr` for Postgres + auth.
- **Stripe** is installed but no checkout exists yet.
- **react-easy-crop** for cropping uploads.
- **Hosted on Vercel** — live project name is **`earthenminersdesigns`** (not the
  unused `mark-jewelry` Vercel project). GitHub: `rscheetz-ui/mark-jewelry`.
  Custom domain `earthenminersdesigns.com` must stay on that Vercel project.
  Full deploy handoff: `docs/NEXT_STEPS.md` → **Deploy / Git / Vercel**.

Version-matched Next.js docs ship inside the repo at `node_modules/next/dist/docs/`.
Read them before changing framework behavior; training data for this version is
unreliable.

## Routes

**Public** — `/` (homepage), `/shop` (The Vault), `/workbench` (live build), `/mark`
(Know Mark). Contact is an in-page popup; see `docs/MESSAGING.md`.

**Admin**, all behind `proxy.ts` — `/admin` (hub), `/admin/current-project`,
`/admin/add-piece`, `/admin/homepage`, `/admin/messages`, `/admin/mark`. `/login` is
the auth portal and redirects to `/admin` when a session already exists.

## Auth

`proxy.ts` runs on `/admin/:path*` and `/login`. It builds a Supabase server client from
request cookies, calls `getUser()`, and redirects unauthenticated admin traffic to
`/login`.

This is an *optimistic* check only. Proxy is explicitly not a full authorization
solution, and Server Actions can be POSTed directly, so every action and privileged
read must verify the session again on its own. See `.cursor/rules/mutations-and-auth.mdc`.

The login form lets Mark type a bare handle and appends
`@earthenminersdesigns.com` automatically.

## Data model (Supabase)

### `current_build` — one row, the live feed

| column | type | notes |
|---|---|---|
| `id` | uuid | |
| `status` | text | `active` or `complete`. Gates the homepage hero and `/workbench`. |
| `progress_images` | text[] | Ordered build timeline, oldest first. |
| `video_archive` | jsonb | Array of `{ id, title, date, url }` livestream sessions. |
| `description` | text | Completes the sentence "Right now, on the bench…". |
| `updated_at` | timestamptz | Shown as "Updated:" on the homepage. |

### `shop_inventory` — finished pieces

| column | type | notes |
|---|---|---|
| `id` | uuid | |
| `title` | text | |
| `category` | text | Must match a `categories.slug`. |
| `piece_type` | text | Ring, Pendant, Cuff, Earrings, or free text via "Other". |
| `price` | numeric | |
| `photos` | text[] | The shop renders `photos[0]` as the thumbnail. |
| `description` | text | |
| `tags` | text[] | Feeds search. |
| `specs` | jsonb | `{ weight, size, width, material }` |
| `sold` | bool | *Planned.* Drives the sold-pieces strip. |
| `sort_order` | int | *Planned.* Admin ordering. |
| `created_at` | timestamptz | |

### `clients` — commission ledger

Used by `/api/clients/*`: `entity_name`, `contact_email`, `contact_name`,
`business_division`, `phase_1_amount`, `phase_1_duration_months`, `phase_2_amount`,
`status`.

### `categories` — the storefront taxonomy

The single source of truth for the homepage grid, the shop filter pills, and every
category select in the admin.

| Column | Type | Notes |
|---|---|---|
| `slug` | text, unique | What `shop_inventory.category` stores and `/shop?category=` reads. |
| `title` | text | Full display name (homepage grid, admin selects). |
| `short_name` | text | Compact label for the shop filter pills. |
| `description` | text | Homepage grid copy. Empty for admin-created categories. |
| `image_url` | text, nullable | Homepage thumbnail; falls back to a placeholder. |
| `sort_order` | int | Display order. Seeded in tens so rows can be inserted between. |
| `show_on_homepage` | bool | Hides a category from the grid without hiding its shop filter. |

Public `SELECT`; `authenticated` may write. Rows are created by the `createCategory`
Server Action, never by a client-side insert.

### `reviews` — Ironclad Verdicts

| Column | Type | Notes |
|---|---|---|
| `quote` | text | Review body |
| `author` | text | Display name |
| `location` | text | Optional place |
| `rating` | numeric | Stars (default 5) |
| `sort_order` | int | Drag order on homepage |
| `image_url` | text, nullable | Optional bleed photo (person or jewelry-on) |
| `status` | text | `pending` (from invite) or `published` (homepage) |
| `piece_id` | uuid, nullable | Sold piece the review is about |
| `invite_id` | uuid, nullable | Invite that collected it |
| `source` | text | `admin` or `invite` |

Public pages only load `status = 'published'`. Mark approves pending reviews from
`/admin/reviews`.

### `review_invites` — Manual review requests

| Column | Type | Notes |
|---|---|---|
| `piece_id` | uuid | Sold piece |
| `token` | text, unique | Magic link `/review/[token]` |
| `buyer_name` / `buyer_email` | text | Snapshot at send time |
| `status` | text | `sent` · `submitted` · `dismissed` |

Mark sends from `/admin/reviews` (top-bar paper/pencil lights up 3 days after
`shop_inventory.sold_at` when buyer email is on file). Resend emails the link.

### `shop_inventory` extras for homepage editing

| Column | Type | Notes |
|---|---|---|
| `sold` | bool | True → sold strip, hidden from shop |
| `sold_at` | timestamptz | Set when marked sold; drives the 3-day review badge |
| `buyer_name` / `buyer_email` | text | For review invites |
| `sort_order` | int | Order within a category |
| `featured` | bool | True → Available Handiworks |
| `featured_sort_order` | int | Drag order on the handiworks strip |

### Planned tables

None currently — homepage sections and messaging are DB-driven. Chat schema and
notify email env: `docs/MESSAGING.md`.

## Data flow rules

Reads happen on the server, in `async` Server Components, before render. Supabase must
never be queried from `useEffect` — see `.cursor/rules/data-fetching.mdc` for the
rationale and the migration pattern. Writes go through Server Actions that verify auth
and then call `revalidatePath`, rather than client-side inserts followed by
`window.location.reload()`.

Visitor chat is an exception for **polling** (cookies + RPCs every few seconds); it
still must not use the admin Supabase Auth user. See `docs/MESSAGING.md`.

## Known gaps

- Some older admin writes may still use client-side `supabase.from(...).insert()`;
  prefer Server Actions when touching those flows.
- Stripe checkout is not wired.
- Mark email notify needs `RESEND_API_KEY` + `MARK_NOTIFY_EMAIL` (often unset locally).

These are tracked in `docs/ROADMAP.md` and `docs/NEXT_STEPS.md`.
