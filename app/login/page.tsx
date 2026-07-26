import { Suspense } from 'react'
import LoginPortal from '@/components/admin/LoginPortal'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070A] flex items-center justify-center text-[#71717A] text-xs tracking-widest uppercase">
          Unlocking…
        </div>
      }
    >
      <LoginPortal />
    </Suspense>
  )
}
