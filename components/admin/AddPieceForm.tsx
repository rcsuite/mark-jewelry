'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Cropper, { Area } from 'react-easy-crop'
import { createClient } from '@/lib/supabase/client'
import { getCroppedImageBlob } from '@/lib/crop-image'
import { CROP_ASPECT_OPTIONS } from '@/lib/crop-aspect'
import { slugify } from '@/lib/categories'
import { createCategory } from '@/lib/actions'
import { assertPersistentImageUrls } from '@/lib/auth-session'
import { SHOP_INVENTORY_BUCKET, uploadImageBlob } from '@/lib/upload-image'
import {
  computePriceBreakdown,
  normalizeCategoryList,
  parseMoneyInput,
} from '@/lib/pricing'
import PiecePricingFields, {
  type PricingFormState,
} from '@/components/admin/PiecePricingFields'
import {
  SortableList,
  urlsFromPhotoSlots,
  type PhotoSlot,
} from '@/components/admin/SortableList'
import PartnershipModal from '@/components/admin/PartnershipModal'
import { PIECE_MAKERS, type PieceMaker } from '@/lib/makers'
import type { Category, Partner } from '@/lib/types'

const supabase = createClient()

type AddPieceFormProps = {
  categories: Category[]
  partners: Partner[]
  spotPerOz: number | null
}

export default function AddPieceForm({ categories, partners: initialPartners, spotPerOz }: AddPieceFormProps) {
  const [madeBy, setMadeBy] = useState<PieceMaker | null>(null)
  const [partners, setPartners] = useState(initialPartners)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState<Category[]>(categories)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    selectedCategories: [] as string[],
    customCategory: '',
    pieceType: '',
    customPieceType: '',
    description: '',
    photos: [{ id: crypto.randomUUID(), url: '' }] as PhotoSlot[],
    specs: {
      weight: '',
      size: '',
      width: '',
      material: '',
    },
  })

  const [pricing, setPricing] = useState<PricingFormState>({
    materialCost: '',
    workmanshipCost: '',
    silverGrams: '',
    inquireForPrice: false,
    manualPrice: false,
    manualAmount: '',
  })

  const [markAsSold, setMarkAsSold] = useState(false)
  const [soldNote, setSoldNote] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')

  const [showOtherCategory, setShowOtherCategory] = useState(false)

  const [activeCropId, setActiveCropId] = useState<string | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState<number | undefined>(undefined)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const previewSlug = slugify(formData.customCategory)

  const toggleCategory = (slug: string) => {
    setFormData((prev) => {
      const has = prev.selectedCategories.includes(slug)
      return {
        ...prev,
        selectedCategories: has
          ? prev.selectedCategories.filter((s) => s !== slug)
          : [...prev.selectedCategories, slug],
      }
    })
  }

  const handleFileClick = (slotId: string) => {
    setActiveCropId(slotId)
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
    if (activeCropId === null || !imageSrc || !croppedAreaPixels) {
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
        `piece-${Date.now()}`
      )

      setFormData((prev) => {
        const newPhotos = prev.photos.map((p) =>
          p.id === activeCropId ? { ...p, url: publicUrl } : p
        )
        const filled = newPhotos.filter((p) => p.url).length
        const hasEmpty = newPhotos.some((p) => !p.url)
        if (filled < 5 && !hasEmpty) {
          newPhotos.push({ id: crypto.randomUUID(), url: '' })
        }
        return { ...prev, photos: newPhotos }
      })
      setStatusMessage('Image uploaded to Storage.')
      URL.revokeObjectURL(imageSrc)
      setImageSrc(null)
      setActiveCropId(null)
      setCroppedAreaPixels(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const removePhoto = (slotId: string) => {
    setFormData((prev) => {
      let newPhotos = prev.photos.filter((p) => p.id !== slotId)
      if (newPhotos.length === 0 || (newPhotos.length < 5 && newPhotos.every((p) => p.url))) {
        newPhotos = [...newPhotos, { id: crypto.randomUUID(), url: '' }]
      }
      return { ...prev, photos: newPhotos }
    })
  }

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
    setFormData((prev) => ({
      ...prev,
      customCategory: '',
      selectedCategories: prev.selectedCategories.includes(result.category.slug)
        ? prev.selectedCategories
        : [...prev.selectedCategories, result.category.slug],
    }))
    setShowOtherCategory(false)
    setStatusMessage(
      result.created
        ? `Category "${result.category.title}" created.`
        : `Category "${result.category.title}" already existed — selected it.`
    )
    setIsAddingCategory(false)
  }

  const resolvedPrice = useMemo(() => {
    if (pricing.manualPrice) {
      const amount = parseMoneyInput(pricing.manualAmount)
      return amount === null ? null : Math.round(amount)
    }
    const material = parseMoneyInput(pricing.materialCost)
    const work = parseMoneyInput(pricing.workmanshipCost)
    const grams = parseMoneyInput(pricing.silverGrams)
    if (material === null || work === null || grams === null || spotPerOz === null) return null
    return computePriceBreakdown(
      { materialCost: material, workmanshipCost: work, silverGrams: grams },
      spotPerOz
    ).total
  }, [pricing, spotPerOz])

  const handleSubmit = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const finalPhotos = urlsFromPhotoSlots(formData.photos).filter((p) => p.trim() !== '')
    if (finalPhotos.length === 0) {
      setErrorMessage('Add at least one photo.')
      setIsSaving(false)
      return
    }

    try {
      assertPersistentImageUrls(finalPhotos)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid photo URLs.')
      setIsSaving(false)
      return
    }

    const material = parseMoneyInput(pricing.materialCost)
    const work = parseMoneyInput(pricing.workmanshipCost)
    const grams = parseMoneyInput(pricing.silverGrams)

    // Incomplete formula / no manual amount → Inquire on the shop.
    const hasManual = pricing.manualPrice && parseMoneyInput(pricing.manualAmount) !== null
    const hasFormula =
      !pricing.manualPrice &&
      material !== null &&
      work !== null &&
      grams !== null &&
      spotPerOz !== null
    const inquireForPrice =
      pricing.inquireForPrice || (!hasManual && !hasFormula)

    if (pricing.manualPrice && !hasManual) {
      setErrorMessage('Enter a manual dollar amount, or turn off Manual price overwrite.')
      setIsSaving(false)
      return
    }

    let finalPieceType =
      formData.pieceType === 'Other' ? formData.customPieceType.trim() : formData.pieceType.trim()
    if (!finalPieceType) finalPieceType = 'Piece'

    let categoriesList = normalizeCategoryList(
      formData.selectedCategories[0] ?? '',
      formData.selectedCategories
    )
    if (categoriesList.length === 0) {
      const uncategorized = await createCategory('Uncategorized')
      if (!uncategorized.ok) {
        setErrorMessage(uncategorized.error)
        setIsSaving(false)
        return
      }
      setCategoryOptions((prev) =>
        prev.some((c) => c.slug === uncategorized.category.slug)
          ? prev
          : [...prev, uncategorized.category]
      )
      categoriesList = [uncategorized.category.slug]
    }

    const title = formData.title.trim() || 'Untitled'
    const storedPrice = resolvedPrice ?? 0

    if (!madeBy) {
      setErrorMessage('Choose who made this piece first.')
      setIsSaving(false)
      return
    }

    const { error } = await supabase.from('shop_inventory').insert([
      {
        title,
        category: categoriesList[0],
        categories: categoriesList,
        piece_type: finalPieceType,
        price: storedPrice,
        material_cost: material,
        workmanship_cost: work,
        silver_grams: grams,
        inquire_for_price: inquireForPrice,
        manual_price: pricing.manualPrice,
        photos: finalPhotos,
        description: formData.description.trim() || null,
        tags: [],
        specs: formData.specs,
        sold: markAsSold,
        sold_note: markAsSold ? soldNote.trim() || null : null,
        sold_at: markAsSold ? new Date().toISOString() : null,
        buyer_name: markAsSold ? buyerName.trim() || null : null,
        buyer_email: markAsSold ? buyerEmail.trim().toLowerCase() || null : null,
        featured: false,
        made_by: madeBy,
        partner_id: partnerId,
      },
    ])

    if (error) {
      setErrorMessage('Error adding to Vault: ' + error.message)
      setIsSaving(false)
      return
    }

    setStatusMessage(
      markAsSold
        ? 'Sold piece archived — opening homepage editor…'
        : 'Piece secured — opening category editor…'
    )
    window.location.href = markAsSold
      ? '/admin'
      : `/admin/homepage/categories/${categoriesList[0]}`
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

      {!madeBy && (
        <div className="fixed inset-0 z-[60] bg-[#05070A]/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-xl w-full text-center">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#14B8A6] mb-4">
              Manual Vault Entry
            </p>
            <h1 className="text-4xl md:text-5xl display-font text-white mb-3">Made by</h1>
            <p className="text-[#A1A1AA] text-sm mb-10 max-w-md mx-auto">
              Choose who forged this piece — then fill in the listing. Visitors see this on the
              piece page only.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {PIECE_MAKERS.map((maker) => (
                <button
                  key={maker.id}
                  type="button"
                  onClick={() => setMadeBy(maker.id)}
                  className="border border-[#27272A] bg-[#0A0C10] py-10 px-6 display-font text-2xl tracking-widest text-white hover:border-[#14B8A6] hover:text-[#00F2FE] transition-colors"
                >
                  {maker.label}
                </button>
              ))}
            </div>
            <Link
              href="/admin"
              className="inline-block mt-10 text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A] hover:text-[#14B8A6]"
            >
              &larr; Back to Control Panel
            </Link>
          </div>
        </div>
      )}

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
                setActiveCropId(null)
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
          {madeBy && (
            <p className="mt-4 text-sm">
              <span className="text-[#71717A] uppercase tracking-widest text-[10px] font-bold mr-2">
                Made by
              </span>
              <span className="text-[#14B8A6] display-font tracking-wider text-xl">
                {madeBy === 'joeline' ? 'Joeline' : 'Mark'}
              </span>
              <button
                type="button"
                onClick={() => setMadeBy(null)}
                className="ml-4 text-[10px] font-bold tracking-widest uppercase text-[#71717A] hover:text-white"
              >
                Change
              </button>
            </p>
          )}
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

        {/* 1. Visuals first */}
        <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#00F2FE]"></div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl display-font text-white">1. Visuals</h2>
              <p className="text-[#71717A] text-xs mt-1">
                Drag to reorder · first photo is the display photo
              </p>
            </div>
            <span className="text-[#71717A] text-xs font-bold">
              {formData.photos.filter((p) => p.url).length} / 5 Loaded
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SortableList
              items={formData.photos}
              onReorder={(next) => setFormData({ ...formData, photos: next })}
              className="contents"
              renderItem={(slot, { isDragging, dragHandleProps }) => {
                const filledIndex = formData.photos
                  .filter((p) => p.url)
                  .findIndex((p) => p.id === slot.id)
                const isDisplay = Boolean(slot.url) && filledIndex === 0
                return (
                  <div className="flex flex-col">
                    <div
                      {...(slot.url ? dragHandleProps : { draggable: false as const })}
                      className={`aspect-[4/5] bg-[#05070A] border relative group ${
                        slot.url
                          ? `cursor-grab active:cursor-grabbing ${
                              isDragging
                                ? 'border-[#00F2FE] opacity-60'
                                : 'border-[#27272A] hover:border-[#14B8A6]'
                            }`
                          : 'border-[#27272A]'
                      }`}
                    >
                      {!slot.url ? (
                        <button
                          type="button"
                          onClick={() => handleFileClick(slot.id)}
                          className="w-full h-full flex flex-col items-center justify-center text-[#71717A] hover:text-[#00F2FE] hover:border-[#00F2FE] border border-transparent transition-all"
                        >
                          <span className="text-2xl mb-2">📸</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest">
                            {formData.photos.every((p) => !p.url) ? 'Display Photo' : 'Add Angle'}
                          </span>
                        </button>
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={slot.url}
                            className="w-full h-full object-cover pointer-events-none"
                            alt="Angle"
                            draggable={false}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removePhoto(slot.id)
                            }}
                            className="absolute top-2 right-2 z-10 bg-red-900/80 text-white w-6 h-6 flex items-center justify-center rounded-sm hover:bg-red-500 transition-colors"
                          >
                            &times;
                          </button>
                        </>
                      )}
                    </div>
                    {isDisplay && (
                      <p className="mt-2 text-sm md:text-base font-bold tracking-widest uppercase text-[#14B8A6] text-center">
                        Display Photo
                      </p>
                    )}
                  </div>
                )
              }}
            />
          </div>
        </div>

        <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#14B8A6]"></div>
          <h2 className="text-2xl display-font mb-2 text-white">2. Classification</h2>
          <p className="text-[#71717A] text-xs mb-6">
            All optional for quick sold uploads — empty title becomes “Untitled”, no category →
            Uncategorized, no kind → Piece.
          </p>

          <div className="mb-6">
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

          <div className="mb-6">
            <label className="block text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-3">
              Categories (select one or more)
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {categoryOptions.map((cat) => {
                const checked = formData.selectedCategories.includes(cat.slug)
                return (
                  <label
                    key={cat.slug}
                    className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#14B8A6] bg-[#14B8A6]/10'
                        : 'border-[#27272A] bg-[#05070A] hover:border-[#14B8A6]/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat.slug)}
                      className="accent-[#14B8A6]"
                    />
                    <span className="text-sm text-white">{cat.title}</span>
                  </label>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowOtherCategory((v) => !v)}
              className="mt-3 text-[10px] font-bold tracking-widest uppercase text-[#14B8A6] hover:text-white"
            >
              {showOtherCategory ? '− Hide new category' : '+ Add new category'}
            </button>
            {showOtherCategory && (
              <div className="mt-4 border border-[#14B8A6]/30 bg-[#05070A] p-6">
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
                    ? `Saves as slug: ${previewSlug}`
                    : 'Type a name to generate its shop filter slug.'}
                </p>
              </div>
            )}
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
          <PiecePricingFields
            value={pricing}
            onChange={setPricing}
            spotPerOz={spotPerOz}
            sectionNumber={3}
          />
        </div>

        <div className="bg-[#0A0C10] p-8 border border-[#27272A] rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59A54]"></div>
          <h2 className="text-2xl display-font mb-2 text-white">4. Specs & story</h2>
          <p className="text-[#71717A] text-xs mb-6">
            Shop search already matches title, description, category, kind, and specs — no tags
            needed.
          </p>

          <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
            <div className="space-y-3">
              {(
                [
                  { key: 'weight', label: 'Weight (g)', placeholder: '42g' },
                  { key: 'size', label: 'Size', placeholder: '10.5' },
                  { key: 'width', label: 'Width (mm)', placeholder: '8mm' },
                  { key: 'material', label: 'Material', placeholder: '.925' },
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
                    value={formData.specs[row.key]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specs: { ...formData.specs, [row.key]: e.target.value },
                      })
                    }
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-full min-h-[16rem] bg-[#05070A] border border-[#27272A] p-4 text-white focus:border-[#B59A54] outline-none resize-y"
                placeholder="The story of the piece…"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#27272A]">
            <p className="text-[#14B8A6] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
              Partnership credit (optional)
            </p>
            <p className="text-[#52525B] text-xs mb-3">
              Shown on the piece page — e.g. Stones Cut By · Name
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={partnerId ?? ''}
                onChange={(e) => setPartnerId(e.target.value ? e.target.value : null)}
                className="flex-1 min-w-[14rem] bg-[#05070A] border border-[#27272A] p-3 text-white outline-none focus:border-[#B59A54]"
              >
                <option value="">None</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.credit_label}: {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPartnerModalOpen(true)}
                className="px-4 py-3 border border-[#14B8A6] text-[#14B8A6] text-[10px] font-bold tracking-widest uppercase hover:bg-[#14B8A6] hover:text-black"
              >
                + Add New
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0C10] p-8 border border-[#B59A54]/40 rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#B59A54]"></div>
          <h2 className="text-2xl display-font mb-2 text-white">5. Status</h2>
          <p className="text-[#71717A] text-xs mb-6">
            Check sold when archiving older work — it goes to the sold strip, not the shop grid.
          </p>
          <label className="flex items-start gap-3 cursor-pointer select-none border border-[#27272A] bg-[#05070A] p-4 hover:border-[#B59A54]/50 transition-colors">
            <input
              type="checkbox"
              checked={markAsSold}
              onChange={(e) => setMarkAsSold(e.target.checked)}
              className="mt-1 accent-[#B59A54] w-4 h-4"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-sm text-white font-medium">Mark as sold</span>
              <span className="block text-[11px] text-[#71717A] mt-0.5 mb-3">
                Archives this piece on save. Optional note for the sold listing.
              </span>
              {markAsSold && (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    rows={3}
                    value={soldNote}
                    onChange={(e) => setSoldNote(e.target.value)}
                    placeholder="e.g. Anniversary gift — found a home in Boulder."
                    className="w-full bg-[#0A0C10] border border-[#B59A54]/40 p-3 text-sm text-white outline-none focus:border-[#B59A54] resize-none"
                  />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Buyer name"
                      className="w-full bg-[#0A0C10] border border-[#B59A54]/40 p-3 text-sm text-white outline-none focus:border-[#B59A54]"
                    />
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="Buyer email (for reviews)"
                      className="w-full bg-[#0A0C10] border border-[#B59A54]/40 p-3 text-sm text-white outline-none focus:border-[#B59A54]"
                    />
                  </div>
                </div>
              )}
            </span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving || isUploading}
          className="w-full bg-[#B59A54] text-black display-font text-2xl py-6 hover:bg-transparent hover:text-[#B59A54] border-2 border-[#B59A54] transition-all disabled:opacity-50"
        >
          {isSaving ? 'SECURING...' : markAsSold ? 'ARCHIVE AS SOLD' : 'SECURE IN VAULT'}
        </button>
      </div>

      <PartnershipModal
        open={partnerModalOpen}
        onClose={() => setPartnerModalOpen(false)}
        onCreated={(partner) => {
          setPartners((prev) =>
            prev.some((p) => p.id === partner.id) ? prev : [...prev, partner]
          )
          setPartnerId(partner.id)
        }}
      />
    </div>
  )
}
