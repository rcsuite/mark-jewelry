import ContactForm from '@/components/chat/ContactForm'
import { getPieceById } from '@/lib/queries'

type Props = {
  searchParams: Promise<{ piece?: string }>
}

export default async function ContactPage({ searchParams }: Props) {
  const { piece: pieceId } = await searchParams
  const piece = pieceId ? await getPieceById(pieceId) : null

  return (
    <ContactForm
      pieceId={piece?.id ?? pieceId ?? null}
      pieceTitle={piece?.title ?? null}
    />
  )
}
