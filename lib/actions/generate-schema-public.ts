"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { z } from "zod"

import { generateSchemaArtifacts, type GenerateArtifactsResult } from "@/lib/services/generation.service"
import { createClient } from "@/lib/supabase/server"

// Public, unauthenticated landing-page sandbox (Engineering Spec §2 #3,
// M9). Deliberately never persists anything and never touches
// generateAndPersistSchema — that path requires a project to attach the
// result to, which no anonymous visitor has. Gated on
// check_sandbox_rate_limit (supabase/rls.sql), a SECURITY DEFINER
// function that's the only sanctioned access to sandbox_generations;
// there is no client-reachable table access to bypass here.
const MAX_REQUESTS_PER_WINDOW = 5
const WINDOW_MINUTES = 60

export type GenerateSchemaPublicResult =
  | GenerateArtifactsResult
  | { status: "INVALID_INPUT"; error: string }
  | { status: "RATE_LIMITED"; error: string }
  | { status: "RATE_LIMIT_UNAVAILABLE"; error: string }

const inputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt can't be empty.")
    // Shorter than the authenticated path's 4000 chars — an extra bound
    // on worst-case cost/latency per unauthenticated request, on top of
    // the request-count limit itself.
    .max(500, "Keep the demo prompt under 500 characters — sign up for the full Generator."),
})

async function hashClientIp(): Promise<string> {
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  const realIp = headerList.get("x-real-ip")
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"
  return createHash("sha256").update(ip).digest("hex")
}

export async function generatePublicSchemaAction(input: {
  prompt: string
}): Promise<GenerateSchemaPublicResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: "INVALID_INPUT", error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  const ipHash = await hashClientIp()
  const supabase = await createClient()

  const { data: allowed, error } = await supabase.rpc("check_sandbox_rate_limit", {
    p_ip_hash: ipHash,
    p_max_requests: MAX_REQUESTS_PER_WINDOW,
    p_window_minutes: WINDOW_MINUTES,
  })

  if (error) {
    // Fails closed, not open: if the rate limiter itself can't be
    // reached, the safe default is to deny the generation, not to let a
    // broken safety check silently become a bypass.
    return {
      status: "RATE_LIMIT_UNAVAILABLE",
      error: "The demo is temporarily unavailable. Please try again shortly.",
    }
  }

  if (!allowed) {
    return {
      status: "RATE_LIMITED",
      error: "You've reached the demo's request limit for now. Sign up for unlimited access.",
    }
  }

  return generateSchemaArtifacts({ prompt: parsed.data.prompt })
}
