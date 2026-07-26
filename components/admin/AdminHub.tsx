'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Category, ShopPiece } from '@/lib/types'
import type { SilverQuote } from '@/lib/silver'
import { matchesQuery, pieceSearchHaystack } from '@/lib/shop-search'
import { piecePriceLabel } from '@/lib/pricing'

type Props = {
  pieces: ShopPiece[]
  categories: Category[]
  silver: SilverQuote | null
}

export default function AdminHub({ pieces, categories, silver }: Props) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const results = useMemo(() => {
    const q = deferredQuery.trim()
    if (!q) return []
    return pieces.filter((piece) =>
      matchesQuery(pieceSearchHaystack(piece, categories), q)
    )
  }, [pieces, categories, deferredQuery])

  const searching = query.trim().length > 0

  return (
    <div className="min-h-screen bg-[#05070A] text-white font-sans antialiased">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
        .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
      `,
        }}
      />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider display-font">
            EARTHEN MINERS <span className="text-[#14B8A6]">DESIGNS</span>
          </h1>
          <p className="text-[#71717A] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            Admin · find a piece fast
          </p>
        </header>

        <div className="mb-4">
          <label htmlFor="admin-piece-search" className="sr-only">
            Search pieces
          </label>
          <input
            id="admin-piece-search"
            type="search"
            autoFocus
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search title, category, tags, price…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#0A0C10] border-2 border-[#14B8A6]/50 focus:border-[#00F2FE] text-white placeholder:text-[#52525B] px-4 py-4 rounded-sm text-base outline-none transition-colors"
          />
          {searching && (
            <p className="text-[10px] text-[#71717A] uppercase tracking-widest mt-2">
              {results.length} result{results.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {searching ? (
          <ul className="mb-10 divide-y divide-[#27272A] border border-[#27272A] rounded-sm overflow-hidden bg-[#0A0C10]">
            {results.length === 0 ? (
              <li className="px-4 py-8 text-center text-[#71717A] text-sm">
                No pieces match “{query.trim()}”
              </li>
            ) : (
              results.map((piece) => {
                const thumb = piece.photos[0]
                return (
                  <li key={piece.id}>
                    <Link
                      href={`/admin/homepage/pieces/${piece.id}`}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-[#14B8A6]/10 active:bg-[#14B8A6]/15 transition-colors"
                    >
                      <div className="relative w-14 h-14 shrink-0 bg-[#05070A] border border-[#27272A] overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-[#52525B] display-font">
                            No photo
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="display-font text-base text-white truncate">
                          {piece.title || 'Untitled'}
                        </p>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-widest truncate mt-0.5">
                          {piece.piece_type || 'Piece'}
                          {piece.sold ? ' · Sold' : ''}
                          {piece.featured ? ' · Featured' : ''}
                        </p>
                      </div>
                      <p className="display-font text-lg text-[#B59A54] tabular-nums shrink-0 max-w-[7rem] text-right leading-tight">
                        {piecePriceLabel(piece, silver?.pricePerOz ?? null)}
                      </p>
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
        ) : (
          <p className="mb-8 text-sm text-[#52525B]">
            Type to find any vault piece — tap a row to edit every field.
          </p>
        )}

        {!searching && (
          <div className="space-y-4">
            <Link
              href="/admin/current-project"
              className="block bg-[#0A0C10] border border-[#14B8A6]/30 hover:border-[#14B8A6] p-6 rounded-sm group transition-colors relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#14B8A6]" />
              <h2 className="text-xl display-font text-white group-hover:text-[#00F2FE] transition-colors">
                Current Build
              </h2>
              <p className="text-[#A1A1AA] text-sm mt-1 font-light">
                Workbench slideshow, livestreams, finalize into the vault.
              </p>
            </Link>

            <Link
              href="/admin/homepage"
              className="block bg-[#0A0C10] border border-[#B59A54]/40 hover:border-[#B59A54] p-6 rounded-sm group transition-colors relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#B59A54]" />
              <h2 className="text-xl display-font text-white group-hover:text-[#B59A54] transition-colors">
                Edit Homepage
              </h2>
              <p className="text-[#A1A1AA] text-sm mt-1 font-light">
                Drag, pencil, reorder — mirror of the live site.
              </p>
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/admin/add-piece"
                className="bg-[#0A0C10] border border-[#27272A] hover:border-[#B59A54] p-6 rounded-sm transition-colors group"
              >
                <h2 className="text-lg display-font group-hover:text-[#B59A54] transition-colors">
                  Add piece
                </h2>
                <p className="text-[#71717A] text-[10px] tracking-widest uppercase mt-2 font-bold">
                  Manual vault entry
                </p>
              </Link>
              <Link
                href="/admin/messages"
                className="bg-[#0A0C10] border border-[#27272A] hover:border-[#14B8A6] p-6 rounded-sm transition-colors group"
              >
                <h2 className="text-lg display-font group-hover:text-[#14B8A6] transition-colors">
                  Messages
                </h2>
                <p className="text-[#71717A] text-[10px] tracking-widest uppercase mt-2 font-bold">
                  Live chats from the site
                </p>
              </Link>
              <Link
                href="/admin/mark"
                className="bg-[#0A0C10] border border-[#27272A] hover:border-[#B59A54] p-6 rounded-sm transition-colors group sm:col-span-2"
              >
                <h2 className="text-lg display-font group-hover:text-[#B59A54] transition-colors">
                  Know Mark
                </h2>
                <p className="text-[#71717A] text-[10px] tracking-widest uppercase mt-2 font-bold">
                  Hobbies & life photos — fishing, family, off the bench
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
