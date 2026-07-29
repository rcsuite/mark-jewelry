import Image from 'next/image'
import type { ReactNode } from 'react'

type Props = {
  /** Extra lines under the brand (tagline, contact CTA, etc.) */
  children?: ReactNode
  className?: string
}

/**
 * Site footer: Earthen Miners brand + RCSuite credit (footer-right).
 */
export default function SiteFooter({ children, className = '' }: Props) {
  return (
    <footer
      className={`border-t border-white/5 bg-[#05070A] relative z-10 py-10 md:py-12 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div className="text-center md:text-left">
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
          className="group flex items-center gap-3 self-center md:self-end shrink-0 hover:opacity-95 transition-opacity"
          aria-label="Website composed by RCSuite — visit rcsuite.net"
        >
          <Image
            src="/rcsuite-logo.png"
            alt=""
            width={40}
            height={40}
            className="rounded-full ring-1 ring-white/10"
          />
          <span className="text-left leading-tight">
            <span className="block text-[10px] tracking-wide text-white/45 group-hover:text-white/60 transition-colors">
              Website composed by
            </span>
            <span className="inline-flex items-baseline gap-0 mt-0.5">
              <span
                className="text-[15px] font-bold tracking-tight text-white"
                style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
              >
                RC
              </span>
              <span
                className="text-[15px] italic tracking-tight text-[#C5A26F]"
                style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
              >
                Suite
              </span>
            </span>
          </span>
        </a>
      </div>
    </footer>
  )
}
