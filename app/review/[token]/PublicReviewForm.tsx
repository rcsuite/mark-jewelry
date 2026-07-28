'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import {
  submitPublicReview,
  uploadReviewInvitePhoto,
  type PublicInvitePayload,
} from '@/lib/review-actions'

type Props = {
  invite: PublicInvitePayload
}

export default function PublicReviewForm({ invite }: Props) {
  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState(invite.buyer_name || '')
  const [location, setLocation] = useState('')
  const [rating, setRating] = useState(5)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const result = await uploadReviewInvitePhoto(invite.token, fd)
      if (!result.ok || !result.data) {
        setError(!result.ok ? result.error : 'Upload failed.')
        return
      }
      setImageUrl(result.data.url)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const submit = () => {
    startTransition(async () => {
      setError(null)
      const result = await submitPublicReview({
        token: invite.token,
        quote,
        author,
        location,
        rating,
        image_url: imageUrl,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#05070A] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-3xl display-font text-[#14B8A6]">Thank you</h1>
          <p className="text-[#A1A1AA] text-sm leading-relaxed">
            Mark will see your words. Grateful you took a minute for{' '}
            <span className="text-white">{invite.piece_title}</span>.
          </p>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `.display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }`,
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />
      <div className="max-w-lg mx-auto space-y-8">
        <div className="space-y-3">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#14B8A6]">
            Earthen Miners Designs
          </p>
          <h1 className="text-3xl md:text-4xl display-font">How&apos;s it treating you?</h1>
          <p className="text-[#A1A1AA] text-sm">
            A few words about <span className="text-white">{invite.piece_title}</span> mean a
            lot to Mark.
          </p>
        </div>

        {invite.piece_photo && (
          <div className="relative aspect-[4/5] max-w-xs border border-[#27272A] overflow-hidden">
            <Image
              src={invite.piece_photo}
              alt={invite.piece_title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {error && (
          <div className="border border-red-900/50 bg-red-950/30 text-red-300 p-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 bg-[#0A0C10] border border-[#27272A] p-6">
          <label className="block text-[10px] uppercase tracking-widest text-[#71717A] font-bold">
            Stars
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`w-10 h-10 text-lg ${
                    n <= rating ? 'text-[#B59A54]' : 'text-[#27272A]'
                  }`}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
          <textarea
            rows={5}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Your review…"
            className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none focus:border-[#14B8A6] resize-none"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
            className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#14B8A6]"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / place (optional)"
            className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#14B8A6]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[10px] font-bold uppercase tracking-widest border border-[#27272A] px-4 py-3 cursor-pointer hover:border-[#14B8A6] text-[#A1A1AA]">
              {uploading ? 'Uploading…' : imageUrl ? 'Replace photo' : 'Optional photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onPhoto}
                disabled={uploading}
              />
            </label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending || uploading}
            className="w-full bg-[#14B8A6] text-black display-font text-xl py-4 hover:bg-[#2dd4bf] disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  )
}
