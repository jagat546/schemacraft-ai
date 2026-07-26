"use server"

import { cookies } from "next/headers"

import { requireUser } from "@/lib/auth/require-user"
import { upsertUserPreferences } from "@/lib/repositories/user-preferences.repository"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Accessibility overrides need to apply *before first paint* (root layout
// reads these cookies synchronously, no database round-trip -- same
// reasoning next-themes uses for theme). The cookie write is the real,
// guaranteed effect; the database sync alongside it is genuinely
// best-effort: user_preferences has no migration applied yet (see
// lib/db/schema.ts), so upsertUserPreferences will fail every time until
// that changes. That failure is swallowed, not surfaced, deliberately --
// the user asked for "turn this off," not "sync this across my devices,"
// and the former must not show an error toast because the latter isn't
// wired up yet.
export async function updateAccessibilityPreferenceAction(updates: {
  reducedMotion?: boolean
  highContrast?: boolean
}): Promise<void> {
  await requireUser()

  const cookieStore = await cookies()
  if (updates.reducedMotion !== undefined) {
    cookieStore.set("reduced-motion", String(updates.reducedMotion), { maxAge: COOKIE_MAX_AGE })
  }
  if (updates.highContrast !== undefined) {
    cookieStore.set("high-contrast", String(updates.highContrast), { maxAge: COOKIE_MAX_AGE })
  }

  // Result deliberately ignored (repository functions return
  // { ok: false, error }, not a thrown exception, for expected failures
  // like this one) -- until user_preferences has a real migration applied,
  // this fails every time, and that failure must not surface to the user.
  await upsertUserPreferences(updates)
}
