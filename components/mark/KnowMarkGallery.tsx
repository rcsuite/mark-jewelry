'use client'

import type { MarkMoment } from '@/lib/types'
import Link from 'next/link'
import ContactTrigger from '@/components/chat/ContactTrigger'
import SiteFooter from '@/components/SiteFooter'

type Props = {
  moments: MarkMoment[]
  /** Soft CTA under the gallery */
  showContactCta?: boolean
}

export default function KnowMarkGallery({ moments, showContactCta = true }: Props) {
  return (
    <div className="min-h-screen bg-[#05070A] text-[#E0E6ED] font-sans antialiased">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600;800&display=swap');
            h1, h2, h3, .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
            .labradorite-teal { color: #14B8A6; }
            .metal-oxidized { color: #71717A; }
            .noise-bg {
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
              pointer-events: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;
            }
          `,
        }}
      />
      <div className="noise-bg" />

      <nav className="relative z-10 w-full p-6 md:p-8 flex flex-wrap justify-between items-center gap-4 border-b border-white/5 bg-[#05070A]/80 backdrop-blur-sm">
        <Link href="/" className="text-2xl md:text-3xl display-font tracking-widest text-white hover:text-[#14B8A6] transition-colors">
          Earthen Miners <span className="labradorite-teal">Designs</span>
        </Link>
        <div className="flex gap-5 items-center">
          <Link
            href="/shop"
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#A1A1AA] hover:text-[#14B8A6]"
          >
            Shop
          </Link>
          <ContactTrigger className="text-xs tracking-[0.2em] uppercase font-bold text-[#A1A1AA] hover:text-[#14B8A6]">
            Contact
          </ContactTrigger>
        </div>
      </nav>

      <header className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase metal-oxidized mb-4">
          Off the bench
        </p>
        <h1 className="text-5xl md:text-6xl display-font text-white mb-6">
          Joeline <span className="labradorite-teal">&amp; Mark</span>
        </h1>
        <p className="text-lg text-[#A1A1AA] font-light leading-relaxed max-w-2xl mx-auto">
          The forge is only half the story. Out on the water, in the woods, with family — these are
          the hours that shape the hands that shape the silver.
        </p>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        {moments.length === 0 ? (
          <div className="border border-[#27272A] bg-[#0A0C10] p-12 text-center">
            <p className="text-[#71717A] text-sm">
              Photos from our life off the bench will show up here soon.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-6 space-y-6">
            {moments.map((moment, index) => (
              <figure
                key={moment.id}
                className="break-inside-avoid border border-white/5 bg-[#0A0C10] overflow-hidden group"
              >
                <div className="relative overflow-hidden bg-[#111419]">
                  <img
                    src={moment.image_url}
                    alt={moment.caption || 'A moment with Joeline & Mark'}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    loading={index < 2 ? 'eager' : 'lazy'}
                  />
                </div>
                {moment.caption.trim() && (
                  <figcaption className="p-4 text-sm text-[#A1A1AA] leading-relaxed border-t border-white/5">
                    {moment.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {showContactCta && (
          <div className="mt-20 text-center border-t border-white/5 pt-12">
            <p className="text-[#71717A] text-sm mb-6 max-w-md mx-auto">
              Want to talk about a piece — or just say hello? We&apos;ll answer you ourselves.
            </p>
            <ContactTrigger className="inline-block bg-[#B59A54] text-black display-font tracking-[0.2em] px-10 py-4 hover:bg-white transition-colors">
              Contact us
            </ContactTrigger>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
