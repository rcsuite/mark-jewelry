'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Category, ShopPiece } from '@/lib/types'
import type { SilverQuote } from '@/lib/silver'
import { matchesQuery, pieceSearchHaystack } from '@/lib/shop-search'
import { adminPiecePriceLabel } from '@/lib/pricing'

type Props = {
  pieces: ShopPiece[]
  categories: Category[]
  silver: SilverQuote | null
}

export default function AdminPieceSearch({ pieces, categories, silver }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = deferredQuery.trim()
    if (!q) return []
    return pieces.filter((piece) =>
      matchesQuery(pieceSearchHaystack(piece, categories), q)
    )
  }, [pieces, categories, deferredQuery])

  const searching = query.trim().length > 0

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-10 h-10 flex items-center justify-center border transition-colors ${
          open
            ? 'border-[#00F2FE] text-[#00F2FE]'
            : 'border-[#27272A] text-[#A1A1AA] hover:border-[#14B8A6] hover:text-white'
        }`}
        aria-label="Search pieces"
        aria-expanded={open}
        title="Search pieces"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[min(100vw-1.5rem,22rem)] bg-[#0A0C10] border border-[#27272A] shadow-xl z-50">
          <div className="p-3 border-b border-[#27272A]">
            <label htmlFor="admin-topbar-piece-search" className="sr-only">
              Search pieces
            </label>
            <input
              ref={inputRef}
              id="admin-topbar-piece-search"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Title, category, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#05070A] border border-[#14B8A6]/50 focus:border-[#00F2FE] text-white placeholder:text-[#52525B] px-3 py-2.5 text-sm outline-none"
            />
            {searching && (
              <p className="text-[10px] text-[#71717A] uppercase tracking-widest mt-2">
                {results.length} result{results.length === 1 ? '' : 's'}
              </p>
            )}
          </div>

          <ul className="max-h-[min(60vh,22rem)] overflow-y-auto divide-y divide-[#27272A]">
            {!searching ? (
              <li className="px-4 py-6 text-center text-[#52525B] text-xs">
                Type to find any vault piece
              </li>
            ) : results.length === 0 ? (
              <li className="px-4 py-6 text-center text-[#71717A] text-sm">
                No pieces match “{query.trim()}”
              </li>
            ) : (
              results.map((piece) => {
                const thumb = piece.photos[0]
                const price = adminPiecePriceLabel(piece, silver?.pricePerOz ?? null)
                return (
                  <li key={piece.id}>
                    <Link
                      href={`/admin/homepage/pieces/${piece.id}`}
                      onClick={() => {
                        setOpen(false)
                        setQuery('')
                      }}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-[#14B8A6]/10 transition-colors"
                    >
                      <div className="relative w-11 h-11 shrink-0 bg-[#05070A] border border-[#27272A] overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[7px] text-[#52525B] display-font">
                            No photo
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="display-font text-sm text-white truncate">
                          {piece.title || 'Untitled'}
                        </p>
                        <p className="text-[9px] text-[#71717A] uppercase tracking-widest truncate mt-0.5">
                          {piece.piece_type || 'Piece'}
                          {piece.sold ? ' · Sold' : ''}
                          {piece.featured ? ' · Featured' : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {price.amount ? (
                          <p className="display-font text-base text-[#B59A54] tabular-nums leading-tight">
                            {price.amount}
                          </p>
                        ) : null}
                        {price.inquire ? (
                          <p className="text-[8px] font-bold tracking-widest uppercase text-[#14B8A6]">
                            Inquire
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
