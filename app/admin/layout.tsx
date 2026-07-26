import AuthSessionKeeper from '@/components/admin/AuthSessionKeeper'
import SignOutButton from '@/components/admin/SignOutButton'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthSessionKeeper />
      <div className="sticky top-0 z-[70] bg-[#0A0C10]/95 border-b border-[#27272A] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#71717A]">
            Admin ·{' '}
            <Link href="/admin" className="text-[#14B8A6] hover:text-white">
              Control panel
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SignOutButton />
            <SignOutButton
              everywhere
              className="text-[10px] font-bold tracking-widest uppercase border border-red-950 text-red-500/80 hover:border-red-700 hover:text-red-400 px-4 py-2.5 transition-colors disabled:opacity-50"
            />
          </div>
        </div>
      </div>
      {children}
    </>
  )
}
