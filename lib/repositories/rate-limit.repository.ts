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

export type RateLimitOutcome =
  | { status: "ALLOWED" }
  | { status: "RATE_LIMITED"; retryAfterSeconds: number | null }
  | { status: "UNAVAILABLE" }

// Raw shape of the RPC's jsonb return value (S7-003: the function used to
// return a plain boolean; it now also reports how long until the caller
// can retry, since a beta user actively exploring the product is a
// realistic, not edge-case, candidate for hitting the burst ceiling).
type RateLimitRpcData = { allowed: boolean; retry_after_seconds: number | null }

// Pure mapping from the RPC's raw result to a decision -- extracted so
// this logic is testable without mocking the Supabase client, mirroring
// generation.repository.ts's countGenerationsByProject convention of
// separating pure logic from I/O.
export function resolveRateLimitOutcome(result: {
  data: RateLimitRpcData | null
  error: unknown
}): RateLimitOutcome {
  if (result.error || !result.data) {
    // Fails closed, not open: if the rate limiter itself can't be
    // reached, the safe default is to deny the generation, not to let a
    // broken check silently become a bypass (same reasoning as
    // generate-schema-public.ts's RATE_LIMIT_UNAVAILABLE branch).
    return { status: "UNAVAILABLE" }
  }
  if (!result.data.allowed) {
    return { status: "RATE_LIMITED", retryAfterSeconds: result.data.retry_after_seconds }
  }
  return { status: "ALLOWED" }
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

  return resolveRateLimitOutcome({ data, error })
}

// Pure text formatting, extracted for the same testability reason as
// resolveRateLimitOutcome above -- turns a retry estimate into a clear,
// human-readable rejection message instead of a bare "try again later"
// that gives an actively-exploring user no sense of when to come back.
export function formatRateLimitRetryMessage(retryAfterSeconds: number | null): string {
  if (retryAfterSeconds === null || retryAfterSeconds <= 0) {
    return "You've reached the generation limit for now. Please try again later."
  }
  if (retryAfterSeconds < 60) {
    const seconds = Math.ceil(retryAfterSeconds)
    return `You've reached the generation limit for now. Try again in about ${seconds} second${seconds === 1 ? "" : "s"}.`
  }
  const minutes = Math.ceil(retryAfterSeconds / 60)
  return `You've reached the generation limit for now. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
}
