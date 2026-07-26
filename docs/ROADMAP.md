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
- [ ] **Fix the root metadata.** `app/layout.tsx` still says "Create Next App"; set the
      real title, description, and favicon.
- [ ] **Replace `window.location.reload()`** after saves with `revalidatePath` from a
      Server Action.

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
- [ ] **Categories: remove / edit / reorder.** Adding works; the rest still needs an
      editor. Also needs a thumbnail upload — `image_url` is wired into the homepage grid
      but nothing writes it yet, so categories still render the `[SLUG IMAGE]`
      placeholder.
- [ ] **Reviews: add / remove.** Move the three hardcoded "Ironclad Verdicts" cards into
      a `reviews` table (quote, author, location, rating).
- [ ] **Available Handiworks: add / remove / edit / reorder.** The homepage section is
      four hardcoded sample cards. It should be an itemized list of all currently
      available pieces, ordered by the admin.
- [ ] **Sold pieces strip.** Add `sold` to `shop_inventory`, mark pieces sold instead of
      deleting them, and render a thumbnail row at the bottom of the homepage as social
      proof. Sold pieces must be excluded from the shop's available grid.
- [ ] **Homepage edit affordances.** Surface the add/remove/edit/reorder controls for the
      logged-in admin. Decide whether they render inline on `/` behind a session check or
      live on a dedicated `/admin/homepage` page — inline is friendlier, but it means the
      homepage can no longer be fully static.

## P2 — Shop search and navigation

- [ ] **Intelligent search.** Current matching only covers title, description, and tags.
      Extend it to category (both slug and display name), `piece_type`, and `specs`
      values, match each whitespace-separated term independently so word order doesn't
      matter, and make it accent/case-insensitive. Consider a Postgres full-text or
      trigram index once the dataset grows past client-side filtering.
- [ ] **"Back to Homepage" button** on `/shop`. The logo links home today, but it isn't
      obvious as navigation.
- [ ] **Detailed search overlay.** A search icon that opens a pop-out panel over a
      blurred backdrop (`backdrop-blur`) with filter controls: category, piece type,
      price range, material, and sold/available. Reuse the same query logic as the inline
      search, keep the state in the URL so results are shareable, and remember that
      `useSearchParams` needs a `<Suspense>` boundary.

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
