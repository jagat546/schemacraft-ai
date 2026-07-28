// Guards the `?next=` post-login redirect target against becoming an open
// redirect: `next` is attacker-influenceable (it's a query param anyone can
// craft a link with), so only a same-origin relative path is ever honored.
// A relative-looking value can still smuggle a scheme change via a
// protocol-relative URL (`//evil.com`) or an encoded absolute URL
// (`/\evil.com`, `https:/\evil.com`) that browsers/some routers normalize
// into an off-site navigation -- both rejected explicitly, not just "does
// it start with a single slash."
export function getSafeRedirectPath(next: string | null | undefined): string | null {
  if (!next) {
    return null
  }

  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null
  }

  // A relative path can't legally contain a scheme, but `new URL` with a
  // base normalizes plenty of malformed input rather than rejecting it, so
  // check for one explicitly (e.g. "/\thttps://evil.com" style smuggling).
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(next)) {
    return null
  }

  return next
}
