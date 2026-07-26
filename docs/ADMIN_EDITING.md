# Admin editing ethos

Working document for how Mark edits the storefront. Future chats and features
should follow this lens: **user-intuitive edits** — see the site, poke it,
drag it, pencil it. Not a back-office spreadsheet.

Companion Cursor rule: `.cursor/rules/admin-editing-ethos.mdc` (always on).

---

## The one sentence

If a visitor can see it on the homepage or in the shop, Mark should be able to
change it from a screen that **looks like that page**, with clear click, drag,
and pencil controls.

---

## What “intuitive” looks like (x, y, z)

### x — Mirror the public layout

- `/admin/homepage` mirrors `/`: same dark industrial look, same section order
  (hero context → Build Categories → Ironclad Verdicts → Available Handiworks
  → Sold strip), same card shapes.
- Public `/` never shows pencils, drag handles, or “edit mode” chrome.
- A thin “Editing storefront” banner on the admin mirror is enough to tell the
  two apart.

### y — Obvious affordances

| Cue | Meaning |
|---|---|
| Cyan / teal border on hover or grab | This unit is selectable / movable |
| Small pencil icon on every unit | Open edit for this unit |
| Drag and drop | Reorder peers at this level |
| `+` control on a section | Add another unit (category, review, featured piece) |
| Click a piece photo/card | Edit **every** field stored for that piece |

No typing of sort numbers. No hunting through a list of UUIDs.

### z — Depth matches the content

| Unit | Pencil / click goes to… |
|---|---|
| Category card | Shop-like page for that category: edit **cover photo**, see **all pieces**, **drag-reorder** pieces |
| One piece | Full field editor (title, price, category, kind, description, tags, specs, photos, sold, featured) |
| Review card | In-place / small panel (quote, rating, author, location) — short enough not to need its own route |
| Handiworks card | Same piece editor; remove from strip = un-feature, not delete from vault |
| Sold thumbnail | Same piece editor; un-sell returns it to the shop grid |

---

## Section map (homepage)

1. **Build Categories** — drag reorder cards; pencil → category vault page;
   `+` adds a category (name → slug); cover photo lives on the category row.
2. **Ironclad Verdicts** — drag reorder; pencil edits copy; `+` / remove.
3. **Available Handiworks** — curated featured list; drag order; pencil opens
   piece editor; `+` picks from vault; remove un-features.
4. **Sold pieces strip** — pieces marked sold; drag order; excluded from shop
   “for sale” grid; pencil opens piece editor.

---

## Rules for new features

Before shipping any new storefront control, check:

1. Can Mark find it by looking at a page that resembles the public site?
2. Is reorder done by dragging, not by typing an index?
3. Does every editable card have a pencil (or an equally obvious click target)?
4. When he opens a piece, can he edit **all** stored fields?
5. Is visitor-facing content coming from the database, not hardcoded JSX?

If a proposed UI fails those, redesign under this ethos before implementing.

### Prefer

- Mirror page → pencil / drag → focused editor
- Server-loaded data, Server Actions that revalidate `/` and `/shop`
- `sort_order` integers updated by drag end

### Avoid

- Admin-only data tables as the primary editor
- Manual `sort_order` number inputs
- Hardcoded reviews, categories, or featured lists in page components
- Hiding important fields (sold, photos, specs) behind a second “advanced” screen

---

## Related routes (target)

| Route | Role |
|---|---|
| `/admin/homepage` | Editable mirror of `/` |
| `/admin/homepage/categories/[slug]` | Category cover + piece grid + reorder |
| `/admin/homepage/pieces/[id]` | Full piece field editor (or modal opened from the above) |
| `/admin/add-piece` | Create flow; on success, prefer landing on that category’s edit page |

---

## Living document

Update this file when we add a new homepage section or invent a new edit
pattern, so the ethos stays the source of truth for “how editing should feel.”
