'use client'

import {
  SILVER_MARKUP,
  computePriceBreakdown,
  formatMoneyPrecise,
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
  manualPrice: boolean
  manualAmount: string
}

type Props = {
  value: PricingFormState
  onChange: (next: PricingFormState) => void
  spotPerOz: number | null
  /** Section number shown in the heading (add-piece renumbers). */
  sectionNumber?: number
}

const rowLabel =
  'text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase shrink-0 min-w-[7.5rem]'
const rowInput =
  'w-[6.5rem] shrink-0 bg-[#05070A] border border-[#27272A] px-2.5 py-2 text-sm text-white outline-none focus:border-[#B59A54] tabular-nums text-right'

export default function PiecePricingFields({
  value,
  onChange,
  spotPerOz,
  sectionNumber = 2,
}: Props) {
  const material = parseMoneyInput(value.materialCost)
  const work = parseMoneyInput(value.workmanshipCost)
  const grams = parseMoneyInput(value.silverGrams)
  const manualAmount = parseMoneyInput(value.manualAmount)

  const formulaReady =
    material !== null && work !== null && grams !== null && spotPerOz !== null && spotPerOz > 0

  const breakdown =
    formulaReady && spotPerOz !== null
      ? computePriceBreakdown(
          { materialCost: material!, workmanshipCost: work!, silverGrams: grams! },
          spotPerOz
        )
      : null

  const perGram = spotPerOz !== null ? silverPricePerGram(spotPerOz) : null

  const displayTotal = value.manualPrice
    ? manualAmount
    : breakdown
      ? breakdown.total
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="display-font text-xl text-white">{sectionNumber}. Pricing</h3>
          <p className="text-[#71717A] text-xs mt-1 max-w-md">
            Leave pricing blank for photo-only uploads — the shop will show Inquire. Incomplete
            formula fields also default to Inquire. Or set a manual dollar amount.
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
              ≈ {formatMoneyPrecise(perGram)}/g (+{Math.round((SILVER_MARKUP - 1) * 100)}%)
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="price-material" className={rowLabel}>
              Stone & material
            </label>
            <input
              id="price-material"
              type="number"
              min={0}
              step="1"
              value={value.materialCost}
              onChange={(e) => onChange({ ...value, materialCost: e.target.value })}
              className={rowInput}
              placeholder="$"
              aria-label="Stone and material dollars"
              disabled={value.manualPrice}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="price-work" className={rowLabel}>
              Workmanship
            </label>
            <input
              id="price-work"
              type="number"
              min={0}
              step="1"
              value={value.workmanshipCost}
              onChange={(e) => onChange({ ...value, workmanshipCost: e.target.value })}
              className={rowInput}
              placeholder="$"
              aria-label="Workmanship dollars"
              disabled={value.manualPrice}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="price-grams" className={rowLabel}>
              Silver (g)
            </label>
            <input
              id="price-grams"
              type="number"
              min={0}
              step="0.1"
              value={value.silverGrams}
              onChange={(e) => onChange({ ...value, silverGrams: e.target.value })}
              className={rowInput}
              placeholder="g"
              aria-label="Silver grams"
              disabled={value.manualPrice}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none border border-[#27272A] bg-[#05070A] p-3 mt-2 hover:border-[#B59A54]/50 transition-colors">
            <input
              type="checkbox"
              checked={value.manualPrice}
              onChange={(e) =>
                onChange({
                  ...value,
                  manualPrice: e.target.checked,
                  manualAmount:
                    e.target.checked && !value.manualAmount && breakdown
                      ? String(breakdown.total)
                      : value.manualAmount,
                })
              }
              className="mt-0.5 accent-[#B59A54] w-4 h-4"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-white font-medium">Manual price overwrite</span>
              <span className="block text-[11px] text-[#71717A] mt-0.5 mb-2">
                Lock a fixed dollar amount instead of the live silver formula.
              </span>
              {value.manualPrice && (
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={value.manualAmount}
                  onChange={(e) => onChange({ ...value, manualAmount: e.target.value })}
                  className="w-full bg-[#0A0C10] border border-[#B59A54]/50 px-2.5 py-2 text-sm text-white outline-none focus:border-[#B59A54] tabular-nums"
                  placeholder="Amount $"
                  aria-label="Manual price dollars"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none border border-[#27272A] bg-[#05070A] p-3 hover:border-[#14B8A6]/50 transition-colors">
            <input
              type="checkbox"
              checked={value.inquireForPrice}
              onChange={(e) => onChange({ ...value, inquireForPrice: e.target.checked })}
              className="mt-0.5 accent-[#14B8A6] w-4 h-4"
            />
            <span>
              <span className="block text-sm text-white font-medium">Inquire for price</span>
              <span className="block text-[11px] text-[#71717A] mt-0.5">
                Shop shows “Inquire…” even if a manual or formula amount is set for your notes.
              </span>
            </span>
          </label>
        </div>

        <div className="border border-[#14B8A6]/30 bg-[#05070A] p-5 min-h-[8rem] flex flex-col justify-center">
          {displayTotal !== null ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A]">
                {value.inquireForPrice
                  ? 'Internal price'
                  : value.manualPrice
                    ? 'Manual listed price'
                    : 'Listed price'}
              </p>
              <p className="display-font text-4xl text-[#B59A54] tabular-nums leading-none">
                {formatPiecePrice(displayTotal)}
              </p>
              {value.inquireForPrice && (
                <p className="text-[11px] text-[#14B8A6]">Shop will show “Inquire for price”</p>
              )}
              {!value.manualPrice && breakdown && (
                <p className="text-[#A1A1AA] text-sm pt-1">
                  Silver metal{' '}
                  <span className="text-white tabular-nums">
                    {formatMoneyPrecise(breakdown.silverCost)}
                  </span>
                </p>
              )}
              {value.manualPrice && (
                <p className="text-[11px] text-[#B59A54]/80">Formula fields ignored while overwrite is on</p>
              )}
            </div>
          ) : (
            <p className="text-[#71717A] text-sm">
              {value.manualPrice
                ? 'Enter a manual dollar amount.'
                : 'Enter all three numbers for a live price — or leave blank (shop shows Inquire).'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
