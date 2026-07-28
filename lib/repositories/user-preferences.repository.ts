import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { RepositoryResult } from "@/lib/repositories/types"

// NOT YET APPLIED: the user_preferences table (lib/db/schema.ts) has no
// migration generated or run against a live database. Every function here
// will fail with "relation does not exist" until that changes -- expected
// and disclosed, not a bug. See lib/db/schema.ts's userPreferences comment.
export type UserPreferences = {
  defaultDialect: string
  defaultNamingConvention: string
  defaultLandingScreen: string
  reducedMotion: boolean
  highContrast: boolean
  developerMode: boolean
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultDialect: "postgres",
  defaultNamingConvention: "snake_case",
  defaultLandingScreen: "dashboard",
  reducedMotion: false,
  highContrast: false,
  developerMode: false,
}

type UserPreferencesRow = {
  default_dialect: string
  default_naming_convention: string
  default_landing_screen: string
  reduced_motion: boolean
  high_contrast: boolean
  developer_mode: boolean
}

function mapUserPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    defaultDialect: row.default_dialect,
    defaultNamingConvention: row.default_naming_convention,
    defaultLandingScreen: row.default_landing_screen,
    reducedMotion: row.reduced_motion,
    highContrast: row.high_contrast,
    developerMode: row.developer_mode,
  }
}

// Returns defaults, not an error, when no row exists yet -- lazily created
// on first save.
export async function getUserPreferences(): Promise<RepositoryResult<UserPreferences>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_preferences")
    .select()
    .maybeSingle<UserPreferencesRow>()

  if (error) {
    return { ok: false, error: "Could not load your preferences. Please try again." }
  }

  return { ok: true, data: data ? mapUserPreferences(data) : DEFAULT_USER_PREFERENCES }
}

export async function upsertUserPreferences(
  updates: Partial<UserPreferences>
): Promise<RepositoryResult<UserPreferences>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: "You must be signed in to update preferences." }
  }

  const payload: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if (updates.defaultDialect !== undefined) payload.default_dialect = updates.defaultDialect
  if (updates.defaultNamingConvention !== undefined) {
    payload.default_naming_convention = updates.defaultNamingConvention
  }
  if (updates.defaultLandingScreen !== undefined) {
    payload.default_landing_screen = updates.defaultLandingScreen
  }
  if (updates.reducedMotion !== undefined) payload.reduced_motion = updates.reducedMotion
  if (updates.highContrast !== undefined) payload.high_contrast = updates.highContrast
  if (updates.developerMode !== undefined) payload.developer_mode = updates.developerMode

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single<UserPreferencesRow>()

  if (error) {
    return { ok: false, error: "Could not save your preferences. Please try again." }
  }

  return { ok: true, data: mapUserPreferences(data) }
}
