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
  })
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

  const save = () => {
    startTransition(async () => {
      if (!form.title.trim() || form.selectedCategories.length === 0) {
        flash('Title and at least one category are required.', true)
        return
      }

      const material = parseMoneyInput(pricing.materialCost)
      const work = parseMoneyInput(pricing.workmanshipCost)
      const grams = parseMoneyInput(pricing.silverGrams)

      if (!pricing.inquireForPrice && (material === null || work === null || grams === null)) {
        flash(
          'Enter stone/material, workmanship, and silver grams — or check Inquire for price.',
          true
        )
        return
      }

      try {
        assertPersistentImageUrls(form.photos)
      } catch (err) {
        flash(err instanceof Error ? err.message : 'Invalid photo URLs.', true)
        return
      }

      const result = await updatePiece({
        id: piece.id,
        title: form.title,
        category: form.selectedCategories[0],
        categories: form.selectedCategories,
        piece_type: form.piece_type,
        material_cost: material,
        workmanship_cost: work,
        silver_grams: grams,
        inquire_for_price: pricing.inquireForPrice,
        description: form.description,
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
        sold: form.sold,
        featured: form.featured,
      })

      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setPiece(result.data!)
      flash('Piece saved.')
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
                : '/admin/homepage'
            }
            className="text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase hover:text-[#14B8A6] mb-4 inline-block"
          >
            &larr; Back to category
          </Link>
          <h1 className="text-4xl display-font">Edit piece</h1>
          <p className="text-[#A1A1AA] text-sm mt-2">
            Every field stored for this piece. Mark sold to move it to the sold strip and off the
            shop grid.
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

        <div className="bg-[#0A0C10] border border-[#27272A] p-8 space-y-6">
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

          <Field label="Description">
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] resize-none"
            />
          </Field>

          <Field label="Tags (comma separated)">
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
            />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Weight">
              <input
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </Field>
            <Field label="Size">
              <input
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </Field>
            <Field label="Width">
              <input
                value={form.width}
                onChange={(e) => setForm({ ...form, width: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </Field>
            <Field label="Material">
              <input
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-[#27272A]">
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.sold}
                onChange={(e) => setForm({ ...form, sold: e.target.checked })}
                className="accent-[#B59A54] w-4 h-4"
              />
              <span>
                <span className="font-bold text-[#B59A54]">Sold</span>
                <span className="text-[#71717A] block text-xs">
                  Moves to sold strip · removed from shop
                </span>
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="accent-[#14B8A6] w-4 h-4"
              />
              <span>
                <span className="font-bold text-[#14B8A6]">Featured</span>
                <span className="text-[#71717A] block text-xs">Shows in Available Handiworks</span>
              </span>
            </label>
          </div>
        </div>

        <div className="bg-[#0A0C10] border border-[#27272A] p-8">
          <PiecePricingFields value={pricing} onChange={setPricing} spotPerOz={spotPerOz} />
        </div>

        <div className="bg-[#0A0C10] border border-[#27272A] p-8">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl display-font">Photos</h2>
            <span className="text-[#71717A] text-xs font-bold">{form.photos.length} / 5</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {form.photos.map((url, i) => (
              <div key={url} className="aspect-[4/5] relative border border-[#27272A]">
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

        <button
          type="button"
          onClick={save}
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
