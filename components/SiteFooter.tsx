import Image from 'next/image'
import type { ReactNode } from 'react'

type Props = {
  /** Extra lines under the brand (tagline, contact CTA, etc.) */
  children?: ReactNode
  className?: string
}

/**
 * Site footer: centered cascading Earthen Miners stack + RCSuite credit on the right.
 */
export default function SiteFooter({ children, className = '' }: Props) {
  return (
    <footer
      className={`border-t border-white/5 bg-[#05070A] relative z-10 py-10 md:py-12 ${className}`}
    >
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center">
          <div className="text-sm tracking-[0.2em] uppercase font-bold text-white/30">
            EARTHEN MINERS <span className="text-[#14B8A6]">DESIGNS</span> &copy;{' '}
            {new Date().getFullYear()}
          </div>
          {children}
        </div>

        <a
          href="https://rcsuite.net"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-8 md:mt-0 flex items-center justify-center gap-3 md:absolute md:right-6 md:top-0 md:justify-end shrink-0 hover:opacity-95 transition-opacity"
          aria-label="Website Composition by RCSuite — visit rcsuite.net"
        >
          <span className="text-center leading-tight">
            <span className="block text-[10px] tracking-wide text-white/45 group-hover:text-white/60 transition-colors">
              Website Composition
            </span>
            <span className="inline-flex items-baseline justify-center gap-1 mt-0.5">
              <span className="text-[12px] tracking-wide text-white/45">by</span>
              <span
                className="text-[17px] font-bold tracking-tight text-white"
                style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
              >
                RC
              </span>
              <span
                className="text-[17px] italic tracking-tight text-[#C5A26F]"
                style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
              >
                Suite
              </span>
            </span>
          </span>
          <Image
            src="/rcsuite-logo.png"
            alt=""
            width={56}
            height={56}
            className="rounded-full ring-1 ring-white/10 w-14 h-14"
          />
        </a>
      </div>
    </footer>
  )
}
