import type { SilverQuote } from '@/lib/silver'
import { formatUsdPerOz } from '@/lib/silver'

function SilverMonthChart({ history }: { history: SilverQuote['history'] }) {
  if (history.length < 2) {
    return (
      <div className="h-20 flex items-center text-[#71717A] text-xs tracking-widest uppercase">
        Chart unavailable
      </div>
    )
  }

  const prices = history.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const w = 280
  const h = 72
  const pad = 4

  const points = history
    .map((p, i) => {
      const x = pad + (i / (history.length - 1)) * (w - pad * 2)
      const y = pad + (1 - (p.price - min) / span) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const last = history[history.length - 1]
  const first = history[0]
  const up = last.price >= first.price
  const stroke = up ? '#14B8A6' : '#F87171'

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-20"
        role="img"
        aria-label="One month silver futures chart"
      >
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-[9px] text-[#71717A] tracking-widest uppercase mt-1">
        <span>{first.date.slice(5)}</span>
        <span>1 mo</span>
        <span>{last.date.slice(5)}</span>
      </div>
    </div>
  )
}

export default function SilverSpotPanel({ quote }: { quote: SilverQuote | null }) {
  if (!quote) {
    return (
      <div className="bg-[#0A0C10] border border-[#27272A] p-4 rounded-sm">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A]">
          Silver · today
        </p>
        <p className="text-sm text-[#A1A1AA] mt-2">Spot feed unavailable right now.</p>
      </div>
    )
  }

  const up = (quote.change ?? 0) >= 0
  const changeColor = up ? 'text-[#14B8A6]' : 'text-red-400'

  return (
    <div className="bg-[#0A0C10] border border-[#27272A] p-4 rounded-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A]">
            Silver · today
          </p>
          <p className="display-font text-3xl md:text-4xl text-white mt-1 tabular-nums">
            {formatUsdPerOz(quote.pricePerOz)}
            <span className="text-sm text-[#71717A] ml-2 tracking-normal normal-case font-sans">
              / oz
            </span>
          </p>
          {quote.change !== null && quote.changePercent !== null && (
            <p className={`text-xs mt-1 tabular-nums ${changeColor}`}>
              {up ? '+' : ''}
              {formatUsdPerOz(quote.change)} ({up ? '+' : ''}
              {quote.changePercent.toFixed(2)}%)
            </p>
          )}
          <p className="text-[9px] text-[#52525B] mt-2 tracking-wide uppercase">
            {quote.label} · {quote.source}
          </p>
        </div>
        <div className="w-full sm:w-56 shrink-0">
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#71717A] mb-1">
            1 month futures
          </p>
          <SilverMonthChart history={quote.history} />
        </div>
      </div>
    </div>
  )
}
