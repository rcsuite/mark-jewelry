import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<{ piece?: string; title?: string }>
}

/** Deep-link into the contact popup without leaving the shopping journey. */
export default async function ContactPage({ searchParams }: Props) {
  const { piece, title } = await searchParams
  const params = new URLSearchParams({ contact: '1' })
  if (piece) params.set('piece', piece)
  if (title) params.set('title', title)
  redirect(piece ? `/shop?${params.toString()}` : `/?${params.toString()}`)
}
