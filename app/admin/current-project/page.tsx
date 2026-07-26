import CurrentProjectAdmin from '@/components/admin/CurrentProjectAdmin'
import { getCategories, getCurrentBuild } from '@/lib/queries'

export default async function CurrentProjectPage() {
  const [build, categories] = await Promise.all([getCurrentBuild(), getCategories()])

  return <CurrentProjectAdmin build={build} categories={categories} />
}
