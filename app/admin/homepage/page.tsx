import { redirect } from 'next/navigation'

/** Homepage editing lives on `/admin` — keep nested category/piece routes under this path. */
export default function AdminHomepageRedirect() {
  redirect('/admin')
}
