import "server-only"

import { cookies } from "next/headers"

// Same guaranteed-cookie, no-DB-dependency approach as
// lib/actions/account-preferences.actions.ts's accessibility overrides --
// this needs to work immediately (S6-007's "automatically hide it
// permanently" requirement), not depend on user_preferences, which has no
// migration applied to any live database yet.
export const ONBOARDING_DISMISSED_COOKIE = "onboarding-dismissed"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export async function isOnboardingDismissed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(ONBOARDING_DISMISSED_COOKIE)?.value === "true"
}

export async function dismissOnboarding(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ONBOARDING_DISMISSED_COOKIE, "true", { maxAge: COOKIE_MAX_AGE })
}
