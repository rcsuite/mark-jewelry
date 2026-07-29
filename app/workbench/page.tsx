import WorkbenchView from '@/components/workbench/WorkbenchView'
import { getCurrentBuild, getForgeArchives, isBuildActive } from '@/lib/queries'

export default async function WorkbenchPage() {
  const [build, archives] = await Promise.all([getCurrentBuild(), getForgeArchives()])

  return (
    <WorkbenchView build={build} forgeActive={isBuildActive(build)} archives={archives} />
  )
}
