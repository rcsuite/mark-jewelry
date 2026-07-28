'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  dismissReviewCandidate,
  publishReview,
  sendReviewInvite,
  updatePieceBuyer,
} from '@/lib/review-actions'
import { deleteReview, upsertReview } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import { REVIEW_PHOTOS_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import { getCroppedImageBlob } from '@/lib/crop-image'
import Cropper, { Area } from 'react-easy-crop'
import ReviewCard from '@/components/home/ReviewCard'
import type { Review, ReviewCandidate } from '@/lib/types'

const supabase = createClient()

type Props = {
  candidates: ReviewCandidate[]
  reviews: Review[]
}

export default function AdminReviewsHub({ candidates: initialCandidates, reviews: initialReviews }: Props) {
  const [candidates, setCandidates] = useState(initialCandidates)
  const [reviews, setReviews] = useState(initialReviews)
  const [pending, startTransition] = useTransition()
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buyerEdits, setBuyerEdits] = useState<
    Record<string, { buyer_name: string; buyer_email: string }>
  >({})

  const [draft, setDraft] = useState({
    quote: '',
    author: '',
    location: '',
    rating: 5,
    image_url: null as string | null,
  })
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)

  const ready = candidates.filter((c) => c.ready)
  const waiting = candidates.filter(
    (c) =>
      !c.ready &&
      c.invite?.status !== 'submitted' &&
      c.invite?.status !== 'sent'
  )
  const sent = candidates.filter((c) => c.invite?.status === 'sent')
  // Hide pieces that already submitted a review from the request list
  const pendingReviews = reviews.filter((r) => r.status === 'pending')
  const publishedReviews = reviews.filter((r) => r.status === 'published')

  const notify = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setFlash(null)
    } else {
      setFlash(msg)
      setError(null)
    }
  }

  const sendInvite = (pieceId: string) => {
    startTransition(async () => {
      const result = await sendReviewInvite(pieceId)
      if (!result.ok) {
        notify(result.error, true)
        return
      }
      setCandidates((prev) =>
        prev.map((c) =>
          c.piece.id === pieceId
            ? { ...c, ready: false, invite: result.data ?? c.invite }
            : c
        )
      )
      notify('Review request emailed.')
    })
  }

  const dismiss = (pieceId: string) => {
    if (!confirm('Skip review request for this piece?')) return
    startTransition(async () => {
      const result = await dismissReviewCandidate(pieceId)
      if (!result.ok) {
        notify(result.error, true)
        return
      }
      setCandidates((prev) => prev.filter((c) => c.piece.id !== pieceId))
      notify('Skipped.')
    })
  }

  const saveBuyer = (pieceId: string) => {
    const edit = buyerEdits[pieceId]
    if (!edit) return
    startTransition(async () => {
      const result = await updatePieceBuyer({
        pieceId,
        buyer_name: edit.buyer_name,
        buyer_email: edit.buyer_email,
      })
      if (!result.ok) {
        notify(result.error, true)
        return
      }
      setCandidates((prev) =>
        prev.map((c) =>
          c.piece.id === pieceId && result.data
            ? {
                ...c,
                piece: result.data,
                ready:
                  Boolean(result.data.buyer_email?.trim()) &&
                  c.daysSinceSold >= 3 &&
                  c.invite?.status !== 'sent' &&
                  c.invite?.status !== 'submitted',
              }
            : c
        )
      )
      setBuyerEdits((prev) => {
        const next = { ...prev }
        delete next[pieceId]
        return next
      })
      notify('Buyer info saved.')
    })
  }

  const approve = (id: string) => {
    startTransition(async () => {
      const result = await publishReview(id)
      if (!result.ok) {
        notify(result.error, true)
        return
      }
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'published' } : r))
      )
      notify('Published to Ironclad Verdicts.')
    })
  }

  const remove = (id: string) => {
    if (!confirm('Remove this review?')) return
    startTransition(async () => {
      const result = await deleteReview(id)
      if (!result.ok) {
        notify(result.error, true)
        return
      }
      setReviews((prev) => prev.filter((r) => r.id !== id))
      notify('Review removed.')
    })
  }

  const createReview = () => {
    startTransition(async () => {
      const result = await upsertReview({
        quote: draft.quote,
        author: draft.author,
        location: draft.location,
        rating: draft.rating,
        image_url: draft.image_url,
        status: 'published',
      })
      if (!result.ok) {
        notify(result.error, true)
        return
      }
      if (result.data) setReviews((prev) => [result.data!, ...prev])
      setDraft({ quote: '', author: '', location: '', rating: 5, image_url: null })
      notify('Review added to the homepage.')
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  const uploadPhoto = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      notify('Adjust the crop first.', true)
      return
    }
    setUploading(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      const url = await uploadImageBlob(
        supabase,
        REVIEW_PHOTOS_BUCKET,
        'admin',
        blob,
        `review-${Date.now()}`
      )
      setDraft((prev) => ({ ...prev, image_url: url }))
      URL.revokeObjectURL(imageSrc)
      setImageSrc(null)
      notify('Photo uploaded.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.', true)
    } finally {
      setUploading(false)
    }
  }

  const renderCandidate = (c: ReviewCandidate, mode: 'ready' | 'waiting' | 'sent') => {
    const edit = buyerEdits[c.piece.id] ?? {
      buyer_name: c.piece.buyer_name ?? '',
      buyer_email: c.piece.buyer_email ?? '',
    }
    const daysLabel =
      c.daysSinceSold === 0
        ? 'today'
        : c.daysSinceSold === 1
          ? '1 day ago'
          : `${c.daysSinceSold} days ago`
    const who = c.piece.buyer_name?.trim() || 'Someone'

    return (
      <div
        key={c.piece.id}
        className="bg-[#0A0C10] border border-[#27272A] p-5 md:p-6 flex flex-col md:flex-row gap-4 md:items-center"
      >
        <div className="w-16 h-16 shrink-0 bg-[#111419] border border-white/5 overflow-hidden relative">
          {c.piece.photos[0] ? (
            <Image src={c.piece.photos[0]} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#71717A] text-xs">
              —
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-white text-sm md:text-base">
            <span className="font-semibold">{who}</span>
            {' bought '}
            <Link
              href={`/admin/homepage/pieces/${c.piece.id}`}
              className="text-[#14B8A6] hover:underline"
            >
              {c.piece.title}
            </Link>
            <span className="text-[#71717A]"> · {daysLabel}</span>
          </p>
          {mode === 'sent' && (
            <p className="text-[10px] uppercase tracking-widest text-[#B59A54] font-bold">
              Invite sent — waiting on their reply
            </p>
          )}
          {mode === 'waiting' && c.daysSinceSold < 3 && (
            <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">
              Ready in {3 - c.daysSinceSold} day{3 - c.daysSinceSold === 1 ? '' : 's'}
            </p>
          )}
          {(!c.piece.buyer_email || buyerEdits[c.piece.id]) && (
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              <input
                value={edit.buyer_name}
                onChange={(e) =>
                  setBuyerEdits((prev) => ({
                    ...prev,
                    [c.piece.id]: { ...edit, buyer_name: e.target.value },
                  }))
                }
                placeholder="Buyer name"
                className="bg-[#05070A] border border-[#27272A] p-2 text-sm text-white outline-none focus:border-[#14B8A6]"
              />
              <input
                type="email"
                value={edit.buyer_email}
                onChange={(e) =>
                  setBuyerEdits((prev) => ({
                    ...prev,
                    [c.piece.id]: { ...edit, buyer_email: e.target.value },
                  }))
                }
                placeholder="Buyer email"
                className="bg-[#05070A] border border-[#27272A] p-2 text-sm text-white outline-none focus:border-[#14B8A6]"
              />
              <button
                type="button"
                onClick={() => saveBuyer(c.piece.id)}
                disabled={pending}
                className="sm:col-span-2 text-[10px] font-bold uppercase tracking-widest border border-[#14B8A6] text-[#14B8A6] px-3 py-2 hover:bg-[#14B8A6] hover:text-black disabled:opacity-50 w-fit"
              >
                Save buyer info
              </button>
            </div>
          )}
          {c.piece.buyer_email && !buyerEdits[c.piece.id] && (
            <button
              type="button"
              onClick={() =>
                setBuyerEdits((prev) => ({
                  ...prev,
                  [c.piece.id]: {
                    buyer_name: c.piece.buyer_name ?? '',
                    buyer_email: c.piece.buyer_email ?? '',
                  },
                }))
              }
              className="text-[10px] text-[#71717A] hover:text-[#14B8A6] uppercase tracking-widest font-bold"
            >
              Edit {c.piece.buyer_email}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {mode === 'ready' && (
            <button
              type="button"
              onClick={() => sendInvite(c.piece.id)}
              disabled={pending || !c.piece.buyer_email}
              className="px-4 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase hover:bg-[#2dd4bf] disabled:opacity-40"
            >
              Send review request
            </button>
          )}
          {mode !== 'sent' && (
            <button
              type="button"
              onClick={() => dismiss(c.piece.id)}
              disabled={pending}
              className="px-4 py-3 border border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase hover:border-white hover:text-white disabled:opacity-50"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
            .labradorite-flash { background: linear-gradient(90deg, #14B8A6, #00F2FE, #B59A54); -webkit-background-clip: text; background-clip: text; color: transparent; }
            .metal-oxidized { color: #71717A; }
          `,
        }}
      />

      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-4xl display-font">Reviews</h1>
          <p className="text-[#A1A1AA] text-sm mt-2 max-w-xl">
            Three days after a piece is marked sold, the top-bar icon lights up. Send a
            request when you&apos;re ready — reviews land below for you to publish.
          </p>
        </div>

        {(flash || error) && (
          <div
            className={`border p-4 text-sm ${
              error
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {error || flash}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-2xl display-font text-[#14B8A6]">Request a review</h2>
          {ready.length === 0 && waiting.length === 0 && sent.length === 0 ? (
            <p className="text-[#71717A] text-sm">
              No sold pieces yet. When you mark something sold and add the buyer&apos;s
              email, it will show up here after three days.
            </p>
          ) : (
            <div className="space-y-3">
              {ready.map((c) => renderCandidate(c, 'ready'))}
              {sent.map((c) => renderCandidate(c, 'sent'))}
              {waiting.map((c) => renderCandidate(c, 'waiting'))}
            </div>
          )}
        </section>

        <div className="h-px bg-[#27272A]" />

        <section className="space-y-6">
          <h2 className="text-2xl display-font text-white">Reviews received</h2>

          {pendingReviews.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-[#B59A54] font-bold">
                Awaiting your approval
              </p>
              {pendingReviews.map((review) => (
                <div key={review.id} className="relative">
                  <ReviewCard review={review} className="border-[#B59A54]/40" />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => approve(review.id)}
                      disabled={pending}
                      className="px-4 py-2 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(review.id)}
                      disabled={pending}
                      className="px-4 py-2 border border-red-900 text-red-400 text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {publishedReviews.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">
                On the homepage
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {publishedReviews.map((review) => (
                  <div key={review.id}>
                    <ReviewCard review={review} />
                    <button
                      type="button"
                      onClick={() => remove(review.id)}
                      disabled={pending}
                      className="mt-2 text-[10px] uppercase tracking-widest text-[#71717A] hover:text-red-400 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length === 0 && (
            <p className="text-[#71717A] text-sm">No reviews yet — add one below or send an invite.</p>
          )}
        </section>

        <section className="bg-[#0A0C10] border border-[#27272A] p-6 md:p-8 space-y-4 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#14B8A6]" />
          <h2 className="text-2xl display-font">Write a review</h2>
          <p className="text-[#71717A] text-xs">
            Manual entry for when someone tells you in person. Publishes straight to Ironclad
            Verdicts.
          </p>
          <textarea
            rows={4}
            value={draft.quote}
            onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
            placeholder="Quote"
            className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#B59A54] resize-none"
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={draft.author}
              onChange={(e) => setDraft({ ...draft, author: e.target.value })}
              placeholder="Author"
              className="bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#14B8A6]"
            />
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Location (optional)"
              className="bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#14B8A6]"
            />
          </div>
          <label className="block text-[10px] uppercase tracking-widest text-[#71717A] font-bold">
            Rating
            <input
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={draft.rating}
              onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
              className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[10px] font-bold uppercase tracking-widest border border-[#27272A] px-4 py-3 cursor-pointer hover:border-[#14B8A6] text-[#A1A1AA]">
              {draft.image_url ? 'Replace photo' : 'Optional photo'}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
            {draft.image_url && (
              <button
                type="button"
                onClick={() => setDraft({ ...draft, image_url: null })}
                className="text-[10px] uppercase tracking-widest text-[#71717A] hover:text-white font-bold"
              >
                Clear photo
              </button>
            )}
            {draft.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            )}
          </div>
          <button
            type="button"
            onClick={createReview}
            disabled={pending}
            className="px-6 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
          >
            Add review
          </button>
        </section>
      </div>

      {imageSrc && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-2xl h-[50vh] bg-[#0A0C10] border border-[#27272A] mb-4 overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, area) => setCroppedAreaPixels(area)}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-64 mb-4"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={uploadPhoto}
              disabled={uploading}
              className="px-6 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Use photo'}
            </button>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(imageSrc)
                setImageSrc(null)
              }}
              className="px-6 py-3 border border-[#27272A] text-[10px] font-bold tracking-widest uppercase text-[#A1A1AA]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
