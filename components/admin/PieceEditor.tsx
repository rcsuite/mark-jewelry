'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import Cropper, { Area } from 'react-easy-crop'
import { updatePiece } from '@/lib/actions'
import { assertPersistentImageUrls } from '@/lib/auth-session'
import { createClient } from '@/lib/supabase/client'
import { getCroppedImageBlob } from '@/lib/crop-image'
import { CROP_ASPECT_OPTIONS } from '@/lib/crop-aspect'
import { SHOP_INVENTORY_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import { parseMoneyInput } from '@/lib/pricing'
import PiecePricingFields, {
  type PricingFormState,
} from '@/components/admin/PiecePricingFields'
import type { Category, ShopPiece } from '@/lib/types'

const supabase = createClient()

type Props = {
  piece: ShopPiece
  categories: Category[]
  spotPerOz: number | null
}

export default function PieceEditor({ piece: initial, categories, spotPerOz }: Props) {
  const [piece, setPiece] = useState(initial)
  const [form, setForm] = useState({
    title: initial.title,
    selectedCategories: initial.categories?.length
      ? [...initial.categories]
      : initial.category
        ? [initial.category]
        : ([] as string[]),
    piece_type: initial.piece_type,
    description: initial.description ?? '',
    tags: (initial.tags ?? []).join(', '),
    weight: initial.specs?.weight ?? '',
    size: initial.specs?.size ?? '',
    width: initial.specs?.width ?? '',
    material: initial.specs?.material ?? '',
    sold: initial.sold,
    sold_note: initial.sold_note ?? '',
    featured: initial.featured,
    photos: initial.photos.length ? [...initial.photos] : ([] as string[]),
  })
  const [pricing, setPricing] = useState<PricingFormState>({
    materialCost:
      initial.material_cost !== null && initial.material_cost !== undefined
        ? String(initial.material_cost)
        : '',
    workmanshipCost:
      initial.workmanship_cost !== null && initial.workmanship_cost !== undefined
        ? String(initial.workmanship_cost)
        : '',
    silverGrams:
      initial.silver_grams !== null && initial.silver_grams !== undefined
        ? String(initial.silver_grams)
        : '',
    inquireForPrice: initial.inquire_for_price,
    manualPrice: initial.manual_price,
    manualAmount: initial.manual_price && initial.price > 0 ? String(Math.round(initial.price)) : '',
  })
  const [soldPromptOpen, setSoldPromptOpen] = useState(false)
  const [soldNoteDraft, setSoldNoteDraft] = useState(initial.sold_note ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)

  const flash = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setStatus(null)
    } else {
      setStatus(msg)
      setError(null)
    }
  }

  const toggleCategory = (slug: string) => {
    setForm((prev) => {
      const has = prev.selectedCategories.includes(slug)
      return {
        ...prev,
        selectedCategories: has
          ? prev.selectedCategories.filter((s) => s !== slug)
          : [...prev.selectedCategories, slug],
      }
    })
  }

  const resolvePriceFields = ():
    | {
        ok: true
        material: number | null
        work: number | null
        grams: number | null
        price?: number
        inquire: boolean
      }
    | { ok: false; error: string } => {
    const material = parseMoneyInput(pricing.materialCost)
    const work = parseMoneyInput(pricing.workmanshipCost)
    const grams = parseMoneyInput(pricing.silverGrams)

    if (pricing.manualPrice) {
      const amount = parseMoneyInput(pricing.manualAmount)
      if (amount === null) {
        return {
          ok: false,
          error: 'Enter a manual dollar amount, or turn off Manual price overwrite.',
        }
      }
      return {
        ok: true,
        material,
        work,
        grams,
        price: Math.round(amount),
        inquire: pricing.inquireForPrice,
      }
    }

    const hasFormula = material !== null && work !== null && grams !== null
    const inquire = pricing.inquireForPrice || !hasFormula

    return { ok: true, material, work, grams, inquire }
  }

  const save = (overrides?: {
    sold?: boolean
    sold_note?: string | null
    featured?: boolean
  }) => {
    startTransition(async () => {
      const resolved = resolvePriceFields()
      if (!resolved.ok) {
        flash(resolved.error, true)
        return
      }

      const title = form.title.trim() || 'Untitled'
      let categories = form.selectedCategories
      if (categories.length === 0) {
        flash('Pick at least one category, or use Add piece for Uncategorized defaults.', true)
        return
      }

      try {
        assertPersistentImageUrls(form.photos)
      } catch (err) {
        flash(err instanceof Error ? err.message : 'Invalid photo URLs.', true)
        return
      }

      const nextSold = overrides?.sold ?? form.sold
      const nextNote =
        overrides?.sold_note !== undefined
          ? overrides.sold_note
          : form.sold_note.trim() || null
      const nextFeatured =
        overrides?.featured !== undefined
          ? overrides.featured
          : nextSold
            ? false
            : form.featured

      const result = await updatePiece({
        id: piece.id,
        title,
        category: categories[0],
        categories,
        piece_type: form.piece_type.trim() || 'Piece',
        material_cost: resolved.material,
        workmanship_cost: resolved.work,
        silver_grams: resolved.grams,
        inquire_for_price: resolved.inquire,
        manual_price: pricing.manualPrice,
        price: resolved.price,
        description: form.description,
        sold_note: nextNote,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        specs: {
          weight: form.weight,
          size: form.size,
          width: form.width,
          material: form.material,
        },
        photos: form.photos,
        featured: nextFeatured,
        sold: nextSold,
      })

      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setPiece(result.data!)
      setForm((prev) => ({
        ...prev,
        sold: result.data!.sold,
        sold_note: result.data!.sold_note ?? '',
        featured: result.data!.featured,
      }))
      setSoldPromptOpen(false)
      flash(
        overrides?.sold === true
          ? 'Marked sold — archived to the sold partition.'
          : overrides?.sold === false
            ? 'Back on the forge — listed as available.'
            : 'Piece saved.'
      )
    })
  }

  const confirmMarkSold = () => {
    const note = soldNoteDraft.trim()
    if (note.length < 8) {
      flash('Add a sentence or two about where this piece ended up.', true)
      return
    }
    save({ sold: true, sold_note: note, featured: false })
  }

  const markAvailableAgain = () => {
    save({ sold: false, sold_note: form.sold_note.trim() || null })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  const uploadPhoto = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      flash('Adjust the crop first.', true)
      return
    }
    setUploading(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      const url = await uploadImageBlob(
        supabase,
        SHOP_INVENTORY_BUCKET,
        'pieces',
        blob,
        `piece-${piece.id}-${Date.now()}`
      )
      setForm((prev) => ({ ...prev, photos: [...prev.photos, url].slice(0, 5) }))
      URL.revokeObjectURL(imageSrc)
      setImageSrc(null)
      flash('Photo uploaded — hit Save to keep it on the piece.')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Upload failed.', true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            href={
              form.selectedCategories[0]
                ? `/admin/homepage/categories/${form.selectedCategories[0]}`
                : '/admin'
            }
            className="text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase hover:text-[#14B8A6] mb-4 inline-block"
          >
            &larr; Back to category
          </Link>
          <h1 className="text-4xl display-font">Edit piece</h1>
          <p className="text-[#A1A1AA] text-sm mt-2">
            Every field stored for this piece. Mark sold to archive it under the vault’s sold
            partition and the homepage sold strip.
          </p>
        </div>

        {(error || status) && (
          <div
            className={`border p-4 text-sm ${
              error
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {error || status}
          </div>
        )}

        {!form.sold ? (
          <div className="space-y-4">
            {!soldPromptOpen ? (
              <button
                type="button"
                onClick={() => {
                  setSoldNoteDraft(form.sold_note)
                  setSoldPromptOpen(true)
                  setError(null)
                }}
                disabled={pending}
                className="w-full bg-[#B59A54] text-black display-font text-3xl md:text-4xl py-8 border-2 border-[#B59A54] hover:bg-transparent hover:text-[#B59A54] disabled:opacity-50 tracking-wider"
              >
                Mark as Sold
              </button>
            ) : (
              <div className="bg-[#0A0C10] border-2 border-[#B59A54] p-6 md:p-8 space-y-4">
                <h2 className="display-font text-2xl text-[#B59A54]">Archive this piece</h2>
                <p className="text-sm text-[#A1A1AA]">
                  A sentence or two about where it ended up — who claimed it, the story, anything
                  worth remembering. Visitors may see this on the sold listing.
                </p>
                <textarea
                  rows={4}
                  value={soldNoteDraft}
                  onChange={(e) => setSoldNoteDraft(e.target.value)}
                  placeholder="e.g. Found a home with a collector in Boulder — anniversary gift."
                  className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] resize-none"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={confirmMarkSold}
                    disabled={pending}
                    className="flex-1 min-w-[10rem] bg-[#B59A54] text-black display-font text-xl py-4 hover:bg-[#d4b86a] disabled:opacity-50"
                  >
                    {pending ? 'Saving…' : 'Confirm sold'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoldPromptOpen(false)}
                    disabled={pending}
                    className="px-6 py-4 border border-[#27272A] text-xs font-bold uppercase tracking-widest text-[#A1A1AA] hover:border-white hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#0A0C10] border border-[#B59A54]/50 p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="display-font text-2xl text-[#B59A54]">Sold · archived</p>
                <p className="text-xs text-[#71717A] mt-1 uppercase tracking-widest">
                  Shows under sold pieces on the shop & homepage
                </p>
              </div>
              <button
                type="button"
                onClick={markAvailableAgain}
                disabled={pending}
                className="text-[10px] font-bold uppercase tracking-widest border border-[#14B8A6]/50 text-[#14B8A6] px-4 py-2 hover:bg-[#14B8A6] hover:text-black disabled:opacity-50"
              >
                Mark available again
              </button>
            </div>
            <Field label="Where it ended up">
              <textarea
                rows={3}
                value={form.sold_note}
                onChange={(e) => setForm({ ...form, sold_note: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] resize-none"
              />
            </Field>
          </div>
        )}

        {/* 1. Photos */}
        <div className="bg-[#0A0C10] border border-[#27272A] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#00F2FE]" />
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl display-font text-white">1. Photos</h2>
            <span className="text-[#71717A] text-xs font-bold">{form.photos.length} / 5</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {form.photos.map((url, i) => (
              <div key={url} className="aspect-[4/5] relative border border-[#27272A]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, photos: form.photos.filter((_, idx) => idx !== i) })
                  }
                  className="absolute top-2 right-2 bg-red-900/80 w-6 h-6 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            {form.photos.length < 5 && (
              <button
                type="button"
                onClick={() => document.getElementById('piece-photo')?.click()}
                className="aspect-[4/5] border border-dashed border-[#27272A] text-[#71717A] text-[10px] font-bold tracking-widest uppercase hover:border-[#00F2FE] hover:text-[#00F2FE]"
              >
                + Add
              </button>
            )}
          </div>
          <input
            id="piece-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onFile}
          />
        </div>

        {/* 2. Specs */}
        <div className="bg-[#0A0C10] border border-[#27272A] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#14B8A6]" />
          <h2 className="text-2xl display-font mb-2 text-white">2. Specs</h2>
          <p className="text-[#71717A] text-xs mb-6">
            Weight, size, and material show on the shop card and in search.
          </p>
          <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
            <div className="space-y-3">
              {(
                [
                  { key: 'weight' as const, label: 'Weight (g)', placeholder: '42g' },
                  { key: 'size' as const, label: 'Size', placeholder: '10.5' },
                  { key: 'width' as const, label: 'Width (mm)', placeholder: '8mm' },
                  { key: 'material' as const, label: 'Material', placeholder: '.925' },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`spec-${row.key}`}
                    className="text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase shrink-0 min-w-[7.5rem]"
                  >
                    {row.label}
                  </label>
                  <input
                    id={`spec-${row.key}`}
                    type="text"
                    value={form[row.key]}
                    onChange={(e) => setForm({ ...form, [row.key]: e.target.value })}
                    className="w-[6.5rem] shrink-0 bg-[#05070A] border border-[#27272A] px-2.5 py-2 text-sm text-white outline-none focus:border-[#B59A54] text-right"
                    placeholder={row.placeholder}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Story
              </label>
              <textarea
                rows={12}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] resize-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Pricing */}
        <div className="bg-[#0A0C10] border border-[#27272A] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59A54]" />
          <PiecePricingFields value={pricing} onChange={setPricing} spotPerOz={spotPerOz} sectionNumber={3} />
        </div>

        {/* Classification & visibility */}
        <div className="bg-[#0A0C10] border border-[#27272A] p-8 space-y-6">
          <h2 className="text-2xl display-font text-white">Classification</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </Field>
            <Field label="Kind of piece">
              <input
                value={form.piece_type}
                onChange={(e) => setForm({ ...form, piece_type: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </Field>
          </div>

          <div>
            <p className="text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
              Categories (one or more)
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {categories.map((c) => {
                const checked = form.selectedCategories.includes(c.slug)
                return (
                  <label
                    key={c.slug}
                    className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#14B8A6] bg-[#14B8A6]/10'
                        : 'border-[#27272A] bg-[#05070A] hover:border-[#14B8A6]/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(c.slug)}
                      className="accent-[#14B8A6]"
                    />
                    <span className="text-sm">{c.title}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <Field label="Tags (comma separated)">
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
            />
          </Field>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-[#27272A]">
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                disabled={form.sold}
                className="accent-[#14B8A6] w-4 h-4"
              />
              <span>
                <span className="font-bold text-[#14B8A6]">Featured</span>
                <span className="text-[#71717A] block text-xs">Shows in Available Handiworks</span>
              </span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={() => save()}
          disabled={pending || uploading}
          className="w-full bg-[#B59A54] text-black display-font text-2xl py-6 border-2 border-[#B59A54] hover:bg-transparent hover:text-[#B59A54] disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save piece'}
        </button>
      </div>

      {imageSrc && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-3xl h-[50vh] bg-[#0A0C10] border border-[#27272A] mb-4 overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_a, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {CROP_ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAspect(opt.value)}
                className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase border ${
                  aspect === opt.value
                    ? 'bg-[#14B8A6] text-black border-[#14B8A6]'
                    : 'bg-[#0A0C10] text-[#A1A1AA] border-[#27272A]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(imageSrc)
                setImageSrc(null)
              }}
              className="px-6 py-3 border border-[#27272A] text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadPhoto}
              disabled={uploading || !croppedAreaPixels}
              className="px-6 py-3 bg-[#B59A54] text-black text-xs font-bold uppercase disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Crop & Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
        {label}
      </span>
      {children}
    </label>
  )
}
