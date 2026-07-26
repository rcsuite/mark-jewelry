/** Cookie lifetime for Mark's long-lived admin session (homescreen / PWA). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // ~13 months (browser cap-friendly)

export const authCookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  maxAge: AUTH_COOKIE_MAX_AGE,
}
