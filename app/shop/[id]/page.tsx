import Link from 'next/link'
import { notFound } from 'next/navigation'
import ContactTrigger from '@/components/chat/ContactTrigger'
import SiteFooter from '@/components/SiteFooter'
import { makerDisplayName } from '@/lib/makers'
import { piecePriceLabel } from '@/lib/pricing'
import { getPartnerById, getPieceById } from '@/lib/queries'
import { getSilverSpotPerOz } from '@/lib/silver'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ShopPiecePage({ params }: Props) {
  const { id } = await params
  const [piece, spot] = await Promise.all([getPieceById(id), getSilverSpotPerOz()])
  if (!piece) notFound()

  const partner = piece.partner_id ? await getPartnerById(piece.partner_id) : null
  const photo = piece.photos[0]
  const priceLabel = piecePriceLabel(piece, spot)

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E0E6ED] font-sans antialiased">
      <nav className="w-full p-6 md:p-8 flex justify-between items-center border-b border-white/5 bg-[#05070A]/80 backdrop-blur-sm">
        <Link href="/" className="display-font text-lg tracking-widest text-white">
          EARTHEN MINERS <span className="text-[#14B8A6]">DESIGNS</span>
        </Link>
        <Link
          href="/shop"
          className="text-[10px] uppercase tracking-widest font-bold text-[#B59A54] hover:text-white"
        >
          ← Back to The Vault
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-16 grid md:grid-cols-2 gap-10 md:gap-14">
        <div className="aspect-[4/5] bg-[#111419] border border-white/5 relative overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={piece.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/20 display-font">
              [No Photo]
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#14B8A6] mb-3">
            {piece.piece_type}
            {piece.sold ? ' · Archived' : ''}
          </p>
          <h1 className="display-font text-4xl md:text-5xl text-white mb-3">{piece.title}</h1>
          <p className="text-sm tracking-[0.15em] uppercase text-[#A1A1AA] mb-2">
            Made by{' '}
            <span className="text-[#B59A54] font-semibold tracking-widest">
              {makerDisplayName(piece.made_by)}
            </span>
          </p>
          {partner && (
            <p className="text-sm tracking-[0.12em] uppercase text-[#A1A1AA] mb-6">
              {partner.credit_label}:{' '}
              {partner.url ? (
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#14B8A6] font-semibold tracking-widest hover:text-[#00F2FE]"
                >
                  {partner.name}
                </a>
              ) : (
                <span className="text-[#14B8A6] font-semibold tracking-widest">{partner.name}</span>
              )}
            </p>
          )}
          {!partner && <div className="mb-4" />}
          <p
            className={`text-2xl font-bold mb-6 display-font tracking-wider ${
              piece.sold ? 'text-[#B59A54]' : 'text-white'
            }`}
          >
            {priceLabel}
          </p>
          {piece.sold && piece.sold_note && (
            <p className="text-[#E7D7A4] leading-relaxed mb-6 border-l-2 border-[#B59A54]/50 pl-4">
              {piece.sold_note}
            </p>
          )}
          {piece.description && (
            <p className="text-[#A1A1AA] leading-relaxed mb-8 whitespace-pre-wrap">
              {piece.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 border-y border-[#27272A] py-5 mb-8 text-sm">
            <div>
              <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold mb-1">
                Weight
              </div>
              <div className="font-mono text-white">{piece.specs?.weight || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold mb-1">
                Size
              </div>
              <div className="font-mono text-white">{piece.specs?.size || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold mb-1">
                Material
              </div>
              <div className="font-mono text-white">{piece.specs?.material || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[9px] text-[#71717A] uppercase tracking-widest font-bold mb-1">
                Width
              </div>
              <div className="font-mono text-white">{piece.specs?.width || 'N/A'}</div>
            </div>
          </div>

          {!piece.sold && (
            <ContactTrigger
              pieceId={piece.id}
              pieceTitle={piece.title}
              className="w-full text-center text-[10px] font-bold tracking-widest uppercase border border-[#14B8A6] text-[#14B8A6] py-3.5 hover:bg-[#14B8A6] hover:text-black transition-all"
            >
              Inquire about this piece
            </ContactTrigger>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
