import { notFound } from 'next/navigation'
import WorkbenchView from '@/components/workbench/WorkbenchView'
import { getCurrentBuild, getForgeArchiveById, getForgeArchives, isBuildActive } from '@/lib/queries'

type WorkbenchArchivePageProps = {
  params: Promise<{ id: string }>
}

export default async function WorkbenchArchivePage({ params }: WorkbenchArchivePageProps) {
  const { id } = await params
  const [archive, archives, build] = await Promise.all([
    getForgeArchiveById(id),
    getForgeArchives(),
    getCurrentBuild(),
  ])

  if (!archive) notFound()

  return (
    <WorkbenchView
      build={build}
      forgeActive={isBuildActive(build)}
      archives={archives}
      archive={archive}
    />
  )
}
