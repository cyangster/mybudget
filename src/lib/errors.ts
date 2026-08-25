/** Map cryptic Supabase / auth errors to actionable UI copy. */
export function formatAppError(message: string): string {
  const lower = message.toLowerCase()

  if (
    lower.includes('jwt issued at future') ||
    lower.includes('jwtissuedatfuture')
  ) {
    return (
      'Your computer clock is out of sync with the server (JWT issued at future). ' +
      'Turn on automatic time in Windows Settings → Time & language, sync now, then sign out and sign back in.'
    )
  }

  if (lower.includes('jwt expired') || lower.includes('token is expired')) {
    return (
      'Your session expired or your clock is wrong. Sync Windows time, then sign out and sign back in.'
    )
  }

  return message
}
