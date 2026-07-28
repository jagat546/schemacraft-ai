// The same session-adaptive routing decision HeroSection's primary CTA
// already makes (isAuthenticated ? /dashboard : /signup), extracted so
// Pricing (S4-007) reuses it rather than re-implementing the same branch a
// second time (roadmap: "reuse the existing session-adaptive logic already
// proven in the Hero's primary CTA, not a new implementation of the same
// decision").
export function getPrimaryCtaHref(isAuthenticated: boolean): string {
  return isAuthenticated ? "/dashboard" : "/signup"
}
