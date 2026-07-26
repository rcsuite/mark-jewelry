'use client'

import type { SilverQuote } from '@/lib/silver'
import { formatUsdPerOz } from '@/lib/silver'

function MiniChart({ history }: { history: SilverQuote['history'] }) {
  if (history.length < 2) return null
  const prices = history.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const w = 72
  const h = 22
  const points = history
    .map((p, i) => {
      const x = (i / (history.length - 1)) * w
      const y = (1 - (p.price - min) / span) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const up = history[history.length - 1].price >= history[0].price
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-16 h-5 shrink-0" aria-hidden>
      <polyline
        fill="none"
        stroke={up ? '#14B8A6' : '#F87171'}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  )
}

export default function AdminSilverStrip({
  quote,
  futuresUrl,
}: {
  quote: SilverQuote | null
  futuresUrl: string
}) {
  if (!quote) {
    return (
      <span className="text-[10px] text-[#52525B] uppercase tracking-widest truncate">
        Silver unavailable
      </span>
    )
  }

  const up = (quote.change ?? 0) >= 0
  const changeColor = up ? 'text-[#14B8A6]' : 'text-red-400'

  return (
    <a
      href={futuresUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 md:gap-3 max-w-full hover:opacity-90 transition-opacity"
      title="Open silver futures on Google"
    >
      <span className="display-font text-sm md:text-base text-white tabular-nums whitespace-nowrap">
        Ag {formatUsdPerOz(quote.pricePerOz)}
      </span>
      {quote.changePercent !== null && (
        <span className={`text-[10px] md:text-xs tabular-nums whitespace-nowrap ${changeColor}`}>
          {up ? '+' : ''}
          {quote.changePercent.toFixed(2)}%
        </span>
      )}
      <span className="hidden sm:inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[#71717A]">
        1m
        <MiniChart history={quote.history} />
      </span>
    </a>
  )
}
