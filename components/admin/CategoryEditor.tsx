'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Cropper, { Area } from 'react-easy-crop'
import { PencilButton, SortableList } from '@/components/admin/SortableList'
import { reorderPieces, updateCategory } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import { getCroppedImageBlob } from '@/lib/crop-image'
import { CROP_ASPECT_OPTIONS } from '@/lib/crop-aspect'
import { SHOP_INVENTORY_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import type { Category, ShopPiece } from '@/lib/types'

const supabase = createClient()

type Props = {
  category: Category
  pieces: ShopPiece[]
}

export default function CategoryEditor({ category: initial, pieces: initialPieces }: Props) {
  const [category, setCategory] = useState(initial)
  const [pieces, setPieces] = useState(initialPieces)
  const [title, setTitle] = useState(initial.title)
  const [shortName, setShortName] = useState(initial.short_name)
  const [description, setDescription] = useState(initial.description)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(1)
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

  const saveMeta = () => {
    startTransition(async () => {
      const result = await updateCategory({
        id: category.id,
        title,
        short_name: shortName,
        description,
      })
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setCategory(result.data!)
      flash('Category details saved.')
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  const uploadCover = async () => {
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
        'categories',
        blob,
        `cover-${category.slug}-${Date.now()}`
      )
      const result = await updateCategory({ id: category.id, image_url: url })
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setCategory(result.data!)
      URL.revokeObjectURL(imageSrc)
      setImageSrc(null)
      flash('Cover photo updated.')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Upload failed.', true)
    } finally {
      setUploading(false)
    }
  }

  const persistPieceOrder = (next: ShopPiece[]) => {
    setPieces(next)
    startTransition(async () => {
      const result = await reorderPieces(next.map((p) => p.id))
      if (!result.ok) flash(result.error, true)
      else flash('Piece order saved.')
    })
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
          `,
        }}
      />

      <div className="sticky top-0 z-40 bg-[#14B8A6] text-black px-6 py-3 flex flex-wrap justify-between gap-3">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase">
          Editing category · {category.title}
          {pending ? ' · Saving…' : ''}
        </p>
        <Link href="/admin" className="text-[10px] font-bold tracking-widest uppercase">
          ← Back to homepage editor
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
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

        <div>
          <p className="text-[#71717A] text-[10px] font-bold tracking-[0.3em] uppercase mb-2">
            The Vault · {category.slug}
          </p>
          <h1 className="text-5xl display-font mb-2">{category.title}</h1>
          <p className="text-[#A1A1AA] text-sm">
            Edit the cover photo visitors see on the homepage, then drag pieces to set their order.
          </p>
        </div>

        {/* Cover + meta */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-[#0A0C10] border border-[#27272A] p-6">
            <h2 className="display-font text-xl mb-4">Cover photo</h2>
            <div className="aspect-square bg-[#111419] border border-[#27272A] mb-4 overflow-hidden flex items-center justify-center">
              {category.image_url ? (
                <img src={category.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-white/20 display-font">
                  [{category.slug.toUpperCase()} IMAGE]
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              id="cover-upload"
              className="hidden"
              onChange={onFile}
            />
            <button
              type="button"
              onClick={() => document.getElementById('cover-upload')?.click()}
              className="w-full py-3 border border-[#14B8A6] text-[#14B8A6] text-[10px] font-bold tracking-widest uppercase hover:bg-[#14B8A6] hover:text-black"
            >
              Edit cover photo
            </button>
          </div>

          <div className="bg-[#0A0C10] border border-[#27272A] p-6 space-y-4">
            <h2 className="display-font text-xl mb-2">Details</h2>
            <label className="block text-[10px] text-[#14B8A6] font-bold tracking-widest uppercase">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </label>
            <label className="block text-[10px] text-[#14B8A6] font-bold tracking-widest uppercase">
              Short name (shop filter)
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              />
            </label>
            <label className="block text-[10px] text-[#14B8A6] font-bold tracking-widest uppercase">
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] resize-none"
              />
            </label>
            <button
              type="button"
              onClick={saveMeta}
              className="w-full py-4 bg-[#B59A54] text-black display-font tracking-widest"
            >
              Save details
            </button>
          </div>
        </div>

        {/* Pieces grid */}
        <div>
          <div className="flex items-end justify-between mb-8 border-b border-white/10 pb-4">
            <h2 className="text-3xl display-font">
              All {category.short_name || category.title}
            </h2>
            <span className="text-[#71717A] text-xs font-bold tracking-widest uppercase">
              {pieces.length} pieces · drag to reorder · pencil to edit
            </span>
          </div>

          {pieces.length === 0 ? (
            <p className="text-[#71717A] text-sm py-12 text-center border border-dashed border-[#27272A]">
              No pieces in this category yet.
            </p>
          ) : (
            <SortableList
              items={pieces}
              onReorder={persistPieceOrder}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              renderItem={(piece, { isDragging, dragHandleProps }) => (
                <div
                  {...dragHandleProps}
                  className={`relative bg-[#0A0C10] border cursor-grab active:cursor-grabbing ${
                    isDragging
                      ? 'border-[#00F2FE] opacity-60'
                      : 'border-[#27272A] hover:border-[#14B8A6]'
                  }`}
                >
                  <PencilButton
                    href={`/admin/homepage/pieces/${piece.id}`}
                    label={`Edit ${piece.title}`}
                  />
                  {piece.sold && (
                    <span className="absolute top-3 left-3 z-20 bg-[#B59A54] text-black text-[9px] font-bold tracking-widest uppercase px-2 py-1">
                      Sold
                    </span>
                  )}
                  <div className="aspect-[4/5] bg-[#111419] relative overflow-hidden flex items-center justify-center">
                    {piece.photos[0] ? (
                      <img
                        src={piece.photos[0]}
                        alt={piece.title}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <span className="text-xs text-white/20 display-font">[No Photo]</span>
                    )}
                    <span className="absolute top-3 left-3 bg-black/70 text-[9px] tracking-widest uppercase px-2 py-1">
                      {piece.piece_type || 'Piece'}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="display-font text-lg">{piece.title}</h3>
                    <p className="text-[#B59A54] text-sm mt-1">
                      {piece.sold
                        ? 'Sold'
                        : piece.inquire_for_price
                          ? 'Inquire'
                          : `$${piece.price.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              )}
            />
          )}
        </div>
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
                    : 'border-[#27272A] text-[#A1A1AA]'
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
              className="px-8 py-3 border border-[#27272A] text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadCover}
              disabled={uploading || !croppedAreaPixels}
              className="px-8 py-3 bg-[#B59A54] text-black text-xs font-bold uppercase disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Save cover'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
