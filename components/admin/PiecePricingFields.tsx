'use client'

import {
  SILVER_MARKUP,
  computePriceBreakdown,
  formatPiecePrice,
  parseMoneyInput,
  silverPricePerGram,
} from '@/lib/pricing'
import { formatUsdPerOz } from '@/lib/silver'

export type PricingFormState = {
  materialCost: string
  workmanshipCost: string
  silverGrams: string
  inquireForPrice: boolean
}

type Props = {
  value: PricingFormState
  onChange: (next: PricingFormState) => void
  spotPerOz: number | null
}

export default function PiecePricingFields({ value, onChange, spotPerOz }: Props) {
  const material = parseMoneyInput(value.materialCost)
  const work = parseMoneyInput(value.workmanshipCost)
  const grams = parseMoneyInput(value.silverGrams)

  const ready =
    material !== null && work !== null && grams !== null && spotPerOz !== null && spotPerOz > 0

  const breakdown =
    ready && spotPerOz !== null
      ? computePriceBreakdown(
          { materialCost: material!, workmanshipCost: work!, silverGrams: grams! },
          spotPerOz
        )
      : null

  const perGram = spotPerOz !== null ? silverPricePerGram(spotPerOz) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="display-font text-xl text-white">Pricing formula</h3>
          <p className="text-[#71717A] text-xs mt-1">
            Stone/material + workmanship + silver grams × (spot + 5%). Unsold pieces track spot
            automatically.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A]">
            Silver spot
          </p>
          <p className="display-font text-lg text-[#14B8A6] tabular-nums">
            {spotPerOz !== null ? `${formatUsdPerOz(spotPerOz)} / oz` : 'Unavailable'}
          </p>
          {perGram !== null && (
            <p className="text-[10px] text-[#52525B] mt-0.5">
              ≈ {formatPiecePrice(perGram)}/g (+{Math.round((SILVER_MARKUP - 1) * 100)}%)
            </p>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer select-none border border-[#27272A] bg-[#05070A] p-4 hover:border-[#14B8A6]/50 transition-colors">
        <input
          type="checkbox"
          checked={value.inquireForPrice}
          onChange={(e) => onChange({ ...value, inquireForPrice: e.target.checked })}
          className="mt-1 accent-[#14B8A6] w-4 h-4"
        />
        <span>
          <span className="block text-sm text-white font-medium">Inquire for price</span>
          <span className="block text-[11px] text-[#71717A] mt-1">
            Shop shows “Inquire for price” instead of a dollar amount. Messaging comes next.
          </span>
        </span>
      </label>

      <div
        className={`grid md:grid-cols-3 gap-4 ${value.inquireForPrice ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div>
          <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
            Stone & material ($)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={value.materialCost}
            onChange={(e) => onChange({ ...value, materialCost: e.target.value })}
            className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
            Workmanship ($)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={value.workmanshipCost}
            onChange={(e) => onChange({ ...value, workmanshipCost: e.target.value })}
            className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
            Silver weight (g)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={value.silverGrams}
            onChange={(e) => onChange({ ...value, silverGrams: e.target.value })}
            className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
            placeholder="0"
          />
        </div>
      </div>

      {!value.inquireForPrice && (
        <div className="border border-[#14B8A6]/30 bg-[#05070A] p-4">
          {breakdown ? (
            <div className="space-y-1 text-sm">
              <p className="text-[#A1A1AA]">
                Silver metal:{' '}
                <span className="text-white tabular-nums">
                  {formatPiecePrice(breakdown.silverCost)}
                </span>
              </p>
              <p className="display-font text-2xl text-[#B59A54] tabular-nums pt-1">
                Listed price {formatPiecePrice(breakdown.total)}
              </p>
            </div>
          ) : (
            <p className="text-[#71717A] text-sm">
              Enter all three numbers to see the live listed price.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
