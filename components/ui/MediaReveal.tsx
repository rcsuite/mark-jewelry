'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type MediaRevealProps = {
  children: ReactNode
  className?: string
  /** Sold pieces stay a touch more muted even when lit. */
  variant?: 'default' | 'sold'
}

/**
 * Soft rest look → full vibrancy on hover (desktop) or when on-screen (touch).
 *
 * Tune the look in `app/globals.css` under the MEDIA REVEAL dial block
 * (`--mr-sat`, `--mr-bright`, `--mr-mask`, etc.).
 *
 * Tune when phones light a card: change `LIT_RATIO` below
 * (0.4 = ~40% of the photo must be visible).
 *
 * Desktop with a real hover pointer never gets the in-view “snap” —
 * only `:hover` / `.group:hover` lights those cards.
 */
const LIT_RATIO = 0.4

/** True when the primary input can hover (mouse / trackpad). */
function primaryCanHover(): boolean {
  return window.matchMedia('(hover: hover)').matches
}

export default function MediaReveal({
  children,
  className = '',
  variant = 'default',
}: MediaRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let observer: IntersectionObserver | null = null

    const stopInViewLighting = () => {
      observer?.disconnect()
      observer = null
      setInView(false)
    }

    const startInViewLighting = () => {
      if (observer) return
      observer = new IntersectionObserver(
        ([entry]) => {
          setInView(entry.isIntersecting && entry.intersectionRatio >= LIT_RATIO)
        },
        {
          threshold: [0, LIT_RATIO, 0.55, 0.75],
          // Negative bottom margin = must be a bit further onto the screen
          rootMargin: '0px 0px -8% 0px',
        }
      )
      observer.observe(el)
    }

    const syncMode = () => {
      if (primaryCanHover()) stopInViewLighting()
      else startInViewLighting()
    }

    const hoverMq = window.matchMedia('(hover: hover)')
    syncMode()
    hoverMq.addEventListener('change', syncMode)

    return () => {
      hoverMq.removeEventListener('change', syncMode)
      stopInViewLighting()
    }
  }, [])

  return (
    <div
      ref={ref}
      className={[
        'media-reveal',
        variant === 'sold' ? 'media-reveal--sold' : '',
        inView ? 'is-lit' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      <span className="media-reveal-mask" aria-hidden />
    </div>
  )
}
