<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Earthen Miners Designs

A one-artisan jewelry storefront built around a single "current build" that is forged,
followed live, then moved into the shop.

Start here:

- `docs/ARCHITECTURE.md` — how the system fits together, the data model, and known gaps.
- `docs/ROADMAP.md` — the prioritized to-do list.
- `.cursor/rules/` — the conventions to follow when writing code.

Two rules matter more than the rest:

1. **Never fetch Supabase inside `useEffect`.** Read data on the server in `async`
   Server Components. Details in `.cursor/rules/data-fetching.mdc`.
2. **The admin owns the storefront.** Categories, photos, reviews, and item lists are
   database rows edited from `/admin`, never hardcoded in a page component.

Note that this project is on Next.js 16, where Middleware is called **Proxy**; the auth
gate lives in `proxy.ts` at the repo root.
