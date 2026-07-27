'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import ContactTrigger from '@/components/chat/ContactTrigger'
import type { Category, ShopPiece } from '@/lib/types'
import {
  EMPTY_SHOP_FILTERS,
  countActiveDetailFilters,
  filterShopItems,
  filtersFromSearchParams,
  searchParamsFromFilters,
  uniqueMaterials,
  uniquePieceTypes,
  type ShopFilters,
} from '@/lib/shop-search'

type ShopGalleryProps = {
  items: ShopPiece[]
  categories: Category[]
}

export default function ShopGallery({ items, categories }: ShopGalleryProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )

  const [draft, setDraft] = useState<ShopFilters>(filters)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [queryDraft, setQueryDraft] = useState(filters.query)

  useEffect(() => {
    setDraft(filters)
    setQueryDraft(filters.query)
  }, [filters])

  const pushFilters = useCallback(
    (next: ShopFilters) => {
      const params = searchParamsFromFilters(next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router]
  )

  const categoryFilters = [{ slug: 'all', name: 'All Specs' }].concat(
    categories.map((cat) => ({ slug: cat.slug, name: cat.short_name }))
  )

  const pieceTypes = useMemo(() => uniquePieceTypes(items), [items])
  const materials = useMemo(() => uniqueMaterials(items), [items])

  const filteredItems = useMemo(
    () => filterShopItems(items, categories, filters),
    [items, categories, filters]
  )

  const availableItems = useMemo(
    () => filteredItems.filter((item) => !item.sold),
    [filteredItems]
  )
  const soldItems = useMemo(
    () => filteredItems.filter((item) => item.sold),
    [filteredItems]
  )

  const detailCount = countActiveDetailFilters(filters)

  const applyInlineQuery = (value: string) => {
    setQueryDraft(value)
    pushFilters({ ...filters, query: value })
  }

  const openOverlay = () => {
    setDraft(filters)
    setOverlayOpen(true)
  }

  const applyOverlay = () => {
    pushFilters(draft)
    setQueryDraft(draft.query)
    setOverlayOpen(false)
  }

  const clearAll = () => {
    pushFilters(EMPTY_SHOP_FILTERS)
    setDraft(EMPTY_SHOP_FILTERS)
    setQueryDraft('')
    setOverlayOpen(false)
  }

  // Close overlay on Escape
  useEffect(() => {
    if (!overlayOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlayOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlayOpen])

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E0E6ED] font-sans antialiased selection:bg-[#14B8A6]/30 selection:text-[#CCFFFD]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600;800&display=swap');
        h1, h2, h3, .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
        .labradorite-flash { color: #00F2FE; text-shadow: 0 0 15px rgba(0,242,254,0.5); }
        .labradorite-teal { color: #14B8A6; }
        .metal-oxidized { color: #71717A; }
        .accent-brass { color: #B59A54; }
        .noise-bg {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 50;
        }
      `,
        }}
      />
      <div className="noise-bg"></div>

      <nav className="w-full p-6 md:p-8 flex justify-between items-center border-b border-white/5 relative z-10 bg-[#05070A]/80 backdrop-blur-sm">
        <Link
          href="/"
          className="text-3xl display-font tracking-widest text-white hover:text-[#14B8A6] transition-colors"
        >
          Earthen Miners <span className="labradorite-teal">Designs</span>
        </Link>
        <div className="flex gap-4 md:gap-6 items-center">
          <Link
            href="/"
            className="text-[10px] md:text-xs tracking-[0.2em] uppercase font-bold bg-[#0A0C10] border border-[#B59A54] text-[#B59A54] hover:bg-[#B59A54] hover:text-black px-4 py-2.5 transition-colors"
          >
            ← Back to Homepage
          </Link>
          <ContactTrigger className="text-xs tracking-[0.2em] uppercase font-bold text-[#71717A] hover:text-[#14B8A6] transition-colors">
            Contact
          </ContactTrigger>
          <Link
            href="/mark"
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#71717A] hover:text-[#14B8A6] transition-colors hidden sm:inline"
          >
            Know Mark
          </Link>
          <Link
            href="/workbench"
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#71717A] hover:text-white transition-colors hidden sm:inline"
          >
            Live Forge
          </Link>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 py-12 md:py-24 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-white/5 pb-8 gap-8">
          <div>
            <h1 className="text-5xl md:text-7xl display-font text-white mb-4 tracking-tight">
              THE <span className="labradorite-flash">VAULT.</span>
            </h1>
            <p className="text-[#A1A1AA] font-light max-w-xl text-lg">
              Completed architectures, cooled and ready for acquisition. Filter by specification or
              search for specific loads.
            </p>
          </div>

          <div className="w-full md:w-auto flex gap-3 items-stretch">
            <div className="relative flex-grow md:w-72">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]" aria-hidden>
                <SearchIcon />
              </span>
              <input
                type="search"
                placeholder="Search the vault..."
                value={queryDraft}
                onChange={(e) => applyInlineQuery(e.target.value)}
                className="w-full bg-[#0A0C10] border border-[#27272A] p-4 pl-12 text-white focus:border-[#14B8A6] outline-none text-sm placeholder:text-[#71717A] transition-colors"
                aria-label="Search the vault"
              />
            </div>
            <button
              type="button"
              onClick={openOverlay}
              className="relative shrink-0 w-14 border border-[#27272A] bg-[#0A0C10] text-[#14B8A6] hover:border-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors flex items-center justify-center"
              aria-label="Open detailed search"
              title="Detailed search"
            >
              <SlidersIcon />
              {detailCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#B59A54] text-black text-[10px] font-bold flex items-center justify-center">
                  {detailCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          {categoryFilters.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => pushFilters({ ...filters, category: cat.slug })}
              className={`px-6 py-3 display-font tracking-widest text-sm transition-all duration-300 border
                        ${
                          filters.category === cat.slug
                            ? 'bg-[#14B8A6] text-black border-[#14B8A6] shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                            : 'bg-[#0A0C10] text-[#71717A] border-[#27272A] hover:border-[#14B8A6] hover:text-white'
                        }
                    `}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {(filters.query || detailCount > 0) && (
          <div className="flex flex-wrap items-center gap-3 mb-12 text-[10px] uppercase tracking-widest font-bold text-[#71717A]">
            <span>
              Showing {filteredItems.length} of {items.length}
            </span>
            {filters.query && (
              <span className="border border-[#27272A] px-3 py-1 text-[#A1A1AA]">
                “{filters.query}”
              </span>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="text-[#14B8A6] border-b border-[#14B8A6]/30 hover:border-[#14B8A6] pb-0.5"
            >
              Clear filters
            </button>
          </div>
        )}
        {!(filters.query || detailCount > 0) && <div className="mb-12" />}

        {availableItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {availableItems.map((item) => (
              <VaultCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-[#27272A] bg-[#0A0C10]">
            <span className="text-5xl mb-4 block grayscale opacity-30">🕸️</span>
            <h3 className="text-2xl display-font text-white mb-2">
              {soldItems.length > 0 ? 'NO PIECES FOR SALE HERE' : 'NO SPECIMENS FOUND'}
            </h3>
            <p className="text-[#71717A]">
              {soldItems.length > 0
                ? 'Everything matching these filters has already found a home — see sold below.'
                : 'Try adjusting your filters or searching for different specs.'}
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-6 text-[#14B8A6] text-xs uppercase tracking-widest font-bold border-b border-[#14B8A6]/30 pb-1 hover:border-[#14B8A6]"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {soldItems.length > 0 && (
          <section className="mt-24 pt-16 border-t border-white/10">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl display-font text-white uppercase tracking-wider">
                Sold pieces
              </h2>
              <p className="text-[#71717A] text-sm mt-2">
                Archived from the forge — still part of the vault’s story.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {soldItems.map((item) => (
                <VaultCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="py-12 border-t border-white/5 bg-[#05070A] relative z-10 text-center mt-24">
        <div className="text-sm tracking-[0.2em] uppercase font-bold text-white/30">
          EARTHEN MINERS <span className="labradorite-teal">DESIGNS</span> &copy;{' '}
          {new Date().getFullYear()}
        </div>
        <p className="text-xs text-white/10 mt-2">Unapologetic Craft. No Molds. No Fluff.</p>
      </footer>

      {overlayOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-search-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            aria-label="Close detailed search"
            onClick={() => setOverlayOpen(false)}
          />
          <div className="relative w-full sm:max-w-xl bg-[#0A0C10] border border-[#27272A] border-b-0 sm:border-b shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <h2 id="vault-search-title" className="text-2xl display-font text-white">
                    Detailed search
                  </h2>
                  <p className="text-[#71717A] text-sm mt-1">
                    Narrow the vault by category, kind, material, and price.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlayOpen(false)}
                  className="text-[#71717A] hover:text-white text-2xl leading-none px-2"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <label className="block">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                    Keywords
                  </span>
                  <input
                    type="search"
                    value={draft.query}
                    onChange={(e) => setDraft({ ...draft, query: e.target.value })}
                    placeholder="Any word — title, tags, stone, size…"
                    className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                    Category
                  </span>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
                  >
                    <option value="all">All Specs</option>
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                    Kind of piece
                  </span>
                  <select
                    value={draft.pieceType}
                    onChange={(e) => setDraft({ ...draft, pieceType: e.target.value })}
                    className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
                  >
                    <option value="">Any</option>
                    {pieceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                    Material
                  </span>
                  <select
                    value={draft.material}
                    onChange={(e) => setDraft({ ...draft, material: e.target.value })}
                    className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
                  >
                    <option value="">Any</option>
                    {materials.map((mat) => (
                      <option key={mat} value={mat}>
                        {mat}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                      Min price
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={draft.minPrice}
                      onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
                      placeholder="0"
                      className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                      Max price
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={draft.maxPrice}
                      onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
                      placeholder="Any"
                      className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <button
                  type="button"
                  onClick={applyOverlay}
                  className="flex-grow bg-[#14B8A6] text-black display-font tracking-widest py-4 hover:bg-white transition-colors"
                >
                  Show results
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-6 py-4 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase hover:border-white hover:text-white"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VaultCard({ item }: { item: ShopPiece }) {
  const priceLabel = item.sold
    ? 'Sold'
    : item.inquire_for_price
      ? 'Inquire'
      : `$${Math.round(item.price)}`

  return (
    <div
      className={`group bg-[#0A0C10] border border-white/5 flex flex-col h-full hover:border-[#B59A54] transition-all duration-500 ${
        item.sold ? 'opacity-90' : ''
      }`}
    >
      <Link
        href={`/shop/${item.id}`}
        className="aspect-[4/5] bg-[#111419] relative overflow-hidden flex items-center justify-center border-b border-white/5"
      >
        {item.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photos[0]}
            alt={item.title}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
              item.sold
                ? 'grayscale opacity-70 group-hover:opacity-90'
                : 'grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'
            }`}
          />
        ) : (
          <span className="text-xs text-white/20 display-font">[No Photo]</span>
        )}
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm border border-white/10 px-3 py-1">
          <span
            className={`text-[10px] font-bold tracking-widest uppercase ${
              item.sold ? 'text-[#B59A54]' : 'text-[#14B8A6]'
            }`}
          >
            {item.sold ? 'Sold' : item.piece_type}
          </span>
        </div>
      </Link>

      <div className="p-6 flex flex-col flex-grow">
        <Link href={`/shop/${item.id}`}>
          <h4 className="text-2xl display-font text-white mb-2 group-hover:text-[#B59A54] transition-colors">
            {item.title}
          </h4>
        </Link>
        <p className="text-sm metal-oxidized mb-6 flex-grow leading-relaxed line-clamp-2">
          {item.sold && item.sold_note ? item.sold_note : item.description}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-6 border-y border-[#27272A] py-4">
          <div>
            <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold mb-1">
              Weight
            </div>
            <div className="text-xs text-white font-mono">{item.specs?.weight || 'N/A'}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold mb-1">
              Size
            </div>
            <div className="text-xs text-white font-mono">{item.specs?.size || 'N/A'}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center gap-3">
            <span className="text-2xl font-bold text-white display-font tracking-wider">
              {priceLabel}
            </span>
            {!item.sold &&
              (item.inquire_for_price ? (
                <ContactTrigger
                  pieceId={item.id}
                  pieceTitle={item.title}
                  className="accent-brass text-xs font-bold tracking-widest uppercase border border-[#B59A54]/30 px-4 py-2 hover:bg-[#B59A54] hover:text-black transition-all"
                >
                  Inquire for price
                </ContactTrigger>
              ) : (
                <button
                  type="button"
                  className="accent-brass text-xs font-bold tracking-widest uppercase border border-[#B59A54]/30 px-4 py-2 hover:bg-[#B59A54] hover:text-black transition-all"
                >
                  Acquire
                </button>
              ))}
          </div>
          {!item.sold && (
            <ContactTrigger
              pieceId={item.id}
              pieceTitle={item.title}
              className="w-full text-center text-[10px] font-bold tracking-widest uppercase border border-[#14B8A6]/40 text-[#14B8A6] py-2.5 hover:bg-[#14B8A6] hover:text-black transition-all"
            >
              Inquire about this piece
            </ContactTrigger>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <circle cx="4" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
      <circle cx="20" cy="14" r="2" fill="currentColor" />
    </svg>
  )
}
