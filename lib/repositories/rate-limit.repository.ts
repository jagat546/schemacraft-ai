import "server-only"

import { createClient } from "@/lib/supabase/server"

// Authenticated-user generation rate limiting (S6-004): 60/hour, burst
// 10/minute. Reuses the public sandbox's proven pg_advisory_xact_lock
// check-then-act pattern (supabase/rls.sql's check_sandbox_rate_limit is
// the direct precedent this mirrors) via a second SECURITY DEFINER
// function scoped to a real user_id instead of an ip_hash, enforcing both
// windows in one call so a burst of concurrent requests from the same
// user can never race past either ceiling.
const HOURLY_MAX_REQUESTS = 60
const HOURLY_WINDOW_MINUTES = 60
const BURST_MAX_REQUESTS = 10
const BURST_WINDOW_MINUTES = 1

export type RateLimitOutcome = "ALLOWED" | "RATE_LIMITED" | "UNAVAILABLE"

// Pure mapping from the RPC's raw result to a decision -- extracted so
// this logic is testable without mocking the Supabase client, mirroring
// generation.repository.ts's countGenerationsByProject convention of
// separating pure logic from I/O.
export function resolveRateLimitOutcome(result: {
  allowed: boolean | null
  error: unknown
}): RateLimitOutcome {
  if (result.error) {
    // Fails closed, not open: if the rate limiter itself can't be
    // reached, the safe default is to deny the generation, not to let a
    // broken check silently become a bypass (same reasoning as
    // generate-schema-public.ts's RATE_LIMIT_UNAVAILABLE branch).
    return "UNAVAILABLE"
  }
  return result.allowed ? "ALLOWED" : "RATE_LIMITED"
}

export async function checkAuthenticatedGenerationRateLimit(
  userId: string
): Promise<RateLimitOutcome> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("check_authenticated_rate_limit", {
    p_user_id: userId,
    p_hourly_max: HOURLY_MAX_REQUESTS,
    p_hourly_window_minutes: HOURLY_WINDOW_MINUTES,
    p_burst_max: BURST_MAX_REQUESTS,
    p_burst_window_minutes: BURST_WINDOW_MINUTES,
  })

  return resolveRateLimitOutcome({ allowed: data, error })
}
