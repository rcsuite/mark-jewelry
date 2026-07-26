# Roadmap

Working to-do list. P0 items are existing bugs and should land before new features,
because most of the P1/P2 work touches the same code paths.

## P0 — Correctness

- [x] **Move homepage + shop + workbench Supabase reads out of `useEffect`.** Those
      routes are async Server Components via `lib/queries.ts`; interactive shells live in
      `components/home`, `components/shop`, and `components/workbench`. Admin loaders
      still need the same treatment.
- [x] **Persist image uploads to Supabase Storage.** `add-piece` and `current-project`
      crop via `onCropComplete`, upload to `shop-inventory` / `forge-images`, and store
      the public URL on the row. Storage RLS policies added for authenticated writes.
- [x] **Unify category slugs (finalize modal).** Every category select, the homepage
      grid, and the shop filter pills now read the `categories` table.
- [x] **Fix the finalize flow's photo field.** Writes `photos: [...]` (not
      `primary_image`) and carries `tags` so finalized pieces show thumbnails and are
      searchable.
- [x] **Replace `.single()` with `.maybeSingle()`** on `current_build` admin reads so a
      missing or duplicated row doesn't throw. Public pages still need the same fix.
- [x] **Fix the root metadata.** Title and description set for Earthen Miners Designs.
- [x] **Replace `window.location.reload()`** after saves with `revalidatePath` from a
      Server Action (most new admin flows already use actions; leftover client inserts
      in add-piece / finalize can migrate when touched).
- [x] **Admin session + Storage uploads for Mark’s phone.** Long-lived cookies, PWA
      manifest → `/admin`, visibility-based session refresh, uploads refresh auth and
      refuse `blob:` URLs. See `.cursor/rules/admin-auth-uploads.mdc`.

## P1 — Admin controls the storefront

Each of these replaces hardcoded JSX on the homepage with a database table plus an
admin editor. All lists use an integer `sort_order`.

**Vision (backburner until data is live):** after adding a piece, route into an admin
view that *looks like the homepage* but is editable — click a category to
add/remove/edit/reorder pieces, mark sold, etc. Build that after categories /
inventory are DB-driven so the editor has real data to mutate.

- [x] **Custom category via "Other".** Both `add-piece` and the finalize modal expose
      "Other (Specify)". Typing a name and hitting "+ Add Category" (or just submitting)
      calls the `createCategory` Server Action, which slugifies the name, reuses an
      existing row on collision, and revalidates `/` and `/shop`.
- [x] **Categories live in the database.** The `categories` table (slug, title,
      short_name, description, image_url, sort_order, show_on_homepage) is seeded from
      the old hardcoded lists and read via `getCategories()`.
- [x] **Categories: remove / edit / reorder.** `/admin/homepage` mirrors the site:
      drag category cards, pencil opens `/admin/homepage/categories/[slug]` (cover photo,
      all pieces, drag-reorder). Piece pencil opens a full field editor. See
      `docs/ADMIN_EDITING.md`.
- [x] **Reviews: add / remove / edit / reorder.** `reviews` table + Ironclad Verdicts
      on the homepage editor (in-place panel).
- [x] **Available Handiworks: add / remove / edit / reorder.** Driven by
      `shop_inventory.featured` + `featured_sort_order`; drag on the admin homepage.
- [x] **Sold pieces strip.** `shop_inventory.sold`; sold pieces leave the shop grid and
      appear on the homepage / admin sold strip.
- [x] **Homepage edit affordances.** Dedicated `/admin/homepage` mirror (public `/`
      stays clean). Ethos documented in `docs/ADMIN_EDITING.md` and
      `.cursor/rules/admin-editing-ethos.mdc`.

## P2 — Shop search and navigation

- [x] **Intelligent search.** Matches every whitespace-separated term across title,
      description, tags, category slug + display name, `piece_type`, specs, and price
      (accent/case-insensitive). Shared helpers in `lib/shop-search.ts`.
- [x] **"Back to Homepage" button** on `/shop` — brass-bordered control in the nav.
- [x] **Detailed search overlay.** Sliders icon opens a panel over a blurred backdrop
      with category, kind, material, and price range. Filters live in the URL
      (`q`, `category`, `type`, `material`, `min`, `max`) so results are shareable.

## P3 — Commerce

- [ ] **Stripe checkout** behind the "Acquire" and "Claim this piece" buttons. Stripe is
      already a dependency but entirely unwired.
- [ ] **Claim flow for in-progress builds** — reserve the active build before it is
      finished, which is what the workbench CTA currently promises.
- [ ] **Finish the admin placeholders.** `/admin/clients` and `/admin/invoices` exist as
      routes but the dashboard still lists them as "Coming Soon".

## Open decisions

- Homepage content lives in new Supabase tables (`categories`, `reviews`, `handiworks`)
  rather than shared TypeScript config. This is assumed throughout the P1 items; it costs
  a little more setup but is the only version where Mark can edit the storefront without
  a deploy.
- Whether to enable `cacheComponents` and adopt `use cache` plus `unstable_instant` for
  instant navigation. Worthwhile once pages are Server Components, since most storefront
  data changes rarely.
