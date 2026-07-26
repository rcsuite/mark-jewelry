'use client'

import { useState } from 'react'
import Link from 'next/link'
import Cropper, { Area } from 'react-easy-crop'
import { createClient } from '@/lib/supabase/client'
import { getCroppedImageBlob } from '@/lib/crop-image'
import { CROP_ASPECT_OPTIONS } from '@/lib/crop-aspect'
import { OTHER_CATEGORY, slugify } from '@/lib/categories'
import { createCategory } from '@/lib/actions'
import { SHOP_INVENTORY_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import type { Category } from '@/lib/types'

const supabase = createClient()

type AddPieceFormProps = {
  categories: Category[]
}

export default function AddPieceForm({ categories }: AddPieceFormProps) {
  const [categoryOptions, setCategoryOptions] = useState<Category[]>(categories)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    customCategory: '',
    pieceType: '',
    customPieceType: '',
    price: '',
    description: '',
    tags: '',
    photos: [''] as string[],
    specs: {
      weight: '',
      size: '',
      width: '',
      material: '',
    },
  })

  const [activeCropIndex, setActiveCropIndex] = useState<number | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const isOtherCategory = formData.category === OTHER_CATEGORY
  const previewSlug = slugify(formData.customCategory)

  const handleFileClick = (index: number) => {
    setActiveCropIndex(index)
    setCroppedAreaPixels(null)
    setAspect(undefined)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    document.getElementById('image-upload')?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setImageSrc(URL.createObjectURL(file))
      e.target.value = ''
    }
  }

  const generateCropAndSave = async () => {
    if (activeCropIndex === null || !imageSrc || !croppedAreaPixels) {
      setErrorMessage('Adjust the crop before saving.')
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      const publicUrl = await uploadImageBlob(
        supabase,
        SHOP_INVENTORY_BUCKET,
        'pieces',
        blob,
        `piece-${Date.now()}-${activeCropIndex + 1}`
      )

      const newPhotos = [...formData.photos]
      newPhotos[activeCropIndex] = publicUrl

      if (activeCropIndex === newPhotos.length - 1 && newPhotos.length < 5) {
        newPhotos.push('')
      }

      setFormData({ ...formData, photos: newPhotos })
      setStatusMessage('Image uploaded to Storage.')
      URL.revokeObjectURL(imageSrc)
      setImageSrc(null)
      setActiveCropIndex(null)
      setCroppedAreaPixels(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index)
    if (newPhotos.length === 0 || (newPhotos.length < 5 && newPhotos[newPhotos.length - 1] !== '')) {
      newPhotos.push('')
    }
    setFormData({ ...formData, photos: newPhotos })
  }

  /** Create the typed-in category immediately so it joins the dropdown. */
  const handleAddCategory = async () => {
    setIsAddingCategory(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const result = await createCategory(formData.customCategory)

    if (!result.ok) {
      setErrorMessage(result.error)
      setIsAddingCategory(false)
      return
    }

    setCategoryOptions((prev) =>
      prev.some((c) => c.slug === result.category.slug) ? prev : [...prev, result.category]
    )
    setFormData((prev) => ({ ...prev, category: result.category.slug, customCategory: '' }))
    setStatusMessage(
      result.created
        ? `Category "${result.category.title}" created.`
        : `Category "${result.category.title}" already existed — selected it.`
    )
    setIsAddingCategory(false)
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const finalPhotos = formData.photos.filter((p) => p.trim() !== '')
    if (finalPhotos.length === 0) {
      setErrorMessage('You must include at least one photo.')
      setIsSaving(false)
      return
    }

    if (!formData.title.trim() || !formData.category || !formData.price) {
      setErrorMessage('Title, category, and price are required.')
      setIsSaving(false)
      return
    }

    // "Other" that was never explicitly added — create it now.
    let categorySlug = formData.category
    if (categorySlug === OTHER_CATEGORY) {
      const result = await createCategory(formData.customCategory)
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

    const finalPieceType =
      formData.pieceType === 'Other' ? formData.customPieceType.trim() : formData.pieceType

    if (!finalPieceType) {
      setErrorMessage('Kind of piece is required.')
      setIsSaving(false)
      return
    }

    const tagArray = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '')

    const { error } = await supabase.from('shop_inventory').insert([
      {
        title: formData.title.trim(),
        category: categorySlug,
        piece_type: finalPieceType,
        price: parseFloat(formData.price),
        photos: finalPhotos,
        description: formData.description,
        tags: tagArray,
        specs: formData.specs,
      },
    ])

    if (error) {
      setErrorMessage('Error adding to Vault: ' + error.message)
    } else {
      setStatusMessage('Piece secured in Vault with Storage image URLs.')
      setFormData({
        title: '',
        category: '',
        customCategory: '',
        pieceType: '',
        customPieceType: '',
        price: '',
        description: '',
        tags: '',
        photos: [''],
        specs: { weight: '', size: '', width: '', material: '' },
      })
    }
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
              onClick={() => {
                URL.revokeObjectURL(imageSrc)
                setImageSrc(null)
                setActiveCropIndex(null)
                setCroppedAreaPixels(null)
              }}
              disabled={isUploading}
              className="px-8 py-3 bg-[#0A0C10] border border-[#27272A] text-white uppercase text-xs font-bold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={generateCropAndSave}
              disabled={isUploading || !croppedAreaPixels}
              className="px-8 py-3 bg-[#B59A54] text-black uppercase text-xs font-bold disabled:opacity-50"
            >
              {isUploading ? 'Uploading…' : 'Crop & Upload'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div>
          <Link
            href="/admin"
            className="text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase hover:text-[#14B8A6] mb-6 inline-block"
          >
            &larr; Back to Control Panel
          </Link>
          <h1 className="text-4xl display-font">Manual Vault Entry</h1>
          <p className="text-[#A1A1AA] text-sm mt-2">
            Bypass the live workbench and insert directly into the shop inventory.
          </p>
        </div>

        {(errorMessage || statusMessage) && (
          <div
            className={`border p-4 text-sm ${
              errorMessage
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {errorMessage || statusMessage}
          </div>
        )}

        <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#14B8A6]"></div>
          <h2 className="text-2xl display-font mb-6 text-white">1. Classification</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Item Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
              />
            </div>
            <div>
              <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Price ($)
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Category (Filters the Shop)
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
              >
                <option value="">-- Select Category --</option>
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
              <select
                value={formData.pieceType}
                onChange={(e) => setFormData({ ...formData, pieceType: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
              >
                <option value="">-- Select Kind --</option>
                <option value="Ring">Ring</option>
                <option value="Pendant">Pendant</option>
                <option value="Cuff">Cuff / Bracelet</option>
                <option value="Earrings">Earrings</option>
                <option value="Other">Other (Specify)</option>
              </select>
            </div>
          </div>

          {isOtherCategory && (
            <div className="mt-6 border border-[#14B8A6]/30 bg-[#05070A] p-6">
              <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                New Category Name
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                  className="flex-grow bg-[#0A0C10] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                  placeholder="e.g. Bolo Ties"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={isAddingCategory || !previewSlug}
                  className="px-6 py-4 bg-[#14B8A6] text-black uppercase text-[10px] font-bold tracking-widest disabled:opacity-50 whitespace-nowrap"
                >
                  {isAddingCategory ? 'Adding…' : '+ Add Category'}
                </button>
              </div>
              <p className="text-[#71717A] text-[10px] mt-3 font-mono">
                {previewSlug
                  ? `Saves as slug: ${previewSlug} — appears on the homepage and shop filters.`
                  : 'Type a name to generate its shop filter slug.'}
              </p>
            </div>
          )}

          {formData.pieceType === 'Other' && (
            <div className="mt-6">
              <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Specify Kind
              </label>
              <input
                type="text"
                value={formData.customPieceType}
                onChange={(e) => setFormData({ ...formData, customPieceType: e.target.value })}
                className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
                placeholder="e.g. Bolo Tie"
              />
            </div>
          )}
        </div>

        <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59A54]"></div>
          <h2 className="text-2xl display-font mb-6 text-white">2. Specs & SEO</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Weight (g)
              </label>
              <input
                type="text"
                value={formData.specs.weight}
                onChange={(e) =>
                  setFormData({ ...formData, specs: { ...formData.specs, weight: e.target.value } })
                }
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-sm text-white outline-none focus:border-[#B59A54]"
                placeholder="42g"
              />
            </div>
            <div>
              <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Size
              </label>
              <input
                type="text"
                value={formData.specs.size}
                onChange={(e) =>
                  setFormData({ ...formData, specs: { ...formData.specs, size: e.target.value } })
                }
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-sm text-white outline-none focus:border-[#B59A54]"
                placeholder="10.5"
              />
            </div>
            <div>
              <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Width (mm)
              </label>
              <input
                type="text"
                value={formData.specs.width}
                onChange={(e) =>
                  setFormData({ ...formData, specs: { ...formData.specs, width: e.target.value } })
                }
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-sm text-white outline-none focus:border-[#B59A54]"
                placeholder="8mm"
              />
            </div>
            <div>
              <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
                Material
              </label>
              <input
                type="text"
                value={formData.specs.material}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specs: { ...formData.specs, material: e.target.value },
                  })
                }
                className="w-full bg-[#05070A] border border-[#27272A] p-3 text-sm text-white outline-none focus:border-[#B59A54]"
                placeholder=".925 Silver"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
              Full Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none resize-none"
              placeholder="The story of the piece..."
            />
          </div>

          <div>
            <label className="block text-[#71717A] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
              Search Tags (Comma Separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none"
              placeholder="hammered, oxidized, biker, gothic, turquoise..."
            />
          </div>
        </div>

        <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#00F2FE]"></div>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl display-font text-white">3. Visuals</h2>
            <span className="text-[#71717A] text-xs font-bold">
              {formData.photos.filter((p) => p !== '').length} / 5 Loaded
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {formData.photos.map((img, index) => (
              <div
                key={index}
                className="aspect-[4/5] bg-[#05070A] border border-[#27272A] relative group"
              >
                {!img ? (
                  <button
                    onClick={() => handleFileClick(index)}
                    className="w-full h-full flex flex-col items-center justify-center text-[#71717A] hover:text-[#00F2FE] hover:border-[#00F2FE] border border-transparent transition-all"
                  >
                    <span className="text-2xl mb-2">📸</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {index === 0 ? 'Primary' : 'Add Angle'}
                    </span>
                  </button>
                ) : (
                  <>
                    <img src={img} className="w-full h-full object-cover" alt="Angle" />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-900/80 text-white w-6 h-6 flex items-center justify-center rounded-sm hover:bg-red-500 transition-colors"
                    >
                      &times;
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving || isUploading}
          className="w-full bg-[#B59A54] text-black display-font text-2xl py-6 hover:bg-transparent hover:text-[#B59A54] border-2 border-[#B59A54] transition-all disabled:opacity-50"
        >
          {isSaving ? 'SECURING...' : 'SECURE IN VAULT'}
        </button>
      </div>
    </div>
  )
}
