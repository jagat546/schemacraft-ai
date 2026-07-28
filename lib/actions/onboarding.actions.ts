"use server"

import { dismissOnboarding } from "@/lib/onboarding/dismissed-cookie"

// Explicit-dismiss path (the card's own close control). The other path --
// automatic dismissal on a user's first successful generation -- calls
// dismissOnboarding() directly from lib/actions/generate-schema.ts, since
// that Server Action is already running server-side and has no need for
// a second round trip through this action.
export async function dismissOnboardingAction(): Promise<void> {
  await dismissOnboarding()
}
