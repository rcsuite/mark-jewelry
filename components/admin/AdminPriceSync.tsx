'use client'

import { useEffect } from 'react'
import { repriceInventoryFromSpot } from '@/lib/actions'

/** Fire-and-forget DB reprice when Mark opens the admin hub. */
export default function AdminPriceSync() {
  useEffect(() => {
    void repriceInventoryFromSpot()
  }, [])

  return null
}
