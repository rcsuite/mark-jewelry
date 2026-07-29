'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ContactTrigger from '@/components/chat/ContactTrigger'
import ReviewCard from '@/components/home/ReviewCard'
import MediaReveal from '@/components/ui/MediaReveal'
import SiteFooter from '@/components/SiteFooter'
import type { Category, CurrentBuild, HeroSlide, Review, ShopPiece } from '@/lib/types'
import { CATEGORY_GRID_CLASS, categoryItemWidthClass } from '@/lib/category-layout'

type HomePageProps = {
  build: CurrentBuild | null
  slides: HeroSlide[]
  featured: ShopPiece[]
  forgeActive: boolean
  categories: Category[]
  reviews: Review[]
  sold: ShopPiece[]
  handiworksDisplayCount: number
  soldDisplayCount: number
  availableCount: number
  soldTotalCount: number
}

function pieceBlurb(piece: ShopPiece): string {
  const parts = [
    piece.specs?.material,
    piece.specs?.weight,
    piece.description,
  ].filter(Boolean)
  if (parts.length === 0) return piece.piece_type
  return parts.slice(0, 2).join(' / ')
}

export default function HomePage({
  build,
  slides,
  featured,
  forgeActive,
  categories,
  reviews,
  sold,
  handiworksDisplayCount,
  soldDisplayCount,
  availableCount,
  soldTotalCount,
}: HomePageProps) {
  const showHandiworksMore = availableCount > handiworksDisplayCount
  const showSoldMore = soldTotalCount > soldDisplayCount
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length)
    }, 5500)
    return () => clearInterval(interval)
  }, [slides])

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E0E6ED] font-sans antialiased selection:bg-[#14B8A6]/30 selection:text-[#CCFFFD]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600;800&display=swap');
        h1, h2, h3, .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
        .labradorite-flash { color: #00F2FE; text-shadow: 0 0 15px rgba(0,242,254,0.5); }
        .labradorite-teal { color: #14B8A6; }
        .metal-oxidized { color: #71717A; }
        .accent-brass { color: #B59A54; }
        .noise-bg {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 50;
        }
        .labradorite-glow {
            background: radial-gradient(circle at center, rgba(20,184,166,0.15) 0%, rgba(0,242,254,0.05) 40%, rgba(5,7,10,0) 70%);
        }
      `,
        }}
      />
      <div className="noise-bg"></div>

      <nav className="w-full p-6 md:p-8 flex justify-between items-center border-b border-white/5 relative z-10 bg-[#05070A]/80 backdrop-blur-sm">
        <div className="text-3xl display-font tracking-widest text-white">
          Earthen Miners <span className="labradorite-teal">Designs</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/shop"
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#A1A1AA] hover:text-[#14B8A6]"
          >
            Shop
          </Link>
          <Link
            href="/mark"
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#A1A1AA] hover:text-[#14B8A6]"
          >
            Joeline &amp; Mark
          </Link>
          <ContactTrigger className="text-xs tracking-[0.2em] uppercase font-bold text-[#A1A1AA] hover:text-[#14B8A6]">
            Contact
          </ContactTrigger>
        </div>
      </nav>

      <header className="relative w-full border-b border-white/5 labradorite-glow">
        <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-0 items-center">
          <Link
            href={forgeActive ? '/workbench' : '/shop'}
            className="md:col-span-3 aspect-[16/10] md:aspect-auto md:h-full border-r border-white/5 bg-[#0A0C10] relative overflow-hidden group block cursor-pointer min-h-[400px]"
          >
            {slides.map((slide, index) => (
              <img
                key={`${slide.url}-${index}`}
                src={slide.url}
                alt="Current state of the forge workbench"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-[1.03] group-hover:brightness-110 ${
                  slideIndex === index ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none"></div>

            <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/60 p-3 backdrop-blur-sm border border-white/10 z-10 transition-all duration-300 group-hover:border-[#14B8A6]/50 group-hover:bg-black/80">
              <div className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 group-hover:opacity-100 ${
                    forgeActive ? 'bg-[#00F2FE]' : 'bg-[#71717A]'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    forgeActive ? 'bg-[#00F2FE] group-hover:shadow-[0_0_10px_#00F2FE]' : 'bg-[#71717A]'
                  }`}
                ></span>
              </div>
              <span
                className={`display-font tracking-widest text-sm transition-colors ${
                  forgeActive ? 'text-white group-hover:text-[#00F2FE]' : 'text-[#A1A1AA]'
                }`}
              >
                {slides[slideIndex]?.label}
              </span>
            </div>
          </Link>

          <div className="md:col-span-2 p-8 md:p-16 flex flex-col justify-center">
            <span className="text-sm font-semibold tracking-[0.2em] uppercase metal-oxidized mb-3">
              CURRENT PROJECT LOG
            </span>

            <Link
              href={forgeActive ? '/workbench' : '/shop'}
              className="inline-block group/text cursor-pointer w-fit"
            >
              <h1 className="text-6xl md:text-7xl font-bold leading-[0.9] mb-6 text-white display-font tracking-tight transition-all duration-300 group-hover/text:text-[#00F2FE] group-hover/text:scale-[1.02] group-hover/text:drop-shadow-[0_0_20px_rgba(0,242,254,0.3)]">
                Follow <br /> The <span className="labradorite-flash">Build.</span>
              </h1>
            </Link>

            <div className="border-l-2 border-[#14B8A6] pl-6 py-1 mb-8">
              <p className="text-lg md:text-xl text-[#A1A1AA] font-light leading-relaxed min-h-[5rem]">
                {forgeActive
                  ? `We don't stockpile inventory. We forge one piece at a time. Right now, on the bench, ${
                      build?.description || 'a new custom piece is underway.'
                    }`
                  : 'The anvil is currently resting. The previous piece has been finalized and moved to the vault. View the shop for available handiworks.'}
              </p>
              {forgeActive && build?.updated_at && (
                <p className="text-sm text-white/50 mt-4 italic">
                  Updated:{' '}
                  {new Date(build.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>

            <Link
              href={forgeActive ? '/workbench' : '/shop'}
              className="w-full md:w-fit bg-[#B59A54] text-black display-font text-lg tracking-[0.2em] px-10 py-5 hover:bg-white transition-all duration-300 hover:scale-105 text-center block hover:shadow-[0_0_20px_rgba(181,154,84,0.4)]"
            >
              {forgeActive ? 'Claim the current project' : 'Enter the Shop'}
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-[#0A0C10] py-24 border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6 border-b border-white/10 pb-8">
            <h2 className="text-4xl md:text-5xl display-font text-white uppercase">Build Categories</h2>
            <p className="metal-oxidized font-light max-w-md md:text-right">
              Industrial architectures set with geological specimens. Choose your loadout.
            </p>
          </div>
          <div className={CATEGORY_GRID_CLASS}>
            {categories.map((category) => (
              <Link
                href={`/shop?category=${category.slug}`}
                key={category.slug}
                className={`group bg-[#05070A] border border-white/5 p-6 hover:border-[#14B8A6] transition-all duration-300 flex flex-col h-full ${categoryItemWidthClass(categories.length)}`}
              >
                <div className="aspect-square bg-[#111419] mb-6 flex items-center justify-center border border-white/5 group-hover:border-[#14B8A6]/30 overflow-hidden">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-white/20 display-font">
                      [{category.slug.toUpperCase()} IMAGE]
                    </span>
                  )}
                </div>
                <h3 className="text-xl display-font mb-2 text-white group-hover:text-[#00F2FE]">
                  {category.title}
                </h3>
                <p className="text-sm text-[#A1A1AA] font-light leading-relaxed flex-grow">
                  {category.description}
                </p>
                <span className="accent-brass text-xs font-bold tracking-widest uppercase mt-6 block group-hover:translate-x-1 transition-transform">
                  &rarr; View Specs
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl md:text-5xl display-font text-center mb-16 text-white uppercase tracking-wider">
          Ironclad Verdicts
        </h2>
        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <p className="text-center text-[#71717A] text-sm">Reviews coming soon.</p>
        )}
      </section>

      <section className="bg-[#0A0C10] py-24 border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl display-font text-white uppercase tracking-wider">
              Available Handiworks
            </h2>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {featured.map((piece) => (
                <div
                  key={piece.id}
                  className="group bg-[#05070A] border border-white/5 flex flex-col"
                >
                  <Link
                    href={`/shop/${piece.id}`}
                    className="block flex-grow"
                  >
                    <MediaReveal className="aspect-square bg-[#111419] border-b border-white/5 flex items-center justify-center">
                      {piece.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={piece.photos[0]}
                          alt={piece.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-white/20 display-font relative z-[2]">
                          [No Photo]
                        </span>
                      )}
                    </MediaReveal>
                    <div className="p-6 pb-3">
                      <h4 className="text-xl display-font text-white mb-2 group-hover:text-[#14B8A6] transition-colors">
                        {piece.title}
                      </h4>
                      <p className="text-sm metal-oxidized mb-4 line-clamp-2">{pieceBlurb(piece)}</p>
                      <div className="flex justify-between items-baseline border-t border-white/5 pt-4">
                        <span className="text-lg font-bold text-white">
                          {piece.sold
                            ? 'Sold'
                            : piece.inquire_for_price
                              ? 'Inquire'
                              : `$${piece.price.toFixed(2)}`}
                        </span>
                        <span className="accent-brass text-[10px] font-bold tracking-widest uppercase">
                          View Specs
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="px-6 pb-6">
                    <ContactTrigger
                      pieceId={piece.id}
                      pieceTitle={piece.title}
                      className="w-full text-center text-[10px] font-bold tracking-widest uppercase border border-[#14B8A6]/40 text-[#14B8A6] py-2.5 hover:bg-[#14B8A6] hover:text-black transition-all"
                    >
                      Inquire about this piece
                    </ContactTrigger>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-[#27272A] bg-[#05070A] p-12 text-center">
              <p className="text-[#71717A] display-font tracking-widest text-sm mb-4">
                VAULT EMPTY — ADD A PIECE FROM ADMIN
              </p>
              <Link href="/shop" className="text-[#B59A54] text-xs uppercase tracking-widest font-bold">
                Enter the Shop
              </Link>
            </div>
          )}

          {showHandiworksMore && (
            <div className="mt-10 flex justify-center">
              <Link
                href="/shop"
                className="border border-[#B59A54] text-[#B59A54] display-font tracking-[0.2em] px-10 py-4 hover:bg-[#B59A54] hover:text-black transition-colors text-sm"
              >
                See more in The Vault →
              </Link>
            </div>
          )}
        </div>
      </section>

      {sold.length > 0 && (
        <section className="bg-[#05070A] py-24 border-t border-white/5 relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl display-font text-white uppercase tracking-wider">
                  Sold pieces
                </h2>
                <p className="text-[#71717A] text-sm mt-3 max-w-lg">
                  Claimed from the forge — still part of the story.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {sold.map((piece) => (
                <Link
                  key={piece.id}
                  href={`/shop/${piece.id}`}
                  className="group relative bg-[#0A0C10] border border-white/5 overflow-hidden hover:border-[#B59A54]/60 transition-colors"
                  title={piece.title}
                >
                  <MediaReveal variant="sold" className="aspect-square">
                    {piece.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={piece.photos[0]}
                        alt={piece.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/20 display-font z-[2]">
                        SOLD
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 right-2 z-[2] text-[9px] font-bold tracking-widest uppercase text-[#B59A54] bg-black/70 px-2 py-1 truncate">
                      Sold
                    </span>
                  </MediaReveal>
                  <div className="p-3">
                    <p className="text-xs text-white truncate display-font tracking-wide group-hover:text-[#B59A54]">
                      {piece.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {showSoldMore && (
              <div className="mt-10 flex justify-center">
                <Link
                  href="/shop"
                  className="border border-[#B59A54]/50 text-[#B59A54] display-font tracking-[0.2em] px-10 py-4 hover:bg-[#B59A54] hover:text-black transition-colors text-sm"
                >
                  See more in The Vault →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <SiteFooter>
        <p className="text-xs text-white/20 mt-2 tracking-[0.15em] uppercase">
          Forged from earth & fire · USA
        </p>
        <p className="text-xs text-white/10 mt-2">Unapologetic Craft. No Molds. No Fluff.</p>
        <ContactTrigger className="inline-block mt-4 text-[10px] tracking-[0.2em] uppercase font-bold text-[#14B8A6]/70 hover:text-[#14B8A6]">
          Contact us
        </ContactTrigger>
      </SiteFooter>
    </div>
  )
}
