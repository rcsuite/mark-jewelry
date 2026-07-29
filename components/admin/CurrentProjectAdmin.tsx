'use client'
import { useState } from 'react'
import Link from 'next/link'
import Cropper, { Area } from 'react-easy-crop'
import { createClient } from '@/lib/supabase/client'
import { getCroppedImageBlob } from '@/lib/crop-image'
import { CROP_ASPECT_OPTIONS } from '@/lib/crop-aspect'
import { OTHER_CATEGORY, slugify } from '@/lib/categories'
import { createCategory, finalizeCurrentBuild, updateHomepageBanner } from '@/lib/actions'
import { resolveHeroBannerUrl } from '@/lib/hero'
import { FORGE_IMAGES_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import { assertPersistentImageUrls } from '@/lib/auth-session'
import {
  photoSlotsFromUrls,
  SortableList,
  urlsFromPhotoSlots,
  type PhotoSlot,
} from '@/components/admin/SortableList'
import { PIECE_MAKERS, type PieceMaker } from '@/lib/makers'
import type { Category, CurrentBuild, VideoSession } from '@/lib/types'

const supabase = createClient()

type CropTarget = { kind: 'progress'; slotId: string } | { kind: 'hero' }

type CurrentProjectAdminProps = {
  build: CurrentBuild | null
  categories: Category[]
}

export default function CurrentProjectAdmin({ build, categories }: CurrentProjectAdminProps) {
  const [categoryOptions, setCategoryOptions] = useState<Category[]>(categories)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    id: build?.id ?? '',
    progress_images: (build?.progress_images?.length
      ? photoSlotsFromUrls(build.progress_images)
      : [{ id: crypto.randomUUID(), url: '' }]) as PhotoSlot[],
    video_archive: (build?.video_archive ?? []) as VideoSession[],
    description: build?.description ?? '',
    status: build?.status ?? 'active',
    hero_image: build?.hero_image ?? '',
  })

  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [heroPreview, setHeroPreview] = useState(resolveHeroBannerUrl(build?.hero_image))

  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const [showListingModal, setShowListingModal] = useState(false)
  const [listingData, setListingData] = useState({
    title: '',
    category: '',
    customCategory: '',
    pieceType: '',
    price: '',
    weight: '',
    size: '',
    material: '',
    tags: '',
    primaryImage: '',
    made_by: 'mark' as PieceMaker,
  })

  const openCropper = (target: CropTarget) => {
    setCropTarget(target)
    setCroppedAreaPixels(null)
    setAspect(target.kind === 'hero' ? 16 / 10 : undefined)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    document.getElementById('image-upload')?.click()
  }

  const handleFileClick = (slotId: string) => {
    openCropper({ kind: 'progress', slotId })
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setImageSrc(URL.createObjectURL(file))
      e.target.value = ''
    }
  }

  const closeCropper = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(null)
    setCropTarget(null)
    setCroppedAreaPixels(null)
  }

  const generateCropAndSave = async () => {
    if (!cropTarget || !imageSrc || !croppedAreaPixels) {
      setErrorMessage('Adjust the crop before saving.')
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)

      if (cropTarget.kind === 'hero') {
        const publicUrl = await uploadImageBlob(
          supabase,
          FORGE_IMAGES_BUCKET,
          'homepage',
          blob,
          `banner-${Date.now()}`
        )
        const result = await updateHomepageBanner(publicUrl)
        if (!result.ok) {
          setErrorMessage(result.error)
          return
        }
        const nextBanner = result.data!.hero_image
        setHeroPreview(nextBanner)
        setFormData((prev) => ({ ...prev, hero_image: nextBanner }))
        setStatusMessage('Homepage hero banner updated. Visible on / and /admin.')
      } else {
        const folder = formData.id || 'draft'
        const publicUrl = await uploadImageBlob(
          supabase,
          FORGE_IMAGES_BUCKET,
          `builds/${folder}`,
          blob,
          `step-${Date.now()}`
        )

        setFormData((prev) => ({
          ...prev,
          progress_images: prev.progress_images.map((p) =>
            p.id === cropTarget.slotId ? { ...p, url: publicUrl } : p
          ),
        }))
        setStatusMessage('Progress image uploaded to Storage.')
      }

      closeCropper()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const addProgressStep = () => {
    setFormData({
      ...formData,
      progress_images: [...formData.progress_images, { id: crypto.randomUUID(), url: '' }],
    })
  }

  const removeProgressStep = (slotId: string) => {
    const newImages = formData.progress_images.filter((p) => p.id !== slotId)
    setFormData({
      ...formData,
      progress_images:
        newImages.length > 0 ? newImages : [{ id: crypto.randomUUID(), url: '' }],
    })
  }

  const handleAddVideo = () => {
    if (!newVideoUrl.trim()) return

    const sessionNumber = formData.video_archive.length + 1
    const newSession: VideoSession = {
      id: Date.now(),
      title: `SESSION 0${sessionNumber}: LIVE FORGE`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      url: newVideoUrl.trim(),
    }

    setFormData({ ...formData, video_archive: [...formData.video_archive, newSession] })
    setNewVideoUrl('')
  }

  const removeVideo = (id: number) => {
    const newVideos = formData.video_archive.filter((v) => v.id !== id)
    const renumberedVideos = newVideos.map((vid, i) => ({
      ...vid,
      title: `SESSION 0${i + 1}: LIVE FORGE`,
    }))
    setFormData({ ...formData, video_archive: renumberedVideos })
  }

  const handleSaveWorkbench = async () => {
    if (!formData.id) {
      setErrorMessage('No current_build row found to update.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const cleanImages = urlsFromPhotoSlots(formData.progress_images).filter((img) => img.trim() !== '')
    // hero_image is saved separately via updateHomepageBanner — do not overwrite here.

    const { error } = await supabase
      .from('current_build')
      .update({
        progress_images: cleanImages,
        video_archive: formData.video_archive,
        description: formData.description,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', formData.id)

    if (error) {
      setErrorMessage('Error saving to the forge: ' + error.message)
    } else {
      setStatusMessage('Workbench live feed updated. Image URLs saved on the build row.')
      setFormData((prev) => ({
        ...prev,
        status: 'active',
        progress_images:
          cleanImages.length > 0
            ? photoSlotsFromUrls(cleanImages)
            : [{ id: crypto.randomUUID(), url: '' }],
      }))
    }

    setIsSaving(false)
  }

  /** Create the typed-in category immediately so it joins the dropdown. */
  const handleAddCategory = async () => {
    setIsAddingCategory(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const result = await createCategory(listingData.customCategory)

    if (!result.ok) {
      setErrorMessage(result.error)
      setIsAddingCategory(false)
      return
    }

    setCategoryOptions((prev) =>
      prev.some((c) => c.slug === result.category.slug) ? prev : [...prev, result.category]
    )
    setListingData((prev) => ({ ...prev, category: result.category.slug, customCategory: '' }))
    setStatusMessage(
      result.created
        ? `Category "${result.category.title}" created.`
        : `Category "${result.category.title}" already existed — selected it.`
    )
    setIsAddingCategory(false)
  }

  const handleFinalizeListing = async () => {
    if (!formData.id) {
      setErrorMessage('No current_build row found to finalize.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const cleanImages = urlsFromPhotoSlots(formData.progress_images).filter((img) => img.trim() !== '')
    const photos = listingData.primaryImage.trim()
      ? [listingData.primaryImage.trim(), ...cleanImages.filter((img) => img !== listingData.primaryImage.trim())]
      : cleanImages

    if (photos.length === 0) {
      setErrorMessage('Add at least one progress image before finalizing.')
      setIsSaving(false)
      return
    }

    try {
      assertPersistentImageUrls(photos)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid photo URLs.')
      setIsSaving(false)
      return
    }

    if (!listingData.title.trim() || !listingData.category || !listingData.price) {
      setErrorMessage('Title, category, and price are required to finalize.')
      setIsSaving(false)
      return
    }

    // "Other" that was never explicitly added — create it now.
    let categorySlug = listingData.category
    if (categorySlug === OTHER_CATEGORY) {
      const result = await createCategory(listingData.customCategory)
      if (!result.ok) {
        setErrorMessage(result.error)
        setIsSaving(false)
        return
      }
      categorySlug = result.category.slug
      setCategoryOptions((prev) =>
        prev.some((c) => c.slug === result.category.slug) ? prev : [...prev, result.category]
      )
    }

    const tagArray = listingData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '')

    const result = await finalizeCurrentBuild({
      buildId: formData.id,
      title: listingData.title.trim(),
      category: categorySlug,
      pieceType: listingData.pieceType.trim() || 'Ring',
      price: parseFloat(listingData.price),
      photos,
      description: formData.description,
      tags: tagArray,
      weight: listingData.weight,
      size: listingData.size,
      material: listingData.material,
      progressImages: cleanImages,
      videoArchive: formData.video_archive,
      made_by: listingData.made_by,
    })

    if (!result.ok) {
      setErrorMessage(result.error)
      setIsSaving(false)
      return
    }

    setShowListingModal(false)
    setStatusMessage('Piece moved to shop inventory. Forge archive saved for /workbench.')
    setFormData((prev) => ({
      ...prev,
      status: 'complete',
      progress_images: [{ id: crypto.randomUUID(), url: '' }],
      video_archive: [],
      description: '',
    }))
    setIsSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#05070A] text-white p-6 md:p-12 font-sans relative">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
            .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
        `,
        }}
      />

      <input
        type="file"
        id="image-upload"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      {imageSrc && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6">
          <h3 className="text-xl display-font text-white mb-4">
            {cropTarget?.kind === 'hero' ? 'Crop homepage hero banner' : 'Crop progress photo'}
          </h3>
          <div className="relative w-full max-w-4xl h-[60vh] bg-[#0A0C10] border border-[#27272A] rounded-sm overflow-hidden mb-4">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>

          <div className="w-full max-w-4xl flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {CROP_ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAspect(opt.value)}
                  className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                    aspect === opt.value
                      ? 'bg-[#14B8A6] text-black border-[#14B8A6]'
                      : 'bg-[#0A0C10] text-[#A1A1AA] border-[#27272A] hover:border-[#14B8A6] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase text-[#71717A] flex-grow">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#B59A54]"
              />
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={closeCropper}
              disabled={isUploading}
              className="px-8 py-3 bg-[#0A0C10] border border-[#27272A] text-white hover:border-[#71717A] uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={generateCropAndSave}
              disabled={isUploading || !croppedAreaPixels}
              className="px-8 py-3 bg-[#B59A54] text-black border border-[#B59A54] hover:bg-transparent hover:text-[#B59A54] uppercase tracking-widest text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isUploading
                ? 'Uploading…'
                : cropTarget?.kind === 'hero'
                  ? 'Crop & Save Hero Banner'
                  : 'Crop & Upload to Timeline'}
            </button>
          </div>
        </div>
      )}

      {showListingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#0A0C10] border border-[#27272A] p-8 md:p-12 max-w-3xl w-full relative mt-24 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#B59A54]"></div>
            <button
              onClick={() => setShowListingModal(false)}
              className="absolute top-6 right-6 text-[#71717A] hover:text-white text-2xl"
            >
              &times;
            </button>

            <h2 className="text-3xl display-font mb-2">Finalize & List Item</h2>
            <p className="text-[#A1A1AA] text-sm mb-8">
              This will shut down the live feed and push the item to your shop, including all
              uploaded progress photos.
            </p>

            <div className="mb-8">
              <p className="text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
                Made by
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {PIECE_MAKERS.map((maker) => {
                  const selected = listingData.made_by === maker.id
                  return (
                    <button
                      key={maker.id}
                      type="button"
                      onClick={() => setListingData({ ...listingData, made_by: maker.id })}
                      className={`py-4 border display-font tracking-widest text-lg transition-colors ${
                        selected
                          ? 'border-[#14B8A6] bg-[#14B8A6]/15 text-[#00F2FE]'
                          : 'border-[#27272A] text-[#A1A1AA] hover:border-[#14B8A6]'
                      }`}
                    >
                      {maker.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Listing Title
                  </label>
                  <input
                    type="text"
                    value={listingData.title}
                    onChange={(e) => setListingData({ ...listingData, title: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                    placeholder="e.g. The Asphalt Signet"
                  />
                </div>
                <div>
                  <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Retail Price ($)
                  </label>
                  <input
                    type="number"
                    value={listingData.price}
                    onChange={(e) => setListingData({ ...listingData, price: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                    placeholder="240.00"
                  />
                </div>
                <div>
                  <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Category
                  </label>
                  <select
                    value={listingData.category}
                    onChange={(e) => setListingData({ ...listingData, category: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                  >
                    <option value="">-- Choose --</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.title}
                      </option>
                    ))}
                    <option value={OTHER_CATEGORY}>Other (Specify)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Kind of Piece
                  </label>
                  <input
                    type="text"
                    value={listingData.pieceType}
                    onChange={(e) => setListingData({ ...listingData, pieceType: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                    placeholder="Ring / Pendant / Cuff..."
                  />
                </div>
                {listingData.category === OTHER_CATEGORY && (
                  <div className="md:col-span-2 border border-[#14B8A6]/30 bg-[#05070A] p-6">
                    <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                      New Category Name
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={listingData.customCategory}
                        onChange={(e) =>
                          setListingData({ ...listingData, customCategory: e.target.value })
                        }
                        className="flex-grow bg-[#0A0C10] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                        placeholder="e.g. Bolo Ties"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={isAddingCategory || !slugify(listingData.customCategory)}
                        className="px-6 py-4 bg-[#14B8A6] text-black uppercase text-[10px] font-bold tracking-widest disabled:opacity-50 whitespace-nowrap"
                      >
                        {isAddingCategory ? 'Adding…' : '+ Add Category'}
                      </button>
                    </div>
                    <p className="text-[#71717A] text-[10px] mt-3 font-mono">
                      {slugify(listingData.customCategory)
                        ? `Saves as slug: ${slugify(listingData.customCategory)} — appears on the homepage and shop filters.`
                        : 'Type a name to generate its shop filter slug.'}
                    </p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Primary Photo URL (optional)
                  </label>
                  <input
                    type="text"
                    value={listingData.primaryImage}
                    onChange={(e) =>
                      setListingData({ ...listingData, primaryImage: e.target.value })
                    }
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-[#71717A] outline-none"
                    placeholder="Defaults to final progress image"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-[#27272A]">
                <div>
                  <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    value={listingData.material}
                    onChange={(e) => setListingData({ ...listingData, material: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none"
                    placeholder=".925 Silver"
                  />
                </div>
                <div>
                  <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Weight
                  </label>
                  <input
                    type="text"
                    value={listingData.weight}
                    onChange={(e) => setListingData({ ...listingData, weight: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none"
                    placeholder="42g"
                  />
                </div>
                <div>
                  <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={listingData.size}
                    onChange={(e) => setListingData({ ...listingData, size: e.target.value })}
                    className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none"
                    placeholder="10.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                  Search Tags (Comma Separated)
                </label>
                <input
                  type="text"
                  value={listingData.tags}
                  onChange={(e) => setListingData({ ...listingData, tags: e.target.value })}
                  className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white outline-none"
                  placeholder="hammered, oxidized, labradorite..."
                />
              </div>

              <button
                onClick={handleFinalizeListing}
                disabled={isSaving}
                className="w-full bg-[#B59A54] text-black display-font text-xl py-6 hover:bg-transparent hover:text-[#B59A54] border-2 border-[#B59A54] transition-all disabled:opacity-50 mt-8"
              >
                {isSaving ? 'SECURING INVENTORY...' : 'FINISH PROJECT & PUSH TO SHOP'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin"
          className="text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase hover:text-[#14B8A6] mb-6 inline-block"
        >
          &larr; Back to Control Panel
        </Link>

        <h1 className="text-4xl display-font mb-2">Live Workbench Dashboard</h1>
        <p
          className={`text-xs font-bold tracking-widest uppercase mb-6 ${
            formData.status === 'active' ? 'text-emerald-500' : 'text-[#71717A]'
          }`}
        >
          Status: {formData.status === 'active' ? 'Forge Active' : 'Forge Resting'}
        </p>

        {(errorMessage || statusMessage) && (
          <div
            className={`mb-8 border p-4 text-sm ${
              errorMessage
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {errorMessage || statusMessage}
          </div>
        )}

        {/* Homepage hero banner — separate from progress timeline */}
        <div className="mb-8 bg-[#0A0C10] border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59A54]" />
          <div className="grid md:grid-cols-5 gap-0 items-stretch">
            <div className="relative md:col-span-3 aspect-[16/10] md:aspect-auto md:min-h-[240px] bg-[#05070A] overflow-hidden border-b md:border-b-0 md:border-r border-[#27272A]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroPreview}
                alt="Homepage hero banner"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <p className="absolute top-3 left-3 z-10 text-[9px] font-bold tracking-widest uppercase bg-black/80 border border-[#B59A54]/50 text-[#B59A54] px-2 py-1">
                Homepage hero · slide 1
              </p>
            </div>
            <div className="md:col-span-2 p-6 md:p-8 flex flex-col justify-center gap-4">
              <div>
                <label className="block text-[#B59A54] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                  Homepage Hero Banner
                </label>
                <p className="text-[#A1A1AA] text-sm font-light leading-relaxed">
                  First image on <span className="text-white">/</span> and{' '}
                  <span className="text-white">/admin</span>. Stays when the forge rests.
                  Progress photos below scroll <em>after</em> this banner when the build is
                  active.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCropper({ kind: 'hero' })}
                disabled={isUploading}
                className="w-fit border border-[#B59A54] text-[#B59A54] display-font tracking-widest text-sm px-6 py-3 hover:bg-[#B59A54] hover:text-black disabled:opacity-50"
              >
                Change hero banner
              </button>
              <Link
                href="/admin"
                className="text-[10px] font-bold tracking-widest uppercase text-[#71717A] hover:text-[#14B8A6]"
              >
                Also editable via pencil on /admin →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#14B8A6]"></div>
              <div className="flex justify-between items-end mb-8 border-b border-[#27272A] pb-4">
                <div>
                  <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase">
                    The Build Timeline (Start to Finish)
                  </label>
                  <p className="text-[#71717A] text-xs mt-1">
                    Drag steps to reorder — these scroll on the homepage <em>after</em> the hero
                    banner
                  </p>
                </div>
                <button
                  onClick={addProgressStep}
                  className="text-[#B59A54] text-[10px] uppercase tracking-widest font-bold hover:text-white"
                >
                  + Add Step
                </button>
              </div>

              <SortableList
                items={formData.progress_images}
                onReorder={(next) => setFormData({ ...formData, progress_images: next })}
                className="space-y-4"
                renderItem={(slot, { isDragging, dragHandleProps }) => {
                  const index = formData.progress_images.findIndex((p) => p.id === slot.id)
                  return (
                    <div
                      {...(slot.url ? dragHandleProps : { draggable: false as const })}
                      className={`flex gap-4 items-center bg-[#05070A] border p-3 rounded-sm group transition-colors ${
                        slot.url
                          ? `cursor-grab active:cursor-grabbing ${
                              isDragging
                                ? 'border-[#00F2FE] opacity-60'
                                : 'border-[#27272A] hover:border-[#14B8A6]'
                            }`
                          : 'border-[#27272A] hover:border-[#71717A]'
                      }`}
                    >
                      <span className="text-[#71717A] font-bold w-6 text-center text-xs">
                        {index + 1}.
                      </span>

                      {!slot.url ? (
                        <button
                          type="button"
                          onClick={() => handleFileClick(slot.id)}
                          className="bg-[#111419] border border-[#27272A] hover:border-[#14B8A6] text-[#71717A] hover:text-[#14B8A6] py-3 transition-colors text-[10px] font-bold tracking-widest uppercase flex-grow text-center"
                        >
                          📸 Select Image
                        </button>
                      ) : (
                        <div className="flex-grow flex items-center justify-between pl-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[#14B8A6] text-lg">✓</span>
                            <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase">
                              Uploaded
                            </span>
                          </div>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slot.url}
                            className="h-10 w-16 object-cover border border-[#27272A] pointer-events-none"
                            alt={`Step ${index + 1}`}
                            draggable={false}
                          />
                        </div>
                      )}

                      {formData.progress_images.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeProgressStep(slot.id)
                          }}
                          className="text-red-900 group-hover:text-red-500 text-xl font-bold ml-2 px-2 transition-colors"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  )
                }}
              />
            </div>

            <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#14B8A6]"></div>
              <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
                Finish this sentence: &quot;Right now, on the bench...&quot;
              </label>
              <textarea
                rows={3}
                placeholder="is a stunning custom stone pendant... / we have a heavy silver cuff... / watch this custom build..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#14B8A6] outline-none resize-none"
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl sticky top-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00F2FE]"></div>
              <h2 className="text-2xl display-font mb-2 text-white">Livestream Archive</h2>
              <p className="text-[#A1A1AA] text-xs mb-8 leading-relaxed font-light">
                After a Facebook Live ends, paste the video URL here. Sessions show on{' '}
                <span className="text-white">/workbench</span> newest-first — drag to reorder.
                Publish Workbench Update to push them live.
              </p>

              <div className="flex gap-2 mb-8 border-b border-[#27272A] pb-8">
                <input
                  type="text"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full bg-[#05070A] border border-[#27272A] p-3 text-white focus:border-[#00F2FE] outline-none text-[10px] font-mono"
                  placeholder="https://facebook.com/..."
                />
                <button
                  onClick={handleAddVideo}
                  className="bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 hover:bg-[#00F2FE] hover:text-black px-4 font-bold text-lg transition-colors"
                >
                  +
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
                  Saved Sessions · drag to reorder
                </label>
                {formData.video_archive.length === 0 ? (
                  <div className="text-[#71717A] text-xs italic text-center py-8 border border-dashed border-[#27272A]">
                    No livestreams added yet.
                  </div>
                ) : (
                  <SortableList
                    items={formData.video_archive}
                    onReorder={(next) => {
                      const renumbered = next.map((vid, i) => ({
                        ...vid,
                        title: `SESSION 0${i + 1}: LIVE FORGE`,
                      }))
                      setFormData({ ...formData, video_archive: renumbered })
                    }}
                    className="space-y-3"
                    renderItem={(video, { isDragging, dragHandleProps }) => (
                      <div
                        {...dragHandleProps}
                        className={`bg-[#05070A] border p-4 flex justify-between items-center group transition-colors cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? 'border-[#00F2FE] opacity-60'
                            : 'border-[#27272A] hover:border-[#14B8A6]'
                        }`}
                      >
                        <div>
                          <div className="text-[10px] font-bold tracking-widest uppercase text-white">
                            {video.title}
                          </div>
                          <div className="text-[10px] text-[#A1A1AA] mt-1 font-mono">{video.date}</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeVideo(video.id)
                          }}
                          className="text-red-900 group-hover:text-red-500 font-bold text-xl px-2 transition-colors"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          <button
            onClick={handleSaveWorkbench}
            disabled={isSaving || isUploading}
            className="w-full bg-[#14B8A6] text-black display-font text-2xl py-6 hover:bg-transparent hover:text-[#14B8A6] border-2 border-[#14B8A6] transition-all duration-300 disabled:opacity-50"
          >
            {isSaving ? 'TRANSMITTING...' : 'PUBLISH WORKBENCH UPDATE'}
          </button>

          <button
            onClick={() => setShowListingModal(true)}
            disabled={isSaving || isUploading}
            className="w-full bg-[#05070A] text-[#B59A54] display-font text-xl py-4 hover:bg-[#B59A54] hover:text-black border border-[#B59A54] transition-all duration-300 disabled:opacity-50"
          >
            FINISH, REMOVE & CREATE LISTING
          </button>
        </div>
      </div>
    </div>
  )
}
