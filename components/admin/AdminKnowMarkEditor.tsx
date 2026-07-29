'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Cropper, { Area } from 'react-easy-crop'
import {
  deleteMarkMoment,
  reorderMarkMoments,
  upsertMarkMoment,
} from '@/lib/actions'
import { assertPersistentImageUrls } from '@/lib/auth-session'
import { createClient } from '@/lib/supabase/client'
import { getCroppedImageBlob } from '@/lib/crop-image'
import { CROP_ASPECT_OPTIONS } from '@/lib/crop-aspect'
import { FORGE_IMAGES_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import { PencilButton, SortableList } from '@/components/admin/SortableList'
import type { MarkMoment } from '@/lib/types'

const supabase = createClient()

type Props = {
  moments: MarkMoment[]
}

export default function AdminKnowMarkEditor({ moments: initial }: Props) {
  const [moments, setMoments] = useState(initial)
  const [editing, setEditing] = useState<MarkMoment | null>(null)
  const [adding, setAdding] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const flash = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setStatus(null)
    } else {
      setStatus(msg)
      setError(null)
    }
  }

  const openEdit = (moment: MarkMoment) => {
    setEditing(moment)
    setAdding(false)
    setCaption(moment.caption)
    setImageUrl(moment.image_url)
  }

  const openAdd = () => {
    setAdding(true)
    setEditing(null)
    setCaption('')
    setImageUrl('')
  }

  const closePanel = () => {
    setAdding(false)
    setEditing(null)
    setCaption('')
    setImageUrl('')
  }

  const save = () => {
    startTransition(async () => {
      if (!imageUrl) {
        flash('Upload a photo first.', true)
        return
      }
      try {
        assertPersistentImageUrls([imageUrl])
      } catch (err) {
        flash(err instanceof Error ? err.message : 'Invalid image URL.', true)
        return
      }

      const result = await upsertMarkMoment({
        id: editing?.id,
        image_url: imageUrl,
        caption,
      })
      if (!result.ok) {
        flash(result.error, true)
        return
      }

      setMoments((prev) => {
        if (editing) {
          return prev.map((m) => (m.id === editing.id ? result.data! : m))
        }
        return [...prev, result.data!]
      })
      flash(editing ? 'Moment updated.' : 'Moment added.')
      closePanel()
    })
  }

  const remove = (id: string) => {
    if (!confirm('Remove this photo from Joeline & Mark?')) return
    startTransition(async () => {
      const result = await deleteMarkMoment(id)
      if (!result.ok) {
        flash(result.error, true)
        return
      }
      setMoments((prev) => prev.filter((m) => m.id !== id))
      if (editing?.id === id) closePanel()
      flash('Removed.')
    })
  }

  const onReorder = (next: MarkMoment[]) => {
    setMoments(next)
    startTransition(async () => {
      const result = await reorderMarkMoments(next.map((m) => m.id))
      if (!result.ok) flash(result.error, true)
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  const uploadCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      flash('Adjust the crop first.', true)
      return
    }
    setUploading(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      const url = await uploadImageBlob(
        supabase,
        FORGE_IMAGES_BUCKET,
        'know-mark',
        blob,
        `moment-${Date.now()}`
      )
      setImageUrl(url)
      URL.revokeObjectURL(imageSrc)
      setImageSrc(null)
      flash('Photo uploaded — hit Save to keep it.')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Upload failed.', true)
    } finally {
      setUploading(false)
    }
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

      <div className="sticky top-[3.25rem] z-[60] bg-[#14B8A6]/10 border-b border-[#14B8A6]/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
            Editing Joeline &amp; Mark — drag to reorder · pencil to edit
          </p>
          <Link
            href="/mark"
            className="text-[10px] font-bold tracking-widest uppercase text-[#A1A1AA] hover:text-white"
          >
            View public page →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/admin"
          className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A] hover:text-[#14B8A6]"
        >
          ← Control panel
        </Link>
        <h1 className="display-font text-4xl mt-4 mb-2">Joeline &amp; Mark</h1>
        <p className="text-[#A1A1AA] text-sm mb-8 max-w-xl">
          Fishing trips, big catches, life off the bench — upload photos and short captions.
          Same layout visitors see on <span className="text-white">/mark</span>.
        </p>

        {(error || status) && (
          <div
            className={`mb-6 border p-4 text-sm ${
              error
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {error || status}
          </div>
        )}

        <div className="flex justify-end mb-6">
          <button
            type="button"
            onClick={openAdd}
            className="px-5 py-3 bg-[#14B8A6] text-black text-[10px] font-bold tracking-widest uppercase"
          >
            + Add photo
          </button>
        </div>

        {moments.length === 0 && !adding ? (
          <div className="border border-dashed border-[#27272A] p-12 text-center text-[#71717A] text-sm">
            No moments yet. Hit + Add photo to start the gallery.
          </div>
        ) : (
          <SortableList
            items={moments}
            onReorder={onReorder}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            renderItem={(moment, { isDragging, dragHandleProps }) => (
              <div
                {...dragHandleProps}
                className={`border bg-[#0A0C10] relative cursor-grab active:cursor-grabbing transition-colors ${
                  isDragging
                    ? 'border-[#00F2FE] opacity-80'
                    : 'border-white/5 hover:border-[#14B8A6]'
                }`}
              >
                <PencilButton onClick={() => openEdit(moment)} />
                <img
                  src={moment.image_url}
                  alt=""
                  className="w-full h-auto object-cover pointer-events-none"
                  draggable={false}
                />
                {moment.caption && (
                  <p className="p-4 text-sm text-[#A1A1AA] border-t border-white/5">{moment.caption}</p>
                )}
              </div>
            )}
          />
        )}
      </div>

      {(adding || editing) && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={closePanel}
          />
          <div className="relative w-full sm:max-w-lg bg-[#0A0C10] border border-[#27272A] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h2 className="display-font text-2xl">
              {editing ? 'Edit moment' : 'Add moment'}
            </h2>

            <div className="aspect-[4/5] bg-[#05070A] border border-[#27272A] relative overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#52525B] text-xs uppercase tracking-widest">No photo</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => document.getElementById('know-mark-upload')?.click()}
              className="w-full py-3 border border-[#27272A] text-[10px] font-bold tracking-widest uppercase text-[#A1A1AA] hover:border-[#14B8A6] hover:text-white"
            >
              {imageUrl ? 'Replace photo' : 'Upload & crop photo'}
            </button>
            <input
              id="know-mark-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFile}
            />

            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#14B8A6]">
                Caption
              </span>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. 32 lb channel cat — Lake of the Ozarks"
                className="mt-2 w-full bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54] resize-none"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={save}
                disabled={pending || uploading}
                className="flex-1 py-3 bg-[#B59A54] text-black display-font tracking-widest disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="px-5 py-3 border border-[#27272A] text-[10px] font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => remove(editing.id)}
                  className="px-5 py-3 border border-red-900/50 text-red-400 text-[10px] font-bold uppercase tracking-widest"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {imageSrc && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex flex-col items-center justify-center p-6">
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
              onClick={uploadCrop}
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
