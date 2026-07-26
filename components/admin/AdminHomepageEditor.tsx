'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  createCategory,
  deleteReview,
  reorderCategories,
  reorderFeatured,
  reorderReviews,
  setPieceFeatured,
  upsertReview,
} from '@/lib/actions'
import { PencilButton, SortableList } from '@/components/admin/SortableList'
import type { Category, CurrentBuild, HeroSlide, Review, ShopPiece } from '@/lib/types'

type Props = {
  build: CurrentBuild | null
  slides: HeroSlide[]
  forgeActive: boolean
  categories: Category[]
  reviews: Review[]
  featured: ShopPiece[]
  sold: ShopPiece[]
  availableForFeature: ShopPiece[]
}

export default function AdminHomepageEditor({
  categories: initialCategories,
  reviews: initialReviews,
  featured: initialFeatured,
  sold,
  availableForFeature,
  forgeActive,
}: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [reviews, setReviews] = useState(initialReviews)
  const [featured, setFeatured] = useState(initialFeatured)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [addingReview, setAddingReview] = useState(false)
  const [reviewDraft, setReviewDraft] = useState({
    quote: '',
    author: '',
    location: '',
    rating: 5,
  })
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [pickingFeatured, setPickingFeatured] = useState(false)

  const flash = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setStatus(null)
    } else {
      setStatus(msg)
      setError(null)
    }
  }

  const persistCategoryOrder = (next: Category[]) => {
    setCategories((prev) => {
      const hidden = prev.filter((c) => !c.show_on_homepage)
      return [...next, ...hidden]
    })
    startTransition(async () => {
      const result = await reorderCategories(next.map((c) => c.id))
      if (!result.ok) flash(result.error, true)
      else flash('Category order saved.')
    })
  }

  const persistReviewOrder = (next: Review[]) => {
    setReviews(next)
    startTransition(async () => {
      const result = await reorderReviews(next.map((r) => r.id))
      if (!result.ok) flash(result.error, true)
      else flash('Review order saved.')
    })
  }

  const persistFeaturedOrder = (next: ShopPiece[]) => {
    setFeatured(next)
    startTransition(async () => {
      const result = await reorderFeatured(next.map((p) => p.id))
      if (!result.ok) flash(result.error, true)
      else flash('Handiworks order saved.')
    })
  }

  const openReviewEdit = (review: Review) => {
    setEditingReview(review)
    setAddingReview(false)
    setReviewDraft({
      quote: review.quote,
      author: review.author,
      location: review.location,
      rating: review.rating,
    })
  }

  const openReviewAdd = () => {
    setAddingReview(true)
    setEditingReview(null)
    setReviewDraft({ quote: '', author: '', location: '', rating: 5 })
  }

  const saveReview = () => {
    startTransition(async () => {
      const result = await upsertReview({
        id: editingReview?.id,
        ...reviewDraft,
      })
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      if (editingReview) {
        setReviews((prev) => prev.map((r) => (r.id === result.data!.id ? result.data! : r)))
      } else {
        setReviews((prev) => [...prev, result.data!])
      }
      setEditingReview(null)
      setAddingReview(false)
      flash('Review saved.')
    })
  }

  const removeReview = (id: string) => {
    if (!confirm('Remove this review from the homepage?')) return
    startTransition(async () => {
      const result = await deleteReview(id)
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setReviews((prev) => prev.filter((r) => r.id !== id))
      setEditingReview(null)
      flash('Review removed.')
    })
  }

  const addCategory = () => {
    startTransition(async () => {
      const result = await createCategory(newCategoryName)
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setCategories((prev) =>
        prev.some((c) => c.id === result.category.id) ? prev : [...prev, result.category]
      )
      setNewCategoryName('')
      setAddingCategory(false)
      flash(result.created ? 'Category created.' : 'Category already existed.')
    })
  }

  const addToFeatured = (piece: ShopPiece) => {
    startTransition(async () => {
      const result = await setPieceFeatured(piece.id, true)
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setFeatured((prev) => (prev.some((p) => p.id === piece.id) ? prev : [...prev, piece]))
      setPickingFeatured(false)
      flash('Added to Available Handiworks.')
    })
  }

  const removeFromFeatured = (id: string) => {
    startTransition(async () => {
      const result = await setPieceFeatured(id, false)
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setFeatured((prev) => prev.filter((p) => p.id !== id))
      flash('Removed from Available Handiworks (still in the vault).')
    })
  }

  const homepageCategories = categories.filter((c) => c.show_on_homepage)

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E0E6ED] font-sans antialiased">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
            .metal-oxidized { color: #71717A; }
            .accent-brass { color: #B59A54; }
            .labradorite-flash { color: #00F2FE; }
            .labradorite-teal { color: #14B8A6; }
          `,
        }}
      />

      {/* Editing banner */}
      <div className="sticky top-0 z-50 bg-[#14B8A6] text-black px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase">
          Editing storefront — drag to reorder · pencil to edit
          {pending ? ' · Saving…' : ''}
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="text-[10px] font-bold tracking-widest uppercase border border-black/30 px-4 py-2 hover:bg-black hover:text-[#14B8A6]"
          >
            View public site
          </Link>
          <Link
            href="/admin"
            className="text-[10px] font-bold tracking-widest uppercase bg-black text-[#14B8A6] px-4 py-2"
          >
            Control panel
          </Link>
        </div>
      </div>

      {(error || status) && (
        <div
          className={`mx-6 mt-4 border p-4 text-sm ${
            error
              ? 'border-red-900/50 bg-red-950/30 text-red-300'
              : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          {error || status}
        </div>
      )}

      {/* Hero stub — not editable here; points at live forge */}
      <header className="relative border-b border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#14B8A6] font-bold mb-4">
            {forgeActive ? 'Forge active' : 'Forge resting'} — managed in Current Build
          </p>
          <h1 className="text-4xl md:text-6xl display-font text-white mb-4">
            Earthen Miners <span className="labradorite-teal">Designs</span>
          </h1>
          <p className="text-[#A1A1AA] max-w-xl text-sm">
            This page mirrors the public homepage. Grab a card to reorder. Hit the pencil to go
            deeper.
          </p>
          <Link
            href="/admin/current-project"
            className="inline-block mt-8 border border-[#B59A54] text-[#B59A54] display-font tracking-widest text-sm px-6 py-3 hover:bg-[#B59A54] hover:text-black"
          >
            Edit live forge →
          </Link>
        </div>
      </header>

      {/* Categories */}
      <section className="bg-[#0A0C10] py-24 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6 border-b border-white/10 pb-8">
            <h2 className="text-4xl md:text-5xl display-font text-white uppercase">Build Categories</h2>
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="w-fit border border-[#14B8A6] text-[#14B8A6] display-font tracking-widest text-sm px-6 py-3 hover:bg-[#14B8A6] hover:text-black"
            >
              + Add category
            </button>
          </div>

          {addingCategory && (
            <div className="mb-8 border border-[#14B8A6]/40 bg-[#05070A] p-6 flex flex-col sm:flex-row gap-3">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Bolo Ties"
                className="flex-grow bg-[#0A0C10] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54]"
              />
              <button
                type="button"
                onClick={addCategory}
                className="px-6 py-4 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setAddingCategory(false)}
                className="px-6 py-4 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase"
              >
                Cancel
              </button>
            </div>
          )}

          <SortableList
            items={homepageCategories}
            onReorder={persistCategoryOrder}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6"
            renderItem={(category, { isDragging, dragHandleProps }) => (
              <div
                {...dragHandleProps}
                className={`relative group bg-[#05070A] border p-6 flex flex-col h-full cursor-grab active:cursor-grabbing transition-all ${
                  isDragging
                    ? 'border-[#00F2FE] opacity-60 scale-[0.98]'
                    : 'border-white/5 hover:border-[#14B8A6]'
                }`}
              >
                <PencilButton
                  href={`/admin/homepage/categories/${category.slug}`}
                  label={`Edit ${category.title}`}
                />
                <div className="aspect-square bg-[#111419] mb-6 flex items-center justify-center border border-white/5 overflow-hidden">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.title}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <span className="text-xs text-white/20 display-font">
                      [{category.slug.toUpperCase()} IMAGE]
                    </span>
                  )}
                </div>
                <h3 className="text-xl display-font mb-2 text-[#00F2FE]">{category.title}</h3>
                <p className="text-sm text-[#A1A1AA] font-light leading-relaxed flex-grow">
                  {category.description || 'No description yet — open the pencil to add one.'}
                </p>
                <span className="accent-brass text-xs font-bold tracking-widest uppercase mt-6 block">
                  &rarr; View Specs
                </span>
              </div>
            )}
          />
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <h2 className="text-4xl md:text-5xl display-font text-white uppercase tracking-wider">
            Ironclad Verdicts
          </h2>
          <button
            type="button"
            onClick={openReviewAdd}
            className="w-fit border border-[#14B8A6] text-[#14B8A6] display-font tracking-widest text-sm px-6 py-3 hover:bg-[#14B8A6] hover:text-black"
          >
            + Add review
          </button>
        </div>

        <SortableList
          items={reviews}
          onReorder={persistReviewOrder}
          className="grid md:grid-cols-3 gap-8"
          renderItem={(review, { isDragging, dragHandleProps }) => (
            <div
              {...dragHandleProps}
              className={`relative bg-[#0A0C10] p-8 border cursor-grab active:cursor-grabbing ${
                isDragging ? 'border-[#00F2FE] opacity-60' : 'border-white/5 hover:border-[#14B8A6]'
              }`}
            >
              <PencilButton onClick={() => openReviewEdit(review)} label="Edit review" />
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#A1A1AA] mb-1 font-semibold">
                <span>{review.rating.toFixed(1)}</span>{' '}
                <span className="labradorite-flash">{'★'.repeat(Math.round(review.rating))}</span>
              </div>
              <p className="text-lg font-bold leading-relaxed mb-6 uppercase text-white tracking-wide pr-10">
                &quot;{review.quote}&quot;
              </p>
              <p className="text-xs tracking-[0.2em] uppercase metal-oxidized font-bold">
                — {review.author}
                {review.location ? `, ${review.location}` : ''}
              </p>
            </div>
          )}
        />
      </section>

      {/* Handiworks */}
      <section className="bg-[#0A0C10] py-24 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
            <h2 className="text-4xl md:text-5xl display-font text-white uppercase tracking-wider">
              Available Handiworks
            </h2>
            <button
              type="button"
              onClick={() => setPickingFeatured(true)}
              className="w-fit border border-[#B59A54] text-[#B59A54] display-font tracking-widest text-sm px-6 py-3 hover:bg-[#B59A54] hover:text-black"
            >
              + Feature a piece
            </button>
          </div>

          {featured.length === 0 ? (
            <p className="text-[#71717A] text-sm display-font tracking-widest">
              No featured pieces yet — add one from the vault.
            </p>
          ) : (
            <SortableList
              items={featured}
              onReorder={persistFeaturedOrder}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8"
              renderItem={(piece, { isDragging, dragHandleProps }) => (
                <div
                  {...dragHandleProps}
                  className={`relative group bg-[#05070A] border cursor-grab active:cursor-grabbing ${
                    isDragging ? 'border-[#00F2FE] opacity-60' : 'border-white/5 hover:border-[#14B8A6]'
                  }`}
                >
                  <PencilButton
                    href={`/admin/homepage/pieces/${piece.id}`}
                    label={`Edit ${piece.title}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeFromFeatured(piece.id)}
                    className="absolute top-3 left-3 z-20 text-[9px] font-bold tracking-widest uppercase bg-black/80 border border-[#27272A] text-[#A1A1AA] px-2 py-1 hover:border-red-500 hover:text-red-400"
                  >
                    Unfeature
                  </button>
                  <div className="aspect-square bg-[#111419] border-b border-white/5 relative overflow-hidden flex items-center justify-center">
                    {piece.photos[0] ? (
                      <img
                        src={piece.photos[0]}
                        alt={piece.title}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <span className="text-xs text-white/20 display-font">[No Photo]</span>
                    )}
                  </div>
                  <div className="p-6">
                    <h4 className="text-xl display-font text-white mb-2">{piece.title}</h4>
                    <div className="flex justify-between items-baseline border-t border-white/5 pt-4">
                      <span className="text-lg font-bold text-white">
                        {piece.inquire_for_price ? 'Inquire' : `$${piece.price.toFixed(2)}`}
                      </span>
                      <span className="accent-brass text-[10px] font-bold tracking-widest uppercase">
                        View Specs
                      </span>
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* Sold strip */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl display-font text-white uppercase tracking-wider mb-8">
          Sold pieces
        </h2>
        {sold.length === 0 ? (
          <p className="text-[#71717A] text-sm">
            Mark a piece as sold from its pencil editor and it will show up here.
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {sold.map((piece) => (
              <Link
                key={piece.id}
                href={`/admin/homepage/pieces/${piece.id}`}
                className="relative shrink-0 w-28 h-28 bg-[#111419] border border-white/5 hover:border-[#14B8A6] overflow-hidden"
              >
                {piece.photos[0] ? (
                  <img src={piece.photos[0]} alt={piece.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/20 display-font">
                    SOLD
                  </span>
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center py-1 tracking-widest uppercase text-[#B59A54]">
                  Sold
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Review modal */}
      {(editingReview || addingReview) && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#0A0C10] border border-[#27272A] p-8 max-w-lg w-full relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
            <h3 className="text-2xl display-font mb-6">
              {addingReview ? 'Add review' : 'Edit review'}
            </h3>
            <div className="space-y-4">
              <textarea
                rows={4}
                value={reviewDraft.quote}
                onChange={(e) => setReviewDraft({ ...reviewDraft, quote: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54] resize-none"
                placeholder="Quote"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  value={reviewDraft.author}
                  onChange={(e) => setReviewDraft({ ...reviewDraft, author: e.target.value })}
                  className="bg-[#05070A] border border-[#27272A] p-3 text-white outline-none"
                  placeholder="Author"
                />
                <input
                  value={reviewDraft.location}
                  onChange={(e) => setReviewDraft({ ...reviewDraft, location: e.target.value })}
                  className="bg-[#05070A] border border-[#27272A] p-3 text-white outline-none"
                  placeholder="Location"
                />
              </div>
              <label className="block text-[10px] uppercase tracking-widest text-[#71717A] font-bold">
                Rating
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={reviewDraft.rating}
                  onChange={(e) =>
                    setReviewDraft({ ...reviewDraft, rating: Number(e.target.value) })
                  }
                  className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              <button
                type="button"
                onClick={saveReview}
                className="px-6 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase"
              >
                Save
              </button>
              {editingReview && (
                <button
                  type="button"
                  onClick={() => removeReview(editingReview.id)}
                  className="px-6 py-3 border border-red-900 text-red-400 text-[10px] font-bold tracking-widest uppercase"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingReview(null)
                  setAddingReview(false)
                }}
                className="px-6 py-3 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature picker */}
      {pickingFeatured && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#0A0C10] border border-[#27272A] p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl display-font mb-2">Feature a vault piece</h3>
            <p className="text-[#71717A] text-sm mb-6">
              Pick a piece that is for sale and not already on the homepage strip.
            </p>
            <div className="space-y-2">
              {availableForFeature
                .filter((p) => !featured.some((f) => f.id === p.id))
                .map((piece) => (
                  <button
                    key={piece.id}
                    type="button"
                    onClick={() => addToFeatured(piece)}
                    className="w-full flex items-center gap-4 p-3 border border-[#27272A] hover:border-[#14B8A6] text-left"
                  >
                    <div className="w-14 h-14 bg-[#111419] shrink-0 overflow-hidden">
                      {piece.photos[0] && (
                        <img src={piece.photos[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <div className="display-font text-white">{piece.title}</div>
                      <div className="text-[10px] text-[#71717A] uppercase tracking-widest">
                        {piece.category} ·{' '}
                        {piece.inquire_for_price ? 'Inquire' : `$${piece.price.toFixed(2)}`}
                      </div>
                    </div>
                  </button>
                ))}
              {availableForFeature.filter((p) => !featured.some((f) => f.id === p.id)).length ===
                0 && (
                <p className="text-[#71717A] text-sm py-8 text-center">
                  Every available piece is already featured, or the vault is empty.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickingFeatured(false)}
              className="mt-6 px-6 py-3 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
