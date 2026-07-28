/** Public origin for links in emails (admin inbox, etc.). */
export function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (production) return `https://${production.replace(/^https?:\/\//, '')}`

  const preview = process.env.VERCEL_URL?.trim()
  if (preview) return `https://${preview.replace(/^https?:\/\//, '')}`

  return 'http://localhost:3000'
}

export function adminMessagesUrl(): string {
  return `${getAppOrigin()}/admin/messages`
}

export function adminReviewsUrl(): string {
  return `${getAppOrigin()}/admin/reviews`
}

export function reviewInviteUrl(token: string): string {
  return `${getAppOrigin()}/review/${encodeURIComponent(token)}`
}
