import WorkbenchView from '@/components/workbench/WorkbenchView'
import { getCurrentBuild } from '@/lib/queries'

export default async function WorkbenchPage() {
  const build = await getCurrentBuild()
  const forgeActive = build?.status === 'active'

  return <WorkbenchView build={build} forgeActive={Boolean(forgeActive)} />
}
