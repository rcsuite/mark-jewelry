import Image from 'next/image'
import { initialsFromName } from '@/lib/review-utils'
import type { Review } from '@/lib/types'

type Props = {
  review: Review
  className?: string
}

/**
 * Ironclad Verdicts card — same layout as the homepage, with an optional
 * bottom-right bleed photo (or initials) inspired by the eternal-site avatar.
 */
export default function ReviewCard({ review, className = '' }: Props) {
  const initials = initialsFromName(review.author)
  const hasPhoto = Boolean(review.image_url)

  return (
    <div
      className={`bg-[#0A0C10] p-8 border border-white/5 relative group rounded-sm overflow-hidden ${className}`}
    >
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#14B8A6] opacity-5 blur-3xl group-hover:opacity-10 transition-opacity" />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#A1A1AA] mb-1 font-semibold relative z-10">
        <span>{review.rating.toFixed(1)}</span>{' '}
        <span className="labradorite-flash">
          {'★'.repeat(Math.max(1, Math.round(review.rating)))}
        </span>
      </div>
      <p className="text-lg md:text-xl font-bold leading-relaxed mb-6 uppercase text-white tracking-wide relative z-10 pr-16">
        &quot;{review.quote}&quot;
      </p>
      <p className="text-xs tracking-[0.2em] uppercase metal-oxidized font-bold relative z-10 pr-20">
        — {review.author}
        {review.location ? `, ${review.location}` : ''}
      </p>

      <div
        className="absolute -bottom-3 -right-3 w-24 h-24 rounded-full flex items-center justify-center border-[3px] border-[#05070A] shadow-md text-2xl font-bold display-font z-20 overflow-hidden bg-[#111419] text-[#71717A]"
        aria-hidden={hasPhoto}
      >
        {review.image_url ? (
          <Image
            src={review.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
            unoptimized
          />
        ) : (
          initials
        )}
      </div>
    </div>
  )
}
