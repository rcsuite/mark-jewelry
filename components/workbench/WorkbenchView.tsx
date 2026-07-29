'use client'

import { useState } from 'react'
import Link from 'next/link'
import MediaReveal from '@/components/ui/MediaReveal'
import type { CurrentBuild, ForgeArchive } from '@/lib/types'

type WorkbenchViewProps = {
  build: CurrentBuild | null
  forgeActive: boolean
  archives: ForgeArchive[]
  /** When set, show this archived build instead of the live forge. */
  archive?: ForgeArchive | null
}

/** Facebook watch/permalink URLs need the plugins/video embed to play in an iframe. */
function facebookEmbedSrc(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.includes('facebook.com/plugins/video.php')) return trimmed
  if (/facebook\.com|fb\.watch/i.test(trimmed)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false&width=560`
  }
  return trimmed
}

function PastBuildsStrip({
  archives,
  activeId,
}: {
  archives: ForgeArchive[]
  activeId?: string | null
}) {
  if (archives.length === 0) return null

  return (
    <section className="bg-[#05070A] py-16 md:py-20 border-t border-white/5 relative z-10 shrink-0">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl display-font text-white uppercase tracking-wider">
              Past builds
            </h2>
            <p className="text-[#71717A] text-sm mt-3 max-w-lg">
              Finished on the anvil — open a piece to rewatch the forge.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {archives.map((item) => {
            const isActive = activeId === item.id
            return (
              <Link
                key={item.id}
                href={`/workbench/${item.id}`}
                className={`group relative bg-[#0A0C10] border overflow-hidden transition-colors ${
                  isActive
                    ? 'border-[#B59A54]'
                    : 'border-white/5 hover:border-[#B59A54]/60'
                }`}
                title={item.title}
              >
                <MediaReveal variant="sold" className="aspect-square">
                  {item.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/20 display-font z-[2]">
                      FORGED
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 right-2 z-[2] text-[9px] font-bold tracking-widest uppercase text-[#B59A54] bg-black/70 px-2 py-1 truncate">
                    Forged
                  </span>
                </MediaReveal>
                <div className="p-3">
                  <p className="text-xs text-white truncate display-font tracking-wide group-hover:text-[#B59A54]">
                    {item.title}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function WorkbenchView({
  build,
  forgeActive,
  archives,
  archive = null,
}: WorkbenchViewProps) {
  const isArchive = Boolean(archive)
  const progressImages = isArchive
    ? (archive?.progress_images ?? [])
    : (build?.progress_images ?? [])
  const videos = isArchive ? (archive?.video_archive ?? []) : (build?.video_archive ?? [])

  const [activeImageIndex, setActiveImageIndex] = useState(
    Math.max(0, progressImages.length - 1)
  )
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)

  const activeVideo = videos[activeVideoIndex]
  const embedSrc = activeVideo?.url ? facebookEmbedSrc(activeVideo.url) : ''
  const showWorkbenchBody = isArchive || forgeActive

  return (
    <div className="min-h-screen bg-[#05070A] text-[#E0E6ED] font-sans antialiased selection:bg-[#14B8A6]/30 selection:text-[#CCFFFD] flex flex-col">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@300;400;600;800&display=swap');
        h1, h2, h3, .display-font { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.05em; }
        .labradorite-flash { color: #00F2FE; text-shadow: 0 0 15px rgba(0,242,254,0.5); }
        .labradorite-teal { color: #14B8A6; }
        .metal-oxidized { color: #71717A; }
        .noise-bg {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 50;
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
      <div className="noise-bg" />

      <nav className="w-full p-6 md:p-8 flex justify-between items-center border-b border-white/5 relative z-10 bg-[#05070A]/80 backdrop-blur-sm shrink-0">
        <Link
          href="/"
          className="text-3xl display-font tracking-widest text-white hover:text-[#14B8A6] transition-colors"
        >
          Earthen Miners <span className="labradorite-teal">Designs</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link
            href={isArchive ? '/workbench' : '/'}
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#B59A54] hover:text-white transition-colors"
          >
            {isArchive ? '← Live workbench' : '← Home'}
          </Link>
          <Link
            href="/shop"
            className="text-xs tracking-[0.2em] uppercase font-bold text-[#71717A] hover:text-white transition-colors"
          >
            The Vault
          </Link>
          <div className="text-xs tracking-[0.3em] uppercase font-bold metal-oxidized hidden md:block">
            Forged from earth & fire • USA
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative z-10">
        {showWorkbenchBody ? (
          <>
            <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-10 md:py-14 grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
              {/* Left — Build progression (rolodex) */}
              <section className="space-y-6 min-w-0">
                <h3 className="display-font tracking-widest text-lg text-[#71717A]">
                  BUILD PROGRESSION
                </h3>

                <div className="relative w-full">
                  <div className="flex overflow-x-auto hide-scrollbar py-12 px-6 -mx-2 items-center justify-start space-x-[-3rem] snap-x snap-mandatory">
                    {progressImages.length > 0 ? (
                      progressImages.map((img, index) => {
                        const isActive = activeImageIndex === index
                        return (
                          <button
                            type="button"
                            key={`${img}-${index}`}
                            onClick={() => setActiveImageIndex(index)}
                            className={`relative shrink-0 aspect-[4/5] rounded-sm transition-all duration-500 cursor-pointer border border-white/10 snap-center text-left
                              ${
                                isActive
                                  ? 'w-64 sm:w-72 scale-110 z-30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] brightness-110 ring-1 ring-[#14B8A6]/50'
                                  : 'w-48 sm:w-56 scale-90 z-10 opacity-40 grayscale hover:grayscale-[50%] hover:opacity-80 hover:-translate-y-2 hover:z-20'
                              }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`Progress step ${index + 1}`}
                              className="w-full h-full object-cover rounded-sm pointer-events-none"
                            />
                            <span
                              className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase transition-opacity duration-300 ${
                                isActive ? 'text-[#14B8A6] opacity-100' : 'opacity-0'
                              }`}
                            >
                              Step {String(index + 1).padStart(2, '0')}
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <p className="text-[#71717A] text-sm italic py-16">
                        No timeline images logged yet.
                      </p>
                    )}
                  </div>
                  <div className="absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-[#05070A] to-transparent pointer-events-none" />
                  <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-[#05070A] to-transparent pointer-events-none" />
                </div>

                {progressImages.length > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      aria-label="Previous step"
                      disabled={activeImageIndex === 0}
                      onClick={() => setActiveImageIndex((i) => Math.max(0, i - 1))}
                      className="text-[10px] font-bold tracking-widest uppercase text-[#71717A] hover:text-[#14B8A6] disabled:opacity-30"
                    >
                      ← Prev
                    </button>
                    <span className="text-[10px] font-mono text-[#A1A1AA]">
                      {activeImageIndex + 1} / {progressImages.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next step"
                      disabled={activeImageIndex >= progressImages.length - 1}
                      onClick={() =>
                        setActiveImageIndex((i) => Math.min(progressImages.length - 1, i + 1))
                      }
                      className="text-[10px] font-bold tracking-widest uppercase text-[#71717A] hover:text-[#14B8A6] disabled:opacity-30"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </section>

              {/* Right — Livestream archive */}
              <section className="space-y-6 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    {!isArchive && activeVideoIndex === 0 && videos.length > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        !isArchive && activeVideoIndex === 0 && videos.length > 0
                          ? 'bg-red-600'
                          : 'bg-[#71717A]'
                      }`}
                    />
                  </div>
                  <h2 className="display-font tracking-widest text-lg text-white">
                    {videos.length === 0
                      ? 'LIVESTREAM ARCHIVE'
                      : isArchive
                        ? activeVideo?.title || 'ARCHIVED SESSION'
                        : activeVideoIndex === 0
                          ? 'LATEST SESSION'
                          : 'ARCHIVED SESSION'}
                  </h2>
                </div>

                <div className="relative aspect-video bg-[#0A0C10] border-2 border-[#27272A] p-2 shadow-[0_0_40px_rgba(20,184,166,0.05)]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#14B8A6]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#14B8A6]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#14B8A6]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#14B8A6]" />

                  <div className="w-full h-full bg-black relative overflow-hidden flex items-center justify-center">
                    {embedSrc ? (
                      <iframe
                        src={embedSrc}
                        className="w-full h-full border-none"
                        allowFullScreen
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        title={activeVideo?.title ?? 'Forge session'}
                      />
                    ) : (
                      <div className="text-center px-6">
                        <span className="text-[#71717A] text-xs font-bold tracking-[0.2em] uppercase block">
                          {isArchive ? 'No Sessions Saved' : 'Stream Currently Offline'}
                        </span>
                        <span className="text-white/30 text-[10px] mt-2 block italic">
                          {isArchive
                            ? 'This build has no archived livestreams.'
                            : 'Sessions appear here after we archive a Facebook Live.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {videos.length > 0 && (
                  <div className="relative w-full">
                    <div className="flex overflow-x-auto hide-scrollbar py-4 px-2 -mx-2 items-center justify-start gap-3">
                      {videos.map((video, index) => {
                        const isActive = activeVideoIndex === index
                        return (
                          <button
                            type="button"
                            key={video.id}
                            onClick={() => setActiveVideoIndex(index)}
                            className={`relative shrink-0 aspect-video rounded-sm transition-all duration-300 cursor-pointer border bg-[#0A0C10] flex flex-col items-center justify-center p-3
                              ${
                                isActive
                                  ? 'w-44 sm:w-48 z-20 ring-1 ring-[#14B8A6]/50 border-[#14B8A6]/40'
                                  : 'w-36 sm:w-40 opacity-50 border-[#27272A] hover:opacity-100 hover:border-[#14B8A6]/30'
                              }`}
                          >
                            <span
                              className={`text-2xl mb-1 ${isActive ? 'text-[#14B8A6]' : 'text-[#71717A]'}`}
                            >
                              ▶
                            </span>
                            <span className="text-[9px] font-bold tracking-widest uppercase text-center text-white line-clamp-2">
                              {video.title}
                            </span>
                            <span className="text-[10px] text-[#71717A] mt-1">{video.date}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Bottom banner — live forging or archived piece story */}
            <aside className="border-t border-[#27272A] bg-[#0A0C10] relative z-10 shrink-0">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#14B8A6]/40 to-transparent" />
              <div className="max-w-[1400px] mx-auto px-6 py-8 md:py-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    {isArchive ? (
                      <span className="text-[#B59A54] text-[10px] font-bold tracking-[0.25em] uppercase">
                        Forged
                      </span>
                    ) : (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F2FE] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00F2FE]" />
                        </span>
                        <span className="text-[#14B8A6] text-[10px] font-bold tracking-[0.25em] uppercase">
                          Currently Forging
                        </span>
                      </>
                    )}
                    {!isArchive && build?.updated_at && (
                      <span className="text-[#71717A] text-[10px] font-mono tracking-wider uppercase hidden sm:inline">
                        Updated{' '}
                        {new Date(build.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {isArchive && archive?.finalized_at && (
                      <span className="text-[#71717A] text-[10px] font-mono tracking-wider uppercase hidden sm:inline">
                        Finished{' '}
                        {new Date(archive.finalized_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl display-font text-white leading-tight mb-3">
                    {isArchive ? (
                      <>
                        {archive?.title || 'Past'} <span className="labradorite-flash">Build.</span>
                      </>
                    ) : (
                      <>
                        The Current <span className="labradorite-flash">Project.</span>
                      </>
                    )}
                  </h1>
                  <p className="text-[#A1A1AA] font-light leading-relaxed max-w-2xl">
                    {isArchive
                      ? archive?.description || 'A finished forge story from the workbench.'
                      : build?.description || 'A new custom piece is underway on the anvil.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:items-stretch shrink-0">
                  {isArchive ? (
                    <>
                      {archive?.shop_piece_id && (
                        <Link
                          href={`/shop/${archive.shop_piece_id}`}
                          className="bg-[#05070A] text-[#B59A54] display-font text-xl tracking-[0.1em] px-10 py-5 border-2 border-[#B59A54] hover:bg-[#B59A54] hover:text-black transition-all duration-300 text-center"
                        >
                          VIEW IN VAULT
                        </Link>
                      )}
                      <Link
                        href="/workbench"
                        className="text-center text-[#71717A] text-[10px] font-bold tracking-widest uppercase hover:text-[#14B8A6]"
                      >
                        ← Back to live workbench
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="bg-[#B59A54] text-black display-font text-xl tracking-[0.1em] px-10 py-5 hover:bg-transparent hover:text-[#B59A54] border-2 border-[#B59A54] transition-all duration-300 hover:shadow-[0_0_30px_rgba(181,154,84,0.3)]"
                      >
                        CLAIM THIS PIECE
                      </button>
                      <p className="text-center text-[#71717A] text-[10px] font-bold tracking-widest uppercase md:max-w-[14rem]">
                        Secures the item before completion.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 py-24">
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center border border-[#27272A] bg-[#0A0C10] relative overflow-hidden shadow-2xl max-w-2xl w-full">
              <div className="absolute top-0 w-full h-1 bg-[#71717A]" />
              <h1 className="text-5xl md:text-6xl display-font mb-4 tracking-widest text-[#71717A]">
                FORGE ON STANDBY
              </h1>
              <p className="text-[#A1A1AA] text-lg max-w-xl mx-auto font-light leading-relaxed mb-8">
                The previous piece has been finalized and moved to the vault. The anvil is cleared
                and the next bespoke project is currently being drafted.
              </p>
              <Link
                href="/shop"
                className="bg-[#05070A] text-[#B59A54] display-font text-xl tracking-[0.2em] px-10 py-5 border border-[#B59A54] hover:bg-[#B59A54] hover:text-black transition-all shadow-[0_0_15px_rgba(181,154,84,0.1)]"
              >
                ENTER THE SHOP
              </Link>
            </div>
          </div>
        )}

        <PastBuildsStrip archives={archives} activeId={archive?.id} />
      </main>
    </div>
  )
}
